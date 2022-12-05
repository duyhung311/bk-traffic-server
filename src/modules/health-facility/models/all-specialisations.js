const mongoose = require('mongoose');

const modelName = "all_specialisations";

const AllSpecialisationsSchema = mongoose.Schema({
    _id : mongoose.Types.ObjectId, 
    specialisations: [String],
});

model = mongoose.model(modelName, AllSpecialisationsSchema);

module.exports = {
    //ValidateSchema: validateSchemas,
    Name: modelName,
    Model : model
}