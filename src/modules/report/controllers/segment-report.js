/* eslint-disable no-await-in-loop */
const _ = require('lodash');
const cliProgress = require('cli-progress');
const MapModule = require('../../map');
const Validator = require('../../../core/validator');
const Logger = require('../../../core/logger');
const {
  Reason, BaseError, ErrorType, CodeError,
} = require('../../../core/error');
const { ResponseFactory } = require('../../../core/response');
const state = require('../../../state');
const Service = require('../services');
const UserModel = require('../../user');
const PeriodModule = require('../../period');
const currentLocationUpdater = require('../../notification/update-current-location-handler');

let isFakingData = false;
let fakingDataInterval;
let fakingDataTime = 300000;
let fakingLat = 10.7733743;
let fakingLng = 106.6606193;
let fakingExpire = 0;

async function findCurrentReportsByLocation(req, res, next) {
  try {
    const { lat, lng } = req.query;
    const error = {};
    let result = Validator.checkLatitude(lat);
    if (result) {
      error.lat = result;
    }
    result = Validator.checkLongitude(lng);
    if (result) {
      error.lng = result;
    }
    if (!_.isEmpty(error)) {
      const response = new BaseError(ErrorType.badRequest);
      for (const [key, value] of Object.entries(error)) {
        response.addError(key, value);
      }

      response.send(res);
      return;
    }

    const reports = await Service.SegmentReport.findCurrentReportsByLocation(
      lat,
      lng,
    );
    ResponseFactory.success(reports).send(res);
  } catch (error) {
    next(error);
  }
}

async function findReportsBySegment(req, res, next) {
  const rawQuery = req.query;
  try {
    const error = {};
    if (!rawQuery.segmentId) {
      error.segmentId = Reason.required;
    }
    if (!_.isEmpty(error)) {
      const response = new BaseError(ErrorType.badRequest);
      for (const [key, value] of Object.entries(error)) {
        response.addError(key, value);
      }

      response.send(res);
      return;
    }

    const time = rawQuery.time && new Date(parseInt(rawQuery.time, 10)).getTime();
    let period;
    if (!time || Number.isNaN(time)) {
      period = await PeriodModule.Service.getLastUpdatedPeriod();
    } else {
      period = await PeriodModule.Service.getPeriodOfTime(time);
    }
    const reports = await Service.SegmentReport.findReportsBySegment(
      period,
      rawQuery.segmentId,
    );
    ResponseFactory.success(reports).send(res);
  } catch (error) {
    next(error);
  }
}

async function getReportDetail(req, res, next) {
  try {
    const { id } = req.query;
    if (!Validator.isDatabaseId(id)) {
      new BaseError(ErrorType.badRequest)
        .addError('id', Reason.invalid)
        .send(res);
      return;
    }

    const result = await Service.SegmentReport.findOne({ _id: id }, [
      'segment',
      'user',
    ]);
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function getFakeReportStatus(req, res, next) {
  try {
    ResponseFactory.success({
      isFakingData,
      fakingDataTime,
      fakingLat,
      fakingLng,
    }).send(res);
  } catch (error) {
    next(error);
  }
}

async function fakeReport() {
  if (Date.now() > fakingExpire) {
    if (fakingDataInterval) {
      clearInterval(fakingDataInterval);
    }
    fakingDataInterval = null;
    isFakingData = false;
    return;
  }
  try {
    const bar1 = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic,
    );
    let page = 0;
    const limit = 500;
    const query = {
      polyline: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [fakingLng, fakingLat] },
          $minDistance: 0,
          $maxDistance: 2000, // 2km
        },
      },
    };
    const segmentCount = await MapModule.Service.Segment.count(query);
    Logger.info(
      'Start fake data, total page = %d',
      Math.floor(segmentCount / limit),
    );

    // start the progress bar with a total value of 200 and start value of 0
    bar1.start(Math.floor(segmentCount / limit), 0);

    const currentPeriod = await PeriodModule.Service.getCurrentPeriod();
    if (!currentPeriod) {
      return;
    }
    while (true) {
      const segments = await MapModule.Service.Segment.findMany(query, {
        limit,
        skip: page * limit,
      });

      if (segments.length === 0) {
        Logger.info('Finish fake data');
        break;
      }

      const reports = segments.map((segment) => {
        const startNode = segment.polyline.coordinates[0];
        const endNode = segment.polyline.coordinates[1];
        const centerLat = (startNode[1] + endNode[1]) / 2;
        const centerLng = (startNode[0] + endNode[0]) / 2;
        const velocity = Math.round(Math.random() * 40);
        return {
          user: '5dc3e711a6da9a3b2cebc1bb', // user khanhtran - test user
          segment: segment.id,
          velocity,
          description: 'fake-data',
          images: [],
          causes: [],
          center_point: {
            type: 'Point',
            coordinates: [centerLng, centerLat],
          },
          period_id: currentPeriod._id,
        };
      });
      await Service.SegmentReport.insertMany(reports);
      page += 1;
      bar1.update(page);
    }
    Logger.info('Fake data finished');

    // stop the progress bar
    bar1.stop();
  } catch (error) {
    Logger.error('fake data error %o', error);
  }
}

