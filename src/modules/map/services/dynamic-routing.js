/* eslint-disable no-await-in-loop */
const _ = require('lodash');
const Heap = require('heap');
const segmentService = require('./segment');
const mapCache = require('./map-cache');
const historyModule = require('../../history');
const { CodeError, ErrorType } = require('../../../core/error');
const Logger = require('../../../core/logger');
const Util = require('../../../core/utils');
const Analyxer = require('../../../core/bktraffic-analyxer');
const State = require('../../../state');
const trafficStatusCache = require('../../traffic-status/traffic-status.cache');

let costCount = 0;

/**
 * Chuyển segment thành stateful state để thuận tiện cho thuật toán A*
 * @param {Object} segment
 * @param {number} parentCost time-based thì cost là second, distance-based thì cost là meter
 * @param {Obkect} goalCoord tọa độ của điểm cuối cùng cần route tới
 * @param {number} velocity (km/h) tốc độ di chuyển trên đoạn đường để tính phần heuristic cost: h(x)
 * @param {distance / time} type loại routing
 */
function segmentToState(
  segment,
  parentCost,
  goalCoord,
  velocity,
  type = 'distance',
) {
  const lat = segment.polyline.coordinates[1][1];
  const lng = segment.polyline.coordinates[1][0];
  const costToTarget = type === 'distance'
    ? Util.getDistanceBetweenTwoCoords({ lat, lng }, goalCoord)
    : Util.getTimeBetweenTwoCoords({ lat, lng }, goalCoord, velocity);

  return {
    _id: segment._id,
    segment,
    parentCost,
    costToTarget,
    status: {}, // other information
  };
}

/**
 * Compute cost of result path
 * @param {[Object]} path a list of segment state representing routing result
 * @returns distance to travel in the resulting path (in meter)
 */
function getPathCost(path) {
  return segmentService.getPathCost(path.map((state) => state.segment));
}

/**
 * Estimate velocity when time-based routing
 * @param {[object]} segments danh sách segment cần gọi model prediction
 * @param {number} time in milisecond
 * @return danh sách ước tính vận tốc di chuyển trên các segments (km/h)
 */
async function estimateVelocity(segments, time) {
  return Analyxer.velocityEstimator.getVelocity(segments.map((s) => s._id), time)
    .then((velList) => ({
      velocities: velList.map((velocity) => parseFloat(velocity)),
      source: 'predict',
    }))
    .catch(() => ({
      velocities: segments.map((segment) => {
        const baseStatus = trafficStatusCache.getStatusOfSegment(segment._id);
        const period = Util.getBaseStatusFieldOfTime(time);
        return baseStatus && baseStatus.segmentStatus ? Util.getVelocityFromLOS(baseStatus.segmentStatus[period]) : 40;
      }),
    }));
}

/**
 * Tính phần real cost của công thức A*: g(x)
 * @param {[Object]} states nhiều states cùng 1 lúc để giảm thiểu số lần gọi model prediction
 * @param {number} time (in milisecond) thời điểm để tính cost (dùng trong time-based routing)
 * @param {string} type distance/time
 * @returns danh sách chi phí của các states để sử dụng trong thuật toán A*
 */
async function getCostOfStates(states, time, type = 'distance') {
  costCount += states.length;

  if (type === 'distance') {
    return states.map((state) => Object.assign(state, { cost: state.segment.length }));
  }
  const { velocities, source } = await estimateVelocity(states.map((state) => state.segment), time);
  return states.map((state, i) => {
    const eta = state.segment.length / (velocities[i] * State.KMPERHOUR_TO_MPERSECOND_CONST);
    const currentCapacity = segmentService.getCurrentCapacity(state.segment._id, time, eta);
    const factor = currentCapacity > State.MAX_CAPACITY ? currentCapacity / State.MAX_CAPACITY : 1;
    return Object.assign(
      state,
      {
        cost: factor * eta,
        status: {
          eta,
          velocity: velocities[i],
          capacity: currentCapacity,
          source,
        },
      },
    );
  });
}

/**
 * Tìm các segments kế tiếp của 1 state, lấy từ cache hoặc từ database
 * @param {Object} state state chứa thông tin liên quan segment
 * @returns danh sách các segments kế tiếp để traverse
 */
async function findNextSegmentsFromState(state) {
  const status = await mapCache.getStatus();
  return status === 'connected'
    ? mapCache.getListSegmentsByStartNode(state.segment.end_node)
    : segmentService.findNextSegments(state.segment);
}

