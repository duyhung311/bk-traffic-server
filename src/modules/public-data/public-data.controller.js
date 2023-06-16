const _ = require('lodash');
const Logger = require('../../core/logger');
const { CodeError, ErrorType, Reason } = require('../../core/error');

const { ResponseFactory } = require('../../core/response');
const utils = require('../../core/utils');
const PublicDataService = require('./public-data.service');

/**
 * Get Public Data
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getPublicData(req, res, next) {
  try {
    const allowFields = [
      'type',
      'coordinates',
      'radius',
      'option',
      'time',
    ];
    const data = _.pick(req.body, allowFields);
    // validate body
    const errors = utils.validateBodyOfPublicData(data);

    if (errors.length > 0) {
      const response = new CodeError(ErrorType.badRequest);
      for (const error of errors) {
        response.addError(error.key, error.value);
      }
      response.send(res);
      return;
    }
    // handle logic
    const dataTrafficStatus = await PublicDataService.getTrafficStatus(data);
    if (!dataTrafficStatus && dataTrafficStatus.length === 0) {
      new CodeError({ ...ErrorType.notFound, errors: ['Can\'t find any traffic status'] }).send(res);
      return;
    }
    ResponseFactory.success(dataTrafficStatus).send(res);
  } catch (error) {
    Logger.error(error.message);
    next(error);
  }
}

module.exports = {
  getPublicData,
};
