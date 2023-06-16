const express = require("express");
const router = express.Router();

const atmController = require('../controllers/atm');

router.get("/get-atm-list", atmController.getAtmList);
router.get("/get-top-number-atm-list", atmController.getTopNumberAtmList);
router.get("/get-atm-near-your-location", atmController.getAtmNearYourLocation);
router.get("/search-atm", atmController.searchAtm);
router.post("/rating-atm", atmController.ratingAtm);

module.exports = router;