async function startFakeReport(req, res, next) {
  fakingExpire = Date.now() + 30 * 60000; // 30m
  try {
    if (req.body.isFakingData && req.body.isFakingData === 'true') {
      if (fakingDataInterval) {
        clearInterval(fakingDataInterval);
      }
      if (parseInt(req.body.fakingDataTime, 10) > 0) {
        fakingDataTime = parseInt(req.body.fakingDataTime, 10);
      }
      const lat = parseFloat(req.body.lat);
      const lng = parseFloat(req.body.lng);
      if (!Validator.checkLatitude(lat)) {
        fakingLat = lat;
      }
      if (!Validator.checkLongitude(lng)) {
        fakingLng = lng;
      }
      fakeReport();
      isFakingData = true;
      fakingDataInterval = setInterval(fakeReport, fakingDataTime);
    } else {
      if (fakingDataInterval) {
        clearInterval(fakingDataInterval);
      }
      fakingDataInterval = null;
      isFakingData = false;
    }
    ResponseFactory.success({
      isFakingData,
      fakingDataTime,
    }).send(res);
  } catch (error) {
    next(error);
  }
}

async function reportCurrentLocation(req, res, next) {
  try {
    const allowFields = [
      'token',
      'currentLat',
      'currentLng',
      'nextLat',
      'nextLng',
      'velocity',
      'description',
      'weather',
      'images',
      'causes',
      'type',
      'path_id',
      'active',
      'is_update_current_location',
    ];
    const data = _.pick(req.body, allowFields);

    const errors = {};
    let error = Validator.checkLatitude(data.currentLat);
    if (error) {
      errors.currentLat = error;
      error = null;
    }
    error = Validator.checkLatitude(data.nextLat);
    if (error) {
      errors.nextLat = error;
      error = null;
    }
    error = Validator.checkLongitude(data.currentLng);
    if (error) {
      errors.currentLng = error;
      error = null;
    }
    error = Validator.checkLongitude(data.nextLng);
    if (error) {
      errors.nextLng = error;
      error = null;
    }
    if (!data.velocity || data.velocity < 0) {
      errors.velocity = Reason.invalid;
      error = null;
    }
    if (!_.isEmpty(errors)) {
      const response = new BaseError(ErrorType.badRequest);
      for (const [key, value] of Object.entries(errors)) {
        response.addError(key, value);
      }
      response.send(res);
      return;
    }

    const segment = await MapModule.Service.Segment.findNearSegmentWithDirect(
      { lat: data.currentLat, lng: data.currentLng },
      { lat: data.nextLat, lng: data.nextLng },
    );

    if (!segment) {
      new BaseError(ErrorType.badRequest)
        .addError('currentLat', Reason.incorrect)
        .addError('currentLng', Reason.incorrect)
        .send(res);
      return;
    }

    const startNode = segment.polyline.coordinates[0];
    const endNode = segment.polyline.coordinates[1];
    const centerLat = (startNode[1] + endNode[1]) / 2;
    const centerLng = (startNode[0] + endNode[0]) / 2;
    const currentPeriod = await PeriodModule.Service.getCurrentPeriod();
    let { user } = req;
    if (!user) {
      user = await UserModel.Service.User.findOne({
        username: state.admin.username,
      });
    }
    if (!user) {
      new BaseError(ErrorType.serviceError)
        .setMessage('Server does not init. No admin found')
        .send(res);
      return;
    }
    const report = await Service.SegmentReport.insertOne({
      user: user._id,
      segment: segment.id,
      velocity: data.velocity,
      description: data.description,
      images: data.images,
      causes: data.causes,
      weather: data.weather,
      center_point: {
        type: 'Point',
        coordinates: [centerLng, centerLat],
      },
      period_id: currentPeriod._id,
      source: data.type || 'user',
    });
    user = await UserModel.Service.User.findOne({ _id: user._id });
    report.user = user;
    report.segment = segment;

    // update current location if type is 'system' (GPS collection)
    if (data.type === 'system' && data.is_update_current_location === 'true') {
      report.updateCurrentLocationInfo = await currentLocationUpdater.updateCurrentLocation(
        {
          token: data.token,
          lat: data.nextLat,
          lng: data.nextLng,
          path_id: data.path_id,
          user: req.user,
          active: data.active,
        },
      );
    }
    ResponseFactory.success(report).send(res);
  } catch (error) {
    next(error);
  }
}

