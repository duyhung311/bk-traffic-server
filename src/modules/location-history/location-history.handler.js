const database = require('../../core/database');
const modelNames = require('../../config/model-names');
const { BaseError, ErrorType } = require('../../core/error');
const segmentService = require('../map/services/segment');

async function createHistory(_data) {
  const data = _data;
  if (!data.segment) {
    const segments = await segmentService.findNearSegments(data.lat, data.lng, 1, 200);
    if (segments.length > 0) {
      data.segment = segments[0]._id;
      data.street_id = segments[0].street;
    } else {
      throw new BaseError(ErrorType.badRequest).setMessage('Location is not in street');
    }
  }
  if (!data.street) {
    const segment = await database.findOne(modelNames.segment, { _id: data.segment }, 'street');
    if (!segment) {
      throw new BaseError(ErrorType.badRequest).setMessage('Not found segment');
    }
    data.street_id = segment.street._id;
    data.street_type = segment.street.type;
  }
  return database.create(modelNames.locationHistory, data);
}

module.exports = {
  createHistory,
};
