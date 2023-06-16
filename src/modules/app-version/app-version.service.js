const database = require('../../core/database');
const modelNames = require('../../config/model-names');

async function updateOneOrCreate(query, data) {
  return database.updateOneOrCreate(modelNames.appVersion, query, data);
}

async function findOne(query, populate) {
  return database.findOne(modelNames.appVersion, query, populate);
}

module.exports = {
  updateOneOrCreate,
  findOne,
};
