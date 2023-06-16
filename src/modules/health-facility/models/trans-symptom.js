const mongoose = require('mongoose');

const modelName = "trans_symptoms";

const TransSymptomSchema = mongoose.Schema({
    _id : mongoose.Types.ObjectId, 
    ID_apimedic: Number,
    Name : String,
    Name_VN: String
});

model = mongoose.model(modelName,TransSymptomSchema);

module.exports = {
    //ValidateSchema: validateSchemas,
    Name: modelName,
    Model : model
}