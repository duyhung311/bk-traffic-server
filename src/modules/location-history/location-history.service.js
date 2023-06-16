const mongoose = require('mongoose');
const database = require('../../core/database');
const modelNames = require('../../config/model-names');
const utils = require('../../core/utils');
const setting = require('../../config/setting');

function findOne(query, populate) {
  return database.findOne(modelNames.locationHistory, query, populate);
}

function findMany(query, populate) {
  return database.findMany(
    modelNames.locationHistory,
    query,
    null,
    null,
    null,
    populate,
  );
}

function insertOne(data) {
  return database.create(modelNames.locationHistory, data);
}

function insertOrUpdateOne(query, data) {
  return database.updateOneOrCreate(modelNames.locationHistory, query, data);
}

function updateOne(query, data) {
  return database.updateOne(modelNames.locationHistory, query, data);
}

async function findPaths(query) {
  const histories = await mongoose
    .model(modelNames.locationHistory)
    .find(query)
    .sort({ createdAt: 1 });

  const paths = [];
  const tokenTimePair = {
    /**
     * token: {
     *  lastPath: [history item],
     *  lastTime: timestamp
     * }
     */
  };
  histories.forEach((history) => {
    const { token } = history;
    const time = history.createdAt.getTime();
    const current = tokenTimePair[token];
    if (!current) {
      tokenTimePair[token] = {
        lastPath: [history],
        lastTime: time,
      };
    } else if (time - current.lastTime > setting.maxTimeBetweenTwoPaths) {
      if (current.lastPath.length > 1) {
        paths.push({ token, path: current.lastPath });
      }
      tokenTimePair[token] = {
        lastPath: [history],
        lastTime: time,
      };
    } else {
      current.lastPath.push(history);
      current.lastTime = time;
    }
  });
  for (const [key, value] of Object.entries(tokenTimePair)) {
    if (value && value.lastPath.length > 1) {
      paths.push({
        token: key,
        path: value.lastPath,
      });
    }
  }

  return paths.map((item, idx) => {
    let distance = 0;
    for (let i = 0; i < item.path.length - 1; i += 1) {
      const coord1 = item.path[i];
      const coord2 = item.path[i + 1];
      distance += utils.getDistanceBetweenTwoCoords(coord1, coord2);
    }
    paths[idx].distance = distance;
    return item;
  });
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  insertOrUpdateOne,
  updateOne,
  findPaths,
};
