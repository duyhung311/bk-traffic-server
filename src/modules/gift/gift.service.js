const database = require('../../core/database');
const modelNames = require('../../config/model-names');

function findOne(query, populate) {
  return database.findOne(modelNames.gift, query, populate);
}
function insertOne(data) {
  return database.create(modelNames.gift, data);
}
function updateOne(query, data) {
  return database.updateOne(modelNames.gift, query, data);
}
function findMany(query, sort, limit, populate) {
  return database.findMany(modelNames.gift, query, sort, limit, null, populate);
}
function deleteOne(query) {
  return database.deleteOne(modelNames.gift, query);
}
module.exports = {
  updateOne,
  findOne,
  insertOne,
  findMany,
  deleteOne,
};
