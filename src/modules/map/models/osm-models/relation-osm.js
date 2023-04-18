const memberOsm = require("./relation-osm-child/member-osm");
const mongoose = require('mongoose');
const modelNames = require('../../../../config/model-names');
const modelName = modelNames.relationOsm;
const {Schema} = mongoose;


const relationSchema = new Schema({
    id: {
        type: Number,
        require: true,
    },
    members :
    {
        type: [memberOsm],
    },
    tags: {type: String},
    info: {type: String},
})

const validateSchemas = {
};

mongoose.model(modelName, relationSchema, modelName);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelName,
};
