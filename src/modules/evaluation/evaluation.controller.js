const formidable = require('formidable');
const _ = require('lodash');
const { Reason, ErrorType, BaseError } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const Setting = require('../../config/setting');
const Service = require('./evaluation.service');
const userService = require('../user/services/user');
const reportService = require('../report/services');

/**
 * Upload file
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function addOne(req, res, next) {
  try {
    const { report, score } = req.body;
    const data = {
      user: req.user._id,
      report,
      score,
    };
    const reportInfo = await reportService.Segment.findOne({ _id: report });
    if (!reportInfo) {
      new BaseError(ErrorType.badRequest)
        .addError('report', Reason.invalid)
        .send(res);
      return;
    }
    const result = await Service.insertOne(data);
    await userService.updateEvaluation({ _id: reportInfo.user }, score);
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function getMyEvaluations(req, res, next) {
  try {
    const result = await Service.findMany({ user: req.user._id }, ['user', 'report']);
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  user: {
    addOne,
    getMyEvaluations,
  },
};
