const express = require('express');
const compression = require('compression');

const router = express.Router();
const controller = require('./traffic-status.controller');

router.get(
  '/traffic-status/get-status',
  compression({ level: 9 }),
  controller.getTrafficStatus,
);

router.get(
  '/traffic-status/get-status-v2',
  controller.getTrafficStatusV2,
);

module.exports = router;
