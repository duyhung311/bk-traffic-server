const _ = require('lodash');
const { error } = require('winston');
const Service = require('./notification.service');
const Validator = require('../../core/validator');
const historyModule = require('../history');
const utils = require('../../core/utils');
const periodModule = require('../period');
const locationHistoryHandler = require('../location-history/location-history.handler');

async function updateCurrentLocation(param) {
  try {
    const {
      token, lat, lng, path_id, user,
    } = param;

    const active = !(typeof (param.active) !== 'undefined' && param.active == 'false');
    if (!token || token === '') {
      return 'Update current location faild, Token is require';
    }
    const data = {
      user: user._id,
      token,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      active,
    };

    if (Validator.isDatabaseId(path_id)) {
      const path = await historyModule.findPathHistory({ _id: path_id });
      if (path) {
        data.path = path_id;
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
    } else {
      data.path = null;
    }

    const currentPeriod = await periodModule.Service.getCurrentPeriod();
    data.period = currentPeriod._id;
    await locationHistoryHandler.createHistory(data);
    await Service.insertOrUpdateOne({ user: user._id, token }, data);
    const result = await Service.findOne({ user: user._id, token });
    return result;
  } catch (error) {
    return error;
  }
}

module.exports = {
  updateCurrentLocation,
};
