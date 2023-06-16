const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;
const UserModel = require('./user');

const modelName = 'Accounts';

const userSchemas = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: UserModel.Name,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  tp_id: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'disabled', 'blocked'],
    required: true,
  },
  type: {
    type: String,
    enum: ['google', 'facebook', 'password'],
    required: true,
  },
}, {
  timestamps: true,
});

const validateSchemas = {
  username: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(6).max(30).required(),
  type: Joi.string().required(),
  tp_id: Joi.string().required(),
  status: Joi.string().only(['active', 'inactive', 'disabled', 'blocked']).required(),
  type: Joi.string().only(['google', 'facebook', 'password']).required(),
};

mongoose.model(modelName, userSchemas, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
};
