const mongoose = require('mongoose');
const NodeModel = require('./node');
const modelName = require('../../../config/model-names');

const { Schema } = mongoose;

const schema = new Schema(
  {
    node: {
      // id of end node
      type: Number,
      ref: NodeModel.Name,
      required: true,
    },
    segments: {
      type: [Number],
      required: true,
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  {
    timestamps: true,
  },
);

const validateSchemas = {};

mongoose.model(modelName.NodesDirect, schema, modelName.NodesDirect);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName.NodesDirect,
};
