const _ = require('lodash');
const { Reason, ErrorType, CodeError } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const vohService = require('./voh.service');
const validator = require('../../core/validator');
const mapService = require('../map/services');

async function addVohAddresses(req, res, next) {
  const { data } = req.body;
  if (!_.isArray(data)) {
    new CodeError(ErrorType.badRequest)
      .addError('data', Reason.invalid)
      .send(res);
    return;
  }
  try {
    const docs = [];
    data.forEach((item) => {
      const addressId = item.address_id;
      const segments = item.segments || [];
      if (addressId) {
        segments.forEach((segmentId) => {
          docs.push({
            address_id: addressId,
            segment_id: segmentId,
            name: item.name,
          });
        });
      }
    });
    await vohService.insertMany(docs);
    ResponseFactory.success().send(res);
  } catch (error) {
    next(error);
  }
}

async function findAddressesFromCoords(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const error = {};
    let coordError = validator.checkLatitude(lat);
    if (coordError) {
      error.lat = coordError;
    }
    coordError = validator.checkLongitude(lng);
    if (coordError) {
      error.lng = coordError;
    }
    if (!_.isEmpty(error)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, value] of Object.entries(error)) {
        response.addError(key, value);
      }
      response.send(res);
      return;
    }
    const nearSegments = await mapService.Segment.findNearSegments(lat, lng, 50, 200);
    if (nearSegments.length > 0) {
      const ids = nearSegments.map((item) => item._id);
      const result = await vohService.findMany({
        segment_id: { $in: ids },
      });
      const addresses = {};
      result.forEach((item) => {
        if (addresses[item.address_id]) {
          addresses[item.address_id].segments.push(item.segment_id);
        } else {
          addresses[item.address_id] = {
            address_id: item.address_id,
            name: item.name,
            segments: [item.segment_id],
          };
        }
      });
      const addressList = Object.values(addresses);
      ResponseFactory.success(addressList).send(res);
    } else {
      ResponseFactory.success([]).send(res);
    }
  } catch (error) {
    next(error);
  }
}

async function getNewsFromVOH(req, res, next) {
  try {
    const news = await vohService.getNewsFromVOH();
    ResponseFactory.success(news).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  user: {
    addVohAddresses,
    findAddressesFromCoords,
  },
  getNewsFromVOH,
};
