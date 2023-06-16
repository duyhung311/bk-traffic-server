const _ = require('lodash');
const Logger = require('../../../core/logger');
const {
  BaseError,
  CodeError,
  ErrorType,
  Reason,
} = require('../../../core/error');
const Facebook = require('../../../core/facebook');
const Token = require('../../../core/token');
const Util = require('../../../core/utils');
const { ResponseFactory } = require('../../../core/response');
const Google = require('../../../core/google');
const Setting = require('../../../config/setting');
const Service = require('../services');
const distanceModule = require('../../distance');
/**
 * User auth
 */
const user = {
  async loginWithFacebook(req, res, next) {
    try {
      const fbId = req.body.facebook_id;
      const fbToken = req.body.facebook_token;
      if (!fbId || !fbToken) {
        next(
          new BaseError(ErrorType.badRequest)
            .addError('facebook_id', Reason.required)
            .addError('facebook_token', Reason.required),
        );
        return;
      }

      const facebookInfo = await Facebook.getUserInfo(fbId, fbToken);
      Logger.info(`Facebook result: ${JSON.stringify(facebookInfo)}`);
      if (!facebookInfo || facebookInfo.id != fbId) {
        next(
          new BaseError(ErrorType.badRequest)
            .addError('facebook_id', Reason.incorrect)
            .addError('facebook_token', Reason.incorrect),
        );
        return;
      }

      const existed = await Service.Account.findOne({ tp_id: fbId }, 'user');
      if (existed) {
        const { user } = existed;

        user.access_token = Token.createJwtToken({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        });

        ResponseFactory.success(user).send(res);
      } else {
        const info = {};
        info.name = facebookInfo.name;
        info.email = facebookInfo.email;
        // info.email = undefined;
        info.avatar = `https://graph.facebook.com/${fbId}/picture?type=large`;
        info.status = 'active';

        const user = await Service.User.insertOne(info);
        const account = await Service.Account.insertOne(
          {
            tp_id: fbId,
            user: user._id,
            status: 'active',
            type: 'facebook',
          },
          true,
        );
        user.access_token = Token.createJwtToken({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        });

        const distanceData = {
          user: user._id,
          distance: 0,
          point_received: 0,
          last_time_updated: user.createdAt,
        };
        await distanceModule.Service.insertOne(distanceData);

        ResponseFactory.success(user).send(res);
      }
    } catch (error) {
      next(error);
    }
  },

  async loginWithGoogle(req, res, next) {
    try {
      const { google_token, google_id } = req.body;
      if (!google_id || !google_token) {
        next(
          new BaseError(ErrorType.badRequest)
            .addError('google_id', Reason.required)
            .addError('google_token', Reason.required),
        );
        return;
      }

      const validToken = await Google.validateToken(google_id, google_token);
      if (!validToken) {
        // const userData = await Google.getUserInfoWithGoogleServerToken(google_token);
        // if (!userData) {
        next(
          new BaseError(ErrorType.badRequest)
            .addError('google_id', Reason.incorrect)
            .addError('google_token', Reason.incorrect),
        );
        return;
        // }
        // Logger.info('Google data %o', userData);
        // return;
      }

      const existed = await Service.Account.findOne(
        { tp_id: google_id },
        'user',
      );
      if (existed) {
        const { user } = existed;

        user.access_token = Token.createJwtToken({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        });

        ResponseFactory.success(user).send(res);
      } else {
        const googleInfo = await Google.getGoogleUser(google_token);
        Logger.info('Google info');
        Logger.info(googleInfo);
        if (!googleInfo) {
          next(
            new BaseError(ErrorType.serviceError).setMessage(
              'Google service error',
            ),
          );
          return;
        }

        const requireFields = ['name', 'email', 'avatar', 'status'];
        const info = {};
        info.name = googleInfo.name;
        info.email = googleInfo.email;
        info.avatar = googleInfo.picture;
        info.status = 'active';

        const user = await Service.User.insertOne(info);
        const account = await Service.Account.insertOne(
          {
            tp_id: google_id,
            user: user._id,
            status: 'active',
            type: 'google',
          },
          true,
        );

        user.access_token = Token.createJwtToken({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        });

        const distanceData = {
          user: user._id,
          distance: 0,
          point_received: 0,
          last_time_updated: user.createdAt,
        };
        await distanceModule.Service.insertOne(distanceData);

        ResponseFactory.success(user).send(res);
      }
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const { error, value } = Service.Account.validate(
        { username, password },
        ['username', 'password'],
      );
      if (error) {
        next(error);
        return;
      }

      const account = await Service.Account.findOne({ username }, 'user');
      if (account) {
        const same = await Util.comparePassword(password, account.password);
        if (same) {
          const { user } = account;
          delete user.password;
          user.access_token = Token.createJwtToken({
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
          });
          ResponseFactory.success(user).send(res);
          return;
        }
      }

      next(
        new BaseError({
          ...ErrorType.badRequest,
          message: 'Username/password is incorrect',
        }),
      );
    } catch (error) {
      next(error);
    }
  },
  async register(req, res, next) {
    try {
      const requireFields = ['username', 'password'];
      const info = _.pick(req.body, requireFields);

      const { error, value } = Service.Account.validate(info, requireFields);
      if (error) {
        next(error);
        return;
      }

      const existed = await Service.Account.findOne({
        username: value.username,
        type: 'password',
      });
      if (existed) {
        next(
          new BaseError(ErrorType.badRequest).addError(
            'username',
            Reason.duplicated,
          ),
        );
        return;
      }

      const optionalFields = ['name', 'email', 'phone', 'avatar'];
      const userData = {};
      const existedFields = [];
      optionalFields.forEach((item) => {
        if (req.body[item]) {
          userData[item] = req.body[item];
          existedFields.push(item);
        }
      });
      userData.status = 'active';
      userData.username = value.username;
      const user = await Service.User.insertOne(userData);

      const accountData = {
        user: user._id,
        username: value.username,
        password: await Util.hashPassword(value.password),
        status: 'active',
        type: 'password',
      };
      const account = await Service.Account.insertOne(accountData, true);

      const distanceData = {
        user: user._id,
        distance: 0,
        point_received: 0,
        last_time_updated: user.createdAt,
      };
      await distanceModule.Service.insertOne(distanceData);
      delete account.password;
      ResponseFactory.success(account).send(res);
    } catch (error) {
      next(error);
    }
  },

  async sendResetPasswordEmail(req, res, next) {
    try {
      const { email } = req.body;
      const { error, value } = Service.Account.validate(
        ModelName.user,
        { email },
        ['email'],
      );
      if (error) {
        next(error);
        return;
      }

      const account = await Service.Account.findOne(
        { email, type: 'password' },
        'user',
      );

      if (!account || !account.user) {
        next(
          new BaseError({
            ...ErrorType.badRequest,
            message: "Email doesn't exists.",
          }),
        );
        return;
      }

      const { user } = account;
      // send mail
      const token = Token.createJwtToken({
        exp: Math.floor(Date.now() + 60 * 60000),
        data: { id: user._id, email: user.email },
        type: 'password',
      });
      MailSender.sendResetPasswordEmail(user.email, token).then((result) => {
        Logger.info('Send mail successfully');
      });

      ResponseFactory.success({ message: 'Success' }).send(res);
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { password, email, token } = req.body;

      const { error, value } = Service.Account.validate({ password, email }, [
        'password',
        'email',
      ]);

      if (error) {
        next(error);
        return;
      }
      const data = Token.getDataFromJwtToken(token);
      Logger.info(`Token data: ${JSON.stringify(data)}`);
      if (
        Date.now() < data.exp
        && data.data.email === email
        && data.type === 'password'
      ) {
        const hashPassword = await Util.hashPassword(password);
        await Service.Account.updateOne(
          { email, type: 'password' },
          { password: hashPassword },
        );
        ResponseFactory.success({ message: 'Success' }).send(res);
      } else {
        next(
          new BaseError({
            ...ErrorType.unauthorized,
            message: 'Token is invalid',
          }),
        );
        return;
      }
    } catch (error) {
      next(error);
    }
  },
};

