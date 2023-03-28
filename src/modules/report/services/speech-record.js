const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const fsExtra = require('fs-extra');
const Validator = require('../../../core/validator');
const Database = require('../../../core/database');
const Logger = require('../../../core/logger');
const Model = require('../models');
const { sleep, arrayBufferToBuffer } = require('../../../core/utils');
const MAX_RETRY = 5;

function validate(data) {
  const allowFields = ['script', 'length'];

  const existedFields = [];
  const newData = {};
  allowFields.forEach((key) => {
    if (typeof data[key] !== 'undefined') {
      existedFields.push(key);
      newData[key] = data[key];
    }
  });

  return Validator.validate(
    _.pick(Model.SpeechRecord.ValidateSchema, existedFields),
    newData,
    existedFields,
  );
}

async function insertOne(data) {
  const { error } = validate(data);
  if (error) {
    throw error;
  }

  return Database.create(Model.SpeechRecord.Name, data);
}

async function updateOne(query, update) {
  const { error } = validate(update);
  if (error) {
    throw error;
  }
  return Database.updateOne(Model.SpeechRecord.Name, query, update);
}
/*
  According to Dobly API document, the API call in getEnhancedSpeechRecord() is deprecated. 
  Therefore, an up-to-date API call in downloadEnhancedAudio() is implemented
  Although being deprecated, the code will not be removed because it is still usable.
*/
async function getEnhancedSpeechRecord(url, speechRecordId) {

  let retry = 0;
  const filename = `tmp/${speechRecordId}.wav`;

  const getEnhanceAudio = async () => axios
    .get(
      `https://api.dolby.com/media/output?url=${url}`,
      {
        responseType: 'stream',
        headers: {'x-api-key': process.env.DOLBY_API_KEY},
      },
    )
    .then((response) => response.data.pipe(fs.createWriteStream(filename)))
    .then(() => sleep(2000))
    .then(() => {
      Logger.info('[Enhance Audio Service] Enhancing speech record successfully');

      const fileContents = fs.readFileSync(filename);
      fsExtra.removeSync(filename);
      return arrayBufferToBuffer(fileContents.buffer);
    })
    .catch((error) => {
      if (retry >= MAX_RETRY) throw error;
      //Logger.warn('[Enhance Audio Service] Retry enhancing speech record %s', speechRecordId);
      Logger.warn('[Enhance Audio Service] Retry enhancing speech record at %s', url);
      return new Promise((resolve) => {
        setTimeout(() => {
          retry += 1;
          resolve(getEnhanceAudio());
        }, 2000);
      });
    });

  return getEnhanceAudio();
}

async function downloadEnhancedAudio(downloadUrl, speechRecordId) {
  let retry = 0;
  const filename = `tmp/${speechRecordId}.wav`;

  const getEnhanceAudio = async () => axios.get(downloadUrl, {responseType: 'stream'})
  .then((response) => response.data.pipe(fs.createWriteStream(filename)))
    .then(() => sleep(2000))
    .then(() => {
      Logger.info('[Enhance Audio Service] Enhancing speech record successfully');
      const fileContents = fs.readFileSync(filename);
      fsExtra.removeSync(filename);
      return arrayBufferToBuffer(fileContents.buffer);
    })
    .catch((error) => {
      if (retry >= MAX_RETRY) throw error;
      //Logger.warn('[Enhance Audio Service] Retry enhancing speech record %s', speechRecordId);
      Logger.warn('[Enhance Audio Service] Retry enhancing speech record at %s', downloadUrl);
      return new Promise((resolve) => {
        setTimeout(() => {
          retry += 1;
          resolve(getEnhanceAudio());
        }, 2000);
      });
    });
    
    return getEnhanceAudio();
}

module.exports = {
  validate,
  insertOne,
  updateOne,
  getEnhancedSpeechRecord,
  downloadEnhancedAudio,
};
