const express = require('express');

const router = express.Router();
const controller = require('./location-history.controller');
const middleware = require('../../middlewares/auth');

router.get(
  '/location-history/get',
  middleware.isAuthorizedUser,
  controller.getMyHistories,
);

router.get(
  '/location-history/paths',
  middleware.isAuthorizedUser,
  controller.getMyPaths,
);

module.exports = router;
