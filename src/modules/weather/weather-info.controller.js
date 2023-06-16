const { ResponseFactory } = require('../../core/response');
const Logger = require('../../core/logger');
const weatherCache = require('./weather-info.cache');

async function getWeatherInfo(req, res, next) {
  try {
    const startAt = Date.now();
    const performanceTime = {};
    
    result = await weatherCache.getWeatherInfo();

    performanceTime.totalTime = Date.now() - startAt;
    ResponseFactory.success(result)
      .setField('performance', performanceTime)
      .send(res);
  } catch (error) {
    Logger.error(error.message);
    next(error);
  }
}

module.exports = {
  getWeatherInfo
};
