const Joi = require('joi');
const mongoose = require('mongoose');
const _ = require('lodash');

const { Schema } = mongoose;
const modelNames = require('../../../config/model-names');

const modelName = 'Advertisement';

const advertisementSchemas = new Schema({
  name: {
    type: String,
  },
  state: {
    type: Number,
    default: 0,
  },
  content: {
    type: String,
  },
  partner_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: modelNames.user,
  },
  image: {
    type: String,
  },
  type: {
    type: String,
  },
  locate: {
    type: String,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
});

// const validateSchemas = {
//     name: Joi.string().regex(/(\w| )*/).min(4).max(30).trim().required(),
//     username: Joi.string().min(6).max(30).required(),
//     email: Joi.string().email().required(),
//     avatar: Joi.string().required(),
//     status: Joi.string().only(['active', 'inactive', 'disabled', 'blocked']).required(),
//     about_me: Joi.string().min(0).max(1000).trim().required(),
//     phone: Joi.string().min(10).max(11).required(),
//     evaluation_count: Joi.number().required(),
//     evaluation_score: Joi.number().min(0).max(1).required(),
// }

mongoose.model(modelName, advertisementSchemas, modelName);

module.exports = {
  Name: modelName,
};
