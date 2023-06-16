/* eslint-disable no-await-in-loop */
const mongoose = require('mongoose');
const Logger = require('../../core/logger');
const modelNames = require('../../config/model-names');
const axios = require('axios');

let hashWeather = {
  // temperature: 27,
  // mainStatus: 'clouds',
  // description: 'scattered clouds',
  // humidity: 40,
  // visibility: 10000,
  // pressure: 1010,
  // clouds: 40,
  // windSpeed: 0.51
};

async function checkWeatherInfo() {
  try {
    Logger.info('Start sync weather info');
    const period = Math.floor(Date.now() / (1000*60*5));
    if (period != hashWeather['period']) {
      const weatherModel = mongoose.model(modelNames.weatherInfo);
      const weatherDB = await weatherModel
        .findOne({})
        .sort({'period': -1});
      if (!weatherDB || weatherDB.period != period) {
        Logger.info('Fetching new data from API');
        const baseOwmUrl = 'https://api.openweathermap.org/data/2.5/weather';
        const hcmLat = '10.8333';
        const hcmLng = '106.6667';
        const apiKey = process.env.OWM_API_KEY;
        const owmUrl = `${baseOwmUrl}?lat=${hcmLat}&lon=${hcmLng}&appid=${apiKey}&units=metric`
        const weatherOWM = await axios({
          method: 'GET',
          url: owmUrl
        })
          .then(res => { return res.data })
          .catch(err => Logger.error(err));
        hashWeather = {
          mainStatus: weatherOWM.weather[0].main,
          description: weatherOWM.weather[0].description,
          temperature: weatherOWM.main.temp,
          humidity: weatherOWM.main.humidity,
          pressure: weatherOWM.main.pressure,
          visibility: weatherOWM.visibility,
          clouds: weatherOWM.clouds.all,
          windSpeed: weatherOWM.wind.speed,
          period: period
        };
        weatherModel.create(hashWeather);
        hashWeather['period'] = period;
      }
      else {
        hashWeather = weatherDB;
      }
      Logger.info('Sync weather status successfully!');
    }
    return 0;
  } catch (error) {
    Logger.error('Sync weather info error %o', error);
    return -1;
  }
}


async function getWeatherInfo() {
  await checkWeatherInfo();
  return hashWeather;
}

module.exports = {
  getWeatherInfo,
  checkWeatherInfo
};
