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
const fs = require('fs');
const MAX_RETRY = 5;
async function postSpeechReport(req, res, next) {
  try {
    const allowFields = ['segments', 'speech_record_id'];
    const data = _.pick(req.body, allowFields);
    const segments = JSON.parse(JSON.stringify(data)).segments;
    const speechRecordId = data.speech_record_id;
    const dolbyUrl = `dlb://enhanced${speechRecordId}`;
    
    let {isError, reportData}= await validateUserRequest(req, segments, res)
    if (!isError) {
      return;
    };
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
    Logger.error(error)
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
    let apiKey = process.env.DOLBY_API_KEY;
    Logger.info('Received Request from Mobile')
    let formData = new FormData();
    const allowFields = ['speech_record_id', 'file', 'segments'];
    const data = _.pick(req.body, allowFields);
    const segments = data.segments;
    Logger.info(data.speech_record_id)
    const speech_record_id = String(data.speech_record_id).substring(1, data.speech_record_id.length-1);
    var dataFile = data.file;
    let { isError, reportData } = await validateUserRequest(req, segments, res);
    if (!isError) 
      return;
    const audioFile = Buffer.from(dataFile, 'base64');
    Logger.info(`Bucket Url: dlb://${speech_record_id}`);
    // create input bucket
    const inputBucketUrl = await axios
      .post(
        `https://api.dolby.com/media/input`,
        {
          url: `dlb://${speech_record_id}`
        },
        {
          headers: {'x-api-key': apiKey, 
                    'content-type': 'application/json'}
        }
      );
    
    if (inputBucketUrl !== null) {
      formData.append('file', audioFile);
      const putAudioStatus = await axios
        .put(
          inputBucketUrl.data.url,
          audioFile,
          {
            headers: {
              "Content-Type" : "audio/wave",
            }
          }
        )
        .then((response) => {
          return response.status;
        }, (error) => {
          console.log(error);
        })

      if (putAudioStatus === 200) {
        const inputUrl = `dlb://${speech_record_id}`
        const outputUrl = `dlb://enhanced${speech_record_id}`
        let jobId = await axios.post(
          `https://api.dolby.com/media/enhance`,
          {
            content: {
              type: "voice_recording"
            },
            input: inputUrl,
            output: outputUrl,
          },
          {
            headers: {'x-api-key': process.env.DOLBY_API_KEY, 'content-type' : 'application/json'},
          }
        ).then((reponse) => {
            return reponse.data.job_id;
        }, (error) => {
            console.log(error);
        })

        if (jobId !== null) {
          let statusEnhanced =  await getStatusEnhanced(jobId);
          Logger.info(statusEnhanced);
          if (statusEnhanced === 'Success') {
            // downloading enhanced audio
            let downloadUrl = await getDownloadUrl(speech_record_id, apiKey);
            let enhancedBuffer = await Service.SpeechRecord.downloadEnhancedAudio(downloadUrl, speech_record_id);
            reportData.speech_record = speech_record_id;
            Service.SpeechRecord.insertOne({
              _id: speech_record_id,
              data: audioFile,
              length: audioFile.size,
              contentType: 'audio/x-wav',
              encoding: '16bit',
              dataEnhanced: enhancedBuffer,
            });
            Logger.info("Inserted SpeechRecord to DB");
            await Service.SpeechReport.insertOne(reportData);
            Logger.info("Inserted SpeechReport to DB");
          }
        }
      }
    }
  } catch (error) {
    Logger.info("Error ", error);
  }
}

async function validateUserRequest(req, segments, res) {
  let errors = {};
  let isError = false;
  
  if (segments !== undefined && segments.length > 5 ) {
    errors.segments = Reason.invalid;
    isError = true;
    Logger.error('Segments error >=5 with segment size: ');
  }
  if (segments === undefined) {
    segments = []
  }
  if (!_.isEmpty(errors)) {
    const response = new CodeError(ErrorType.badRequest);
    Logger.error("Errors occured!")
    for (const [key, val] of Object.entries(errors)) {
      response.addError(key, val);
    }

    response.send(res);
    return {'isError' : _.isEmpty(errors), 'reportData' : null};
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
    speech_record: "-1",
  };
  const { error } = Service.SpeechReport.validate(reportData);
  console.log("validate reportData");
  if (error) {
    Logger.warn('Error!!!')
    throw error;
  }

  // Finish validate user speech report
  ResponseFactory.success().send(res);
  Logger.info('Validate no errors');
  return {'isError' : _.isEmpty(errors), 'reportData' : reportData};
}

async function getStatusEnhanced(jobId) {
  let retry = 0;

  const getEnhanceStatus = async () => axios
    .get(
      `https://api.dolby.com/media/enhance?job_id=${jobId}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.DOLBY_API_KEY,
        }
      },
    )
    .then((response) => {
      if (response.data.status !== 'Success') {
        Logger.warn("Status: %s", response.data.status);
        throw error;
      }
      return response.data.status;
    })
    .catch((error) => {
      if (retry >= MAX_RETRY) return 'Failed';
      return new Promise((resolve) => {
        setTimeout(() => {
          retry += 1;
          resolve(getEnhanceStatus());
        }, 2000);
      });
    });

  return getEnhanceStatus();
}

async function getDownloadUrl(speechRecordId, apiKey) {
  return await axios.post(
    `https://api.dolby.com/media/output`,
    {
      "url":`dlb://enhanced${speechRecordId}`
    },
    {
      headers: {'x-api-key': apiKey, 
                'content-type': 'application/json'}
    }
  ).then((response) => {
    return response.data.url;
  });
}

module.exports = {
  user: {
    postSpeechReport,
    collectSpeechRecord,
    processSpeechReportMobile,
  },
  getSpeechRecordScript,
}