/**
 * A-star find shortest route
 * @param {Object} startStates
 * @param {Object} goalStates
 * @param {Object} goalCoord coordinate of destination (longitude - latitude)
 * @param {number} timestamp (in milisecond) start routing timestamp
 * @param {number} maxCost
 * @param {string} type distance / time
 * @param {Object} ignoreNodes
 * @param {Object} ignoreEdges
 * @returns list of segment information representing routing result
 */
async function aStarAlgorithm(
  startStates,
  goalStates,
  goalCoord,
  timestamp,
  maxCost,
  type = 'distance',
  ignoreNodes = {},
  ignoreEdges = {},
) {
  const averageVelocity = Util.getAverageVelocityFromTime(timestamp);

  // Init priority queue
  const openQueue = new Heap((a, b) => segmentService.getCostOfState(a) - segmentService.getCostOfState(b));
  const openMap = {};
  const visitedKeySet = new Set();
  const childToParentMap = {};

  startStates.forEach((state) => {
    openMap[state._id] = state;
    openQueue.push(state);
  });

  while (!openQueue.empty()) {
    const currentState = openQueue.pop();

    // Check reach goal states
    if (goalStates.find((item) => item._id === currentState._id)) {
      return segmentService.getPath(currentState, childToParentMap);
    }

    if (segmentService.getCostOfState(currentState) > maxCost) {
      Logger.warn('Find road go exceed max cost %d', maxCost);
      return null;
    }

    delete openMap[currentState._id];
    visitedKeySet.add(currentState._id);

    // Expand child states
    let childSegments = await findNextSegmentsFromState(currentState);
    childSegments = childSegments.filter(
      (child) => !ignoreNodes[child._id] && !visitedKeySet.has(child._id)
                 && (!ignoreEdges[currentState._id] || !ignoreEdges[currentState._id][child._id]),
    );
    if (_.isEmpty(childSegments)) continue;

    const parentCost = currentState.parentCost + currentState.cost;

    const childStates = await getCostOfStates(childSegments.map(
      (segment) => segmentToState(segment, parentCost, goalCoord, averageVelocity, type),
    ), timestamp + parentCost * 1000, type);

    for (const child of childStates) {
      const oldState = openMap[child._id];
      if (!oldState || segmentService.getCostOfState(oldState) > segmentService.getCostOfState(child)) {
        openMap[child._id] = child;
        childToParentMap[child._id] = currentState;
        openQueue.push(child);
      }
    }
  }
  return null;
}

/**
 * YEN algorithm
 * @param {Object} startStates
 * @param {Object} goalStates
 * @param {Object} goalCoord coordinate of destination (longitude - latitude)
 * @param {number} timestamp (in milisecond) start routing timestamp
 * @param {number} maxCost
 * @param {number} numberOfRoad
 * @param {string} type distance / time
 * @returns A number of routing results
 */
