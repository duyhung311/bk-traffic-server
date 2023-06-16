const mongoose = require('mongoose');
const modelNames = require('../../../config/model-names');

const { Schema } = mongoose;
const modelName = modelNames.street;

const schema = new Schema({
  _id: {
    require: true,
    type: Number,
  },
  name: String,
  type: {
    type: String,
    index: true,
  },
  max_velocity: {
    type: Number,
    default: 40,
  },
  level: {
    type: Number,
    index: true,
  },
}, {
  timestamps: true,
});

const validateSchemas = {
};

mongoose.model(modelName, schema, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
};
