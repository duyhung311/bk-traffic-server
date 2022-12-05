const express = require('express');

const router = express.Router();
const controller = require('../controllers/auth');
const middleware = require('../../../middlewares/auth');

router.post('/login-with-facebook', controller.user.loginWithFacebook);

router.post('/login-with-google', controller.user.loginWithGoogle);

router.post('/login', controller.user.login);

router.post('/admin-utraffic/login', controller.adminUtraffic.login);

router.get('/admin-utraffic/me', middleware.isAuthorizedAdminUtraffic, controller.adminUtraffic.getInfo);

router.post('/register', controller.user.register);

router.post('/send-reset-password-email', controller.user.sendResetPasswordEmail);

router.post('/reset-password', controller.user.resetPassword);

router.post('/admin/login', controller.admin.login);

module.exports = router;
