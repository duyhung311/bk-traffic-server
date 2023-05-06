const mongoose = require('mongoose');
const modelNames = require('../../../../config/model-names');
const nodeOsm = require('./node-osm');
const wayOsm = require('./way-osm');
const { ObjectId } = require('../../../../core/database');
const modelName = modelNames.layerOsm;
const {Schema} = mongoose;
const Any = new Schema({ any: mongoose.Mixed });

const layerSchema = new Schema({
  id: {
    require: true,
    type: ObjectId,

  },
  name: {type: String},
  nodes: {
    type: [Number],
    ref: modelNames.nodeOsm,
  },
  ways: {
    type: [Object], blackbox: true 
  },
}, {
});

const validateSchemas = {
};

mongoose.model(modelName, layerSchema, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
};

