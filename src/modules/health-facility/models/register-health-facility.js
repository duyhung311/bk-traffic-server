var mongoose = require('mongoose');
  
const modelName = 'Register_Health_Facilities';

var RegisterHealthFacilitySchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    partner_id: String,
    name: String,
    address: String,
    work_time: String,
    specialisation: [String],
    service: String,
    phone_number: String,
    latitude: Number,
    longitude: Number,
    license_img:String,
    state:String
});
  
model = mongoose.model(modelName, RegisterHealthFacilitySchema);

module.exports = {
    //ValidateSchema: validateSchemas,
    Name: modelName,
    Model : model
}