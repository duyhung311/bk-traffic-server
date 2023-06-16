const _ = require('lodash');
const { Reason, ErrorType, CodeError } = require('../../../core/error');
const { ResponseFactory } = require('../../../core/response');
const state = require('../../../state');
const Service = require('../services');
const UserModel = require('../../user');
const periodModule = require('../../period');
const { ObjectId } = require('../../../core/database');
const Logger = require('../../../core/logger');

async function postSpeechReport(req, res, next) {
  try {
    const allowFields = ['segments', 'speech_record_id'];
    const data = _.pick(req.body, allowFields);
    const errors = {};
    const segments = JSON.parse(data.segments);
    const speechRecordId = data.speech_record_id;
    const dolbyUrl = `dlb://enhanced${speechRecordId}`;

    // Validation
    if (segments.length > 5) {
      errors.segments = Reason.invalid;
    }

    if (!_.isEmpty(errors)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, val] of Object.entries(errors)) {
        response.addError(key, val);
      }
      response.send(res);
      return;
    }

    let { user } = req;
    if (!user) {
      user = await UserModel.Service.User.findOne({
        username: state.admin.username,
      });
    }

    const currentPeriod = await periodModule.Service.getCurrentPeriod();
    const reportData = {
      user: user._id,
      segments: [...new Set(segments.flat())],
      period_id: currentPeriod._id,
      source: 'user',
    };
    const { error } = Service.SpeechReport.validate(reportData);
    if (error) {
      throw error;
    }

    // Finish validate user speech report
    ResponseFactory.success().send(res);

    // Enhance noise cancelling
    let enhancedBuffer = null;
    try {
      enhancedBuffer = await Service.SpeechRecord.getEnhancedSpeechRecord(dolbyUrl, speechRecordId);
    } catch (e) {
      Logger.error('[Enhance Audio]', e);
    }
    // Insert speech record
    Service.SpeechRecord.insertOne({
      _id: speechRecordId,
      data: req.file.buffer,
      length: req.file.size,
      contentType: req.file.mimetype,
      encoding: req.file.encoding,
      dataEnhanced: enhancedBuffer,
    });

    reportData.speech_record = speechRecordId;

    // Insert speech report
    await Service.SpeechReport.insertOne(reportData);
  } catch (error) {
    next(error);
  }
}

async function collectSpeechRecord(req, res, next) {
  try {
    const allowFields = ['script_id', 'speech_record_id'];
    const data = _.pick(req.body, allowFields);
    const errors = {};
    const scriptId = JSON.parse(data.script_id);
    const speechRecordId = ObjectId(data.speech_record_id);
    const dolbyUrl = `dlb://enhanced${speechRecordId}`;

    // Validation
    if (!scriptId) {
      errors.script_id = Reason.required;
    }
    if (!_.isEmpty(errors)) {
      const response = new CodeError(ErrorType.badRequest);
      for (const [key, val] of Object.entries(errors)) {
        response.addError(key, val);
      }
      response.send(res);
      return;
    }

    // Enhance noise cancelling
    let enhancedBuffer = null;
    try {
      enhancedBuffer = await Service.SpeechRecord.getEnhancedSpeechRecord(dolbyUrl, speechRecordId);
    } catch (error) {
      Logger.error('[Enhance Audio]', error);
    }

    // Insert speech record
    await Service.SpeechRecord.insertOne({
      _id: speechRecordId,
      script: scriptId,
      data: req.file.buffer,
      length: req.file.size,
      contentType: req.file.mimetype,
      encoding: req.file.encoding,
      dataEnhanced: enhancedBuffer,
    });

    ResponseFactory.success().send(res);
  } catch (error) {
    next(error);
  }
}

async function getSpeechRecordScript(req, res, next) {
  try {
    const numberOfScripts = parseInt(req.query.n, 10) || state.NUMBER_OF_SCRIPTS;
    const scripts = await Service.SpeechReportScript.getNRandomScripts(numberOfScripts);

    ResponseFactory.success(scripts).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  user: {
    postSpeechReport,
    collectSpeechRecord,
  },
  getSpeechRecordScript,
};
