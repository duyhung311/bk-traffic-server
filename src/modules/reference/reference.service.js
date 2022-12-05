const database = require('../../core/database');
const Model = require('./reference.model');

function findOne(query, populate) {
  return database.findOne(Model.Name, query, populate);
}

function findMany(query) {
  return database.findMany(Model.Name, query);
}

function insertOne(data) {
  return database.create(Model.Name, data);
}

function insertOrUpdateOne(query, data) {
  return database.updateOneOrCreate(Model.Name,
    query,
    data);
}

function updateOne(query, data) {
  return database.updateOne(Model.Name,
    query,
    data);
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  insertOrUpdateOne,
  updateOne,
};
