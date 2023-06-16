const express = require('express');
const router = express.Router();
const health_facilities = require('./health-facilities');
const register_health_facility = require('./register-health-facility');

router.use('/health-facilities',health_facilities);
router.use('/register-health-facility',register_health_facility);

module.exports = router;