const adminUtraffic = {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const { error, value } = Service.Account.validateInput(
        { username, password },
        ['username', 'password'],
      );
      if (error) {
        error.send(res);
        return;
      }

      const account = await Service.Account.findOne({ username }, 'user');
      if (account) {
        const same = await Util.comparePassword(password, account.password);
        if (same) {
          const { user } = account;
          delete user.password;
          if (!user.role || user.role !== 'admin-utraffic') {
            new CodeError({
              ...ErrorType.unauthorized,
              message: 'Unauthorized',
            }).send(res);
            return;
          }
          user.access_token = Token.createJwtToken({
            _id: user._id,
            username: user.username,
            role: user.role,
          });
          ResponseFactory.success(user).send(res);
          return;
        }
      }
      new CodeError({
        ...ErrorType.badRequest,
        message: 'Username/password is incorrect',
      }).send(res);
    } catch (error) {
      Logger.error(error.message);
      next(error);
    }
  },
  async getInfo(req, res, next) {
    try {
      const { username, role } = req.user;
      const user = await Service.User.findOne({ username, role });
      if (!user) {
        new CodeError({
          ...ErrorType.unauthorized,
          message: 'Unauthorized',
        }).send(res);
        return;
      }
      ResponseFactory.success(user).send(res);
    } catch (error) {
      Logger.error(error.message);
      next(error);
    }
  },
};

/**
 * Admin auth
 */
const admin = {
  async login(req, res, next) {},
};

module.exports = {
  user,
  admin,
  adminUtraffic,
};
