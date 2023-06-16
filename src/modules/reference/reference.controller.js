const _ = require('lodash');
const request = require('request-promise');
const Service = require('./reference.service');
const { ResponseFactory } = require('../../core/response');
const Logger = require('../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../core/error');
const appState = require('../../state');

async function getAllReferences(req, res, next) {
  try {
    const result = await Service.findMany({});
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function insertReference(req, res, next) {
  try {
    const {
      name, group, key, value,
    } = req.body;
    const error = {};
    if (!group || group === '') {
      error.group = Reason.required;
    }
    if (!_.isEmpty(error)) {
      const response = new BaseError(ErrorType.badRequest);
      for (const key in errors) {
        response.addError(key, errors[key]);
      }
      response.send(res);
      return;
    }

    const data = {
      name,
      group,
      key,
      value,
    };

    if (group == appState.updateStatusIntervalRefKey
            || group == appState.notificationIntervalKey) {
      await Service.insertOrUpdateOne({ group }, data);
      await Service.updateOne({ group }, data);
      ResponseFactory.success(data).send(res);

      if (group == appState.updateStatusIntervalRefKey
                && process.env.CALCULATE_SERVER) {
        try {
          const result = await request({
            uri: process.env.CALCULATE_SERVER,
            method: 'POST',
          });
          Logger.info('Update calculate server result %o', result);
        } catch (error) {
          Logger.error('UPdate calculate server error %o', error);
        }
      }
      return;
    }

    const result = await Service.insertOne(data);
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllReferences,
  insertReference,
};
