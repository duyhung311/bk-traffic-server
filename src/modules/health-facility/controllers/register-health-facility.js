const util = require("util");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const mongoose = require('mongoose');

const Model = require('../models');

const postRegister = async (req, res) => {
  var img_name = "";
  var storage = new GridFsStorage({
    url: process.env.DATABASE_URI,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
      //const match = ["image/png", "image/jpeg"];
      img_name = `${Date.now()}-registerHF-${file.originalname}`;
      //console.log(file.mimetype);
      // if (match.indexOf(file.mimetype) === -1) {
      //     return img_name;
      // }
      return {
          bucketName: process.env.IMGBUCKET,
          filename: `${img_name}`
      };
    }
  });
  var uploadFiles = multer({ storage: storage }).single("license_image");
  var uploadFilesMiddleware = util.promisify(uploadFiles);

  await uploadFilesMiddleware(req, res);
  
  var new_register = Model.RegisterHealthFacility.Model ({
    _id : new mongoose.Types.ObjectId(),
    partner_id: req.body.partner_id,
    name: req.body.name,
    address: req.body.address,
    work_time: req.body.work_time,
    specialisation: req.body.specialisation,
    service: req.body.service,
    phone_number: req.body.phone_number,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    license_img: img_name,
    state: req.body.state
  });

  new_register.save((err,result) => {
      if (err){
          res.send(err);
      }else{
          res.json(result);
      }
  });
    
};

const getAllRegister = async (req,res) => {
  Model.RegisterHealthFacility.Model.find({state : "processing"})
  .exec()
  .then(registers => {
    res.status(200).json(registers);
  })
  .catch(err => {
    res.status(500).json({
        error: err
    });
  });
};

const getLicenseImage = async (req,res) => {
  const db = mongoose.connection.db;
  var bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: process.env.IMGBUCKET });
  bucket.openDownloadStreamByName(req.query.license_img).pipe(res);
};

const updateState = async (req, res) => {
  const filter = req.query._id;
  const update = { state : req.query.state };
  const options = {
      new : true
  }
  Model.RegisterHealthFacility.Model.findByIdAndUpdate(filter, update,options)
  .exec()
  .then(result => {
      res.status(200).json(result);
  })
  .catch(err => {
      res.status(500).json({error: err});
  });
};

module.exports = {
  postRegister,
  getAllRegister,
  getLicenseImage,
  updateState
}