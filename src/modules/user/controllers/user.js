const _ = require('lodash');
const Logger = require('../../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../../core/error');
const { ResponseFactory } = require('../../../core/response');
const Service = require('../services');

async function updateUserInfo(req, res, next) {
  const { _id } = req.user;
  try {
    const allowUpdateFields = ['name', 'phone', 'avatar', 'email'];
    const info = _.pick(req.body, allowUpdateFields);

    await Service.User.updateOne({ _id }, info);

    const result = await Service.User.findOne({ _id });
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function getUserInfo(req, res, next) {
  const { _id } = req.user;
  try {
    const result = await Service.User.findOne({ _id });
    console.log('Get user info', result);
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  user: {
    updateUserInfo,
    getUserInfo,
  },
  admin: {

  },
};
