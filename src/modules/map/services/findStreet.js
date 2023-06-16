const _ = require('lodash');
const segmentService = require('./segment');
const mapCache = require('./map-cache');
const historyModule = require('../../history');
const { BaseError, ErrorType } = require('../../../core/error');
const Logger = require('../../../core/logger');
const Util = require('../../../core/utils');
const state = require('../../../state');
const trafficStatusCache = require('../../traffic-status/traffic-status.cache');

let costCount = 0;

function segmentsToStates({
  parentCost,
  parentLength,
  segments,
  goalCoord,
  getCostFunc = (segment) => segment.length,
  type = 'distance',
  period,
  averageVelocity,
}) {
  const result = [];
  segments.forEach((item) => {
    let costToTarget = 0;
    if (type === 'distance') {
      costToTarget = Util.getDistanceBetweenTwoCoords(
        {
          lat: item.polyline.coordinates[1][1],
          lng: item.polyline.coordinates[1][0],
        },
        goalCoord,
      );
    } else {
      costToTarget = Util.getTimeBetweenTwoCoords(
        {
          lat: item.polyline.coordinates[1][1],
          lng: item.polyline.coordinates[1][0],
        },
        goalCoord,
        averageVelocity,
      );
    }
    result.push({
      _id: item._id,
      cost: getCostFunc(item, period),
      length: item.length,
      segment: item,
      costToTarget,
      parentLength,
      parentCost,
    });
  });
  return result;
}

function getCostOfSegmentBasedOnStatus(segment, period) {
  const status = trafficStatusCache.getStatusOfSegment(segment._id);
  if (!status || !status.velocity) {
    return segment.length;
  }
  // const factor =
  //   status.current_path > status.max_capacity
  //     ? status.current_path / status.max_capacity
  //     : 1;
  // return (factor * segment.length) / status.velocity;
  costCount += 1;
  const los = period
    ? status.segmentStatus[period]
    : status.segmentStatus[Util.getBaseStatusFieldOfTime(Date.now())];
  const velocity = Util.getVelocityFromLOS(los);
  return segment.length / (velocity * state.KMPERHOUR_TO_MPERSECOND_CONST);
}

async function findShortestPathWithCondition(
  startStates,
  endStates,
  maxLength,
  findNextStateFunc,
  ignoreNodes = {},
  ignoreEdges = {},
  type,
  averageVelocity,
) {
  const openQueue = []; // OPEN list include new state
  const openMap = {};
  const visitedKeySet = {};
  const childToParentMap = {};

  // const startTime = Date.now();
  // let totalFindNextstateTime = 0;
  // let loopcount = 0;

  startStates.forEach((s) => {
    openMap[s._id] = s;
    openQueue.push(s);
  });

  // console.log('Run in findShortestPathWithCondition');

  // console.log('======= start endState');
  // endStates.forEach((state) => {
  //   console.log(state);
  // })
  // console.log('======= end endState');

  while (openQueue.length > 0) {
    // loopcount += 1;
    let bestState;
    let bestCost = Infinity;
    let index = -1;
    let bestLength = 0;
    openQueue.forEach((item, i) => {
      const cost = segmentService.getCostOfState(item);
      if (cost < bestCost) {
        bestState = item;
        bestCost = cost;
        index = i;
        bestLength = item.parentCost
          + (type === 'distance' ? item.length : item.length / averageVelocity)
          + item.costToTarget;
      }
    });

    if (!bestState) {
      return null;
    }
    openQueue.splice(index, 1);
    // console.log('Visit node', bestState._id, maxLength, bestCost);

    if (endStates.find((item) => item._id === bestState._id)) {
      // Logger.info(
      //   "findShortestPath run, time=%d,findNextStateTime=%d,loopCount=%d  ",
      //   Date.now() - startTime,
      //   totalFindNextstateTime,
      //   loopcount
      // );

      // console.log('Loop Count in A *', loopcount);
      return segmentService.getPath(bestState, childToParentMap);
    }

    if (bestLength > maxLength) {
      // Logger.info('findShortestPath run time %d', Date.now() - startTime);
      Logger.warn('Find road go exceed max cost %d', maxLength);
      return null;
    }

    delete openMap[bestState._id];
    visitedKeySet[bestState._id] = true;
    // console.log('Run before findNextStateFunc');

    // eslint-disable-next-line no-await-in-loop
    const childStates = await findNextStateFunc(bestState);

    // const listSegmentsChildren = mapCache.getListSegmentsByStartNode(bestState.segment.end_node);
    // const childStates = segmentsToStates({
    //   parentCost: bestState.parentCost + bestState.cost,
    //   parentLength: bestState.parentLength + bestState.length,
    //   segments: listSegmentsChildren,
    //   goalCoord: endCoord,
    // });

    // const beforeTime = Date.now();
    // totalFindNextstateTime += Date.now() - beforeTime;
    // console.log('After find next state',childStates.length,Date.now()-beforeTime);
    childStates.forEach((child) => {
      if (ignoreNodes[child._id]) {
        return;
      }

      if (visitedKeySet[child._id]) {
        return;
      }

      if (ignoreEdges[bestState._id] && ignoreEdges[bestState._id][child._id]) {
        return;
      }

      if (openMap[child._id]) {
        const oldState = openMap[child._id];
        if (segmentService.getCostOfState(oldState) > segmentService.getCostOfState(child)) {
          openMap[child._id] = child;
          openQueue.push(child);
          childToParentMap[child._id] = bestState;
        }
      } else {
        openMap[child._id] = child;
        openQueue.push(child);
        childToParentMap[child._id] = bestState;
      }
    });
  }
  return null;
}

