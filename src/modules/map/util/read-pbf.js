const Pbf  = require('pbf');
const fs = require('fs');
const Logger = require('../../../core/logger');
const Service = require('../services/osm-services');
const node = require('../models/node');


// const BOTRGHT_HCM = [10.8974, 106.5605]; 
// const TOPLEFT_HCM = [10.6690, 106.8022];
const TOPLEFT_HCM = [10.8974, 106.5605]; 
const BOTRGHT_HCM = [10.6690, 106.8022];

function isLatLngInHCM(lat, lng) {
    let isIn =  lat >= BOTRGHT_HCM[0] &&  //<
                lat <= TOPLEFT_HCM[0] &&  // >
                lng <= BOTRGHT_HCM[1] && //  > 
                lng >= TOPLEFT_HCM[1];    //  <
    return isIn;
}


function isSameBoundingBox(box1, box2) {
    return box1.topLeftLat == box2.topLeftLat &&
           box1.topLeftLon == box2.topLeftLon &&
           box1.botRghtLat == box2.botRghtLat &&
           box1.botRghtLon == box2.botRghtLon
  }

function stringifyProperties(item) {
    if (item.tags)
        item.tags = JSON.stringify(item.tags);
    if (item.info)
        item.info = JSON.stringify(item.info);
    return item
}
function addValueToNodeWayRef(item, nodeWayRef) {
    item.refs.forEach((e) => {
        if (nodeWayRef[e]) {
            //console.log(nodeWayRef[e])
            nodeWayRef[e].push(item.id);
        }
        else {
            Object.assign(e, [item.id]);
        }
    });
    return nodeWayRef;
}

async function readPbf() {
    const osmparser = await import('osm-pbf-parser-node');
    let nodeMap = {};
    let nodeCount = 0;
    let wayCount = 0;
    let relationCount = 0
    let wayMap = {};
    let relationList = [];
    let nodeList = [];
    let wayList = [];
    let isExistInNodeMap;
    let isExistInWayMap;
    let nodeWayRef = {};
    Logger.info("Ready to read pbf file");
    for await (let item of osmparser.createOSMStream('./vietnam.pbf')) {
        if (item.type === 'node' && isLatLngInHCM(item.lat, item.lon)) {
            nodeList.push(stringifyProperties(item));
            nodeMap[item.id] = {id : item.id}; 
            if (!nodeWayRef[item.id]) {
                nodeWayRef[item.id] = [];
            }
            nodeCount++;
            if (nodeCount % 200000 == 0){
                console.log("Another 200000 pieces of Node read")
                
            }
        }
        if (item.type === 'way') {
            isExistInNodeMap = false;
            item.refs.every((e) => {
                if (nodeMap[e]) {
                    isExistInNodeMap = true;
                    return false; // return false just to break the loop
                }
                return true;
            });
            if (isExistInNodeMap) {
                wayList.push(item);
                wayMap[item.id] = {wayId: item.id};
                nodeWayRef = addValueToNodeWayRef(item, nodeWayRef);
                wayCount++;
                if (wayCount % 100000 == 0) 
                    console.log("Another 100000 pieces of Way read")
            }
        }
        if (item.type === 'relation'){
            isExistInWayMap = false;
            item.members.every((e) => {
                if (wayMap[e.ref]) {
                    isExistInWayMap = true;
                    return false; // return false just to break the loop
                }
                return true;
            });
            if (isExistInWayMap) {
                relationList.push(item);
                relationCount++;
            }
            
        }
    }
    nodeList.forEach((e) => {
        e.refWay = nodeWayRef[e.id];
    })
    console.log("Done read pbf file,", nodeCount, wayCount, relationCount);
    return {nodeList,nodeCount, wayList,wayCount, relationList, relationCount};
}

module.exports = {
    readPbf,
    isLatLngInHCM,
    isSameBoundingBox,
}
