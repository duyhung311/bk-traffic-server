const formidable = require('formidable');
const _ = require('lodash');
const mongoose = require('mongoose');
const { Reason, ErrorType, BaseError } = require('../../core/error');
const Setting = require('../../config/setting');
const UserModel = require('../user');
const VoucherModel = require('../voucher');
const OfferModel = require('../offer');
const DealModel = require('../deal');
const AdvertisementModel = require('../advertisement');
const Util = require('../../core/utils');
const Token = require('../../core/token');
const { User } = require('../user/models');
const { Deal } = require('../deal/models');
const { Advetisement } = require('../advertisement/models');
const { ObjectId } = require('../../core/database');
const feedbackService = require('../feedback/feedback.service');
const cardService = require('../card/card.service');
const giftService = require('../gift/gift.service');
const { ResponseFactory } = require('../../core/response');
const { request } = require('../../../app');

async function listUser(req, res, next) {
  try {
    if (req.user.role == 'admin') {
      const user = await UserModel.Service.User.findMany({ role: null });
      res.render('./template/customer.html', { user, name: 'admin', role: req.user.role });
    } else {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }
  } catch (error) {
    next(error);
  }
}

async function listPartner(req, res, next) {
  try {
    if (req.user.role == 'admin') {
      const user = await UserModel.Service.User.findMany({ role: 'partner' });
      res.render('./template/customer.html', { user, name: 'admin', role: req.user.role });
    } else {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }
  } catch (error) {
    next(error);
  }
}

