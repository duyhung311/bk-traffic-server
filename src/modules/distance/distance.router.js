const { Router } = require('express');
const controller = require('./distance.controller');

const router = new Router();
const middleware = require('../../middlewares/auth');

router.get('/get-distance', middleware.isAuthorizedUser, controller.getDistance);

module.exports = router;
