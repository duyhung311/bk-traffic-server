const Model = require('../models');

const getAtmList = async (req,res) => { 
    Model.Atm.Model
        .find({}).limit()
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));
};

const getTopNumberAtmList = async (req, res) => {
    Model.Atm.Model
        .find({}).sort({ number_atm: -1 }).limit(10)
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));
};

const getAtmNearYourLocation = async (req, res) => {
    const { latitude, longitude } = req.query;
    Model.Atm.Model
        .find({ location: { $nearSphere: [longitude, latitude], $maxDistance: 0.1 } })
        .limit(10)
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));
};

const searchAtm = async (req, res) => {
    const { name, latitude, longitude } = req.query;
    Model.Atm.Model
        .find({
            $and: [
                {
                    "$or": [
                        { "name": { $regex: new RegExp('.*' + name.toLowerCase() + '.*', "i") } },
                        { "address": { $regex: new RegExp('.*' + name.toLowerCase() + '.*', "i") } }
                    ]
                },
                {
                    location: { $nearSphere: [longitude, latitude], $maxDistance: 0.1 }
                }
            ]
        })
        .limit(20)
        .exec()
        .then((o) => res.status(200).json(o))
        .catch((e) => res.status(500).json(e));
};

const ratingAtm = async (req, res, next) => {
    try {
        const atm = await Model.Atm.Model.findById(req.body.id).exec();
        let newRate = req.body.rate;
        let newNumberOfRate = 1;
        if (atm.rate != null) {
            newRate = (atm.rate * atm.numberOfRate + req.body.rate) / (atm.numberOfRate + 1)
            newNumberOfRate = atm.numberOfRate + 1
        }

        newRate = Number((newRate).toFixed(1));

        const o = await Model.Atm.Model.findByIdAndUpdate(req.body.id,
            { rate: newRate, numberOfRate: newNumberOfRate }).exec();
        res.status(200).json(o);
    } catch (err) {
        res.status(500).json({
            error: err
        });
    }
};

module.exports = {
    getAtmList,
    getTopNumberAtmList,
    getAtmNearYourLocation,
    searchAtm,
    ratingAtm
}