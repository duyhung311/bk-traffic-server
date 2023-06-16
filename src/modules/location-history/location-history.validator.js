const _ = require('lodash');
const request = require('request-promise');
const Joi = require('joi');
const Service = require('./location-history.service');
const { ResponseFactory } = require('../../core/response');
const Logger = require('../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../core/error');
const appState = require('../../state');
const Validator = require('../../core/validator');
const historyModule = require('../history');
const utils = require('../../core/utils');
const periodModule = require('../period');

const getMyHistories = {
  start_time: Joi.date().required(),
  end_time: Joi.date().required(),
};

const getMyPaths = {
  start_time: Joi.date().required(),
  end_time: Joi.date().required(),
  include_types: Joi.string(),
};

module.exports = {
  getMyHistories,
  getMyPaths,
};
