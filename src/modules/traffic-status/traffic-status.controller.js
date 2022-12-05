const mongoose = require('mongoose');
const { ResponseFactory } = require('../../core/response');
const Logger = require('../../core/logger');
const Validator = require('../../core/validator');
const utils = require('../../core/utils');
const state = require('../../state');
const periodModule = require('../period');
const GetTrafficStatusDto = require('./dto/get-traffic-status');
const setting = require('../../config/setting');
const modelNames = require('../../config/model-names');
const trafficCache = require('./traffic-status.cache');

async function getTrafficStatus(req, res, next) {
  try {
    const startAt = Date.now();
    const performanceTime = {};
    const validatedResult = Validator.validate(GetTrafficStatusDto, req.query);
    if (validatedResult.error) {
      validatedResult.error.send(res);
      return;
    }
    const rawQuery = validatedResult.value;

    const query = {};
    // const streetHash = {};
    if (rawQuery.segment_id) {
      query.segment = rawQuery.segment_id;
    } else {
      let searchDistance = 0;
      if (
        rawQuery.radius_in_meter
        && parseInt(rawQuery.radius_in_meter, 10) > 0
      ) {
        searchDistance = parseInt(rawQuery.radius_in_meter, 10);
      } else if (rawQuery.zoom) {
        searchDistance = utils.getDistanceFromZoom(rawQuery.zoom);
      }
      if (searchDistance <= 0) {
        ResponseFactory.success([]).send(res);
        return;
      }
      query.polyline = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [rawQuery.lng, rawQuery.lat],
          },
          $minDistance: 0,
          $maxDistance: searchDistance,
        },
      };
      const maxLevel = rawQuery.level > 0
        ? rawQuery.level
        : setting.getStreetLevelByDistance(searchDistance);

      query.street_level = { $lte: maxLevel };
    }

    const now = Date.now();
    const searchTime = rawQuery.time ? rawQuery.time : now;

    let selectedPeriod;
    if (searchTime > 0) {
      selectedPeriod = searchTime < now - state.updateStatusInterval
        ? await periodModule.Service.getPeriodOfTime(searchTime)
        : setting.currentPeriod;
      if (!selectedPeriod) {
        ResponseFactory.success([]).send(res);
        return;
      }
    }

    performanceTime.initQueryTime = Date.now() - startAt;

    const segments = await mongoose.model(modelNames.segment).find(query);
    performanceTime.findSegmentTime = Date.now() - startAt - performanceTime.initQueryTime;
    const result = [];

    for (const segment of segments) {
      const { sources } = state;
      let mainStatus;
      for (const source of sources) {
        const key = `${segment._id}_${source}`;
        mainStatus = trafficCache.getMainStatusOfSegment(key);
        if (mainStatus) {
          break;
        }
      }
      let velocity = 40;
      let source = 'base-data';
      const statusAdminFields = [
        'active_time',
        'velocity',
        'source',
        'updatedAt',
      ];

      // startTime and endTime is millisecond but activeTime is second
      if (
        mainStatus
        && utils.isAllowFieldOfObject(mainStatus, statusAdminFields)
        && utils.isExpiredWithTimeFrame(
          mainStatus.updatedAt.getTime(),
          searchTime,
          mainStatus.active_time * 1000,
        )
      ) {
        velocity = mainStatus.velocity;
        source = mainStatus.source;
      } else {
        const status = trafficCache.getStatusOfSegment(segment._id);
        if (!status) {
          continue;
        }
        // if (status.source == 'base-data' && rawQuery.include_user_report) {
        //   continue;
        // }
        // if (status && status.velocity) {
        //   velocity = status.velocity;
        // }
        const period = utils.getBaseStatusFieldOfTime(now);
        const los = status.segmentStatus[period];
        velocity = utils.getVelocityFromLOS(los);
        source = status.source;
      }

      // const street = streetHash[segment.street];

      result.push({
        _id: segment._id,
        polyline: segment.polyline,
        priority: 2,
        segment: segment._id,
        source,
        period_id: query.period_id,
        velocity,
        color: utils.velocityToColor(velocity),
        street: segment.street_name
          ? {
            name: segment.street_name,
            type: segment.street_type,
          }
          : {
            name: 'Không xác định',
            type: 'unclassified',
          },
      });
    }

    performanceTime.handleResultTime = Date.now()
      - startAt
      - performanceTime.initQueryTime
      - performanceTime.findSegmentTime;

    performanceTime.totalTime = Date.now() - startAt;
    ResponseFactory.success(result)
      .setField('performance', performanceTime)
      .send(res);
  } catch (error) {
    Logger.error(error.message);
    next(error);
  }
}