async function yenAlgorithm(
  startStates,
  goalStates,
  goalCoord,
  timestamp,
  maxCost,
  numberOfRoad = 1,
  type = 'distance',
) {
  const firstPath = await aStarAlgorithm(
    startStates,
    goalStates,
    goalCoord,
    timestamp,
    maxCost,
    type,
    {},
    {},
  );

  if (!firstPath) return [];
  if (numberOfRoad === 1) return [firstPath];
  const Aset = [firstPath];
  const listSegmentsIdOfFirstPath = firstPath.map((item) => item._id);
  const numberOfLevelOneSegment = firstPath
    .map((item) => item.segment.street_level)
    .filter((item) => item === 1)
    .length;

  let countAStarAlgorithm = 1;
  const Bset = [];
  const TempBSet = [];
  const listSpurNodeForNotFound = [];

  for (let k = 1; k < numberOfRoad; k += 1) {
    const currentPath = Aset[k - 1];

    for (let i = 0; i < currentPath.length - 2; i += 1) {
      const spurNode = currentPath[i];
      const rootPath = currentPath.slice(0, i + 1);

      const ignoreEdges = {
        /**
         * _id: {
         *      _id: true,
         * }
         */
      };
      const ignoreNodes = {
        /**
         * _id: true
         */
      };

      let nextSegmentId = -1;

      Aset.forEach((path) => {
        if (_.isEqual(path.slice(0, i + 1), rootPath)) {
          const currentNodeId = path[i]._id;
          const nextNodeId = path[i + 1]._id;
          ignoreEdges[currentNodeId] = {};
          ignoreEdges[currentNodeId][nextNodeId] = true;
          nextSegmentId = nextNodeId;
        }
      });

      rootPath.pop();

      rootPath.forEach((item) => {
        ignoreNodes[item._id] = true;
      });

      let nextSegmentsOfSpurNode = await findNextSegmentsFromState(spurNode);
      nextSegmentsOfSpurNode = nextSegmentsOfSpurNode.map((item) => item._id).filter((id) => id !== nextSegmentId);

      const nextNextNextSegmentNodeIdOfSpurNode = mapCache
        .getListSegmentsByStartNode(spurNode.segment.end_node)
        .reduce((prev, item) => {
          const tempNextSegments = mapCache.getListSegmentsByStartNode(item.end_node);
          const tempNextNextNextSegmentsId = tempNextSegments.reduce((innerPrev, innerItem) => {
            const tempNextNextSegmentsId = mapCache
              .getListSegmentsByStartNode(innerItem.end_node)
              .map((itemNode) => itemNode._id);
            return [...new Set(innerPrev.concat(tempNextNextSegmentsId))];
          }, []);
          return [...new Set(prev.concat(tempNextNextNextSegmentsId))];
        }, []);

      const checkCondition = nextNextNextSegmentNodeIdOfSpurNode.includes(nextSegmentId)
        && nextSegmentsOfSpurNode.length === 1;

      if (checkCondition && nextSegmentsOfSpurNode.length) {
        listSpurNodeForNotFound.push(spurNode);
      }

      let spurPath = null;
      if (!checkCondition && nextSegmentsOfSpurNode.length) {
        countAStarAlgorithm += 1;
        spurPath = await aStarAlgorithm(
          [spurNode],
          goalStates,
          goalCoord,
          timestamp,
          maxCost,
          type,
          ignoreNodes,
          ignoreEdges,
        );
      }

      if (spurPath) {
        const fullPath = [...rootPath, ...spurPath];
        const costOfFullPath = getPathCost(fullPath);
        TempBSet.push({
          path: fullPath,
          cost: costOfFullPath,
        });
        let alpha = 0.2;
        if (listSegmentsIdOfFirstPath.length <= 50) {
          alpha = 0.2;
        } else if (listSegmentsIdOfFirstPath.length > 50 && listSegmentsIdOfFirstPath.length <= 100) {
          alpha = 0.175;
        } else if (listSegmentsIdOfFirstPath.length > 100 && listSegmentsIdOfFirstPath.length <= 150) {
          alpha = 0.15;
        } else if (listSegmentsIdOfFirstPath.length > 150 && listSegmentsIdOfFirstPath.length < 200) {
          alpha = 0.1;
        }
        if (numberOfLevelOneSegment >= listSegmentsIdOfFirstPath.length * 0.6) {
          alpha = 0.5;
        }

        const intersection = fullPath.filter((x) => !listSegmentsIdOfFirstPath.includes(x._id));
        if (
          intersection.length > Math.round(listSegmentsIdOfFirstPath.length * alpha)
        ) {
          Bset.push({
            path: fullPath,
            cost: costOfFullPath,
          });
        }
      }
    }

    if (Bset.length === 0) {
      // Call A* again
      for (let i = 0; i < listSpurNodeForNotFound.length; i += 1) {
        const spurNode = listSpurNodeForNotFound[i];
        const indexInFirstShortestPath = firstPath.findIndex((item) => item._id === spurNode._id);
        const rootPath = Aset[k - 1].slice(0, indexInFirstShortestPath + 1);

        const ignoreEdges = {
          /**
           * _id: {
           *      _id: true,
           * }
           */
        };
        const ignoreNodes = {
          /**
           * _id: true
           */
        };

        Aset.forEach((path) => {
          if (_.isEqual(path.slice(0, indexInFirstShortestPath + 1), rootPath)) {
            const currentNodeId = path[indexInFirstShortestPath]._id;
            const nextNodeId = path[indexInFirstShortestPath + 1]._id;
            ignoreEdges[currentNodeId] = {};
            ignoreEdges[currentNodeId][nextNodeId] = true;
          }
        });

        rootPath.pop();

        rootPath.forEach((item) => {
          ignoreNodes[item._id] = true;
        });
        countAStarAlgorithm += 1;
        const spurPath = await aStarAlgorithm(
          [spurNode],
          goalStates,
          goalCoord,
          timestamp,
          maxCost,
          type,
          ignoreNodes,
          ignoreEdges,
        );

        if (spurPath) {
          const fullPath = [...rootPath, ...spurPath];
          const costOfFullPath = getPathCost(fullPath);
          TempBSet.push({
            path: fullPath,
            cost: costOfFullPath,
          });
          let alpha = 0.2;
          if (listSegmentsIdOfFirstPath.length <= 50) {
            alpha = 0.2;
          } else if (listSegmentsIdOfFirstPath.length > 50 && listSegmentsIdOfFirstPath.length <= 100) {
            alpha = 0.175;
          } else if (listSegmentsIdOfFirstPath.length > 100 && listSegmentsIdOfFirstPath.length <= 150) {
            alpha = 0.15;
          } else if (listSegmentsIdOfFirstPath.length > 150 && listSegmentsIdOfFirstPath.length < 200) {
            alpha = 0.1;
          }
          if (numberOfLevelOneSegment >= listSegmentsIdOfFirstPath.length * 0.6) {
            alpha = 0.5;
          }

          const intersection = fullPath.filter((x) => !listSegmentsIdOfFirstPath.includes(x._id));
          if (
            intersection.length > Math.round(listSegmentsIdOfFirstPath.length * alpha)
          ) {
            Bset.push({
              path: fullPath,
              cost: costOfFullPath,
            });
          }
        }
      }
    }

    const bestPath = _.minBy(Bset, 'cost');
    if (bestPath) { Aset.push(bestPath.path); }
  }

  Logger.info('[Dynamic Routing] Number of calling A* algorithm: %d', countAStarAlgorithm);
  return Aset;
}

