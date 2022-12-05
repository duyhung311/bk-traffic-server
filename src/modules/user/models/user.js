const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const modelName = 'Users';

const userSchemas = new Schema({
  name: {
    type: String,
  },
  username: {
    type: String,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  avatar: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'disabled', 'blocked'],
    required: true,
  },
  about_me: {
    type: String,
  },
  evaluation_score: {
    type: Number,
    default: 0,
  },
  evaluation_count: {
    type: Number,
    default: 0,
  },
  point: {
    type: Number,
    default: 0,
  },
  authen: {
    type: String,
  },
  role: {
    type: String,
  },
}, {
  timestamps: true,
});

const validateSchemas = {
  name: Joi.string().regex(/(\w| )*/).min(4).max(30)
    .trim()
    .required(),
  username: Joi.string().min(6).max(30).required(),
  email: Joi.string().email().required(),
  avatar: Joi.string().required(),
  status: Joi.string().only(['active', 'inactive', 'disabled', 'blocked']).required(),
  about_me: Joi.string().min(0).max(1000).trim()
    .required(),
  phone: Joi.string().min(10).max(11).required(),
  point: Joi.number().min(0),
  evaluation_count: Joi.number().required(),
  evaluation_score: Joi.number().min(0).max(1).required(),
};
userSchemas.index({ name: 'text', phone: 'text' });
mongoose.model(modelName, userSchemas, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
};
