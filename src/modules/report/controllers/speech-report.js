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
const { ExceptionHandler } = require('winston');
const { MAX_CAPACITY } = require('../../../state');
const { validate } = require('joi/lib/types/lazy');

//const wav = require('node-wav');

const MAX_RETRY = 5;
async function postSpeechReport(req, res, next) {
  try {
    const allowFields = ['segments', 'speech_record_id'];
    const data = _.pick(req.body, allowFields);
    const segments = JSON.parse(JSON.stringify(data)).segments;
    const speechRecordId = data.speech_record_id;
    const dolbyUrl = `dlb://enhanced${speechRecordId}`;
    let {isError, reportData}= await validateUserRequest(req, segments, res)
    if (!isError) return;
    // Validation  |  separate to new function validateUserRequest()
    // if (segments.length > 5) {
    //   errors.segments = Reason.invalid;
    // }
    // if (!_.isEmpty(errors)) {
    //   const response = new CodeError(ErrorType.badRequest);
    //   for (const [key, val] of Object.entries(errors)) {
    //     response.addError(key, val);
    //   }
    //   response.send(res);
    //   return;
    // }
    // let { user } = req;
    // if (!user) {
    //   user = await UserModel.Service.User.findOne({
    //     username: state.admin.username,
    //   });
    // }
    // const currentPeriod = await periodModule.Service.getCurrentPeriod();
    // const reportData = {
    //   user: user._id,
    //   segments: [...new Set(segments.flat())],
    //   period_id: currentPeriod._id,
    //   source: 'user',
    // };
    // const { error } = Service.SpeechReport.validate(reportData);
    // if (error) {
    //   throw error;
    // }


    // // Finish validate user speech report
    // ResponseFactory.success().send(res);

    // Enhance noise cancelling
    let enhancedBuffer = null;
    try {
      enhancedBuffer = await Service.SpeechRecord.getEnhancedSpeechRecord(dolbyUrl, speechRecordId);
      console.log('enhancedBuffer.length: ', enhancedBuffer==null);
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
    const segments = JSON.parse(JSON.stringify(data)).segments;
    const speech_record_id = data.speech_record_id
    var dataFile = data.file;

    let {isError, reportData}= await validateUserRequest(req, segments, res);
    console.log(isError);
    if (!isError) return;
    console.log('reportData2', reportData);

    Logger.info('Validated');
    let decodedAudioFile = Buffer.from(dataFile, 'base64');
    fs.writeFileSync('./audio.wav', decodedAudioFile);

    const audioFile = fs.readFileSync('./audio.wav');
    console.log("length: ", audioFile.length);

    // create input bucket
    const inputBucketUrl = await axios
    .post(
      `https://api.dolby.com/media/input`,
      {
        url: "dlb://" + speech_record_id
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
              "Content-Type": "audio/wave",
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
        console.log('success', jobId);
        if (jobId !== null) {
          console.log("do here");
          let statusEnhanced =  await getStatusEnhanced(jobId);
          Logger.info(statusEnhanced);
          if (statusEnhanced === 'Success') {
            // downloading enhanced audio
            console.log('Success status')
            let downloadUrl = await getDownloadUrl(data.speech_record_id, apiKey);
            console.log("get download url success")
            let enhancedBuffer = await Service.SpeechRecord.downloadEnhancedAudio(downloadUrl, data.speech_record_id);
            Logger.info("Success enhancing, pls start saving it do db");
            console.log('repportData: ', reportData);  
            reportData.speech_record = data.speech_record_id;
            Service.SpeechRecord.insertOne({
              _id: data.speech_record_id,
              data: decodedAudioFile,
              length: decodedAudioFile.size,
              contentType: 'audio/x-wav', // ?
              encoding: '16bit', //    ?
              dataEnhanced: enhancedBuffer,
            });
            Logger.info("Inserted SpeechRecord to MongoDB")
            
        
            // Insert speech report
            await Service.SpeechReport.insertOne(reportData);
            Logger.info("Inserted SpeechReport to MongoDB")
          }
        }
      }
    }
    // start enhancing
    // TODO: after status = success -> start download the enhanced audio

  } catch (error) {
    console.log("error4: ", error);
    console.log("FAILED TO ERROR")
  }
}

async function validateUserRequest(req, segments, res) {
  let errors = {};
  let isError = false;
  if (segments.length > 5) {
    errors.segments = Reason.invalid;
    isError = true;
    Logger.error('Segments error >=5 with segment size: ');
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
    Logger.error('Cannot find user');
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
  console.log('reportData1', reportData);
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
        Logger.warn("Status failed: %s", response.data.status);
        throw error;
      }
      return response.data.status;
    })
    .catch((error) => {
      if (retry >= MAX_RETRY) return 'Failed';
      //Logger.warn('[Enhance Audio Service]Retry getting status.');
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
    console.log(response);
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