async function reportByForm(req, res, next) {
  try {
    const allowFields = [
      'currentLat',
      'currentLng',
      'nextLat',
      'nextLng',
      'velocity',
      'description',
      'weather',
      'reason',
      'option',
    ];
    const data = _.pick(req.body, allowFields);

    const errors = {};
    let error = Validator.checkLatitude(data.currentLat);
    if (error) {
      errors.currentLat = error;
      error = null;
    }
    error = Validator.checkLatitude(data.nextLat);
    if (error) {
      errors.nextLat = error;
      error = null;
    }
    error = Validator.checkLongitude(data.currentLng);
    if (error) {
      errors.currentLng = error;
      error = null;
    }
    error = Validator.checkLongitude(data.nextLng);
    if (error) {
      errors.nextLng = error;
      error = null;
    }
    if (!data.velocity || data.velocity < 0) {
      errors.velocity = Reason.invalid;
      error = null;
    }
    if (!_.isEmpty(errors)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, value] of Object.entries(errors)) {
        response.addError(key, value);
      }
      response.send(res);
      return;
    }

    const roads = await MapModule.Service.FindStreetService.findStreet(
      { lat: data.currentLat, lng: data.currentLng },
      { lat: data.nextLat, lng: data.nextLng },
      'distance',
    );

    const option = data.option ? parseInt(data.option, 10) : 0;

    if (!roads[option]) {
      new CodeError(ErrorType.badRequest)
        .addError('currentLat', Reason.incorrect)
        .addError('currentLng', Reason.incorrect)
        .send(res);
      return;
    }

    if (roads[option].distance > 1000) { // if distance greater than 1000(m) then ignore
      new CodeError({
        ...ErrorType.badRequest,
        message: 'Distance must less than 1000 (m)',
      }).send(res);
      return;
    }

    const currentPeriod = await PeriodModule.Service.getCurrentPeriod();
    let { user } = req;
    if (!user) {
      user = await UserModel.Service.User.findOne({
        username: state.admin.username,
      });
    }
    if (!user) {
      new CodeError({ ...ErrorType.serviceError, message: 'No user found' })
        .send(res);
      return;
    }

    const segmentReports = roads[option].coords.map((segment) => {
      const centerLat = (segment.lat + segment.elat) / 2;
      const centerLng = (segment.lng + segment.elng) / 2;
      return {
        user: user._id,
        segment: segment.segment_id,
        velocity: data.velocity,
        description: data.description,
        images: [],
        causes: data.reason,
        weather: data.weather,
        center_point: {
          type: 'Point',
          coordinates: [centerLng, centerLat],
        },
        period_id: currentPeriod._id,
        source: 'user',
      };
    });
    await Service.SegmentReport.insertMany(segmentReports);

    ResponseFactory.success(segmentReports).send(res);
  } catch (error) {
    next(error);
  }
}

