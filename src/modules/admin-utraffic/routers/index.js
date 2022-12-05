const express = require('express');

const router = express.Router();
const trafficStatusRouter = require('./traffic-status.router');
const adminTrafficStatusConfig = require('./admin-traffic-status-config.router');

router.use('/admin-utraffic', trafficStatusRouter);
router.use('/admin-utraffic', adminTrafficStatusConfig);

module.exports = router;
