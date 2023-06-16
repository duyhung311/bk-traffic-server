const Database = require('../../../core/database');
const modelNames = require('../../../config/model-names');

async function findMany(query, sort, limit, skip, populate, select = null) {
  return Database.findMany(
    modelNames.segment,
    query,
    sort,
    limit,
    skip,
    populate,
    select,
  );
}

async function insertOne(data) {
  return Database.create(modelNames.segment, data);
}

async function insertMany(data) {
  return Database.insertMany(modelNames.segment, data);
}

function findOne(query, populate) {
  return Database.findOne(modelNames.segment, query, populate);
}

module.exports = {
  findMany,
  insertOne,
  findOne,
  insertMany,
};
