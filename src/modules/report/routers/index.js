const express = require('express');
const segmentReport = require('./segment-report');
const speechReport = require('./speech-report');

const router = express.Router();

router.use('/report/segment', segmentReport);
router.use('/report/speech-report', speechReport);

module.exports = router;
