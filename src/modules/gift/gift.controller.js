const _ = require('lodash');
const { identity } = require('lodash');
const Logger = require('../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const GiftService = require('./gift.service');
const UserModel = require('../user');
const giftModel = require('./gift.model');
const ServiceDeal = require('../deal/services');
const ServiceVoucher = require('../voucher/services');
const ServiceWarehouse = require('../warehouse/warehouse.service');

async function getAllGift(req, res, next) {
  try {
    const result = await GiftService.findMany({ amount: { $gt: 0 } });
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}
async function checkGift(req, res, next) {
  try {
    const { _id } = req.user;
    const { id } = req.body;
    const gift = await GiftService.findOne({ _id: id });
    const user = await UserModel.Service.User.findOne({ _id });
    const deal = await ServiceDeal.Deal.findOne({ content: id });
    result = 1;
    if (gift.amount > 0 && deal == null) {
      await GiftService.updateOne({ _id: id }, { amount: gift.amount - 1 });
      await UserModel.Service.User.updateOne({ _id }, { point: user.point + gift.point });
      codeDeal = ServiceVoucher.Voucher.randomString(10);
      while (await ServiceDeal.Deal.findOne({ code: codeDeal })) {
        codeDeal = ServiceVoucher.Voucher.randomString(10);
      }
      const newDeal = {
        code: codeDeal,
        content: id,
        send_id: null,
        receive_id: _id,
        point: gift.point,
        type: 'get gift',
        offer_id: null,
      };
      await ServiceDeal.Deal.insertOne(newDeal);
      warehouse = await ServiceWarehouse.findOne({});
      await ServiceWarehouse.updateOne({}, { point_current: warehouse.point_current - gift.point });
    } else {
      result = 0;
    }
    ResponseFactory.success({ state: result, point: gift.point }).send(res);
  } catch (error) {
    next(error);
  }
}
module.exports = {
  getAllGift,
  checkGift,
};
