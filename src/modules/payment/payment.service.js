const NodeRSA = require('node-rsa');

const pubKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAit2TJxH7RwK1n+UMB9MbdC9sPO8Ip9zJmnGv1LPEpqY8aYZwXSWGV9w+wcU28zmZSjEWBciqW6kddDjyBtDdPIlWLUliWTjI74ktv/hkaDENCuzUXm0TjTj1nZ9YUQdz6FGJWLJGDYWnT5KEcgCwDVqT9W9EqOPF6Qv2yf4jDppz7Ik29uY4O5pNtip9ipKRB/82x/iB0MvsPeuMBicuyDxkDxt8+aPmCKa7cW6QS+AGqpc70GPe+Ta7yqdiHBtL0hj9+3BI0X9eQFDQ3tRszeXCIT6mBhD5fyeyYx4VNKi6oCIpNb5duVT9+5Ie4mnhwJthttFG59X4qzDIAFr8wwIDAQAB';

const key = new NodeRSA(pubKey, { encryptionScheme: 'pkcs1' });
const jsonData = {
  partnerCode: 'MOMOV2OF20180515',
  partnerRefId: 'caa5a630-8a3a-11e8-884c-653db95e86a6',
  amount: 500000,
  partnerTransId: 'caa5a630-8a3a-11e8-884c-653db95e86a6',
};
const encrypted = key.encrypt(JSON.stringify(jsonData), 'base64');
console.log('encrypted: ', encrypted);
