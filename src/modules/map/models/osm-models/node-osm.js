const mongoose = require('mongoose');
const modelNames = require('../../../../config/model-names');
const modelName = modelNames.nodeOsm;
const {Schema} = mongoose;

const schema = new Schema({
  id: {
    require: true,
    type: Number,
  },
  version: {
    type: Number,
    require: true,
  },
  lat: {
    type: Number,
    require: true,
    index: true,
  },
  lon: {
    type: Number,
    require: true,
    index: true,
  },
  tags: {type: String},
  info: {type: String},
  updateTime: {
    type: Date,
    require: true,
  },
  refWay: {type: [Number]},
  layer: {type: [String]},
}, {
  
});

const validateSchemas = {
};

mongoose.model(modelName, schema, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
  NodeSchema: schema,
};
