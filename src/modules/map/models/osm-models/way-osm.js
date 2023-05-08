const mongoose = require('mongoose');
const modelNames = require('../../../../config/model-names');
const modelName = modelNames.wayOsm;
const {Schema} = mongoose;

const waySchema = new Schema({
  id: {
    require: true,
    type: Number,
  },
  refs: {
    type: [Number],
  },
  tags: {type: Object, blackbox: true },
  maxLat: Number,
  minLat: Number,
  maxLon: Number,
  minLon: Number,
}, {
  
});

const validateSchemas = {
};

mongoose.model(modelName, waySchema, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
};