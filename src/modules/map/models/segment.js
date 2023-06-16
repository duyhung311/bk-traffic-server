const mongoose = require('mongoose');
const modelNames = require('../../../config/model-names');
const StreetModel = require('./street');
const NodeModel = require('./node');
const polygonSchema = require('./polygon-schema');

const { Schema } = mongoose;
const modelName = modelNames.segment;

const schema = new Schema({
  _id: {
    require: true,
    type: Number,
  },
  polyline: {
    type: polygonSchema,
    index: '2dsphere',
  },

  length: Number, // the length of segment, unit meter
  start_node: { // id of start node
    type: Number,
    ref: NodeModel.Name,
  },
  end_node: { // id of end node
    type: Number,
    ref: NodeModel.Name,
  },
  street: { // street id
    type: Number,
    required: true,
    ref: StreetModel.Name,
  },
  street_name: { // street id
    type: String,
  },
  street_type: { // street id
    type: String,
  },
  street_level: {
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
