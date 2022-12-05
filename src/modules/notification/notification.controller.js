const _ = require('lodash');
const request = require('request-promise');
const Service = require('./notification.service');
const { ResponseFactory } = require('../../core/response');
const Logger = require('../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../core/error');
const appState = require('../../state');
const Validator = require('../../core/validator');
const historyModule = require('../history');
const utils = require('../../core/utils');
const periodModule = require('../period');
const locationHistoryHandler = require('../location-history/location-history.handler');

// Không sử dụng => sử dụng "updateCurrentLocation" trong update-current-location-handler.js
async function updateCurrentLocation(req, res, next) {
  try {
    const {
      token, lat, lng, path_id, segment_id,
    } = req.body;
    const active = !(typeof (req.body.active) !== 'undefined' && req.body.active == 'false');
    const error = {};
    if (!token || token === '') {
      error.token = Reason.required;
    }

    if (active) {
      let result = Validator.checkLatitude(lat);
      if (result) {
        error.lat = result;
      }
      result = Validator.checkLongitude(lng);
      if (result) {
        error.lng = result;
      }
    }
    if (!_.isEmpty(error)) {
      const response = new BaseError(ErrorType.badRequest);
      for (const key in error) {
        response.addError(key, error[key]);
      }
      response.send(res);
      return;
    }

    const data = {
      user: req.user._id,
      token,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      active,
    };
    if (Validator.isDatabaseId(path_id)) {
      const path = await historyModule.findPathHistory({ _id: path_id });
      if (path) {
        data.path = path_id;
        const { segments } = path;
        let nearSegment;
        let minDistance = Infinity;
        path.segments.forEach((item) => {
          const centerLat = (item.coordinates[0][1] + item.coordinates[1][1]) / 2;
          const centerLng = (item.coordinates[0][0] + item.coordinates[1][0]) / 2;
          const dis = utils.getDistancePow2BetweenTwoCoords({ lat: centerLat, lng: centerLng }, { lat, lng });
          if (dis <= minDistance) {
            nearSegment = item;
            minDistance = dis;
          }
        });
        if (nearSegment) {
          data.segment = nearSegment._id;
        }
      }
    }

    const currentPeriod = await periodModule.Service.getCurrentPeriod();
    data.period = currentPeriod._id;
    await locationHistoryHandler.createHistory(data);
    await Service.insertOrUpdateOne({ user: req.user._id, token }, data);
    const result = await Service.findOne({ user: req.user._id, token });
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function noticeToUsers(req, res, next) {
  Service.notifyToUser().then(() => {
    Logger.info('Notice to users successfully');
  }).catch((err) => {
    Logger.error('Notice to user error %o', err);
  });
  ResponseFactory.success().send(res);
}
module.exports = {
  updateCurrentLocation,
  noticeToUsers,
};