async function yenAlgorithmV2(
  startStates,
  targetStates,
  numberOfRoad,
  maxCost,
  findNextStatesFunc,
  type,
  averageVelocity,
) {
  const Aset = [];
  const firstPath = await findShortestPathWithCondition(
    startStates,
    targetStates,
    maxCost,
    findNextStatesFunc,
    {},
    {},
    type,
    averageVelocity,
  );

  // console.log("firstPath", firstPath);
  if (!firstPath) {
    return [];
  }

  // console.time('runningYenAlgorithm');

  Aset.push(firstPath);
  const listSegmentsIdOfFirstPath = firstPath.map((item) => item._id);
  const listStreetLevelOneOfFirstPath = firstPath
    .map((item) => item.segment.street_level)
    .filter((item) => item === 1);
  // const listStreetLevelTwoOfFirstPath = firstPath
  //   .map((item) => item.segment.street_level)
  //   .filter((item) => item === 2);
  // const listStreetLevelOfFirstPath = firstPath.map(item => ({
  //   segmentId: item._id,
  //   street_level: item.segment.street_level
  // }));

  // console.log('Number of segments in first shortest path: ', firstPath.length);
  // console.log(
  //   'Ratio: listStreetLevelOneOfFirstPath / listSegmentsIdOfFirstPath: ',
  //   listStreetLevelOneOfFirstPath.length / listSegmentsIdOfFirstPath.length,
  // );
  let countAStarAlgorithm = 0;

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

      const nextSegmentsOfSpurNode = mapCache
        .getListSegmentsByStartNode(spurNode.segment.end_node)
        .map((item) => item._id)
        .filter((id) => id !== nextSegmentId);

      // console.log('spurNode: ', spurNode._id);
      // console.log('nextSegments: ', nextSegmentsOfSpurNode);

      // const nextNextSegmentNodeIdOfSpurNode = mapCache
      //   .getListSegmentsByStartNode(spurNode.segment.end_node)
      //   .reduce((prev, item) => {
      //   // Get next next segments of spur node
      //     const tempNextSegments = mapCache
      //       .getListSegmentsByStartNode(item.end_node)
      //       .map((itemNode) => itemNode._id);

      //     // Get next next next segments of spur node
      //     const tempNextNextNextSegmentsId = tempNextSegments.reduce((innerPrev, innerItem) => {
      //       const tempNextNextSegmentsId = mapCache
      //         .getListSegmentsByStartNode(innerItem.end_node)
      //         .map((itemNode) => itemNode._id);
      //       return [...new Set(innerPrev.concat(tempNextNextSegmentsId))];
      //     }, []);
      //     return [...new Set(prev.concat(tempNextSegments))];
      //   }, []);

      // console.log(nextNextSegmentNodeIdOfSpurNode);

      const nextNextNextSegmentNodeIdOfSpurNode = mapCache
        .getListSegmentsByStartNode(spurNode.segment.end_node)
        .reduce((prev, item) => {
        // Get next next segments of spur node
          const tempNextSegments = mapCache.getListSegmentsByStartNode(item.end_node);

          // Get next next next segments of spur node
          const tempNextNextNextSegmentsId = tempNextSegments.reduce((innerPrev, innerItem) => {
            const tempNextNextSegmentsId = mapCache
              .getListSegmentsByStartNode(innerItem.end_node)
              .map((itemNode) => itemNode._id);
            return [...new Set(innerPrev.concat(tempNextNextSegmentsId))];
          }, []);
          return [...new Set(prev.concat(tempNextNextNextSegmentsId))];
        }, []);

      // console.log('start before');
      // console.log(nextNextNextSegmentNodeIdOfSpurNode);
      // console.log(nextSegmentId);
      // console.log('end before');

      // firstPath.forEach((pathItem) => {
      //   const nextSegmentSpurNodeIndex = nextSegmentsOfSpurNode.findIndex((id) => id === pathItem._id);
      //   if (nextSegmentSpurNodeIndex !== -1) {
      //     nextSegmentsOfSpurNode.splice(nextSegmentSpurNodeIndex, 1);
      //   }
      // })

      const checkCondition = nextNextNextSegmentNodeIdOfSpurNode.includes(nextSegmentId)
        && nextSegmentsOfSpurNode.length === 1;
        // && nextNextNextSegmentNodeIdOfSpurNode.length === 1;

      if (checkCondition && nextSegmentsOfSpurNode.length) {
        listSpurNodeForNotFound.push(spurNode);
      }

      // console.log(checkCondition);
      // console.log(nextSegmentsOfSpurNode.length > 0 && !checkCondition);
      // let checkCondition = false;
      // TempBSet.forEach((setItem) => {
      //   setItem.path.forEach((pathItem) => {
      //     if (nextSegmentsOfSpurNode.includes(pathItem._id)) {
      //       checkCondition = true;
      //     }
      //     const nextSegmentSpurNodeIndex = nextNextSegmentNodeIdOfSpurNode.findIndex((id) => id === pathItem._id);
      //     if (nextSegmentSpurNodeIndex !== -1) {
      //       nextNextSegmentNodeIdOfSpurNode.splice(nextSegmentSpurNodeIndex, 1);
      //     }
      //   });
      // });

      // console.log('start after');
      // console.log(nextNextNextSegmentNodeIdOfSpurNode.length);
      // console.log(nextSegmentsOfSpurNode.length);
      // console.log('end after');

      let spurPath = null;
      // if (!checkCondition || Bset.length === 0) {
      if (!checkCondition && nextSegmentsOfSpurNode.length) {
        // console.log('run a* algorithm');
        // console.time('timeRunningAStar');
        // console.log('Segment is called with A* algorithm ', spurNode._id);
        countAStarAlgorithm += 1;
        // eslint-disable-next-line no-await-in-loop
        spurPath = await findShortestPathWithCondition(
          [spurNode],
          targetStates,
          maxCost,
          findNextStatesFunc,
          ignoreNodes,
          ignoreEdges,
          type,
          averageVelocity,
        );
        // console.timeEnd('timeRunningAStar');
      }
      // console.log('==========================');

      if (spurPath) {
        const fullPath = [...rootPath, ...spurPath];
        const costOfFullPath = segmentService.getPathCost(fullPath);
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
        if (listStreetLevelOneOfFirstPath.length >= listSegmentsIdOfFirstPath.length * 0.6) {
          // console.log('Run here');
          alpha = 0.5;
        }

        // if(listStreetLevelTwoOfFirstPath.length >= listSegmentsIdOfFirstPath.length*0.5) {
        //   alpha = 0.5;
        // }

        const intersection = fullPath.filter((x) => !listSegmentsIdOfFirstPath.includes(x._id));
        // console.log('length of intersection: ', intersection.map(item => item.segment.street_level));
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
        // eslint-disable-next-line no-await-in-loop
        const spurPath = await findShortestPathWithCondition(
          [spurNode],
          targetStates,
          maxCost,
          findNextStatesFunc,
          ignoreNodes,
          ignoreEdges,
          type,
          averageVelocity,
        );

        if (spurPath) {
          const fullPath = [...rootPath, ...spurPath];
          const costOfFullPath = segmentService.getPathCost(fullPath);
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
          if (listStreetLevelOneOfFirstPath.length >= listSegmentsIdOfFirstPath.length * 0.6) {
            alpha = 0.5;
          }

          // if(listStreetLevelTwoOfFirstPath.length >= listSegmentsIdOfFirstPath.length*0.5) {
          //   alpha = 0.5;
          // }

          const intersection = fullPath.filter((x) => !listSegmentsIdOfFirstPath.includes(x._id));
          // console.log('length of intersection: ', intersection.map(item => item.segment.street_level));
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
      // break;
    }

    let bestCost = Infinity;

    let bestPath;
    let bestIndex;
    for (let j = 0; j < Bset.length; j += 1) {
      if (Bset[j].cost < bestCost) {
        bestCost = Bset[j].cost;
        bestPath = Bset[j];
        bestIndex = j;
      }
    }

    Bset.splice(bestIndex, 1);

    if (bestPath) {
      Aset.push(bestPath.path);
    }
  }

  Logger.info('Number of calling A* algorithm: ', countAStarAlgorithm);
  Logger.info('Number of Temp Bset: ', TempBSet.length);
  // console.timeEnd('runningYenAlgorithm');
  return Aset.map((item) => ({
    cost: segmentService.getPathCost(item),
    path: item,
  }));
}

