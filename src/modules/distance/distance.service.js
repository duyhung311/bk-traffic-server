const _ = require('lodash');
const Validator = require('../../core/validator');
const Database = require('../../core/database');
const modelNames = require('../../config/model-names');
const SegmentReportService = require('../report/services/segment');
const distanceModel = require('./distance.model');
const { BaseError } = require('../../core/error');

async function updateOne(query, data) {
  return Database.updateOne(modelNames.distance, query, data);
}

async function insertOne(data) {
  const allowFields = ['name',
    'user',
    'distance',
    'point_received',
    'last_time_updated'];

  const pickedData = _.pick(data, allowFields).omit(_.isUndefined);
  const existedFields = Object.keys(pickedData);

  const { error, value } = Validator.validate(
    _.pick(distanceModel.ValidateSchema, existedFields),
    data,
    existedFields,
  );
  if (error) {
    throw error;
  }
  return Database.create(modelNames.distance, value);
}

async function insertOrUpdateOne(query, data) {
  return Database.updateOneOrCreate(modelNames.distance, query, data);
}
async function findMany(query, populate) {
  return Database.findMany(modelNames.distance, query, null, null, null, populate);
}

async function findOne(query, populate) {
  return Database.findOne(modelNames.distance, query, populate);
}

async function updateDistance() {
  try {
    const distances = await findMany({}, null);
    for (const ele of distances) {
      const $query = {
        user: ele.user,
        createdAt: { $gt: ele.last_time_updated },
      };
      const segmentReports = await SegmentReportService.findMany($query, null, 100, null, ['segment'], { segment: 1, createdAt: 1 });

      if (segmentReports.length > 0) {
        let distance = 0;
        let prevSegmentId = null;
        segmentReports.forEach((element) => {
          if (prevSegmentId != element.segment._id) {
            distance += element.segment.length;
          }
          prevSegmentId = element.segment._id;
        });
        await updateOne(
          { _id: ele._id },
          {
            distance: ele.distance + distance / 1000,
            last_time_updated: segmentReports[segmentReports.length - 1].createdAt,
          },
        );
      }
    }
  } catch (err) {
    throw new BaseError(err);
  }
}

module.exports = {
  updateOne,
  insertOrUpdateOne,
  insertOne,
  findMany,
  findOne,
  updateDistance,
};
