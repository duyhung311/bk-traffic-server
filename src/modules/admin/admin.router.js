const { Router } = require('express');
const controller = require('./admin.controller');

const router = new Router();
const middleware = require('../../middlewares/auth');

router.get('/index', middleware.isAuthorizedWeb, controller.dashboard);
router.get('/customer', middleware.isAuthorizedWeb, controller.listUser);
router.post('/customer/handle', middleware.isAuthorizedWeb, controller.handleUser);
router.get('/partner', middleware.isAuthorizedWeb, controller.listPartner);
router.post('/partner/handle', middleware.isAuthorizedWeb, controller.handleUser);
router.get('/login', controller.login);
router.get('/logout', controller.logout);
router.post('/login', controller.loginAuthentication);
router.get('/voucher', middleware.isAuthorizedWeb, controller.listVoucher);
router.post('/voucher/handle', middleware.isAuthorizedWeb, controller.handleVoucher);
router.get('/advertisement', middleware.isAuthorizedWeb, controller.listAdvertisement);
router.post('/advertisement/handle', middleware.isAuthorizedWeb, controller.handleAdvertisement);
router.get('/offer', middleware.isAuthorizedWeb, controller.listOffer);
router.get('/deal', middleware.isAuthorizedWeb, controller.listDeal);
router.get('/feedback', middleware.isAuthorizedWeb, controller.listFeedback);
router.post('/feedback/handle', middleware.isAuthorizedWeb, controller.handleFeedback);
router.get('/card', middleware.isAuthorizedWeb, controller.listCard);
router.post('/card/handle', middleware.isAuthorizedWeb, controller.handleCard);
router.get('/gift', middleware.isAuthorizedWeb, controller.listGift);
router.post('/gift/handle', middleware.isAuthorizedWeb, controller.handleGift);
module.exports = router;
