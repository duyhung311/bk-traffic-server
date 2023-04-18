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
const Util = require('../util/read-pbf');
const Logger = require('../../../core/logger');

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
    console.log("roads: ", roads);
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

async function readPbf(req, res, next) {
  Logger.info("RECIEVE REQ TO READ PBF");
  let {nodeList, nodeCount, wayList,wayCount, relationList, relationCount} = await Util.readPbf();
  await Service.OsmService.insertData({nodeList, wayList, relationList});
  let message = `Import success with ${nodeCount} nodes ${wayCount} ways ${relationCount} relations`;
  ResponseFactory.success(message).send(res);
}

async function getNewWayFromBound(req, res, next) {
  try {
    Logger.info('RECIEVE REQ TO GET WAY FROM BOUND');
    const allowedField = ['newBound', 'oldBound'];
    const data = _.pick(req.body, allowedField);
    let newBound = await Service.OsmService.getWayAndNodeFromBound(data.newBound);
    let nodesFromNewBound = newBound.nodes;
    if (!isSameBoundingBox(data.newBound, data.oldBound)) {
        let oldBound = await Service.OsmService.getWayAndNodeFromBound(data.oldBound);
        let newWayId = [];
        console.log(newBound.newWaySet.size, oldBound.newWaySet.size);
        newBound.newWaySet.forEach((e) => {
          if (!oldBound.newWaySet.has(e)) {
            newWayId.push(e);
          }
        })
        let wayFromNewBound = await Service.OsmService.getWays(newWayId);
        return ResponseFactory.success({ nodesFromNewBound, wayFromNewBound, isChanging: true}).send(res);
    }
    return ResponseFactory.success({nodesFromNewBound, wayFromNewBound:[], isChanging: false}).send(res);
  }
  catch (err) {
    console.log(err);
    return ResponseFactory.error(err).send(res);
  }
}

function isSameBoundingBox(box1, box2) {
  return box1.topleft.lat == box2.topleft.lat &&
         box1.topleft.lon == box2.topleft.lon &&
         box1.botrght.lat == box2.botrght.lat &&
         box1.botrght.lon == box2.botrght.lon 
}

module.exports = {
  user: {
    findNear,
    direct,
    findStreet,
    dynamicRouting,
    getCurrentCapacity,
    readPbf,
    getNewWayFromBound,
  },
  admin: {},
};

// lat <= BOTRGHT_HCM[0] && 
//                 lat >= TOPLEFT_HCM[0] &&
//                 lng >= BOTRGHT_HCM[1] && 
//                 lng <= TOPLEFT_HCM[1];