async function dashboard(req, res, next) {
  var today = new Date();
  var myToday = new Date();
  myToday.setFullYear(today.getFullYear(), today.getMonth(), 1);
  const myBefor = new Date();
  myBefor.setFullYear(today.getFullYear(), today.getMonth() - 7, 1);
  list_in = [''];

  try {
    if (req.user.role == 'admin') {
      const total_user = await mongoose.model(User.Name).aggregate([{ $count: 'user' }]);

      const total_distance = await mongoose.model('Distances').aggregate([{
        $group: {
          _id: null,
          total: {
            $sum: '$distance',
          },
        },
      }]);
      const total_point = await mongoose.model(User.Name).aggregate([{
        $group: {
          _id: null,
          total: {
            $sum: '$point',
          },
        },
      }]);

      var today = new Date();
      var myToday = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 0, 0);
      var beforeDay = new Date(today.getUTCFullYear(), today.getUTCMonth() - 6, today.getUTCDate(), 0, 0, 0);
      myToday.setUTCHours(23);
      myToday.setUTCMinutes(59);
      beforeDay.setUTCHours(0);
      beforeDay.setUTCDate(1);
      console.log(myToday);

      const resultIn = await mongoose.model(Deal.Name).aggregate([
        {
          $match: {
            createdAt: {
              $gte: myBefor,
              $lt: myToday,
            },
            receive_id: null,
          },
        },
        {

          $group: {
            _id: {

              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            pointIn: { $sum: '$point' },
            first: { $min: '$createdAt' },

          },
        },

        { $sort: { _id: 1 } },
        { $project: { month: '$first', pointIn: 1, _id: 0 } },
      ]);

      const resultOut = await mongoose.model(Deal.Name).aggregate([
        {
          $match: {
            createdAt: {
              $gte: myBefor,
              $lt: myToday,
            },
            send_id: null,

          },
        },
        {

          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            pointOut: { $sum: '$point' },
            first: { $min: '$createdAt' },

          },
        },

        { $sort: { _id: 1 } },
        { $project: { month: '$first', pointOut: 1, _id: 0 } },
      ]);

      list_month = [];
      list_in = [];
      list_out = [];
      var i = beforeDay.getUTCMonth();
      var str_time = `${beforeDay.getUTCDate()}/${beforeDay.getUTCMonth() + 1}/${beforeDay.getUTCFullYear()} - ${today.getUTCDate()}/${today.getUTCMonth() + 1}/${today.getUTCFullYear()}`;
      console.log(str_time);
      var leng_month = i + 7;
      for (; i < leng_month; i++) {
        var date_current = new Date(beforeDay.getUTCFullYear(), i, 2, 0, 0, 0);
        list_month.push(`Tháng ${date_current.getUTCMonth() + 1}`);

        result1 = resultIn.find((itmInner) => itmInner.month.getUTCMonth() === date_current.getUTCMonth());

        if (result1 == null) {
          list_in.push(0);
        } else {
          list_in.push(result1.pointIn);
        }

        result2 = resultOut.find((itmInner) => itmInner.month.getUTCMonth() === date_current.getUTCMonth());

        if (result2 == null) {
          list_out.push(0);
        } else {
          list_out.push(result2.pointOut);
        }
      }
      console.log(resultIn);
      console.log(resultOut);

      res.render('./template/dashboard.html', {
        role: req.user.role, user: total_user[0].user, distance: ~~total_distance[0].total, point: total_point[0].total, list_month, list_out, list_in, str_time,
      });
    } else {
      const result_point = await UserModel.Service.User.findOne({ _id: req.user._id });

      var today = new Date();
      var myToday = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 0, 0);
      var beforeDay = new Date(today.getUTCFullYear(), today.getUTCMonth() - 6, today.getUTCDate(), 0, 0, 0);
      myToday.setUTCHours(23);
      myToday.setUTCMinutes(59);
      beforeDay.setUTCHours(0);
      beforeDay.setUTCDate(1);

      const resultIn = await mongoose.model(Deal.Name).aggregate([
        {
          $match: {
            createdAt: {
              $gte: myBefor,
              $lt: myToday,
            },
            receive_id: ObjectId(req.user._id),
          },
        },
        {

          $group: {
            _id: {

              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            pointIn: { $sum: '$point' },
            first: { $min: '$createdAt' },

          },
        },

        { $sort: { _id: 1 } },
        { $project: { month: '$first', pointIn: 1, _id: 0 } },
      ]);

      const resultOut = await mongoose.model(Deal.Name).aggregate([
        {
          $match: {
            createdAt: {
              $gte: myBefor,
              $lt: myToday,
            },
            send_id: ObjectId(req.user._id),

          },
        },
        {

          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            pointOut: { $sum: '$point' },
            first: { $min: '$createdAt' },

          },
        },

        { $sort: { _id: 1 } },
        { $project: { month: '$first', pointOut: 1, _id: 0 } },
      ]);

      list_month = [];
      list_in = [];
      list_out = [];
      var i = beforeDay.getUTCMonth();
      var str_time = `${beforeDay.getUTCDate()}/${beforeDay.getUTCMonth() + 1}/${beforeDay.getUTCFullYear()} - ${today.getUTCDate()}/${today.getUTCMonth() + 1}/${today.getUTCFullYear()}`;
      console.log(str_time);
      var leng_month = i + 7;
      for (; i < leng_month; i++) {
        var date_current = new Date(beforeDay.getUTCFullYear(), i, 2, 0, 0, 0);
        list_month.push(`Tháng ${date_current.getUTCMonth() + 1}`);

        result1 = resultIn.find((itmInner) => itmInner.month.getUTCMonth() === date_current.getUTCMonth());

        if (result1 == null) {
          list_in.push(0);
        } else {
          list_in.push(result1.pointIn);
        }

        result2 = resultOut.find((itmInner) => itmInner.month.getUTCMonth() === date_current.getUTCMonth());

        if (result2 == null) {
          list_out.push(0);
        } else {
          list_out.push(result2.pointOut);
        }
      }
      res.render('./template/dashboard.html', {
        role: req.user.role, user: -1, distance: -1, point: result_point.point, list_month, list_out, list_in, str_time,
      });
    }
  } catch (error) {
    next(error);
  }
}
async function handleUser(req, res, next) {
  const {
    name, username, password, point, status, phone, email, fileToUpload, form_submitted, iduser,
  } = req.body;
  try {
    if (form_submitted == 0) {
      const requireFields = ['username', 'password'];
      const info = _.pick(req.body, requireFields);

      const { error, value } = UserModel.Service.Account.validate(info, requireFields);
      if (error) {
        next(error);
        return;
      }

      const existed = await UserModel.Service.Account.findOne(
        { username: value.username, type: 'password' },
      );
      if (existed) {
        next(new BaseError(ErrorType.badRequest)
          .addError('username', Reason.duplicated));
        return;
      }

      const optionalFields = ['name', 'email', 'phone', 'fileToUpload'];
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
      const user = await UserModel.Service.User.insertOne(userData);

      const accountData = {
        user: user._id,
        username: value.username,
        password: await Util.hashPassword(value.password),
        status: 'active',
        type: 'password',
      };

      const account = await UserModel.Service.Account.insertOne(
        accountData, true,
      );

      delete account.password;
      res.redirect('back');
    } else if (form_submitted == 1) {
      const { iduser } = req.body;
      const allowUpdateFields = ['name', 'phone', 'fileToUpload', 'email', 'point', 'status'];
      const info = _.pick(req.body, allowUpdateFields);

      await UserModel.Service.User.updateOne({ _id: iduser }, info);

      const result = await UserModel.Service.User.findOne({ _id: iduser });

      res.redirect('back');
    } else if (form_submitted == 2) {
      const { iduser } = req.body;
      await UserModel.Service.User.deleteOne({ _id: iduser });
      await UserModel.Service.Account.deleteOne({ user: iduser });

      res.redirect('back');
    }
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    res.render('./template/login.html');
  } catch (error) {
    next(error);
  }
}

