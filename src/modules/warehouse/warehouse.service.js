const database = require('../../core/database');
const modelNames = require('../../config/model-names');

function findOne(query, populate) {
  return database.findOne(modelNames.warehouse, query, populate);
}
function insertOne(data) {
  return database.create(modelNames.warehouse, data);
}
function updateOne(query, data) {
  return database.updateOne(modelNames.warehouse, query, data);
}
module.exports = {
  updateOne,
  findOne,
  insertOne,
};