async function multiReportByForm(req, res, next) {
  try {
    const reportData = req.body.report;
    const errors = {};
    const { user } = req;
    if (!reportData || reportData.length === 0 || reportData.length > 5) {
      new CodeError({ ...ErrorType.badRequest, message: 'Number of reports must greater than 0 and less than 6' })
        .send(res);
      return;
    }
    const segmentReports = [];
    for (let i = 0; i < reportData.length; i += 1) {
      const allowFields = [
        'segments',
        'velocity',
        'description',
        'weather',
        'causes',
      ];
      const data = _.pick(reportData[i], allowFields);
      const error = Validator.validateForMultiUserReport(data);
      if (!_.isEmpty(error)) {
        errors[`report-${i}`] = error;
      }
      if (!_.isEmpty(errors)) {
        const response = new CodeError(ErrorType.badRequest);
        for (const [key, value] of Object.entries(errors)) {
          response.addError(key, value);
        }
        response.send(res);
        return;
      }
      const currentPeriod = await PeriodModule.Service.getCurrentPeriod();
      for (const segment of data.segments) {
        try {
          const segmentData = await Service.Segment.findOne({ _id: segment });
          if (segmentData) {
            const centerLat = (segmentData.polyline.coordinates[0][1] + segmentData.polyline.coordinates[1][1]) / 2;
            const centerLng = (segmentData.polyline.coordinates[0][0] + segmentData.polyline.coordinates[1][0]) / 2;
            segmentReports.push({
              user: user._id,
              segment: segmentData._id,
              velocity: data.velocity,
              description: data.description,
              images: [],
              weather: data.weather,
              causes: data.causes,
              center_point: {
                type: 'Point',
                coordinates: [centerLng, centerLat],
              },
              period_id: currentPeriod._id,
              source: 'user',
            });
          }
        } catch (e) {
          Logger.error(e);
        }
      }
    }
    await Service.SegmentReport.insertMany(segmentReports);
    ResponseFactory.success(segmentReports).send(res);
  } catch (error) {
    next(error);
  }
}

async function fastReportByForm(req, res, next) {
  try {
    const allowFields = [
      'segments',
      'velocity',
      'description',
      'weather',
      'causes',
    ];
    const data = _.pick(req.body, allowFields);
    const { user } = req;
    const segmentReports = [];
    const errors = Validator.validateForMultiUserReport(data);
    if (!_.isEmpty(errors)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, value] of Object.entries(errors)) {
        response.addError(key, value);
      }
      response.send(res);
      return;
    }
    const currentPeriod = await PeriodModule.Service.getCurrentPeriod();
    for (const segment of data.segments) {
      try {
        const segmentData = await Service.Segment.findOne({ _id: segment });
        if (segmentData) {
          const centerLat = (segmentData.polyline.coordinates[0][1] + segmentData.polyline.coordinates[1][1]) / 2;
          const centerLng = (segmentData.polyline.coordinates[0][0] + segmentData.polyline.coordinates[1][0]) / 2;
          segmentReports.push({
            user: user._id,
            segment: segmentData._id,
            velocity: data.velocity,
            description: data.description,
            images: [],
            weather: data.weather,
            causes: data.causes,
            center_point: {
              type: 'Point',
              coordinates: [centerLng, centerLat],
            },
            period_id: currentPeriod._id,
            source: 'user',
          });
        }
      } catch (error) {
        Logger.error(error);
      }
    }
    await Service.SegmentReport.insertMany(segmentReports);
    ResponseFactory.success(segmentReports).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  user: {
    findCurrentReportsByLocation,
    findReportsBySegment,
    getReportDetail,
    getFakeReportStatus,
    startFakeReport,
    reportCurrentLocation,
    reportByForm,
    multiReportByForm,
    fastReportByForm,
  },
};
