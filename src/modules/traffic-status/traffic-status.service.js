require('./base-status.model');
require('./traffic-status.model');
const mongoose = require('mongoose');

const database = require('../../core/database');
const modelName = require('../../config/model-names');
const trafficStatusCache = require('./traffic-status.cache');

function findOne(query, populate) {
  return database.findOne(modelName.segmentStatus, query, populate);
}

function findMany(query, { populate, limit } = {}) {
  return database.findMany(
    modelName.segmentStatus,
    query,
    null,
    limit,
    null,
    populate,
  );
}

function insertOne(data) {
  return database.create(modelName.segmentStatus, data);
}

function findBaseStatus(query) {
  return database.findMany(modelName.baseSegmentStatus, query);
}

async function updateMainTrafficStatus() {
  const latestStatus = await mongoose.model(modelName.trafficStatus).findOne({ source: { $nin: ['AD', 'VOH'] } })
    .sort({ createdAt: -1 });

  const query = {
    velocity: { $gte: 5, $lte: 80 },
  };
  if (latestStatus && latestStatus.createdAt) {
    query.createdAt = { $gt: latestStatus.createdAt };
  }
  const segmentReports = await mongoose.model(modelName.segmentReport)
    .find(query)
    .select({
      causes: 1, source: 1, user: 1, segment: 1, velocity: 1, createdAt: 1,
    });

  for (const segmentReport of segmentReports) {
    const segmentStatus = {
      velocity: segmentReport.velocity,
      segment_id: segmentReport.segment,
      active_time: 60 * 60, // 1 hour
      source: segmentReport.source === 'system' ? 'GPS' : segmentReport.source,
      expireAt: new Date(new Date(segmentReport.createdAt).getTime() + 60 * 60 * 1000),
      description: segmentReport.causes[0],
      createdAt: segmentReport.createdAt,
      updatedAt: segmentReport.createdAt,
    };
    await mongoose.model(modelName.trafficStatus).create(segmentStatus);

    // update cache
    const key = `${segmentReport.segment}_${segmentReport.source}`;
    const mainTrafficStatus = trafficStatusCache.getMainStatusOfSegment(key);
    if (!mainTrafficStatus || segmentStatus.updatedAt > mainTrafficStatus.updatedAt) {
      trafficStatusCache.updateHashMapMainStatus(segmentStatus);
    }
  }
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  findBaseStatus,
  updateMainTrafficStatus,
};
