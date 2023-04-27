const { forEach } = require('lodash');
const Database = require('../../../core/database');
const Model = require('../models')
const Script = require('../../../scripts/index');
const Util = require('../util/read-pbf');
const nodeModel = Model.NodeOsm.Name;
const layerModel = Model.LayerOsm.Name;
const wayModel = Model.WayOsm.Name;

async function insertData(listsObject) {
  let { nodeList,
        wayList,
        relationList } = listsObject;
  try {
    await insertMany(Model.NodeOsm.Name, nodeList);
    await insertMany(Model.WayOsm.Name, wayList);
    await insertMany(Model.RelationOsm.Name, relationList);
  } catch (err) {
    console.log(err);
  }
  return { nodeList, wayList, relationList };
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

async function getNodeFromWayIdArray(wayIdArray) {
  let nodes;
  let wayQuery = {
    id: {$in: wayIdArray},
  }
  let ways = [];
  try {
    ways = await Database.findMany(wayModel, wayQuery);
  }
  catch(err) {
    return [];
  }
  let nodeSet = new Set();
  ways.forEach((w) => {
    w.refs.forEach((ref) => {
      nodeSet.add(ref);
    }) 
  })
  const nodeAr = await Array.from(nodeSet);
  try {
    const nodeQuery = {
      id : {$in: nodeAr}
    };
    nodes = await Database.findMany(nodeModel, nodeQuery);
  } catch (er) {
    console.log(er)
  }
  let nodeIds = [];
  nodes.forEach((n) => {
    nodeIds.push(n.id);
  })
  
  return nodeIds;
}

async function getWayAndNodeFromBound(bound) {
  const query = {
    $and: [
      { lat: { $gt: bound.botRghtLat } },
      { lat: { $lt: bound.topLeftLat } },
      { lon: { $lt: bound.botRghtLon } },
      { lon: { $gt: bound.topLeftLon } },
    ],
    
  };
  let nodes = await Database.findMany(nodeModel, query);
  let newWaySet = new Set();
  nodes.forEach((e) => {
    if (e.refWay !== undefined) {
      e.refWay.forEach((ref) => {
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
  return { nodes, newWaySet };
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

async function insertLayer() {
  const layerModel = Model.LayerOsm.Name;
  let layerJson = await Script.getLayerInfo(); 
  for (const l of layerJson) {
    let res = await Script.query(l);
    if (Object.keys(res).length > 0) {
      let key = Object.keys(res)[0];
      let wayIdArray = new Set();
      res[key].forEach(e => {
        wayIdArray.add(e['osm_id']);
      });
      let nodes = await getNodeFromWayIdArray(Array.from(wayIdArray));
      if (res[key].length > 0) {
        const lenResKey = res[key].length;
        const firstHalf = res[key].splice(0, lenResKey/2);   
        const secondHalf = res[key].splice(lenResKey/2, lenResKey);   
        const waysString1 = JSON.stringify(firstHalf);
        const waysString2 = JSON.stringify(secondHalf);
        const wayString = waysString1.concat(waysString2);
        const layer = {
          name: key,
          nodes: nodes,
          ways: wayString,
        };
        await Database.create(layerModel, layer);
        Database.updateMany(wayModel, {id : {$in: Array.from(wayIdArray)}}, {$addToSet: {layer: key}})
        .then()
        .catch(e => {console.log(e.id)});
      } else {
        const layer = {
          name: key,
          nodes: nodes,
          ways: 'waysString',
        };
        let a = await Database.create(layerModel, layer);
      }
      
    } 
  }
  return "Done";
}

async function test(bound) {
  const response = [];
  const nodeModel = Model.NodeOsm.Name;
  const query = {
    $and: [
      { lat: { $gt: bound.botRghtLat } },
      { lat: { $lt: bound.topLeftLat } },
      { lon: { $lt: bound.botRghtLon } },
      { lon: { $gt: bound.topLeftLon } },
    ]
  };
  let nodes = await Database.findMany(nodeModel, query);
  let layerName = new Set();
  nodes.forEach((node) => {
    node.layer.forEach((l)=> {
      layerName.add(l);
    })
  });
  for (const layer of layerName) {
    const layerSet = new Set(layer.layer);
    const nodeResp = nodes.filter((n) => {
      return layerSet.has(n)
    });
    let newWaySet = new Set();
    nodeResp.forEach((e) => {
      if (e.refWay !== undefined) {
        e.refWay.forEach((ref) => {
          newWaySet.add(ref);
        });
        delete e.refWay;
      }
    });
    const wayResp = await Database.findMany(wayModel, 
      {
        id: {
          $in: Array.from(newWaySet)
        }
      });
    const layerResp = {
      name: layer,
      nodes: nodeResp,
      ways: wayResp,
    }
    response.push(layerResp)
  }
  return response;
}



module.exports = {
  insertData,
  insertOneNode,
  insertOneWay,
  insertOneRelation,
  getWayAndNodeFromBound,
  getWays,
  insertLayer,
  test,
}
