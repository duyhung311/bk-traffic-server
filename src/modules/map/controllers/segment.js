const _ = require('lodash');
const Validator = require('../../../core/validator');
const {
  Reason,
  CodeError,
  ErrorType,
} = require('../../../core/error');
const { ResponseFactory } = require('../../../core/response');
const state = require('../../../state');
const Service = require('../services');

async function findNear(req, res, next) {
  try {
    const { lat, lng } = req.query;

    const error = {};
    if (Validator.checkLatitude(lat)) {
      error.lat = Validator.checkLatitude(lat);
    }
    if (Validator.checkLongitude(lng)) {
      error.lng = Validator.checkLongitude(lng);
    }

    let limit = state.NUMBER_OF_SEGMENT_RESULT;
    if (typeof req.query.limit !== 'undefined') {
      limit = parseInt(req.query.limit, 10);
      if (Number.isNaN(limit) || limit < 1) {
        error.limit = {
          ...Reason.invalid,
          message: 'Limit must be a positive number',
        };
      }
    }

    let maxDistance = state.SEARCH_DISTANCE;
    if (typeof req.query.max_distance !== 'undefined') {
      maxDistance = parseInt(req.query.max_distance, 10);
      if (Number.isNaN(maxDistance) || maxDistance < 1) {
        error.max_distance = {
          ...Reason.invalid,
          message: 'max_distance must be a positive number',
        };
      }
    }

    if (!_.isEmpty(error)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, val] of Object.entries(error)) {
        response.addError(key, val);
      }
      response.send(res);
      return;
    }

    const result = await Service.Segment.findNearSegments(
      lat,
      lng,
      limit,
      maxDistance,
    );
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function direct(req, res, next) {
  try {
    const { slat, slng, elat, elng, type } = req.query;
    const error = {};
    if (Validator.checkLatitude(slat)) {
      error.slat = Validator.checkLatitude(slat);
    }

    if (Validator.checkLongitude(slng)) {
      error.slng = Validator.checkLongitude(slng);
    }
    if (Validator.checkLatitude(elat)) {
      error.elat = Validator.checkLatitude(elat);
    }

    if (Validator.checkLongitude(elng)) {
      error.elng = Validator.checkLongitude(elng);
    }
    if (type != 'distance' && type != 'time') {
      error.type = Reason.invalid;
    }
    if (!_.isEmpty(error)) {
      const response = new BaseError(ErrorType.badRequest);
      for (let key in error) {
        response.addError(key, error[key]);
      }
      response.send(res);
      return;
    }

    const roads = await Service.Segment.direct(
      { lat: slat, lng: slng },
      { lat: elat, lng: elng },
      type
    );
    roads.sort((a, b) => {
      if (type === 'distance') {
        return a.distance - b.distance;
      } else {
        return a.time - b.time;
      }
    });
    ResponseFactory.success(roads).send(res);
  } catch (error) {
    next(error);
  }
}


async function findStreet(req, res, next) {
  try {
    const {
      slat, slng, elat, elng, type, n,
    } = req.query;
    const error = {};
    if (Validator.checkLatitude(slat)) {
      error.slat = Validator.checkLatitude(slat);
    }
    if (Validator.checkLongitude(slng)) {
      error.slng = Validator.checkLongitude(slng);
    }
    if (Validator.checkLatitude(elat)) {
      error.elat = Validator.checkLatitude(elat);
    }
    if (Validator.checkLongitude(elng)) {
      error.elng = Validator.checkLongitude(elng);
    }
    if (type !== 'distance' && type !== 'time') {
      error.type = Reason.invalid;
    }
    if (!_.isEmpty(error)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, val] of Object.entries(error)) {
        response.addError(key, val);
      }
      response.send(res);
      return;
    }

    const roads = await Service.FindStreetService.findStreet(
      { lat: slat, lng: slng },
      { lat: elat, lng: elng },
      parseInt(n, 10),
      type,
    );
    ResponseFactory.success(roads).send(res);
  } catch (error) {
    next(error);
  }
}

async function dynamicRouting(req, res, next) {
  try {
    const {
      slat, slng, elat, elng, type, n,
    } = req.query;
    const error = {};
    if (Validator.checkLatitude(slat)) {
      error.slat = Validator.checkLatitude(slat);
    }
    if (Validator.checkLongitude(slng)) {
      error.slng = Validator.checkLongitude(slng);
    }
    if (Validator.checkLatitude(elat)) {
      error.elat = Validator.checkLatitude(elat);
    }
    if (Validator.checkLongitude(elng)) {
      error.elng = Validator.checkLongitude(elng);
    }
    if (type !== 'distance' && type !== 'time') {
      error.type = Reason.invalid;
    }
    if (!_.isEmpty(error)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, val] of Object.entries(error)) {
        response.addError(key, val);
      }
      response.send(res);
      return;
    }

    const roads = await Service.DynamicRouting.dynamicRouting(
      { lat: slat, lng: slng },
      { lat: elat, lng: elng },
      parseInt(n, 10),
      type,
    );
    ResponseFactory.success(roads).send(res);
  } catch (error) {
    next(error);
  }
}

/*
 * Temporary APIs to test segment routing capacity**********************************************
 */
async function getCurrentCapacity(req, res, next) {
  try {
    const { id } = req.query;
    const currentCapacity = Service.Segment.getCurrentCapacity(id, Date.now() - 30000, 30);

    ResponseFactory.success({
      segmentId: id,
      currentCapacity,
    }).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  user: {
    findNear,
    direct,
    findStreet,
    dynamicRouting,
    getCurrentCapacity,
  },
  admin: {},
};
