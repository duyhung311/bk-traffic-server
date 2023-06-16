const express = require('express');
const router = express.Router();

const healthFacilitiesController = require('../controllers/health-facilities');

router.get("/by-specialisation", healthFacilitiesController.getHealthFacilityBySpecialisation);
router.get("/by-specialisationIDs", healthFacilitiesController.getHealthFacilityBySpecialisationIDs);
router.get("/by-partnerid", healthFacilitiesController.getHealthFacilityByPartnerId);
router.get("/diagnosis", healthFacilitiesController.diagnosis);
router.get("/all-symptoms", healthFacilitiesController.getAllSymptoms);
router.get("/all-specialisations", healthFacilitiesController.getAllSpecialisations);
router.post("/create", healthFacilitiesController.postHealthFacility);
router.patch("/update", healthFacilitiesController.updateHealthFacility);
//router.patch("/add-comment", healthFacilitiesController.addComment);
router.get("/get-all-health-facilities", healthFacilitiesController.getAllHealthFacilities);
router.post("/comment", healthFacilitiesController.comment);
router.post("/comment/like", healthFacilitiesController.commentLike);
router.post("/comment/status-send", healthFacilitiesController.commentStatusSend);
router.post("/report", healthFacilitiesController.report);
router.get("/get-nearest-health-facilities", healthFacilitiesController.getNearestHealthFacilities);
router.get("/search-health-facility", healthFacilitiesController.searchHealthFacility);
router.post("/rating-health-facility", healthFacilitiesController.ratingHealthFacility);

module.exports = router;