async function findKShortestPath(
  startCoord,
  goalCoord,
  timestamp,
  numberOfRoad = 1,
  type = 'distance',
) {
  const averageVelocity = Util.getAverageVelocityFromTime(timestamp);
  const maxCost = type === 'distance'
    ? 4 * Util.getDistanceBetweenTwoCoords(startCoord, goalCoord)
    : 6 * Util.getTimeBetweenTwoCoords(startCoord, goalCoord, averageVelocity);

  const [startSegments, goalSegments] = await Promise.all([
    segmentService.findNearSegments(
      startCoord.lat,
      startCoord.lng,
      State.NUMBER_OF_SEGMENT_RESULT,
      2000,
    ),
    segmentService.findNearSegments(
      goalCoord.lat,
      goalCoord.lng,
      State.NUMBER_OF_SEGMENT_RESULT,
      2000,
    ),
  ]);
  const startStates = await getCostOfStates(startSegments.map(
    (segment) => segmentToState(segment, 0, goalCoord, averageVelocity, type),
  ), timestamp, type);
  const goalStates = goalSegments.map(
    (segment) => segmentToState(segment, 0, goalCoord, averageVelocity, type),
  );

  return yenAlgorithm(startStates, goalStates, goalCoord, timestamp, maxCost, numberOfRoad, type);
}

/**
 * Dùng model prediction để predict travel time
 * @param {[Object]} path kết quả routing đã tìm được
 * @param {number} timestamp (in milisecond) thời điểm thực hiện routing
 * @returns thông tin về ETA (estimated travel time), velocity, capacity của từng segment trong kết quả routing
 */
async function estimateTravelTime(path, timestamp) {
  let travelTime = timestamp;

  return Analyxer.velocityEstimator
    .estimateTravelTime(path.map((s) => ({ _id: s._id, length: s.segment.length })), timestamp)
    .then((result) => {
      const capacities = [];

      result.segment_ids.forEach((id, i) => {
        const capacity = segmentService.getCurrentCapacity(id, travelTime, result.ETAs[i]);
        capacities.push(capacity);
        path[i].status.source = 'predict';
        travelTime += result.ETAs[i] * 1000;
      });

      return {
        ETA: result.ETAs,
        velocities: result.velocities,
        capacities,
      };
    })
    .catch(() => {
      Logger.error('[Dynamic Routing] Estimate travel time error');

      const ETA = [];
      const velocities = [];
      const capacities = [];

      path.forEach((state, i) => {
        const baseStatus = trafficStatusCache.getStatusOfSegment(state._id);
        const period = Util.getBaseStatusFieldOfTime(travelTime);
        const velocity = baseStatus && baseStatus.segmentStatus
          ? Util.getVelocityFromLOS(baseStatus.segmentStatus[period])
          : 40;
        const eta = state.segment.length / (velocity * State.KMPERHOUR_TO_MPERSECOND_CONST); // in second
        const capacity = segmentService.getCurrentCapacity(state._id, travelTime, eta) || baseStatus.current_path;

        ETA.push(eta);
        velocities.push(velocity);
        capacities.push(capacity);
        path[i].status.source = baseStatus && baseStatus.source ? baseStatus.source : 'default';

        travelTime += eta * 1000;
      });

      return { ETA, velocities, capacities };
    });
}

