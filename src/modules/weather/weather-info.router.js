const express = require('express');

const router = express.Router();
const controller = require('./weather-info.controller');

router.get(
  '/weather-info/get-info',
  controller.getWeatherInfo,
);


module.exports = router;
