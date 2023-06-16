const _ = require('lodash');
const Validator = require('../../../core/validator');
const Database = require('../../../core/database');
const Model = require('../models');
const periodModule = require('../../period');

function validate(data) {
  const allowFields = ['user', 'segment', 'velocity', 'description', 'weather', 'causes'];

  const existedFields = [];
  const newData = {};
  allowFields.forEach((key) => {
    if (typeof data[key] !== 'undefined') {
      existedFields.push(key);
      newData[key] = data[key];
    }
  });

  return Validator.validate(
    _.pick(Model.SegmentReport.ValidateSchema, existedFields),
    newData,
    existedFields,
  );
}

async function findMany(query, sort, limit, skip, populate, select = null) {
  return Database.findMany(
    Model.SegmentReport.Name,
    query,
    sort,
    limit,
    skip,
    populate,
    select,
  );
}

async function insertOne(data) {
  const { error } = validate(data);
  if (error) {
    throw error;
  }

  return Database.create(Model.SegmentReport.Name, data);
}

async function insertMany(data) {
  return Database.insertMany(Model.SegmentReport.Name, data);
}

async function findCurrentReportsByLocation(lat, lng) {
  const period = await periodModule.Service.getCurrentPeriod();
  const query = {
    center_point: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $minDistance: 0,
        $maxDistance: 5000,
      },
    },
    period_id: period._id,
    source: 'user',
  };
  return Database.findMany(
    Model.SegmentReport.Name,
    query,
    { createdAt: -1 },
    300,
    null,
    ['user', 'segment'],
  );
}

async function findReportsBySegment(period, segmentId) {
  if (!period) {
    return [];
  }
  const query = {
    period_id: period._id,
    segment: segmentId,
    source: 'user',
  };
  return Database.findMany(
    Model.SegmentReport.Name,
    query,
    { createdAt: -1 },
    300,
    null,
    ['user', 'segment'],
  );
}

function findOne(query, populate) {
  return Database.findOne(Model.SegmentReport.Name, query, populate);
}

module.exports = {
  validate,
  findMany,
  insertOne,
  findCurrentReportsByLocation,
  findReportsBySegment,
  findOne,
  insertMany,
};
