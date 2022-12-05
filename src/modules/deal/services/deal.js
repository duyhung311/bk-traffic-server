const Database = require('../../../core/database');
const Model = require('../models');

function findMany(query, sort, limit, populate) {
  return Database.findMany(Model.Deal.Name, query, sort, limit, null, populate);
}
function findOne(query, populate) {
  return Database.findOne(Model.Deal.Name, query, populate);
}
async function insertOne(data) {
  return Database.create(Model.Deal.Name, data);
}

module.exports = {
  findMany,
  findOne,
  insertOne,
};