async function loginAuthentication(req, res, next) {
  try {
    const { username, password } = req.body;
    const { error, value } = UserModel.Service.Account.validate(
      { username, password },
      ['username', 'password'],
    );
    if (error) {
      next(error);
      return;
    }
    const account = await UserModel.Service.Account.findOne({ username }, 'user');
    if (account) {
      const same = await Util.comparePassword(password, account.password);
      if (same) {
        const { user } = account;
        delete user.password;
        user.access_token = Token.createJwtToken({
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
        });
        res.cookie('token', user.access_token);
        res.cookie('avatar', user.avatar);
        res.cookie('name', user.name);
        res.cookie('role', user.role);
        res.send(user);
        return;
      }
    }

    next(
      res.send('fail'),
    );
  } catch (error) {
    next(error);
  }
}
async function logout(req, res, next) {
  try {
    res.cookie('token', '');
    res.cookie('avatar', '');
    res.cookie('name', '');
    res.cookie('role', '');

    res.render('./template/login.html');
  } catch (error) {
    next(error);
  }
}
async function listVoucher(req, res, next) {
  const { _id } = req.user;
  try {
    if (req.user.role == 'admin') {
      const voucher = await VoucherModel.Service.Voucher.findMany({}, {}, null, { path: 'partner_id', select: 'name' });
      const partner = await UserModel.Service.User.findMany({ role: 'partner' });

      res.render('./template/voucher.html', { voucher, role: req.user.role, partner });
    } else {
      const voucher = await VoucherModel.Service.Voucher.findMany({ partner_id: _id }, {}, null, { path: 'partner_id', select: 'name -_id' });

      res.render('./template/voucher_partner.html', { voucher, role: req.user.role });
    }
  } catch (error) {
    next(error);
  }
}
async function handleVoucher(req, res, next) {
  const { idvoucher, form_submitted } = req.body;
  try {
    if (req.user.role == 'admin') {
      if (form_submitted == 0) {
        const allowUpdateFields = ['name', 'value', 'image', 'content', 'quantity', 'type', 'partner_id'];
        const info = _.pick(req.body, allowUpdateFields);
        const voucher = await VoucherModel.Service.Voucher.insertOne(info);

        res.redirect('back');
      } else if (form_submitted == 1) {
        const allowUpdateFields = ['name', 'value', 'image', 'content', 'quantity', 'type', 'partner_id'];
        const info = _.pick(req.body, allowUpdateFields);
        await VoucherModel.Service.Voucher.updateOne({ _id: idvoucher }, info);

        //   const result = await UserModel.Service.User.findOne({ _id:iduser });

        res.redirect('back');
      } else if (form_submitted == 2) {
        await VoucherModel.Service.Voucher.deleteOne({ _id: idvoucher });

        res.redirect('back');
      }
    } else if (form_submitted == 0) {
      const allowUpdateFields = ['name', 'value', 'image', 'content', 'quantity', 'type'];
      const info = _.pick(req.body, allowUpdateFields);
      console.log(idvoucher);

      info.partner_id = req.user._id;
      info.status = 0;
      var voucher;
      if (idvoucher == 0) {
        voucher = await VoucherModel.Service.Voucher.insertOne(info);
      } else {
        voucher = await VoucherModel.Service.Voucher.updateOne({ _id: idvoucher }, info);
      }
      result = {
        value: info.value,
        quantity: info.quantity,
        fee: '5%',
        total: ~~(info.quantity * info.value * 5 / 100),
        id: voucher._id,

      };

      let codeDeal = VoucherModel.Service.Voucher.randomString(10);
      while (await DealModel.Service.Deal.findOne({ code: codeDeal })) {
        codeDeal = VoucherModel.Service.Voucher.randomString(10);
      }
      const newDeal = {
        code: codeDeal,
        content: 'Giao dịch tạo voucher',
        send_id: req.user._id,
        point: ~~(info.quantity * info.value * 5 / 100),
        type: 'create voucher',
        message: '',
      };
      await DealModel.Service.Deal.insertOne(newDeal);

      ResponseFactory.success(result).send(res);
    } else if (form_submitted == -1) {
      user = await UserModel.Service.User.findOne({ _id: req.user._id });
      voucher = await VoucherModel.Service.Voucher.findOne({ _id: idvoucher });
      var result;
      if (user.point >= (voucher.value * voucher.quantity * 5 / 100)) {
        await UserModel.Service.User.updateOne({ _id: req.user._id }, { point: user.point - (~~(voucher.value * voucher.quantity * 5 / 100)) });
        await VoucherModel.Service.Voucher.updateOne({ _id: idvoucher }, { status: 1 });
        result = {
          result: 1,
          message: 'Tạo voucher thành công',
        };
      } else {
        result = {
          result: 0,
          message: 'Số điểm người dùng không đủ. Vui lòng thử lại',
        };
      }
      ResponseFactory.success(result).send(res);
    } else if (form_submitted == 1) {
      const allowUpdateFields = ['name', 'image', 'content'];
      const info = _.pick(req.body, allowUpdateFields);

      await VoucherModel.Service.Voucher.updateOne({ _id: idvoucher }, info);

      //   const result = await UserModel.Service.User.findOne({ _id:iduser });

      res.redirect('back');
    } else if (form_submitted == 2) {
      await VoucherModel.Service.Voucher.deleteOne({ _id: idvoucher });

      res.redirect('back');
    }
  } catch (error) {
    next(error);
  }
}
async function listAdvertisement(req, res, next) {
  const { _id } = req.user;
  try {
    if (req.user.role == 'admin') {
      const advertisement = await AdvertisementModel.Service.Advertisement.findMany({}, {}, null, { path: 'partner_id', select: 'name' });
      const partner = await UserModel.Service.User.findMany({ role: 'partner' });

      res.render('./template/advertisement.html', { advertisement, role: req.user.role, partner });
    } else {
      const advertisement = await AdvertisementModel.Service.Advertisement.findMany({ partner_id: _id }, {}, null, { path: 'partner_id', select: 'name -_id' });

      res.render('./template/advertisement_partner.html', { advertisement, role: req.user.role });
    }
  } catch (error) {
    next(error);
  }
}
async function listOffer(req, res, next) {
  const { _id } = req.user;
  try {
    if (req.user.role == 'admin') {
      const offer = await OfferModel.Service.Offer.findMany({}, {}, null, { path: 'voucher_id customer_id', select: 'name -_id' });

      res.render('./template/offer.html', { offer, role: req.user.role });
    } else {
      const voucher = await VoucherModel.Service.Voucher.findMany({ partner_id: _id });
      const ids = voucher.map((doc) => doc._id);
      const offer = await OfferModel.Service.Offer.findMany({ voucher_id: { $in: ids } }, {}, null, [{ path: 'voucher_id', select: 'name', populate: { path: 'partner_id' } }, { path: 'customer_id' }]);
      // const test = await  OfferModel.Service.Offer.findMany({voucher_id: {$in: ids}},{},null,[{path:'voucher_id',populate:{path:'partner_id'}},{path:'customer_id'}]);
      // console.log(test)
      res.render('./template/offer.html', { offer, role: req.user.role });
    }
  } catch (error) {
    next(error);
  }
}
async function listDeal(req, res, next) {
  const { _id } = req.user;
  try {
    if (req.user.role == 'admin') {
      const deal = await DealModel.Service.Deal.findMany({}, {}, null, { path: 'send_id receive_id', select: 'name -_id' });

      res.render('./template/deal.html', { deal, role: req.user.role });
    } else {
      const deal = await DealModel.Service.Deal.findMany({ $or: [{ send_id: _id }, { receive_id: _id }] }, {}, null, { path: 'send_id receive_id', select: 'name -_id' });

      res.render('./template/deal.html', { deal, role: req.user.role });
    }
  } catch (error) {
    next(error);
  }
}

