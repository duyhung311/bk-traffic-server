let json = require('/Users/hungluong/Documents/u-traffic-modules/bk-traffic-server/src/scripts/layer.json');

const data = JSON.parse(JSON.stringify(json))
console.log(data[0].name)