/* This file no more in used */

const _ = require('lodash');
const Database = require('../../../core/database');
const Logger = require('../../../core/logger');
const { BaseError, ErrorType } = require('../../../core/error');
const Util = require('../../../core/utils');
const state = require('../../../state');
const Model = require('../models');
const mapCache = require('./map-cache');
const historyModule = require('../../history');
const trafficStatusCache = require('../../traffic-status/traffic-status.cache');

let costCount = 0;

/**
 * Find near segments
 * @param {*} lat
 * @param {*} lng
 */
async function findNearSegments(
  lat,
  lng,
  limit = state.NUMBER_OF_SEGMENT_RESULT,
  distance = state.SEARCH_DISTANCE,
) {
  const query = {
    polyline: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $minDistance: 0,
        $maxDistance: distance,
      },
    },
  };

  return Database.findMany(Model.Segment.Name, query, null, limit);
}

async function findNextSegments(segment) {
  const nextSegments = await Database.findMany(Model.Segment.Name, {
    start_node: segment.end_node,
  });
  return nextSegments;
}

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

function getPath(bestState, childToParentMap) {
  const states = [];
  let temp = bestState;
  do {
    states.push(temp);
    temp = childToParentMap[temp._id];
  } while (temp);
  return states.reverse();
}

function getPathCost(path) {
  let cost = 0;
  path.forEach((item) => {
    cost += item.length;
  });
  return cost;
}

function getCostOfState(s) {
  return (
    parseFloat(s.cost)
    + parseFloat(s.costToTarget)
    + parseFloat(s.parentCost)
  );
}

function getCostOfSegmentBasedOnStatus(segment, period) {
  const status = trafficStatusCache.getStatusOfSegment(segment._id);
  if (!status || !status.velocity) {
    return segment.length;
  }
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

  while (openQueue.length > 0) {
    // loopcount += 1;
    let bestState;
    let bestCost = Infinity;
    let index = -1;
    let bestLength = 0;
    openQueue.forEach((item, i) => {
      const cost = getCostOfState(item);
      if (cost < bestCost) {
        bestState = item;
        bestCost = cost;
        index = i;
        bestLength = item.parentLength + item.length + item.costToTarget;
      }
    });

    if (!bestState) {
      return null;
    }
    openQueue.splice(index, 1);
    // console.log('Visit node', bestState._id, maxLength, bestCost);

    if (endStates.find((item) => item._id === bestState._id)) {
      return getPath(bestState, childToParentMap);
    }

    if (bestLength > maxLength) {
      Logger.warn('Find road go exceed max cost %d', maxLength);
      return null;
    }

    delete openMap[bestState._id];
    visitedKeySet[bestState._id] = true;

    // eslint-disable-next-line no-await-in-loop
    const childStates = await findNextStateFunc(bestState);

    // const beforeTime = Date.now();
    // totalFindNextstateTime += Date.now() - beforeTime;
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
        if (getCostOfState(oldState) > getCostOfState(child)) {
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

async function findShortestPath(
  startStates,
  endStates,
  maxCost,
  findNextStateFunc,
) {
  return findShortestPathWithCondition(
    startStates,
    endStates,
    maxCost,
    findNextStateFunc,
    {},
  );
}

async function yenAlgorithm(
  startStates,
  targetStates,
  numberOfRoad,
  maxCost,
  findNextStatesFunc,
) {
  const Aset = [];
  const firstPath = await findShortestPath(
    startStates,
    targetStates,
    maxCost,
    findNextStatesFunc,
  );
  if (!firstPath) {
    return [];
  }
  Aset.push(firstPath);
  const Bset = [];

  for (let k = 1; k < numberOfRoad; k += 1) {
    const currentPath = Aset[k - 1];
    const stateCount = currentPath.length;

    const asyncTasks = [...Array(Math.floor(stateCount / 2)).keys()].map(
      async (i) => {
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
        const spurNode = currentPath[i];
        const rootPath = currentPath.slice(0, i + 1);
        Aset.forEach((path) => {
          if (i < path.length && _.isEqual(path.slice(0, i + 1), rootPath)) {
            for (let idx = i; idx < path.length - 20; idx += 1) {
              let nextStates = ignoreEdges[path[idx]._id];
              if (!nextStates) {
                nextStates = {};
              }
              nextStates[path[idx + 1]._id] = true;
              ignoreEdges[path[idx]._id] = nextStates;
            }
          }
        });

        rootPath.forEach((item) => {
          ignoreNodes[item._id] = true;
        });

        const spurPath = await findShortestPathWithCondition(
          [spurNode],
          targetStates,
          maxCost,
          findNextStatesFunc,
          ignoreNodes,
          ignoreEdges,
        );
        if (spurPath) {
          const fullPath = [...rootPath.slice(0, i), ...spurPath];
          Bset.push({
            path: fullPath,
            cost: getPathCost(fullPath),
          });
        }
      },
    );
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(asyncTasks);

    if (Bset.length === 0) {
      break;
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
    Aset.push(bestPath.path);
  }

  return Aset.map((item) => ({
    cost: getPathCost(item),
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
    findNearSegments(
      startCoord.lat,
      startCoord.lng,
      state.NUMBER_OF_SEGMENT_RESULT,
      2000,
    ),
    findNearSegments(
      endCoord.lat,
      endCoord.lng,
      state.NUMBER_OF_SEGMENT_RESULT,
      2000,
    ),
  ]);
  const straightDistance = Util.getDistanceBetweenTwoCoords(
    startCoord,
    endCoord,
  );
  const maxCost = 4 * straightDistance;

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
      const segments = await findNextSegments(currentState.segment);
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

  return yenAlgorithm(
    startStates,
    endStates,
    numberOfRoad,
    maxCost,
    findNextStates,
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

async function directFix(startCoord, endCoord, type, isPublicData = false) {
  try {
    Logger.info('Start direct fix');
    const now = Date.now();
    const period = Util.getBaseStatusFieldOfTime(now);
    const averageVelocity = Util.getAverageVelocityFromTime(now);
    const paths = await findKShortestRoad(startCoord, endCoord, 2, type, period, averageVelocity);
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

    Logger.info('Count', costCount);
    costCount = 0;
    return paths.map((item) => pathToDirections(item, isPublicData));
  } catch (error) {
    Logger.error('Direct error %o', error);
    throw new BaseError(ErrorType.internalServerError);
  }
}

module.exports = {
  directFix,
};
