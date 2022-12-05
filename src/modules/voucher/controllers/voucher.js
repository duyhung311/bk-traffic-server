const _ = require('lodash');
const { identity } = require('lodash');
const mongoose = require('mongoose');
const Service = require('../services');
const Logger = require('../../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../../core/error');
const { ResponseFactory } = require('../../../core/response');
const user = require('../../user/models/user');
const UserModel = require('../../user');
const CarModel = require('../../card');
const DealModel = require('../../deal');
const OfferModel = require('../../offer');
const ServiceDeal = require('../../deal/services');
const AdvertisementModel = require('../../advertisement');
const UploadFile = require('../../file');
const ServiceWarehouse = require('../../warehouse/warehouse.service');
const { Deal } = require('../../deal/models');
const { Offer } = require('../../offer/models');

async function getTopVoucher(req, res, next) {
  try {
    const result = await Service.Voucher.findMany({}, { _id: -1 }, 5);

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getTrendVoucher(req, res, next) {
  try {
    const result = await Service.Voucher.findMany({}, { _id: 1 }, 5);

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getAllTrendVoucher(req, res, next) {
  try {
    const result = await Service.Voucher.findMany({}, { _id: 1 });

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getAllTopVoucher(req, res, next) {
  try {
    const result = await Service.Voucher.findMany({}, { _id: -1 });
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getDetailVoucher(req, res, next) {
  try {
    const result = await Service.Voucher.findOne(req.query);

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getInfoPaymentVoucher(req, res, next) {
  const { _id } = req.user;

  try {
    const user = await UserModel.Service.User.findOne({ _id });
    const voucher = await Service.Voucher.findOne(req.query);
    const card = await CarModel.Service.findOne({ type: voucher.type, status: 0 });
    let check = true;
    if (card != null) {
      check = !_.isEmpty(card);
    }
    if (voucher.quantity > 0 && user.point >= voucher.value && check) {
      const infoPayment = {
        _id: voucher._id,
        name: voucher.name,
        value: voucher.value,
        beforePoint: user.point,
        payPoint: voucher.value,
        afterPoint: user.point - voucher.value,
        image: voucher.image,
      };
      ResponseFactory.success(infoPayment).send(res);
    } else {
      ResponseFactory.success().send(res);
    }
  } catch (error) {
    next(error);
  }
}
async function confirmPaymentVoucher(req, res, next) {
  const { _id } = req.user;
  const { id } = req.body;

  try {
    const user = await UserModel.Service.User.findOne({ _id });
    const voucher = await Service.Voucher.findOne({ _id: id });
    const partner = await UserModel.Service.User.findOne({ _id: voucher.partner_id });

    await UserModel.Service.User.updatePoint({ _id }, { point: user.point - voucher.value });
    await UserModel.Service.User.updatePoint({ _id: voucher.partner_id }, { point: partner.point + (~~(voucher.value * 5 / 100)) });
    await Service.Voucher.updateOne({ _id: id }, { quantity: voucher.quantity - 1 });

    let codeDeal = Service.Voucher.randomString(10);

    while (await ServiceDeal.Deal.findOne({ code: codeDeal })) {
      codeDeal = Service.Voucher.randomString(10);
    }

    let codeOffer = Service.Voucher.randomString(10);
    while (await OfferModel.Service.Offer.findOne({ code: codeOffer })) {
      codeOffer = Service.Voucher.randomString(10);
    }
    if (['viettel', 'vina', 'mobi'].includes(voucher.type)) {
      const card = await CarModel.Service.findOne({ type: voucher.type, status: 0 });
      codeOffer = `${card.code},${card.serial}`;
      await CarModel.Service.updateOne({ _id: card._id }, { status: 1 });
    }

    const newOffer = {
      voucher_id: voucher._id,
      customer_id: _id,
      code: codeOffer,
      status: 0,
    };
    const offer = await OfferModel.Service.Offer.insertOne(newOffer);
    const newDeal = {
      code: codeDeal,
      content: `Giao dịch đổi điểm lấy voucher ${voucher.name}`,
      send_id: _id,
      receive_id: null,
      point: voucher.value,
      type: 'get voucher',
      offer_id: offer._id,
    };
    await ServiceDeal.Deal.insertOne(newDeal);

    warehouse = await ServiceWarehouse.findOne({});
    await ServiceWarehouse.updateOne({}, { point_current: warehouse.point_current + voucher.value });

    ResponseFactory.success({}).send(res);
  } catch (error) {
    next(error);
  }
}
async function getSearchVoucher(req, res, next) {
  const { word } = req.query;
  console.log('word:', word);
  try {
    const result = await Service.Voucher.findMany({ $text: { $search: word } });
    console.log('result', result);

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

async function getMyVoucher(req, res, next) {
  const { _id } = req.user;
  try {
    const result = await OfferModel.Service.Offer.findMany({ customer_id: _id }, { createdAt: -1 }, null, { path: 'voucher_id', select: 'name value -_id' });
    console.log('result', result);

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getDetailMyVoucher(req, res, next) {
  const { id } = req.query;
  try {
    const result = await OfferModel.Service.Offer.findOne({ _id: id }, { path: 'voucher_id', select: 'name value content image' });
    const deal = await ServiceDeal.Deal.findOne({ offer_id: result._id });
    if (deal) {
      result.codeDeal = deal.code;
    }

    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function getInfoVoucher(req, res, next) {
  const { _id } = req.user;
  try {
    // point = caculatePoint(10,10,10)
    // const userUD = await  UserModel.Service.User.findOne({_id});
    // await UserModel.Service.User.updatePoint({ _id }, {point:userUD.point+point});
    const user = await UserModel.Service.User.findOne({ _id });
    const adver = await AdvertisementModel.Service.Advertisement.findMany({ state: 1 });

    const resultIn = await mongoose.model(Offer.Name).aggregate([
      { $group: { _id: '$voucher_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    let i = 0;
    const list_id = [];
    if (resultIn.length >= 5) {
      for (; i < 5; i++) {
        list_id.push(resultIn[i]._id);
      }
    }

    // const total_point = await mongoose.model(Deal.Name).aggregate([{ $group:{
    //     _id: null,
    //     total: {
    //       $sum: "$point"
    //     }
    //   }}])
    // const total_user = await mongoose.model(Deal.Name).aggregate([{ $count: 'user' }])
    let trend;
    if (list_id.length != 0) {
      trend = await Service.Voucher.findMany({ _id: { $in: list_id } }, { _id: -1 });
    } else {
      trend = await Service.Voucher.findMany({}, { _id: 1 }, 5);
    }

    const top = await Service.Voucher.findMany({}, { _id: 1 });
    user.slider = adver;
    user.list_trend = trend;
    user.list_top = top;
    console.log(user);

    ResponseFactory.success(user).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  voucher: {
    getTopVoucher,
    getTrendVoucher,
    getAllTrendVoucher,
    getAllTopVoucher,
    getDetailVoucher,
    getInfoPaymentVoucher,
    confirmPaymentVoucher,
    getSearchVoucher,
    getMyVoucher,
    getDetailMyVoucher,
    getInfoVoucher,

  },

};