async function handleAdvertisement(req, res, next) {
  const { idadvertisement, form_submitted } = req.body;
  try {
    if (req.user.role == 'admin') {
      if (form_submitted == 0) {
        const allowUpdateFields = ['name', 'state', 'image', 'content', 'type', 'locate', 'partner_id'];
        const info = _.pick(req.body, allowUpdateFields);
        const { range_date } = req.body;

        var parts = range_date.split('-');
        var part1 = parts[0].split('/');
        var part2 = parts[1].split('/');
        var from_date = new Date();
        from_date.setFullYear(part1[2], part1[0] - 1, part1[1]);
        var to_date = new Date();
        to_date.setFullYear(part2[2], part2[0] - 1, part2[1]);
        info.startTime = from_date;
        info.endTime = to_date;

        await AdvertisementModel.Service.Advertisement.insertOne(info);

        res.redirect('back');
      } else if (form_submitted == 1) {
        const allowUpdateFields = ['name', 'state', 'image', 'content', 'type', 'locate', 'partner_id'];
        const info = _.pick(req.body, allowUpdateFields);
        const { range_date } = req.body;

        var parts = range_date.split('-');
        var part1 = parts[0].split('/');
        var part2 = parts[1].split('/');
        var from_date = new Date();
        from_date.setFullYear(part1[2], part1[0] - 1, part1[1]);
        var to_date = new Date();
        to_date.setFullYear(part2[2], part2[0] - 1, part2[1]);
        info.startTime = from_date;
        info.endTime = to_date;

        await AdvertisementModel.Service.Advertisement.updateOne({ _id: idadvertisement }, info);

        res.redirect('back');
      } else if (form_submitted == 2) {
        await AdvertisementModel.Service.Advertisement.deleteOne({ _id: idadvertisement });

        res.redirect('back');
      }
    } else if (form_submitted == 0) {
      console.log(req.body);

      const allowUpdateFields = ['name', 'state', 'image', 'content', 'type', 'locate'];
      const info = _.pick(req.body, allowUpdateFields);

      info.partner_id = req.user._id;
      info.state = 0;
      const { range_date } = req.body;

      var parts = range_date.split('-');
      var part1 = parts[0].split('/');
      var part2 = parts[1].split('/');

      var from_date = new Date();
      from_date.setFullYear(part1[2], part1[0] - 1, part1[1]);
      var to_date = new Date();
      to_date.setFullYear(part2[2], part2[0] - 1, part2[1]);
      info.startTime = from_date;
      info.endTime = to_date;
      var advertisement;
      if (idadvertisement == 0) {
        advertisement = await AdvertisementModel.Service.Advertisement.insertOne(info);
      } else {
        advertisement = await AdvertisementModel.Service.Advertisement.updateOne({ _id: idadvertisement }, info);
      }
      var locate;

      if (advertisement.locate == 'head') {
        locate = 10;
      } else {
        locate = 5;
      }
      var type;
      if (advertisement.type == 'slider') {
        type = 5;
      } else {
        type = 10;
      }

      var time = (advertisement.endTime - advertisement.startTime) / (1000 * 3600 * 24) + 1;
      result = {
        locate,
        type,
        time,
        total: ~~time * (locate + type),
        id: advertisement._id,
      };

      let codeDeal = VoucherModel.Service.Voucher.randomString(10);
      while (await DealModel.Service.Deal.findOne({ code: codeDeal })) {
        codeDeal = VoucherModel.Service.Voucher.randomString(10);
      }
      const newDeal = {
        code: codeDeal,
        content: 'Giao dịch tạo quảng cáo ',
        send_id: req.user._id,
        point: ~~time * (locate + type),
        type: 'create advertisement',
        message: '',
      };
      await DealModel.Service.Deal.insertOne(newDeal);

      ResponseFactory.success(result).send(res);
    } else if (form_submitted == -1) {
      user = await UserModel.Service.User.findOne({ _id: req.user._id });
      advertisement = await AdvertisementModel.Service.Advertisement.findOne({ _id: idadvertisement });
      var result;
      var locate;

      if (advertisement.locate == 'head') {
        locate = 10;
      } else {
        locate = 5;
      }
      var type;
      if (advertisement.type == 'slider') {
        type = 5;
      } else {
        type = 10;
      }

      var time = (advertisement.endTime - advertisement.startTime) / (1000 * 3600 * 24) + 1;
      if (user.point >= (~~time * (locate + type))) {
        await UserModel.Service.User.updateOne({ _id: req.user._id }, { point: user.point - ~~time * (locate + type) });
        await AdvertisementModel.Service.Advertisement.updateOne({ _id: idadvertisement }, { state: 1 });
        result = {
          result: 1,
          message: 'Tạo quảng cáo thành công',
        };
      } else {
        result = {
          result: 0,
          message: 'Số điểm người dùng không đủ. Vui lòng thử lại',
        };
      }
      ResponseFactory.success(result).send(res);
    } else if (form_submitted == 1) {
      const allowUpdateFields = ['name', 'fileToUpload', 'content'];
      const info = _.pick(req.body, allowUpdateFields);

      await AdvertisementModel.Service.Advertisement.updateOne({ _id: idadvertisement }, info);

      res.redirect('back');
    } else if (form_submitted == 2) {
      await AdvertisementModel.Service.Advertisement.deleteOne({ _id: idadvertisement });

      res.redirect('back');
    }
  } catch (error) {
    next(error);
  }
}

