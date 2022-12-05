const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;
const { speechReportScript } = require('../../../config/model-names');

const schema = new Schema(
  {
    _id: {
      require: true,
      type: Number,
    },
    script: String,
    label: String,
  },
  {
    timestamps: true,
  },
);

const validateSchemas = {
  _id: Joi.number().integer().positive().required(),
  script: Joi.string().required(),
};

mongoose.model(speechReportScript, schema, speechReportScript);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: speechReportScript,
};
