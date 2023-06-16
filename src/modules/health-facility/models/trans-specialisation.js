const mongoose = require('mongoose');

const modelName = "trans_specialisations";

const TransSpecialisationSchema = mongoose.Schema({
    _id : mongoose.Types.ObjectId, 
    ID_apimedic: Number,
    Name : String,
    Name_VN: [String]
});

model = mongoose.model(modelName,TransSpecialisationSchema);

module.exports = {
    //ValidateSchema: validateSchemas,
    Name: modelName,
    Model : model
}