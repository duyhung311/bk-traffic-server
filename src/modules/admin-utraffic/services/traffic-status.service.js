const Validator = require('../../../core/validator');
const Database = require('../../../core/database');
const Logger = require('../../../core/logger');
const Model = require('../models');
const MapModule = require('../../map');
const modelNames = require('../../../config/model-names');
const { positionChoose } = require('../../../config/constant');
const trafficCache = require('../../traffic-status/traffic-status.cache');
const Analyxer = require('../../../core/bktraffic-analyxer');
const PeriodModule = require('../../period');
const ReportModule = require('../../report');

function findOne(query) {
  return Database.findOne(modelNames.trafficStatus, query);
}

function findMany(query) {
  return Database.findMany(modelNames.trafficStatus, query);
}

async function insertMany(data) {
  return Database.insertMany(modelNames.trafficStatus, data);
}

async function create(data) {
  return Database.create(modelNames.trafficStatus, data);
}

async function updateOneOrCreate(query, data) {
  return Database.updateOneOrCreate(
    modelNames.trafficStatus,
    query,
    data,
  );
}

async function deleteByAdminConfigId(configId) {
  return Database.deleteMany(modelNames.trafficStatus, {
    config_id: configId,
    source_id: 'AD',
  });
}

async function findSegmentIdByAdminConfigId(configId) {
  return Database.findMany(
    modelNames.trafficStatus,
    {
      config_id: configId,
      source_id: 'AD',
    },
    {},
    null,
    null,
    null,
    'segment_id createdAt',
  );
}

async function updateActiveTimeById(
  id,
  activeTime,
  expireAt,
) {
  return Database.updateOne(
    modelNames.trafficStatus,
    {
      _id: id,
      source_id: 'AD',
    },
    {
      active_time: activeTime,
      expireAt,
    },
  );
}

function validateInput(data, fields) {
  return Validator.validate(
    Model.TrafficStatus.ValidateSchema,
    data,
    fields,
  );
}

async function findSegmentByDrawType(type, options) {
  const { coordinates, radius, lineOption } = options;
  let query = {};
  let segments = [];
  if (type === 'rectangle') {
    query = {
      polyline: {
        $geoIntersects: {
          $geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [coordinates[0][1], coordinates[0][0]],
                [coordinates[1][1], coordinates[1][0]],
                [coordinates[2][1], coordinates[2][0]],
                [coordinates[3][1], coordinates[3][0]],
                [coordinates[0][1], coordinates[0][0]],
              ],
            ],
          },
        },
      },
    };
    segments = await MapModule.Service.Segment.findMany(query);
  }
  if (type === 'circle') {
    query = {
      polyline: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [coordinates[0][1], coordinates[0][0]],
          },
          $minDistance: 0,
          $maxDistance: radius,
        },
      },
    };
    segments = await MapModule.Service.Segment.findMany(query);
  }
  if (type === 'line') {
    const roads = await MapModule.Service.FindStreetService.findStreet(
      { lat: coordinates[0][0], lng: coordinates[0][1] },
      { lat: coordinates[1][0], lng: coordinates[1][1] },
      'distance',
    );
    segments = roads[lineOption || 0].coords.map((segment) => ({
      _id: segment.segment_id,
    }));
  }
  return segments;
}

async function updateOrCreateTrafficStatus(data) {
  try {
    const dataTrafficStatus = [];
    const {
      type,
      coordinates,
      velocity,
      active_time,
      description,
      causes,
      weather,
      images,
      radius,
      configId,
    } = data;
    const allowType = [
      positionChoose.rectangle,
      positionChoose.line,
      positionChoose.circle,
    ];
    if (!allowType.includes(type)) {
      return dataTrafficStatus;
    }
    const segments = await findSegmentByDrawType(type, {
      coordinates,
      radius,
      lineOption: data.option,
    });

    if (segments.length > 0) {
      const expireAt = new Date(Date.now() + active_time * 1000);
      for (const segment of segments) {
        const tempData = {
          segment_id: segment._id,
          velocity,
          active_time,
          source: 'AD',
          expireAt,
          description,
          causes,
          weather,
          images,
          config_id: configId,
        };
        dataTrafficStatus.push(tempData);
        // await updateOneOrCreate({ segment_id: segment._id }, tempData);

        // eslint-disable-next-line no-await-in-loop
        await create(tempData);

        // cache traffic status of admin
        trafficCache.updateHashMapMainStatus({
          segment_id: segment._id,
          velocity,
          active_time,
          source: 'AD',
          expireAt,
          description,
        });
      }
    }
    // await trafficCache.cacheTrafficStatus();
    return dataTrafficStatus;
  } catch (error) {
    Logger.error(error);
    return [];
  }
}

async function processSpeechReport(data) {
  const dataTrafficStatus = [];
  const {
    type,
    coordinates,
    radius,
    option,
    speechRecordId,
    configId,
    userId,
    activeTime,
    audioFile,
  } = data;

  const currentPeriod = await PeriodModule.Service.getCurrentPeriod();
  const reportData = {
    user: userId,
    period_id: currentPeriod._id,
    source: 'AD',
  };

  const allowType = [
    positionChoose.rectangle,
    positionChoose.line,
    positionChoose.circle,
  ];
  if (allowType.includes(type)) {
    const segments = await findSegmentByDrawType(type, {
      coordinates,
      radius,
      lineOption: option,
    });
    const segmentIds = segments.map((segment) => segment._id);
    reportData.segments = segmentIds;
  }

  const { error } = ReportModule.Service.SpeechReport.validate(reportData);
  if (error) throw error;

  // Enhance noise cancellation
  const dolbyUrl = `dlb://enhanced${speechRecordId}`;
  let enhancedBuffer = null;
  try {
    enhancedBuffer = await ReportModule.Service.SpeechRecord.getEnhancedSpeechRecord(dolbyUrl, speechRecordId);
  } catch (e) {
    Logger.error('[Enhance Audio]', e);
  }

  // Insert database
  await ReportModule.Service.SpeechRecord.insertOne({
    _id: speechRecordId,
    data: audioFile.buffer,
    length: audioFile.size,
    contentType: audioFile.mimetype,
    encoding: audioFile.encoding,
    dataEnhanced: enhancedBuffer,
  });

  reportData.speech_record = speechRecordId;
  const speechReport = await ReportModule.Service.SpeechReport.insertOne(reportData);
  const segmentReports = await Analyxer.processSpeechReport(speechReport._id);

  const expireAt = new Date(Date.now() + activeTime * 1000);
  for (const report of segmentReports) {
    const tempData = {
      segment_id: report.segment_id,
      velocity: report.velocity,
      active_time: activeTime,
      source: 'AD',
      description: report.description,
      causes: report.causes,
      weather: report.weather,
      expireAt,
      config_id: configId,
    };
    dataTrafficStatus.push(tempData);

    // eslint-disable-next-line no-await-in-loop
    await create(tempData);

    // cache traffic status of admin
    trafficCache.updateHashMapMainStatus({
      segment_id: report.segment_id,
      velocity: report.velocity,
      active_time: activeTime,
      source: 'AD',
      description: report.description,
      expireAt,
    });
  }

  return dataTrafficStatus;
}

module.exports = {
  findOne,
  findMany,
  insertMany,
  updateOneOrCreate,
  deleteByAdminConfigId,
  findSegmentIdByAdminConfigId,
  updateActiveTimeById,
  updateOrCreateTrafficStatus,
  validateInput,
  processSpeechReport,
};
