const express = require('express');

const router = express.Router();

const path = require('path');
const controller = require('../controllers/voucher');
const middleware = require('../../../middlewares/auth');

const { routes } = require('../../../../app');

router.get('/gettopvoucher', controller.voucher.getTopVoucher);
router.get('/gettrendvoucher', controller.voucher.getTrendVoucher);
router.get('/getalltopvoucher', controller.voucher.getAllTopVoucher);
router.get('/getalltrendvoucher', controller.voucher.getAllTrendVoucher);
router.get('/getdetailvoucher', controller.voucher.getDetailVoucher);
router.get('/getinfopaymentvoucher', middleware.isAuthorizedUser, controller.voucher.getInfoPaymentVoucher);
router.post('/confirmpaymentvoucher', middleware.isAuthorizedUser, controller.voucher.confirmPaymentVoucher);
router.get('/getsearchvoucher', controller.voucher.getSearchVoucher);
router.get('/getmyvoucher', middleware.isAuthorizedUser, controller.voucher.getMyVoucher);
router.get('/getdetailmyvoucher', middleware.isAuthorizedUser, controller.voucher.getDetailMyVoucher);
router.get('/getinfovoucher', middleware.isAuthorizedUser, controller.voucher.getInfoVoucher);

module.exports = router;
