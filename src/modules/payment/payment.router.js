const { Router } = require('express');
const controller = require('./payment.controller');

const router = new Router();
const middleware = require('../../middlewares/auth');

router.post('/paymentrequest', middleware.isAuthorizedUser, controller.paymentRequest);

module.exports = router;
