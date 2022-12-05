const express = require('express');
const router = express.Router();

const registerHealthFacilityController = require('../controllers/register-health-facility');

router.post('/register',registerHealthFacilityController.postRegister);
router.get('/all-register',registerHealthFacilityController.getAllRegister);
router.get('/register-image',registerHealthFacilityController.getLicenseImage);
router.patch('/update-state',registerHealthFacilityController.updateState);

module.exports = router;