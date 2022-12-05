const database = require('../../core/database');
const modelNames = require('../../config/model-names');

function findOne(query, populate) {
  return database.findOne(modelNames.card, query, populate);
}
function insertOne(data) {
  return database.create(modelNames.card, data);
}
function updateOne(query, data) {
  return database.updateOne(modelNames.card, query, data);
}
async function findMany(query) {
  return database.findMany(modelNames.card, query, { status: -1 }, null, null, null);
}
function deleteOne(query) {
  return database.deleteOne(modelNames.card, query);
}
module.exports = {
  updateOne,
  findOne,
  insertOne,
  findMany,
  deleteOne,
};
