const mongoose = require('mongoose');
const database = require('../../core/database');
const modelNames = require('../../config/model-names');

function findOne(query, populate) {
  return database.findOne(modelNames.period, query, populate);
}

function findMany(query, populate) {
  return database.findMany(
    modelNames.period,
    query,
    null,
    null,
    null,
    populate,
  );
}

function insertOne(data) {
  return database.create(modelNames.period, data);
}

function insertOrUpdateOne(query, data) {
  return database.updateOneOrCreate(modelNames.period, query, data);
}

function updateOne(query, data) {
  return database.updateOne(modelNames.period, query, data);
}

function getCurrentPeriod() {
  return mongoose.model(modelNames.period).findOne({ end_time: -1 });
}

async function getLastUpdatedPeriod() {
  const model = mongoose.model(modelNames.period);
  const result = await model
    .find()
    .limit(2)
    .sort({ start_time: -1 });
  if (result.length > 1) {
    return result[1];
  }
  return null;
}

async function getPeriodOfTime(time) {
  const date = new Date(time);
  if (date > 0) {
    const query = {
      start_time: { $lte: date },
      $or: [{ end_time: { $gte: date } }, { end_time: -1 }],
    };
    return mongoose.model(modelNames.period).findOne(query);
  }
  return null;
}

async function init() {
  const current = await getCurrentPeriod();
  if (!current) {
    await insertOne({
      start_time: Date.now(),
      end_time: -1,
    });
  }
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  insertOrUpdateOne,
  updateOne,
  getCurrentPeriod,
  getLastUpdatedPeriod,
  init,
  getPeriodOfTime,
};
