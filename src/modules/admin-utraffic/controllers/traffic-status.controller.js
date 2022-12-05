const _ = require('lodash');
const Logger = require('../../../core/logger');
const { CodeError, ErrorType, Reason } = require('../../../core/error');
const Validator = require('../../../core/validator');
const { ResponseFactory } = require('../../../core/response');
const Service = require('../services');
const { positionChoose } = require('../../../config/constant');

async function getTrafficStatus(req, res, next) {
  try {
    const segments = await Service.TrafficStatus.findMany({ source: 'AD' });
    if (segments && segments.length > 0) {
      ResponseFactory.success(segments).send(res);
    } else {
      new CodeError(ErrorType.notFound).send(res);
      return;
    }
  } catch (error) {
    next(error);
  }
}

async function updateTrafficStatus(req, res, next) {
  try {
    const allowFields = [
      'type',
      'coordinates',
      'velocity',
      'active_time',
      'description',
      'radius',
      'causes',
      'images',
      'option',
    ];
    const { user } = req;
    const data = _.pick(req.body, allowFields);
    const activeTime = data.active_time;
    const {
      type,
      coordinates,
      velocity,
      radius,
      option,
    } = data;

    // Validation
    const errors = [];
    Validator.checkTypeWithCoordinates(
      type,
      coordinates,
      radius,
      option,
      errors,
    );
    Validator.checkLatLngInCoordinates(coordinates, errors);
    if (!velocity || velocity < 0 || velocity > 60) {
      errors.push({
        key: 'velocity',
        value: { ...Reason.invalid, message: 'range of velocity is 0 to 60' },
      });
    }
    if (!activeTime || activeTime < 300 || activeTime > 7200) {
      errors.push({
        key: 'active_time',
        value: {
          ...Reason.invalid,
          message: 'range of active_time is 300 to 7200 seconds',
        },
      });
    }
    if (errors && errors.length > 0) {
      const response = new CodeError(ErrorType.badRequest);
      for (const err of errors) {
        response.addError(err.key, err.value);
      }
      response.send(res);
      return;
    }
    const { error } = Service.AdminTrafficStatusConfig.validateInput(data, allowFields);
    if (error) {
      error.send(res);
      return;
    }

    // Processing
    const result = {};
    data.user_id = user._id;
    const adminConfig = await Service.AdminTrafficStatusConfig.create(data);
    const configId = adminConfig._id;
    if (!adminConfig) {
      new CodeError({
        ...ErrorType.internalServerError,
        errors: ['Can\'t create or update traffic status'],
      }).send(res);
      return;
    }
    result.config = adminConfig;

    delete data.user_id;
    data.configId = configId;
    const dataTrafficStatus = await Service.TrafficStatus.updateOrCreateTrafficStatus(data);
    if (!dataTrafficStatus) {
      new CodeError({
        ...ErrorType.internalServerError,
        errors: ['Can\'t create or update traffic status'],
      }).send(res);
      return;
    }
    result.trafficStatus = dataTrafficStatus;
    ResponseFactory.success(result).send(res);
  } catch (error) {
    Logger.error(error.message);
    next(error);
  }
}

async function speechReport(req, res, next) {
  try {
    const allowFields = ['speech_record_id', 'type', 'coordinates', 'active_time', 'radius', 'option'];
    const data = _.pick(req.body, allowFields);
    const activeTime = data.active_time;
    const speechRecordId = data.speech_record_id;
    data.coordinates = JSON.parse(data.coordinates);
    const {
      type,
      coordinates,
      radius,
      option,
    } = data;
    const { user } = req;

    // Validation
    const errors = [];
    const allowType = [
      positionChoose.rectangle,
      positionChoose.line,
      positionChoose.circle,
    ];
    if (allowType.includes(type)) {
      Validator.checkTypeWithCoordinates(type, coordinates, radius, parseInt(option, 10), errors);
      Validator.checkLatLngInCoordinates(coordinates, errors);
    }
    if (errors.length > 0) {
      const response = new CodeError(ErrorType.badRequest);
      for (const err of errors) {
        response.addError(err.key, err.value);
      }
      response.send(res);
      return;
    }
    const { error } = Service.AdminTrafficStatusConfig.validateSpeechReportInput(data, allowFields);
    if (error) {
      error.send(res);
      return;
    }

    // Processing
    const result = {};
    data.user_id = user._id;
    const adminConfig = await Service.AdminTrafficStatusConfig.create(data);
    if (!adminConfig) {
      new CodeError({
        ...ErrorType.internalServerError,
        errors: ['Can\'t create or update traffic status'],
      }).send(res);
      return;
    }
    result.config = adminConfig;
    ResponseFactory.success(result).send(res);

    const dataTrafficStatus = await Service.TrafficStatus.processSpeechReport({
      type,
      coordinates,
      radius,
      option,
      speechRecordId,
      configId: adminConfig._id,
      userId: user._id,
      activeTime,
      audioFile: req.file,
    });
    if (!dataTrafficStatus) {
      new CodeError({
        ...ErrorType.internalServerError,
        errors: ['Can\'t create or update traffic status'],
      }).send(res);
      return;
    }
    result.trafficStatus = dataTrafficStatus;
  } catch (error) {
    Logger.error(error);
    next(error);
  }
}

module.exports = {
  getTrafficStatus,
  updateTrafficStatus,
  speechReport,
};
