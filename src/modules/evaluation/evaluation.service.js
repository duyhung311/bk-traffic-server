const _ = require('lodash');
const Validator = require('../../core/validator');
const Database = require('../../core/database');
const { Reason, BaseError, ErrorType } = require('../../core/error');
const Model = require('./evaluation.model');
const UserModule = require('../user');
const ReportModule = require('../report');
const modelName = require('../../config/model-names');

async function insertOne(inData) {
  const requiredFields = [
    'user',
    'report',
    'score',
  ];
  const data = _.pick(inData, requiredFields);

  const { error } = Validator.validate(Model.ValidateSchema, data, requiredFields);
  if (error) {
    throw error;
  }
  const user = await UserModule.Service.User.findOne({ _id: data.user });
  if (!user) {
    throw new BaseError(ErrorType.badRequest)
      .addError('user', Reason.incorrect);
  }
  const report = await ReportModule.Service.Segment.findOne({ _id: data.report });
  if (!report) {
    throw new BaseError(ErrorType.badRequest)
      .addError('report', Reason.incorrect);
  }
  const result = await Database.create(modelName.evaluation, data);
  result.user = user;
  result.report = report;
  return result;
}

function findMany(query, populate) {
  return Database.findMany(modelName.evaluation, query, { createdAt: -1 }, 100, null, populate);
}
module.exports = {
  insertOne,
  findMany,
};