async function getTrafficStatusV2(req, res, next) {
  try {
    const startAt = Date.now();
    const performanceTime = {};
    // const validatedResult = Validator.validate(GetTrafficStatusDto, req.query);
    // if (validatedResult.error) {
    //   validatedResult.error.send(res);
    //   return;
    // }
    // const rawQuery = validatedResult.value;
    const rawQuery = req.query;
    const {
      NElat, NElng, WSlat, WSlng,
    } = rawQuery;
    // const NECoordinate = utils.addDistanceToCoordinate(NElat, NElng, 100, 100);
    // const WSCoordinate = utils.addDistanceToCoordinate(WSlat, WSlng, -100, -100);
    // const SECoordinate = utils.addDistanceToCoordinate(WSlat, NElng, 100, -100);
    // const WNCoordinate = utils.addDistanceToCoordinate(NElat, WSlng, -100, 100);
    const NECoordinate = [NElng, NElat];
    const WSCoordinate = [WSlng, WSlat];
    const SECoordinate = [NElng, WSlat];
    const WNCoordinate = [WSlng, NElat];
    const query = {};
    // let searchDistance = 0;
    // if (rawQuery.zoom) {
    //   searchDistance = utils.getDistanceFromZoom(rawQuery.zoom);
    // }

    // lat is y line, lng is x line
    query.polyline = {
      $geoIntersects: {
        $geometry: {
          type: 'Polygon',
          coordinates: [
            [
              WNCoordinate,
              NECoordinate,
              SECoordinate,
              WSCoordinate,
              WNCoordinate,
            ],
          ],
        },
      },
    };
    // const maxLevel = rawQuery.level > 0 ? rawQuery.level : 4;
    const maxLevel = rawQuery.level > 0
      ? rawQuery.level
      : setting.getStreetLevelByZoomLevel(rawQuery.zoom);
    query.street_level = { $lte: maxLevel };

    performanceTime.initQueryTime = Date.now() - startAt;

    const segments = await mongoose
      .model(modelNames.segment)
      .find(query)
      .select({
        _id: 1, polyline: 1, street_name: 1, street_type: 1,
      });
    performanceTime.findSegmentTime = Date.now() - startAt - performanceTime.initQueryTime;

    const result = [];

    for (const segment of segments) {
      const { sources } = state;
      let mainStatus;
      const now = Date.now();
      for (const source of sources) {
        const key = `${segment._id}_${source}`;
        mainStatus = trafficCache.getMainStatusOfSegment(key);
        if (mainStatus && mainStatus.expireAt.getTime() >= now) {
          break;
        }
      }
      let velocity = 40;
      let source = 'base-data';
      const statusFields = [
        'active_time',
        'velocity',
        'source',
        'updatedAt',
      ];

      // startTime and endTime is millisecond but activeTime is second
      if (
        mainStatus
          && utils.isAllowFieldOfObject(mainStatus, statusFields)
          && mainStatus.expireAt.getTime() >= now
      ) {
        velocity = mainStatus.velocity;
        source = mainStatus.source;
      } else {
        const status = trafficCache.getStatusOfSegment(segment._id);
        if (!status) {
          continue;
        }
        const period = utils.getBaseStatusFieldOfTime(now);
        const los = status.segmentStatus[period];
        velocity = utils.getVelocityFromLOS(los);
        source = status.source;
      }

      result.push({
        _id: segment._id,
        polyline: segment.polyline,
        priority: 2,
        segment: segment._id,
        source,
        period_id: query.period_id,
        velocity,
        color: utils.velocityToColor(velocity),
        street: segment.street_name
          ? {
            name: segment.street_name,
            type: segment.street_type,
          }
          : {
            name: 'Không xác định',
            type: 'unclassified',
          },
      });
    }

    performanceTime.handleResultTime = Date.now()
      - startAt
      - performanceTime.initQueryTime
      - performanceTime.findSegmentTime;

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
  getTrafficStatus,
  getTrafficStatusV2,
};