async function listFeedback(req, res, next) {
  try {
    if (req.user.role == 'admin') {
      const feedbacks = await feedbackService.findMany({});

      res.render('./template/feedback.html', { feedback: feedbacks, role: req.user.role });
    } else {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }
  } catch (error) {
    next(error);
  }
}

async function handleFeedback(req, res, next) {
  const { idfeedback, form_submitted } = req.body;
  try {
    if (form_submitted == 1) {
      const allowUpdateFields = ['response'];
      const info = _.pick(req.body, allowUpdateFields);

      await feedbackService.updateOne({ _id: idfeedback }, info);

      res.redirect('back');
    }
  } catch (error) {
    next(error);
  }
}

async function listCard(req, res, next) {
  try {
    if (req.user.role == 'admin') {
      console.log(req.role);
      const card = await cardService.findMany({});
      res.render('./template/card.html', { card, role: req.user.role });
    } else {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }
  } catch (error) {
    next(error);
  }
}

async function handleCard(req, res, next) {
  const { idcard, form_submitted } = req.body;
  try {
    if (form_submitted == 0) {
      const allowUpdateFields = ['code', 'serial', 'type', 'status'];
      const info = _.pick(req.body, allowUpdateFields);

      await cardService.insertOne(info);

      res.redirect('back');
    } else if (form_submitted == 1) {
      const allowUpdateFields = ['code', 'serial', 'type', 'status'];
      const info = _.pick(req.body, allowUpdateFields);

      await cardService.updateOne({ _id: idcard }, info);

      res.redirect('back');
    } else if (form_submitted == 2) {
      await cardService.deleteOne({ _id: idcard });

      res.redirect('back');
    }
  } catch (error) {
    next(error);
  }
}

