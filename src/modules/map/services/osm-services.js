const { forEach } = require('lodash');
const Database = require('../../../core/database');
const Model = require('../models')

async function insertData(listsObject) {
    let {nodeList,
        wayList,
        relationList} = listsObject;
    console.log("adding Node list");
    await insertMany(Model.NodeOsm.Name, nodeList);
    console.log("adding Way list");
    try {
        await insertMany(Model.WayOsm.Name, wayList);
    }
    catch (err) {
        console.log(err);
    }
    
    console.log("adding Relation list");
    
    try {
        await insertMany(Model.RelationOsm.Name, relationList);
    }
    catch (err) {
        console.log(err);
    }
    return {nodeList, wayList, relationList};
}

async function insertMany(model, data) {
    await Database.insertMany(model, data);

}

async function insertOneNode(data) {
    return await Database.insertMany(Model.NodeOsm.Name, data);
}

async function insertOneWay(data) {
    return await Database.insertMany(Model.WayOsm.Name, data);
}

async function insertOneRelation(data) {
    return await Database.insertMany(Model.RelationOsm.Name, data);
}



async function getWayAndNodeFromBound(bound) {
    const nodeModel = Model.NodeOsm.Name;
    const query = {
        $and: [
            {lat: {$gt: bound.botRghtLat}},
            {lat: {$lt: bound.topLeftLat}},
            {lon: {$lt: bound.botRghtLon}},
            {lon: {$gt: bound.topLeftLon}},
        ]
    };
    let nodes = await Database.findMany(nodeModel, query);
    let newWaySet = new Set();
    nodes.forEach((e) => {
        if (e.refWay !== undefined) {
            e.refWay.forEach((ref) => {
                //console.log(ref)
                newWaySet.add(ref);
            });
            delete e.refWay;
        }
    });
    nodes.forEach((e) => {
        if (e.refWay !== undefined) {
            e.refWay = undefined;
        }
    });
    console.log(nodes[0].refWay);
    return {nodes, newWaySet};
}
async function getWays(newWaySet) {
    const wayModel = Model.WayOsm.Name;
    const query = {
        id: {
            $in: newWaySet,
        }
    };
    return await Database.findMany(wayModel, query);
}

module.exports = {
    insertData,
    insertOneNode,
    insertOneWay,
    insertOneRelation,
    getWayAndNodeFromBound,
    getWays,
}