async function findKShortestRoad(
  startCoord,
  endCoord,
  numberOfRoad,
  type,
  period,
  averageVelocity,
) {
  const [startSegments, endSegments] = await Promise.all([
    segmentService.findNearSegments(
      startCoord.lat,
      startCoord.lng,
      state.NUMBER_OF_SEGMENT_RESULT,
      2000,
    ),
    segmentService.findNearSegments(
      endCoord.lat,
      endCoord.lng,
      state.NUMBER_OF_SEGMENT_RESULT,
      2000,
    ),
  ]);
  let maxCost = 0;

  let straightDistance = Util.getDistanceBetweenTwoCoords(
    startCoord,
    endCoord,
  );
  maxCost = 4 * straightDistance;
  if (type === 'time') {
    straightDistance = Util.getTimeBetweenTwoCoords(
      startCoord,
      endCoord,
      averageVelocity,
    );
    maxCost = 6 * straightDistance;
  }
  // console.log('maxCost', maxCost);
  // const maxCost = 40 * straightDistance;

  const getCostFunc = type === 'distance'
    ? (segment) => {
      costCount += 1;
      return segment.length;
    }
    : getCostOfSegmentBasedOnStatus;
  const startStates = segmentsToStates({
    parentCost: 0,
    parentLength: 0,
    segments: startSegments,
    goalCoord: endCoord,
    getCostFunc,
    type,
    period,
    averageVelocity,
  });
  const endStates = segmentsToStates({
    parentCost: 0,
    parentLength: 0,
    segments: endSegments,
    goalCoord: endCoord,
    getCostFunc,
    type,
    period,
    averageVelocity,
  });

  const mapCacheStatus = await mapCache.getStatus();
  Logger.info('findShortestRoad: MapCache status %s', mapCacheStatus);
  const findNextStates = mapCacheStatus === 'connected'
    ? async (currentState) => {
      // console.log('Run in connected status');
      const endNode = currentState.segment.end_node;
      const segments = await mapCache.getSegmentsByStartNode(endNode);
      return segmentsToStates({
        parentCost: currentState.parentCost + currentState.cost,
        parentLength: currentState.parentLength + currentState.length,
        segments,
        goalCoord: endCoord,
        getCostFunc,
        type,
        period,
        averageVelocity,
      });
    }
    : async (currentState) => {
      // console.log('Run in NOT connected status');
      const segments = await segmentService.findNextSegments(currentState.segment);
      // console.log('Connect database time',currentState.segment._id, Date.now() - beforeTime);
      return segmentsToStates({
        parentCost: currentState.parentCost + currentState.cost,
        parentLength: currentState.parentLength + currentState.length,
        segments,
        goalCoord: endCoord,
        getCostFunc,
        type,
        period,
        averageVelocity,
      });
    };

  return yenAlgorithmV2(
    startStates,
    endStates,
    numberOfRoad,
    maxCost,
    findNextStates,
    type,
    averageVelocity,
  );
}