async function listGift(req, res, next) {
  try {
    if (req.user.role == 'admin') {
      const gift = await giftService.findMany({});
      res.render('./template/gift.html', { gift, role: req.user.role });
    } else {
      next(new BaseError(ErrorType.unauthorized));
      return;
    }
  } catch (error) {
    next(error);
  }
}

async function handleGift(req, res, next) {
  const { idgift, form_submitted } = req.body;
  try {
    if (form_submitted == 0) {
      const allowUpdateFields = ['longitude', 'latitude', 'amount', 'point'];
      const info = _.pick(req.body, allowUpdateFields);

      await giftService.insertOne(info);

      res.redirect('back');
    } else if (form_submitted == 1) {
      const allowUpdateFields = ['longitude', 'latitude', 'amount', 'point'];
      const info = _.pick(req.body, allowUpdateFields);

      await giftService.updateOne({ _id: idgift }, info);

      res.redirect('back');
    } else if (form_submitted == 2) {
      await giftService.deleteOne({ _id: idgift });

      res.redirect('back');
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUser,
  handleUser,
  login,
  loginAuthentication,
  dashboard,
  listVoucher,
  handleVoucher,
  listAdvertisement,
  listOffer,
  listDeal,
  handleAdvertisement,
  listFeedback,
  handleFeedback,
  logout,
  listCard,
  handleCard,
  listGift,
  handleGift,
  listPartner,
};
