const database = require('../../core/database');
const modelNames = require('../../config/model-names');

function findPathHistory(query, populate) {
  return database.findOne(modelNames.pathHistory, query, populate);
}

function findPathHistories(query) {
  return database.findMany(modelNames.pathHistory, query);
}

function insertPathHistory(data) {
  return database.create(modelNames.pathHistory, data);
}

module.exports = {
  insertPathHistory,
  findPathHistories,
  findPathHistory,
};