function pathToDirections(path, isPublicData, period) {
  let time = 0;
  const tempPeriod = period || Util.getBaseStatusFieldOfTime(Date.now());
  const coords = path.path.map((item) => {
    const { segment } = item;
    let status = trafficStatusCache.getStatusOfSegment(segment._id);
    const los = status.segmentStatus && status.segmentStatus[tempPeriod];
    const velocity = status && los ? Util.getVelocityFromLOS(los) : 40;
    if (!status || !status.velocity) {
      status = {
        velocity,
        source: 'base-data',
        color: Util.velocityToColor(velocity),
      };
    } else {
      status.color = Util.velocityToColor(velocity);
    }
    time += segment.length / velocity;
    const {
      source, max_capacity, current_path, color,
    } = status;
    const formattedStatus = {
      source,
      max_capacity,
      current_path,
      color,
      velocity,
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
  });
  return {
    _id: path._id,
    distance: path.cost,
    time: (time * 60) / 1000,
    coords,
  };
}

/**
 *
 * @param {Object} startCoord 2D coordinate (lat, lng)
 * @param {Object} endCoord 2D coordinate (lat, lng)
 * @param {number} numberOfRoads number of roads to return
 * @param {string} type distance / time
 * @param {boolean} isPublicData whether public data is shared
 * @returns a list of routes sorted by routing type
 */
async function findStreet(startCoord, endCoord, numberOfRoads = 2, type = 'distance', isPublicData = false) {
  try {
    Logger.info('Start find street');
    const now = Date.now();
    const period = Util.getBaseStatusFieldOfTime(now);
    const averageVelocity = Util.getAverageVelocityFromTime(now);
    const n = numberOfRoads === 1 ? 1 : 2;
    const paths = await findKShortestRoad(startCoord, endCoord, n, type, period, averageVelocity);
    if (!paths) {
      return [];
    }
    Logger.info('Found %d path', paths.length);

    await Promise.all(paths.map(async (path, idx) => {
      const segments = path.path.map((item) => ({
        _id: item.segment._id,
        coordinates: item.segment.polyline.coordinates,
      }));

      return historyModule
        .insertPathHistory({ segments })
        .then((history) => {
          paths[idx]._id = history._id;
        });
    }));

    Logger.info('Count %d', costCount);
    costCount = 0;
    const roads = paths.map((item) => pathToDirections(item, isPublicData, period));
    roads.sort((a, b) => {
      if (type === 'distance') {
        return a.distance - b.distance;
      }
      return a.time - b.time;
    });

    return roads;
  } catch (error) {
    Logger.error('Direct error %o', error);
    throw new BaseError(ErrorType.internalServerError);
  }
}

module.exports = {
  findStreet,
};
