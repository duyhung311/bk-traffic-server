const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;
const modelNames = require('../../../config/model-names');

const modelName = 'Voucher';

const voucherSchemas = new Schema({
  name: {
    type: String,
  },
  value: {
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
  quantity: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
  },
  type: {
    type: String,
  },
  status: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});
voucherSchemas.index({ '$**': 'text' });
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
const validateSchemas = {
  name: Joi.string().required(),
  value: Joi.string().required(),
  content: Joi.string().required(),
  quantity: Joi.number().min(0).max(1000).required(),
  image: Joi.string().required(),
  type: Joi.string().required(),
  status: Joi.number(),
};
mongoose.model(modelName, voucherSchemas, modelName);

module.exports = {
  Name: modelName,
  ValidateSchema: validateSchemas,
};
