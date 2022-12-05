const mongoose = require('mongoose');
const Joi = require('joi');
const modelNames = require('../../config/model-names');

const schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: modelNames.user,
  },
  report: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: modelNames.segmentReport,
  },
  score: {
    type: Number,
    required: true,
    max: 1,
    min: 0,
  },
}, {
  timestamps: true,
});

mongoose.model(modelNames.evaluation, schema, modelNames.evaluation);

const ValidateSchema = {
  user: Joi.string().required(),
  report: Joi.string().required(),
  score: Joi.number().min(0).max(1).required(),
};

module.exports = {
  ValidateSchema,
};
