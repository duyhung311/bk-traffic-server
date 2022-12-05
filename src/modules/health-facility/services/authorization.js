const express = require('express');
const crypto = require('crypto-js');
const axios = require('axios');

var api_key = process.env.API_KEY_APIMEDIC;
var uri = "https://authservice.priaid.ch/login";
var secret_key = process.env.SECRET_KEY_APIMEDIC; 
var computedHash = crypto.HmacMD5(uri, secret_key);
var computedHashString = computedHash.toString(crypto.enc.Base64);     

var expiredTime = 0;
var Token = "";
    
function getToken() {
    return new Promise(function(resolve, reject){
        if (expiredTime <= (Date.now()/1000)){
            axios({
                method: 'post',
                url: uri,
                headers: {Authorization: `Bearer ${api_key}:${computedHashString}`  }
            })
            .then(response => {
                Token = response.data.Token;
                expiredTime = Math.round(Date.now()/1000) + response.data.ValidThrough;
                resolve(Token);
            })
            .catch(err => {
                console.log("Error :" + err);
            });
        }else{
            resolve(Token);
        }
    })
}


module.exports = getToken;