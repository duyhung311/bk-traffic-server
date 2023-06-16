// const Logger = require('../../../core/logger');
const { CodeError, ErrorType } = require('../../../core/error');
const Validator = require('../../../core/validator');
const { ResponseFactory } = require('../../../core/response');
const trafficCache = require('../../traffic-status/traffic-status.cache');
const Service = require('../services');

async function getAdminTrafficStatusConfig(req, res, next) {
  try {
    const result = await Service.AdminTrafficStatusConfig.findMany();
    if (!result) {
      new CodeError({
        ...ErrorType.notFound,
        message: 'Can not found admin config',
      }).send(res);
      return;
    }
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function deleteAdminTrafficStatusConfig(req, res, next) {
  try {
    const configId = req.params.id.toString();
    if (!Validator.isDatabaseId(configId)) {
      new CodeError({
        ...ErrorType.badRequest,
        message: 'Invalid config id',
      }).send(res);
      return;
    }
    const config = await Service.AdminTrafficStatusConfig.findById(configId);
    if (!config) {
      new CodeError({
        ...ErrorType.notFound,
        message: 'Can not find config id',
      }).send(res);
      return;
    }
    const adminTrafficStatus = await Service.TrafficStatus.findSegmentIdByAdminConfigId(
      configId,
    );
    if (adminTrafficStatus && adminTrafficStatus.length > 0) {
      let isDeleted = true;
      adminTrafficStatus.forEach((status) => {
        if (!isDeleted) {
          new CodeError({
            ...ErrorType.notFound,
            message: 'Can not delete status in hashmap',
          }).send(res);
          return;
        }
        isDeleted = trafficCache.deleteHashMapAdmin(status.segment_id);
      });
    }
    await Service.TrafficStatus.deleteByAdminConfigId(configId);
    await Service.AdminTrafficStatusConfig.deleteById(configId);
    const result = { message: 'Delete Successful' };
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function inactiveAdminTrafficConfig(req, res, next) {
  try {
    const configId = req.params.id.toString();
    if (!Validator.isDatabaseId(configId)) {
      new CodeError({
        ...ErrorType.badRequest,
        message: 'Invalid config id',
      }).send(res);
      return;
    }
    const config = await Service.AdminTrafficStatusConfig.findById(configId);
    const { active_time, updatedAt } = config;
    if (!config) {
      new CodeError({
        ...ErrorType.notFound,
        message: 'Can not find config id',
      }).send(res);
      return;
    }
    const now = Date.now();
    const diffTime = Math.round((now - new Date(updatedAt).getTime()) / 1000);
    if (diffTime >= active_time) {
      new CodeError({
        ...ErrorType.badRequest,
        message: 'Config is already inactive',
      }).send(res);
      return;
    }
    const updatedConfig = await Service.AdminTrafficStatusConfig.updateActiveTimeById(
      configId,
      diffTime,
    );
    if (!updatedConfig) {
      new CodeError({
        ...ErrorType.internalServerError,
        message: 'Can not update config',
      }).send(res);
      return;
    }
    const adminTrafficStatus = await Service.TrafficStatus.findSegmentIdByAdminConfigId(
      configId,
    );
    if (adminTrafficStatus && adminTrafficStatus.length > 0) {
      await Promise.all(adminTrafficStatus.map((status) => {
        trafficCache.inactiveHashMapAdmin(status.segment_id, diffTime);
        const expireAt = new Date(new Date(status.createdAt).getTime() + diffTime * 1000);
        return Service.TrafficStatus.updateActiveTimeById(status._id, diffTime, expireAt);
      }));
    }
    const result = { message: 'Update successful' };
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminTrafficStatusConfig,
  deleteAdminTrafficStatusConfig,
  inactiveAdminTrafficConfig,
};
