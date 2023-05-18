const express = require('express');

const router = express.Router();
const controller = require('../controllers/segment');

router.get('/find-near', controller.user.findNear);
router.get('/direct',controller.user.direct);
router.get('/find-street', controller.user.findStreet);
router.get('/dynamic-routing', controller.user.dynamicRouting);
router.get('/get-current-capacity', controller.user.getCurrentCapacity);
router.post('/fetch-layers', controller.user.fetchLayer)

// adding OSM data to Mongo
router.get('/pbf', controller.user.readPbf);
router.get('/layers', controller.user.insertLayers)
router.get('/add-bound-to-way', controller.user.addBoundToWay);
module.exports = router;
