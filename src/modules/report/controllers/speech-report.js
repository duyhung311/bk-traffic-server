const _ = require('lodash');
const { Reason, ErrorType, CodeError } = require('../../../core/error');
const { ResponseFactory } = require('../../../core/response');
const state = require('../../../state');
const Service = require('../services');
const UserModel = require('../../user');
const periodModule = require('../../period');
const { ObjectId } = require('../../../core/database');
const Logger = require('../../../core/logger');
const { default: axios } = require('axios');
const { response } = require('express');

async function postSpeechReport(req, res, next) {
  try {
    const allowFields = ['segments', 'speech_record_id'];
    const data = _.pick(req.body, allowFields);
    const errors = {};
    console.log("+++++++++++++++++++++++++++++++")
    console.log(data.segments)
    const segments = JSON.parse(JSON.stringify(data)).segments;
    console.log(segments)
    console.log("-------------------------------")

    const speechRecordId = data.speech_record_id;
    const dolbyUrl = `dlb://enhanced-${speechRecordId}`;

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
    console.log("No errors in validation")
    let { user } = req;
    if (!user) {
      user = await UserModel.Service.User.findOne({
        username: state.admin.username,
      });
      console.log(user)
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
      console.log("Error in validating SpeechReport ", error)
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
    Logger.info(req.file)
    Service.SpeechRecord.insertOne({
      _id: speechRecordId,
      data: req.file.buffer,
      length: req.file.size,
      contentType: req.file.mimetype,
      encoding: req.file.encoding,
      dataEnhanced: enhancedBuffer,
    });
    Logger.info("Inserted SpeechRecord to MongoDB")
    reportData.speech_record = speechRecordId;

    // Insert speech report
    await Service.SpeechReport.insertOne(reportData);
    Logger.info("Inserted SpeechReport to MongoDB")

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
    Logger.info(enhancedBuffer.size)
    
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


async function processSpeechReportMobile(req, res, next) {
  try {
    const segments = req.body.segments
    const speech_record_id = req.body.speech_record_id
    const audioFile = req.file.buffer
    // create input bucket
    const inputBucketUrl = async () => axios
    .post(
      `https://api.dolby.com/media/input`,
      {
        url: speech_record_id,
        headers: {'x-api-key': process.env.DOLBY_API_KEY},
      }
     )
     .then((response) => {
      console.log(response)
      return response.data.url
     }, (error) => {
      console.log(error)
     })
    // send audio to that input bucket
    const status = async () => axios
    .put(
      inputBucketUrl,
      {
        data: audioFile,
        headers: {'Content-Type': 'audio/mpeg'},
      }
     )
     .then((response) => {
      console.log(response)
      return response.status
     }, (error) => {
      console.log(error)
     })
    // start enhancing
    const responseStatus = ""
    if (status == 200) {
      const inputUrl = 'dlb://${speech_ecord_id}'
      const outputUrl = 'dlb://enahnced${speech_ecord_id}'
      const isSuccess = () => axios
      .post(
        `https://api.dolby.com/media/enhance`,
        {
          content: {
            type: "voice-recording"
          },
          input: inputUrl,
          output: outputUrl,
          headers: {'x-api-key': process.env.DOLBY_API_KEY, 'content-type' : 'application/json'},
        }
      ).then((reponse) => {
        responseStatus = reponse.data.status
      }, (error) => {
        responseStatus = reponse.data.status

      })
    }
  } catch (error) {
    console.log("FAILED TO ERROR")
  }


}

module.exports = {
  user: {
    postSpeechReport,
    collectSpeechRecord,
    processSpeechReportMobile,
  },
  getSpeechRecordScript,
};
