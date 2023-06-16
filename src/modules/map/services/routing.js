/* This file no more in used */

const _ = require('lodash');
const Database = require('../../../core/database');
const Logger = require('../../../core/logger');
const { BaseError, ErrorType } = require('../../../core/error');
const Util = require('../../../core/utils');
const state = require('../../../state');
const Model = require('../models');
const mapCache = require('./map-cache');
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
      );
    }
    result.push({
      _id: item._id,
      cost: getCostFunc(item),
      length: item.length,
      segment: item,
      costToTarget,
      parentLength,
      parentCost,
    });
  });
  return result;
}

function segmentsToStatesWithManhattan({
  parentCost,
  parentLength,
  segments,
  goalCoord,
  getCostFunc = (segment) => segment.length,
  type = 'distance',
}) {
  const result = [];
  segments.forEach((item) => {
    let costToTarget = 0;
    if (type === 'distance') {
      costToTarget = Util.getManhattanDistanceBetweenTwoCoords(
        {
          lat: item.polyline.coordinates[1][1],
          lng: item.polyline.coordinates[1][0],
        },
        goalCoord,
      );
    } else {
      costToTarget = Util.getManhattanTimeBetweenTwoCoords(
        {
          lat: item.polyline.coordinates[1][1],
          lng: item.polyline.coordinates[1][0],
        },
        goalCoord,
      );
    }
    result.push({
      _id: item._id,
      cost: getCostFunc(item),
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
  // let count = 0;
  do {
    states.push(temp);
    temp = childToParentMap[temp._id];
    // count += 1;
  } while (temp);
  // console.log('Start log data ===========');
  // console.log(childToParentMap);
  // console.log('count get path', count);
  // console.log(bestState);
  // console.log(states.length);
  // console.log('End log data ===========');

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

function getCostOfSegmentBasedOnStatus(segment) {
  const status = trafficStatusCache.getStatusOfSegment(segment._id);
  if (!status || !status.velocity) {
    return segment.length;
  }
  costCount += 1;
  return (
    segment.length / (status.velocity * state.KMPERHOUR_TO_MPERSECOND_CONST)
  );
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

  startStates.forEach((s) => {
    openMap[s._id] = s;
    openQueue.push(s);
  });

  while (openQueue.length > 0) {
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
  maxLength,
  findNextStateFunc,
) {
  return findShortestPathWithCondition(
    startStates,
    endStates,
    maxLength,
    findNextStateFunc,
    {},
  );
}

async function yenAlgorithm(
  startStates,
  targetStates,
  startStatesManhattan,
  endStatesManhattan,
  numberOfRoad,
  maxLength,
  findNextStatesFunc,
  findNextStatesWithManhattanFunc,
) {
  const Aset = [];

  const firstPath = await findShortestPath(
    startStates,
    targetStates,
    maxLength,
    findNextStatesFunc,
  );

  // console.log(firstPath);
  if (!firstPath) {
    return [];
  }

  const secondPath = await findShortestPath(
    startStatesManhattan,
    endStatesManhattan,
    maxLength,
    findNextStatesWithManhattanFunc,
  );

  Aset.push(firstPath);

  // console.log('check equal',_.isEqual(firstPath, secondPath));
  let isTwoPathEqual = true;
  let moreRoad = 0;

  if (secondPath && secondPath.length > 0) {
    const maxIndex = firstPath.length < secondPath.length ? firstPath.length : secondPath.length;
    for (let i = 0; i < maxIndex; i += 1) {
      if (firstPath[i]._id !== secondPath[i]._id) {
        isTwoPathEqual = false;
        break;
      }
    }
    if (!isTwoPathEqual) {
      Aset.push(secondPath);
    } else {
      moreRoad += 1;
    }
  }
  const Bset = [];

  for (let k = 1; k < numberOfRoad + moreRoad; k += 1) {
    const currentPath = Aset[k - 1];
    const stateCount = currentPath.length;

    const asyncTasks = [...Array(Math.floor(stateCount / 10)).keys()].map(
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
            for (let idx = 0; idx < rootPath.length; idx += 1) {
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
          maxLength,
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

async function findKShortestRoad(startCoord, endCoord, numberOfRoad, type) {
  const [startSegments, endSegments] = await Promise.all([
    findNearSegments(
      startCoord.lat,
      startCoord.lng,
      state.NUMBER_OF_SEGMENT_RESULT,
      200,
    ),
    findNearSegments(
      endCoord.lat,
      endCoord.lng,
      state.NUMBER_OF_SEGMENT_RESULT,
      200,
    ),
  ]);
  let maxLength = 0;
  const straightDistance = Util.getDistanceBetweenTwoCoords(
    startCoord,
    endCoord,
  );
  if (type === 'distance') {
    maxLength = 4 * straightDistance;
  } else {
    maxLength = 5 * straightDistance;
  }
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
  });
  const endStates = segmentsToStates({
    parentCost: 0,
    parentLength: 0,
    segments: endSegments,
    goalCoord: endCoord,
    getCostFunc,
    type,
  });

  const startStatesManhattan = segmentsToStatesWithManhattan({
    parentCost: 0,
    parentLength: 0,
    segments: startSegments,
    goalCoord: endCoord,
    getCostFunc,
    type,
  });
  const endStatesManhattan = segmentsToStatesWithManhattan({
    parentCost: 0,
    parentLength: 0,
    segments: endSegments,
    goalCoord: endCoord,
    getCostFunc,
    type,
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
      });
    }
    : async (currentState) => {
      const segments = await findNextSegments(currentState.segment);
      // console.log('Connect database time',currentState.segment._id, Date.now() - beforeTime);
      return segmentsToStates({
        parentCost: currentState.parentCost + currentState.cost,
        parentLength: currentState.parentLength + currentState.length,
        segments,
        goalCoord: endCoord,
        getCostFunc,
        type,
      });
    };

  const findNextStatesWithManhattan = mapCacheStatus === 'connected'
    ? async (currentState) => {
      const endNode = currentState.segment.end_node;
      const segments = await mapCache.getSegmentsByStartNode(endNode);
      return segmentsToStatesWithManhattan({
        parentCost: currentState.parentCost + currentState.cost,
        parentLength: currentState.parentLength + currentState.length,
        segments,
        goalCoord: endCoord,
        getCostFunc,
        type,
      });
    }
    : async (currentState) => {
      const segments = await findNextSegments(currentState.segment);
      return segmentsToStatesWithManhattan({
        parentCost: currentState.parentCost + currentState.cost,
        parentLength: currentState.parentLength + currentState.length,
        segments,
        goalCoord: endCoord,
        getCostFunc,
        type,
      });
    };

  return yenAlgorithm(
    startStates,
    endStates,
    startStatesManhattan,
    endStatesManhattan,
    numberOfRoad,
    maxLength,
    findNextStates,
    findNextStatesWithManhattan,
    type,
  );
}

function pathToDirections(path) {
  let time = 0;
  const coords = path.path.map((item) => {
    const { segment } = item;
    let status = trafficStatusCache.getStatusOfSegment(segment._id);
    const velocity = status && status.velocity ? status.velocity : 40;
    if (!status || !status.velocity) {
      status = {
        velocity,
        source: 'base-data',
        color: Util.velocityToColor(velocity),
      };
    } else {
      status.color = Util.velocityToColor(velocity);
    }
    time += segment.length / (velocity * state.KMPERHOUR_TO_MPERSECOND_CONST);
    return {
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
      status: status || {},
    };
  });
  return {
    _id: path._id,
    distance: path.cost,
    time: (time / 60).toFixed(4),
    coords,
  };
}

async function routing(startCoord, endCoord, type) {
  try {
    Logger.info('Start direct');
    const paths = await findKShortestRoad(startCoord, endCoord, 1, type);
    if (!paths) {
      return [];
    }
    Logger.info('Found %d path', paths.length);
    Logger.info('Count', costCount);
    costCount = 0;
    return paths.map((item) => pathToDirections(item));
  } catch (error) {
    Logger.error('Direct error %o', error);
    throw new BaseError(ErrorType.internalServerError);
  }
}

module.exports = {
  findNearSegments,
  routing,
};
