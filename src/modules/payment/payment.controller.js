const uuidv1 = require('uuid/v1');
const https = require('https');
const NodeRSA = require('node-rsa');
const UserModel = require('../user');
const ServiceDeal = require('../deal/services');
const ServiceVoucher = require('../voucher/services');
const { ResponseFactory } = require('../../core/response');
const ServiceWarehouse = require('../warehouse/warehouse.service');

const partnerCode = 'MOMOUX4U20201123';

const pubKey = '-----BEGIN PUBLIC KEY-----' + 'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAl1A8E81CP6VydLMIN746aW8GPwO99AVc+jVqc5kyFeccQJGUUlZcKxyhnjhXRPp2qrE1vxBV9cibA3Rv+BcFOaL9JQLuS2MnRkKD4i6Q2pI7OZDvErfZKb1fJ34Dyt7yOyQWi3QM+R7/MsZ27imBfY7MJPVQxp4zpSm1JZOy/Mmf2d//egUZGqfpzDC3471cqDNTBn7IXpuv7JNzzZ0XaMtVDHqcufk4FDlPvUJScG5/7PGpdC3YtUNAJ93slX34K1CPwVvfz8TiCscVNED0hzxhQYVFP03yze3de/X081mv5Htl7OIazduOvkZpKQStlm7AJCVa9Xvcwb4IQv/uJ6KuyBz2N/hxnGVe9C/vHBmI+EUjf9YCOuMv/HJzwSpB/EUUxuc8TbvtsZNO+Sg4qpfLBt0qeiZ+kK5Yz6i95ljBarl0wDBZ+lvJWqo0E/QnuZXgzJOd7vAmLoXoDl5rsyAf4nSPCUb9Z4wIyc47uzRBkLTZEVOpJQLyEVhG0K2y4DDGDlJPzh5AslvRCBWg3yjkr+Y5eDf/vgIt/Pu7JZv8CCsPJJjWGaUesR/6QWP8BQpA7a3ybe5Mi5IH3Dp3O8v1AHkUO5SyMRdHz/12Defjfh9tSDXqsh7ePBISrnHdPXpOEq3Ik3996+6cnimsZ0B7aFkOtx3/NPEB+wLYoTkCAwEAAQ==' + '-----END PUBLIC KEY-----';

async function paymentRequest(req, res, next) {
  try {
    const {
      token, phone, order, amount, point,
    } = req.body;
    const { _id } = req.user;
    const jsonData = {
      partnerCode,
      partnerRefId: order,
      amount: parseInt(amount),
    };
    const key = new NodeRSA(pubKey, { encryptionScheme: 'pkcs1' });

    const encrypted = key.encrypt(JSON.stringify(jsonData), 'base64');
    const body = JSON.stringify({
      partnerCode,
      customerNumber: phone,
      partnerRefId: order,
      appData: token,
      hash: encrypted,
      description: 'Thanh toan cho don hang qua MoMo',
      version: 2,
      payType: 3,
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/pay/app',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const newreq = https.request(options, (res1) => {
      console.log(`Status: ${res1.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res1.headers)}`);
      res1.setEncoding('utf8');
      res1.on('data', async (body) => {
        console.log('Body');
        console.log(body);
        console.log('payURL');
        result = JSON.parse(body);
        console.log(result);
        if (result.status == 0) {
          confirmRequest(result.transid, order, 'capture');
          const user = await UserModel.Service.User.findOne({ _id });
          await UserModel.Service.User.updatePoint({ _id }, { point: user.point + parseInt(point) });

          const newDeal = {
            code: ServiceVoucher.Voucher.randomString(10),
            content: 'Giao dịch mua điểm',
            send_id: null,
            receive_id: _id,
            point,
            type: 'buy point',
          };
          await ServiceDeal.Deal.insertOne(newDeal);

          warehouse = await ServiceWarehouse.findOne({});
          await ServiceWarehouse.updateOne({}, { point_current: warehouse.point_current - point });

          ResponseFactory.success({ state: 1 }).send(res);
        } else {
          confirmRequest(result.transid, order, 'revertAuthorize');

          ResponseFactory.success({ state: 0 }).send(res);
        }
      });
      res1.on('end', () => {
        console.log('No more data in response.');
      });
    });

    newreq.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
    });
    newreq.write(body);
    newreq.end();
  } catch (error) {
    next(error);
  }
}

function confirmRequest(transid, order, type) {
  try {
    req_id = Math.floor(Math.random() * 9000000000) + 1000000000;
    const serectkey = 'DWAlDNBiS2potw2YAY8ir7TDC7df9UZb';
    const rawSignature = `partnerCode=${partnerCode}&partnerRefId=${order}&requestType=${type}&requestId=${req_id}$&momoTransId=${transid}`;
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', serectkey)
      .update(rawSignature)
      .digest('hex');
    const body = JSON.stringify({
      partnerCode,
      customerNumber: phone,
      partnerRefId: order,
      requestType: type,
      requestId: req_id,
      momoTransId: transid,
      signature,
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/pay/confirm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const newreq = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (body) => {
        console.log('Body');
        console.log(body);
        console.log('payURL');
        console.log(JSON.parse(body).payUrl);
        result = JSON.parse(body);
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });

    newreq.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
    });
    newreq.write(body);
    newreq.end();
  } catch (error) {

  }
}

module.exports = {
  paymentRequest,
};
