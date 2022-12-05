const passport = require('passport');
const passportJwt = require('passport-jwt');
const { ObjectId } = require('mongoose').Types;
const { BaseError, CodeError, ErrorType } = require('../core/error');

const { ExtractJwt } = passportJwt;
const { Strategy } = passportJwt;

function init() {
  passport.use(new Strategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.APP_SECRET_KEY || '123456',
  }, (payload, done) => {
    if (payload) {
      done(null, payload);
    } else {
      done(new Error('Token invalid'), null);
    }
  }));
}

function isAuthorizedUser(req, res, next) {
  passport.authenticate('jwt', { session: false }, (error, user) => {
    if (error) {
      next(new BaseError({ ...ErrorType.unauthorized, debugError: error }));
      return;
    }
    if (!user._id || !ObjectId.isValid(user._id)) {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }

    req.user = user;
    next();
  })(req, res, next);
}

function isAnyUser(req, res, next) {
  passport.authenticate('jwt', { session: false }, (error, user) => {
    req.user = {};
    if (error || !user._id || !ObjectId.isValid(user._id)) {
      next();
      return;
    }

    req.user = user;
    next();
  })(req, res, next);
}

function isAuthorizedAdmin(req, res, next) {
  passport.authenticate('jwt', { session: false }, (error, user) => {
    if (error) {
      next(new BaseError({ ...ErrorType.unauthorized, debugError: error }));
      return;
    }
    if (!user._id || !ObjectId.isValid(user._id) || !(user.role === 'admin')) {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }

    req.admin = user;
    next();
  })(req, res, next);
}

function isAuthorizedAdminUtraffic(req, res, next) {
  passport.authenticate('jwt', { session: false }, (error, user) => {
    if (error) {
      new CodeError({ ...ErrorType.unauthorized, debugError: error }).send(res);
      return;
    }
    if (!user._id || !ObjectId.isValid(user._id)) {
      new CodeError(ErrorType.unauthorized).send(res);
      return;
    }
    if (user.role !== 'admin-utraffic') {
      new CodeError(ErrorType.forbidden).send(res);
      return;
    }
    req.user = user;
    next();
  })(req, res, next);
}

function parseCookies(request) {
  const list = {};
  const rc = request.headers.cookie;

  // eslint-disable-next-line no-unused-expressions
  rc && rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });

  return list;
}

function isAuthorizedWeb(req, res, next) {
  const header = parseCookies(req);
  req.headers.authorization = `Bearer ${header.token}`;
  passport.authenticate('jwt', { session: false }, (error, user) => {
    if (error) {
      res.redirect('./login');
      // next(new BaseError({ ...ErrorType.unauthorized, debugError: error }))
      return;
    }
    if (!user._id || !ObjectId.isValid(user._id) || !(user.role === 'admin' || user.role === 'partner')) {
      res.redirect('./login');
      // next(new BaseError(ErrorType.unauthorized));
      return;
    }
    req.user = user;
    next();
  })(req, res, next);
}
module.exports = {
  init,
  isAuthorizedUser,
  isAuthorizedAdmin,
  isAuthorizedAdminUtraffic,
  isAnyUser,
  isAuthorizedWeb,
};
