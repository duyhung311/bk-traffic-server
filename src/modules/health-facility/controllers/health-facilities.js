const axios = require('axios');
const mongoose = require('mongoose');

const Database = require('../../../core/database');
const Model = require('../models');

const getToken = require('../services/authorization.js');

const getHealthFacilityBySpecialisation = async (req, res) => {
    Model.HealthFacility.Model.find({ specialisation: { $in: req.query.specialisation } })
        .exec()
        .then(docs => {
            res.status(200).json(docs);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });

    // try{
    //     const query = {specialisation : req.query.specialisation};
    //     var result = await Database.findMany(Model.HealthFacility.Name,query);
    //     res.status(200).json(result);
    // }catch (err){
    //     res.status(500).json({error: err});
    // }
};

const getHealthFacilityBySpecialisationIDs = async (req, res) => {
    Model.TransSpecialisation.Model.find({ ID_apimedic: { $in: req.query.specialisationIds } })
        .exec()
        .then(transSpecialisations => {
            var nameVNs = []
            transSpecialisations.forEach(element => {
                Array.prototype.push.apply(nameVNs, element.Name_VN);
            })
            return new Promise(function (resolve, reject) {
                resolve(nameVNs);
            });
        })
        .then(nameVNs => {
            Model.HealthFacility.Model.find({ specialisation: { $in: nameVNs } })
                .exec()
                .then(docs => {
                    res.status(200).json(docs);
                })
                .catch(err => {
                    res.status(500).json({
                        error: err
                    });
                });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
};

const getHealthFacilityByPartnerId = async (req, res) => {
    Model.HealthFacility.Model.find({ partner_id: req.query.partner_id })
        .exec()
        .then(docs => {
            res.status(200).json(docs);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
};

const diagnosis = async (req, res) => {
    Model.TransSymptom.Model.find({ Name_VN: { $in: req.query.symptoms } }, { ID_apimedic: 1, _id: 0 })
        .exec()
        .then(response => {
            var ID_apimedics = [];
            response.forEach(element => {
                ID_apimedics.push(element.ID_apimedic);
            });
            return new Promise(function (resolve, reject) {
                resolve(ID_apimedics);
            });
        })
        .then(ID_apimedics => {
            getToken().then(token => {
                axios.get('https://healthservice.priaid.ch/diagnosis', {
                    params: {
                        token: token,
                        symptoms: JSON.stringify(ID_apimedics),
                        gender: req.query.gender,
                        year_of_birth: req.query.year_of_birth,
                        language: "en-gb"
                    }
                })
                    .then(response => {
                        Promise.all(response.data.map(element => {
                            return new Promise(function (resolve, reject) {
                                var specialisationIds = [];
                                element.Specialisation.forEach(spec => {
                                    specialisationIds.push(spec.ID);
                                });

                                var options = {
                                    method: 'POST',
                                    url: 'https://microsoft-translator-text.p.rapidapi.com/translate',
                                    params: { to: 'vi', 'api-version': '3.0', profanityAction: 'NoAction', textType: 'plain' },
                                    headers: {
                                        'content-type': 'application/json',
                                        'x-rapidapi-host': 'microsoft-translator-text.p.rapidapi.com',
                                        'x-rapidapi-key': process.env.MICROSOFT_TRANSLATOR_KEY
                                    },
                                    data: [{ Text: element.Issue.Name }]
                                };
                        
                                axios.request(options).then(function (response) {
                                    resolve({
                                        name: response.data[0].translations[0].text,
                                        specialisationIds: specialisationIds,
                                        accuracy: element.Issue.Accuracy.toFixed(1),
                                    });
                                }).catch(function (error) {
                                    console.error(error);
                                });
                            });
                        }))
                            .then(response => { res.status(200).json(response); })
                    })
                    .catch(err => {
                        res.status(500).json({
                            error: err
                        });
                    });
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
};

const getAllSymptoms = async (req, res) => {
    Model.TransSymptom.Model.find()
        .exec()
        .then(symptoms => {
            var VN_name_symptoms = [];
            symptoms.forEach(element => {
                VN_name_symptoms.push(element.Name_VN);
            });
            res.status(200).json(VN_name_symptoms);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
};

const getAllSpecialisations = async (req, res) => {
    Model.AllSpecialisations.Model.findOne()
        .exec()
        .then(result => {
            res.status(200).json(result.specialisations);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
};

const postHealthFacility = async (req, res) => {
    var new_health_facility = Model.HealthFacility.Model({
        _id: new mongoose.Types.ObjectId(),
        partner_id: req.query.partner_id,
        name: req.query.name,
        address: req.query.address,
        work_time: req.query.work_time,
        specialisation: req.query.specialisation,
        service: req.query.service,
        phone_number: req.query.phone_number,
        latitude: req.query.latitude,
        longitude: req.query.longitude,
        license_img: req.query.license_img
    });
    new_health_facility.save((err, result) => {
        if (err) {
            res.send(err);
        } else {
            res.json(result);
        }
    });
};

const updateHealthFacility = async (req, res) => {
    const filter = req.query.health_facility_id;
    const update = {
        name: req.query.name,
        address: req.query.address,
        work_time: req.query.work_time,
        specialisation: req.query.specialisation,
        service: req.query.service,
        phone_number: req.query.phone_number,
        latitude: req.query.latitude,
        longitude: req.query.longitude
    };
    const options = {
        new: true
    };
    Model.HealthFacility.Model.findByIdAndUpdate(filter, update, options)
        .exec()
        .then(result => {
            res.status(200).json(result);
        })
        .catch(err => {
            res.status(500).json({ error: err });
        });
};

// const addComment = async (req, res) => {
//     var new_comment = {
//         user_id : req.query.user_id,
//         user_name: req.query.user_name,
//         content: req.query.content
//     }
//     const filter = req.query.health_facility_id;
//     const update = { $push : { comments : new_comment }};
//     const options = {
//         new : true
//     };
//     Model.HealthFacility.Model.findByIdAndUpdate(filter, update,options)
//     .exec()
//     .then(result => {
//         res.status(200).json(result);
//     })
//     .catch(err => {
//         res.status(500).json({error: err});
//     });
// };

const getAllHealthFacilities = async (req, res, next) => {
    Model.HealthFacility.Model.find({})
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));

};

const comment = async (req, res, next) => {
    console.log(req.body);
    Model.HealthFacility.Model.findByIdAndUpdate(req.body.id, { $push: { comment: { ...req.body.comment, statusSend: 0, like: 0 } } })
        .exec()
        .then(o => {
            res.status(200).json(o);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        })
};

const commentLike = async (req, res, next) => {
    try {
        const facility = await Model.HealthFacility.Model.findById(req.body.id).exec();
        facility.comment[req.body.like.comment].like += 1;
        const o = await Model.HealthFacility.Model.findByIdAndUpdate(req.body.id, { comment: facility.comment }).exec();
        res.status(200).json(o);
    }
    catch (err) {
        res.status(500).json({
            error: err
        });
    }
};

const commentStatusSend = async (req, res, next) => {
    try {
        const facility = await healthFacilityModel.findById(req.body.id).exec();
        facility.comment[req.body.statusSend.comment].statusSend += 1;
        const o = await healthFacilityModel.findByIdAndUpdate(req.body.id, { comment: facility.comment }).exec();
        res.status(200).json(o);
    }
    catch (err) {
        res.status(500).json({
            error: err
        });
    }
};

const report = async (req, res, next) => {
    console.log(req.body);
    Model.HealthFacility.Model.findByIdAndUpdate(req.body.id, { $push: { report: { ...req.body.report } } },
        { returnOriginal: false })
        .exec()
        .then(o => {
            res.status(200).json(o);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        })
};

const getNearestHealthFacilities = async (req, res, next) => {
    const { latitude, longitude } = req.query;
    Model.HealthFacility.Model
        .find({ location: { $nearSphere: [longitude, latitude], $maxDistance: 0.1 } })
        .limit(50)
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));
};

const searchHealthFacility = async (req, res, next) => {
    const { name } = req.query;
    Model.HealthFacility.Model
        .find({
            "$or": [
                { "name": { $regex: new RegExp('.*' + name.toLowerCase() + '.*', "i") } },
                { "address": { $regex: new RegExp('.*' + name.toLowerCase() + '.*', "i") } }
            ]
        })
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));
};

const ratingHealthFacility = async (req, res, next) => {
    try {
        const facility = await Model.HealthFacility.Model.findById(req.body.id).exec();
        let newRate = req.body.rate;
        let newNumberOfRate = 1;
        if (facility.rate != null) {
            newRate = (facility.rate * facility.numberOfRate + req.body.rate) / (facility.numberOfRate + 1)
            newNumberOfRate = facility.numberOfRate + 1
        }

        newRate = Number((newRate).toFixed(1));

        const o = await Model.HealthFacility.Model.findByIdAndUpdate(req.body.id,
            { rate: newRate, numberOfRate: newNumberOfRate }).exec();
        res.status(200).json(o);
    } catch (err) {
        res.status(500).json({
            error: err
        });
    }
};

module.exports = {
    getHealthFacilityBySpecialisation,
    getHealthFacilityBySpecialisationIDs,
    getHealthFacilityByPartnerId,
    diagnosis,
    getAllSymptoms,
    getAllSpecialisations,
    postHealthFacility,
    updateHealthFacility,
    //addComment
    getAllHealthFacilities,
    comment,
    commentLike,
    commentStatusSend,
    report,
    getNearestHealthFacilities,
    searchHealthFacility,
    ratingHealthFacility,

}