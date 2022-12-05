const mongoose = require('mongoose');
const locationSchema = require('./location-schema');
const modelNames = require('../../../config/model-names');

const { Schema } = mongoose;
const modelName = modelNames.node;

const schema = new Schema({
  _id: {
    require: true,
    type: Number,
  },
  location: {
    type: locationSchema,
    index: '2dsphere',
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