/**
 * Populate result from routing algorithm with usable information to clients
 * @param {[Object]} path a list of segment state representing routing result
 * @param {number} timestamp (in milisecond) time to start routing
 * @param {string} type distance / time
 * @param {boolean} isPublicData indicate whether to share as public data
 * @returns Object contains information related to routing results
 */
async function pathToDirections(path, timestamp, type = 'distance', isPublicData = false) {
  const { ETA, velocities, capacities } = type === 'distance'
    ? await estimateTravelTime(path, timestamp)
    : {
      ETA: path.map((state) => state.status.eta),
      velocities: path.map((state) => state.status.velocity),
      capacities: path.map((state) => state.status.capacity),
    };

  let travelTime = 0; // in second
  const segmentETAs = [];
  const coords = await Promise.all(path.map(async (state, i) => {
    const { segment, status } = state;

    segmentETAs.push({
      segmentId: segment._id,
      eta: ETA[i],
    });
    travelTime += ETA[i];

    const formattedStatus = {
      source: status.source || 'base-data',
      max_capacity: State.MAX_CAPACITY,
      current_path: await capacities[i],
      color: Util.velocityToColor(velocities[i]),
      velocity: velocities[i],
    };
    const data = {
      lat: segment.polyline.coordinates[0][1],
      lng: segment.polyline.coordinates[0][0],
      elat: segment.polyline.coordinates[1][1],
      elng: segment.polyline.coordinates[1][0],
      segment_id: segment._id,
      street_level: segment.street_level,
      street: segment.street_name
        ? {
          name: segment.street_name,
          type: segment.street_type,
        }
        : {
          name: 'Không xác định',
          type: 'unclassified',
        },
      status: formattedStatus || {},
    };
    if (isPublicData) {
      data.street = segment.street_name
        ? {
          name: segment.street_name,
          type: segment.street_type,
        }
        : {
          name: 'Không xác định',
          type: 'unclassified',
        };
    }
    return data;
  }));
  segmentService.updateCapacity(segmentETAs, timestamp);

  return {
    _id: path._id,
    distance: getPathCost(path),
    time: travelTime / 60,
    coords,
  };
}

/**
 *
 * @param {Object} startCoord 2D coordinate (lat, lng)
 * @param {Object} goalCoord 2D coordinate (lat, lng)
 * @param {number} numberOfRoads number of roads to return
 * @param {string} type distance / time
 * @param {boolean} isPublicData whether public data is shared
 * @returns a list of routes sorted by routing type
 */
async function dynamicRouting(startCoord, goalCoord, numberOfRoads = 2, type = 'distance', isPublicData = false) {
  try {
    Logger.info('[Dynamic Routing] Start service');
    const timestamp = Date.now();
    const paths = await findKShortestPath(startCoord, goalCoord, timestamp, numberOfRoads === 1 ? 1 : 2, type);
    if (!paths) {
      return [];
    }
    Logger.info('[Dynamic Routing] Found %d path(s)', paths.length);

    await Promise.all(paths.map(async (path, idx) => {
      const segments = path.map((item) => ({
        _id: item.segment._id,
        coordinates: item.segment.polyline.coordinates,
      }));

      return historyModule
        .insertPathHistory({ segments })
        .then((history) => {
          paths[idx]._id = history._id;
        });
    }));
    Logger.info('[Dynamic Routing] Cost count %d', costCount);
    costCount = 0;
    const roads = await Promise.all(paths.map(async (path) => pathToDirections(path, timestamp, type, isPublicData)));
    roads.sort((a, b) => {
      if (type === 'distance') {
        return a.distance - b.distance;
      }
      return a.time - b.time;
    });

    return roads;
  } catch (error) {
    Logger.error('[Dynamic Routing] %o', error);
    throw new CodeError(ErrorType.internalServerError);
  }
}

module.exports = {
  dynamicRouting,
};
