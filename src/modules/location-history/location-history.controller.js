const _ = require('lodash');
const request = require('request-promise');
const Service = require('./location-history.service');
const { ResponseFactory } = require('../../core/response');
const Logger = require('../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../core/error');
const appState = require('../../state');
const Validator = require('../../core/validator');
const historyModule = require('../history');
const utils = require('../../core/utils');
const periodModule = require('../period');
const validator = require('../../core/validator');
const locationHistoryValidator = require('./location-history.validator');
const locationHistoryService = require('./location-history.service');

async function getMyHistories(req, res, next) {
  try {
    const { error: validatedError, value: rawQuery } = validator.validate(
      locationHistoryValidator.getMyHistories,
      req.query,
    );
    if (validatedError) {
      validatedError.send(res);
      return;
    }
    const query = {
      user: req.user._id,
      $and: [
        { createdAt: { $gte: rawQuery.start_time } },
        { createdAt: { $lte: rawQuery.end_time } },
      ],
    };
    const histories = await locationHistoryService.findMany(query);
    ResponseFactory.success(histories).send(res);
  } catch (error) {
    next(error);
  }
}

async function getMyPaths(req, res, next) {
  try {
    const { error: validatedError, value: rawQuery } = validator.validate(
      locationHistoryValidator.getMyPaths,
      req.query,
    );
    if (validatedError) {
      validatedError.send(res);
      return;
    }
    const query = {
      user: req.user._id,
      $and: [
        { createdAt: { $gte: rawQuery.start_time } },
        { createdAt: { $lte: rawQuery.end_time } },
      ],
    };
    if (typeof rawQuery.include_types === 'string') {
      const types = rawQuery.include_types
        .split(' ')
        .map((item) => item.trim());
      query.street_type = { $in: types };
    }
    const histories = await locationHistoryService.findPaths(query);
    ResponseFactory.success(histories).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyHistories,
  getMyPaths,
};
