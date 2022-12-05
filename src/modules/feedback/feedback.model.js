const mongoose = require('mongoose');
const Joi = require('joi');
const modelNames = require('../../config/model-names');

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: modelNames.user,
    },
    message: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

mongoose.model(modelNames.feedback, schema, modelNames.feedback);

const ValidateSchema = {
  user: Joi.any(),
  message: Joi.string().required(),
  response: Joi.string(),
};

module.exports = {
  ValidateSchema,
};
