require('./weather-info.model');

const database = require('../../core/database');
const modelName = require('../../config/model-names');
const WeatherInfoCache = require('./weather-info.cache');

function findOne(query, populate) {
  return database.findOne(modelName.weatherInfo, query, populate);
}

function findMany(query, { populate, limit } = {}) {
  return database.findMany(
    modelName.weatherInfo,
    query,
    null,
    limit,
    null,
    populate,
  );
}

async function insertOne(data) {
  return database.create(modelName.weatherInfo, data);
}

async function updateWeatherInfo() {
  await WeatherInfoCache.checkWeatherInfo();
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  updateWeatherInfo
};
