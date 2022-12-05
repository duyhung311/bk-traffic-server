const database = require('../../core/database');
const modelNames = require('../../config/model-names');

async function updateOne(query, data) {
  return database.updateOne(modelNames.feedback, query, data);
}

async function findOne(query, populate) {
  return database.findOne(modelNames.feedback, query, populate);
}

async function findMany(query) {
  return database.findMany(modelNames.feedback, query, { _id: -1 }, null, null, null);
}

async function insertOne(data) {
  return database.create(modelNames.feedback, data);
}

module.exports = {
  updateOne,
  findOne,
  insertOne,
  findMany,
};
