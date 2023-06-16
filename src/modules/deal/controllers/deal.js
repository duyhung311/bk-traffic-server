const Service = require('../services');
const Logger = require('../../../core/logger');
const { Reason, BaseError, ErrorType } = require('../../../core/error');
const _ = require('lodash');
const { ResponseFactory } = require('../../../core/response');
const deal = require('../../deal/models/deal');
const UserModel = require("../../user");
const VoucherModel = require("../../voucher");
const OfferModel = require("../../offer");
const { identity } = require('lodash');
const { Deal } = require('../../deal/models');
const MailMessage = require('nodemailer/lib/mailer/mail-message');
const accountSid = 'ACd4e7fd32bca1d25f13de3d337a268efc';
const authToken = 'c6cddfd784c9d37163320390c3665308';
const client = require('twilio')(accountSid, authToken);
const mongoose = require('mongoose');
const ServiceVoucher = require("../../voucher/services");
const ObjectId = mongoose.Types.ObjectId;



async function findUser(req, res, next) {
    const {word}= req.body
    console.log("result:",word)
    try {
        const result = await UserModel.Service.User.findOne({$text: {$search: word}});
        ResponseFactory.success(result).send(res);
    } catch (error) {
        next(error);
    }
}
async function getMessageAuthentication(req, res, next) {
    const{_id}=req.user
    console.log("id:",_id)

    try {
        const authen = Math.floor(100000 + Math.random() * 900000)
        await UserModel.Service.User.updatePoint({ _id }, { authen : authen+""} );
        client.messages
  .create({
     body: 'Mã xác thực giao dịch là '+authen,
     from: '+15302065117',
     to: '+84349232121'
   })
  .then(message => console.log(message.sid));
        ResponseFactory.success({ok:1}).send(res);
    } catch (error) {
        next(error);
    }
}
async function confirmAuthentication(req, res, next) {
    const {point,authen,message,receive}= req.body
    const {_id}=req.user
    console.log("result:",receive)
    try {
        
        const result = await UserModel.Service.User.findOne({_id});
        const result1 = await UserModel.Service.User.findOne({_id:receive});
        if(result['authen']==authen){
            await UserModel.Service.User.updatePoint({ _id },{$unset: {authen:1},point:result['point']-point} );
            await UserModel.Service.User.updatePoint({ _id:receive },{point:result1['point']+point} );
            var codeDeal=ServiceVoucher.Voucher.randomString(10)
            while(await Service.Deal.findOne({code:codeDeal})){
                codeDeal=ServiceVoucher.Voucher.randomString(10)
            }
            const newDeal= {
                code:codeDeal,
                content:"Giao dịch chuyển điểm ",
                send_id:_id,
                receive_id:receive,
                point: point,
                type: "transfer point",
                message: message

            }
            await Service.Deal.insertOne(newDeal)
            ResponseFactory.success({ok:1}).send(res);
        }else{
            ResponseFactory.success().send(res);
        }
        
    } catch (error) {
        next(error);
    }
}
async function getDealVoucher(req, res, next) {
    const{_id}=req.user
    try {
        const result = await Service.Deal.findMany({$or:[{send_id:_id},{receive_id:_id}]},{createdAt:-1},null,{path:'send_id receive_id',select:'name'});
        console.log("result",result)

        ResponseFactory.success(result).send(res);
    } catch (error) {
        next(error);
    }
}
async function getDealVoucher(req, res, next) {
    const{_id}=req.user
    try {
        const result = await Service.Deal.findMany({$or:[{send_id:_id},{receive_id:_id}]},{createdAt:-1},null,{path:'send_id receive_id',select:'name'});
        console.log("result",result)

        ResponseFactory.success(result).send(res);
    } catch (error) {
        next(error);
    }
}
async function getReportDeal(req, res, next) {
    const{_id}=req.user
    var today = new Date();
    console.log(today)
    var myToday = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 0,0);
    console.log(myToday)
    var beforeDay = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-6, 0, 0,0);
    console.log(beforeDay)
    myToday.setUTCHours(0)
    console.log(myToday)
    beforeDay.setUTCHours(0)
    console.log(beforeDay)


    try {
        const resultIn = await mongoose.model(Deal.Name).aggregate([
            {
                $match:{
                    createdAt: {
                        $gte: beforeDay,
                        $lt: myToday
                    },
                    receive_id:ObjectId(_id)
                    
                    
                },
            },
                {
                
                $group: {
                _id: {
                    
                        day: {$dayOfMonth: "$createdAt"},
                        month: {$month: "$createdAt"}, 
                        year: {$year: "$createdAt"}
                      },   
                pointIn: { $sum: "$point" },
                first: {$min: "$createdAt"}

              },
            },
            
            { $sort: {_id: 1} },
            { $project: { date: "$first", pointIn: 1, _id: 0} }
        ])
        const resultOut = await mongoose.model(Deal.Name).aggregate([
            {
                $match:{
                    createdAt: {
                        $gte: beforeDay,
                        $lt: myToday
                    },
                    send_id:ObjectId(_id)
                    
                    
                },
            },
                {
                
                $group: {
                _id: {
                    
                        day: {$dayOfMonth: "$createdAt"},
                        month: {$month: "$createdAt"}, 
                        year: {$year: "$createdAt"}
                      },   
                pointOut: { $sum: "$point" },
                first: {$min: "$createdAt"}

              },
            },
            
            { $sort: {_id: 1} },
            { $project: { date: "$first", pointOut: 1, _id: 0} }
        ])
        
        console.log(resultOut)
        var result = [];
        for(beforeDay.getUTCDate();beforeDay.getUTCDate()<myToday.getUTCDate();beforeDay.setUTCDate(beforeDay.getUTCDate()+1)){
            var ob={
                date:new Date(beforeDay.getUTCFullYear(), beforeDay.getUTCMonth(), beforeDay.getUTCDate()+1, 0, 0,0),
                pointIn:0,
                pointOut:0,
            }
            ob={
                ...ob, 
                ...(resultIn.find((itmInner) => itmInner['date'].getUTCDate() === ob['date'].getUTCDate()))
            }
            ob={
                ...ob, 
                ...(resultOut.find((itmInner) => itmInner['date'].getUTCDate() === ob['date'].getUTCDate()))
            }
            result.push(ob)
        }
        

        //   for(let i=0; i<arr1.length; i++) {
        //     merged.push({
        //      ...arr1[i], 
        //      ...(arr2.find((itmInner) => itmInner.id === arr1[i].id))}
        //     );
        //   }
        console.log("result:",result)

        ResponseFactory.success(result).send(res);
    } catch (error) {
        next(error);
    }
}
async function confirmQRCode(req, res, next) {
    const {code}= req.body
    console.log("code:",code)
    try {
        
        const result = await OfferModel.Service.Offer.findOne({code:code,status:0},{path:"voucher_id",populate:{path:'partner_id'}});
        console.log(result)

        if(result!=null){
            await OfferModel.Service.Offer.updateOne({ _id:result['_id'] },{status:1} );
            
            console.log(result.voucher_id.partner_id._id)
            const partner = await UserModel.Service.User.findOne({"_id":result.voucher_id.partner_id._id});
            await UserModel.Service.User.updatePoint({ _id:result.voucher_id.partner_id._id },{point:partner.point+(~~(result.voucher_id.value*5/100))} );
            
            var codeDeal=ServiceVoucher.Voucher.randomString(10)
            while(await Service.Deal.findOne({code:codeDeal})){
                codeDeal=ServiceVoucher.Voucher.randomString(10)
            }
            
            const newDeal= {
                code:codeDeal,
                content:"Giao dịch hoàn điểm ",
                receive_id: result.voucher_id.partner_id._id,
                point: ~~(result.voucher_id.value*5/100),
                type: "transfer point",
                message: ""

            }
            await Service.Deal.insertOne(newDeal)
            
            ResponseFactory.success({ok:1}).send(res);
        }else{
            ResponseFactory.success().send(res);
        }
        
    } catch (error) {
        next(error);
    }
}
module.exports = {
    deal: {
        findUser,
        getMessageAuthentication,
        confirmAuthentication,
        getDealVoucher,
        getReportDeal,
        confirmQRCode

    },

}