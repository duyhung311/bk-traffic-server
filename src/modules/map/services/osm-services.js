/* eslint-disable */
const { forEach } = require("lodash");
const Database = require("../../../core/database");
const Model = require("../models");
const Script = require("../../../scripts/index");
const Util = require("../util/read-pbf");
const wayOsm = require("../models/osm-models/way-osm");
const { updateMany } = require("../../../core/database");
const pLimit = require("p-limit");

const nodeModel = Model.NodeOsm.Name;
const layerModel = Model.LayerOsm.Name;
const wayModel = Model.WayOsm.Name;
const relationModel = Model.RelationOsm.Name;

async function insertData(listsObject) {
  let { nodeList, wayList, relationList } = listsObject;
  try {
    await insertMany(Model.NodeOsm.Name, nodeList);
    console.log(1);
    nodeList = null;
    // await insertMany(Model.WayOsm.Name, wayList);
    // console.log(2)
    // wayList = null;
    // await insertMany(Model.RelationOsm.Name, relationList);
    // console.log(3)
    // relationList = null;
  } catch (err) {
    console.log(err);
  }
  // return { nodeList, wayList, relationList };
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
  const wayQuery = {
    id: { $in: wayIdArray },
  };
  let ways = [];
  try {
    ways = await Database.findMany(wayModel, wayQuery);
  } catch (err) {
    return [];
  }
  const nodeSet = new Set();
  ways.forEach((w) => {
    w.refs.forEach((ref) => {
      nodeSet.add(ref);
    });
  });
  const nodeAr = await Array.from(nodeSet);
  try {
    const nodeQuery = {
      id: { $in: nodeAr },
    };
    nodes = await Database.findMany(nodeModel, nodeQuery);
  } catch (er) {
    console.log(er);
  }
  const nodeIds = [];
  nodes.forEach((n) => {
    nodeIds.push(n.id);
  });

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
  const nodes = await Database.findMany(nodeModel, query);
  const newWaySet = new Set();
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
    },
  };
  return await Database.findMany(wayModel, query);
}

async function insertLayer() {
  console.log("REQ");

  Script.startPool();

  const layerModel = Model.LayerOsm.Name;
  const layerJson = await Script.getLayerInfo();
  console.log(layerJson.length);
  const err = [];

  console.log("** Clearing way tags **");
  await updateMany(wayModel, {}, { $set: { tags: [] } });

  console.log('** Fetching ways **');
  const ways = (await Database.findMany(wayModel, {})).map((e) => e.id);
  console.log(`** Fetched ${ways.length} ways **\n`, ways[0], typeof ways[0]);

  for (const i in layerJson) {
    const l = layerJson[i];
    console.log(
      "-----Querying layer",
      i,
      "of",
      layerJson.length - 1,
      ":",
      l.name,
      "-----"
    );
    const res = await Script.query(l);
    const key = l.name;

    const limit = pLimit(1000);
    if (res) {
      const updateErr = [];
      let updatedWays = 0;
      if (res.length > 0) {
        const awaitAll = res
          .map((r) => {
            const osmId = Number(r.osm_id);
            if (osmId === undefined || Object.keys(r).length === 0 || !ways.includes(osmId)) {
              // console.log("Skip", osmId);
              return;
            }
            const query = {
              id: osmId,
            };
            if (osmId === 32575788) {
              console.log(r);
            }

            return limit(() =>
              Database.updateOne(wayModel, query, {
                $addToSet: { tags: r },
              })
                .then((e) => {
                  // console.log("Updated", osmId);
                  updatedWays++;
                })
                .catch((e) => {
                  updateErr.push(osmId);
                })
            );
          })
          .filter((e) => e !== undefined);

        const segment = 100000;
        const segmentArr = [];
        for (let i = 0; i < awaitAll.length; i += segment) {
          segmentArr.push(Promise.all(awaitAll.slice(i, i + segment)));
        }

        await Promise.all(segmentArr);

        console.log("Updated", updatedWays, "ways");
        console.log("Update err:", updateErr);
      }
    } else {
      err.push(key);
    }
  }

  console.log("QUERY ERRORS:", err);

  Script.endPool();
  return "Done";
}

// async function test(bound) {
//   const response = [];
//   const nodeModel = Model.NodeOsm.Name;
//   const query = {
//     $and: [
//       { lat: { $gt: bound.botRghtLat } },
//       { lat: { $lt: bound.topLeftLat } },
//       { lon: { $lt: bound.botRghtLon } },
//       { lon: { $gt: bound.topLeftLon } },
//     ]
//   };
//   let nodes = await Database.findMany(nodeModel, query);
//   console.log(nodes.length);
//   let layerName = new Set();
//   nodes.forEach((node) => {
//     node.layer.forEach((l)=> {
//       layerName.add(l);
//     })
//   });
//   //console.log(layerName);
//   for (const layer of layerName) {
//     const layerSet = new Set(layer.layer);
//     const nodeResp = nodes.filter((n) => {
//       return layerSet.has(n)
//     });
//     let newWaySet = new Set();
//     nodes.forEach((e) => {
//     //nodeResp.forEach((e) => {
//       if (e.refWay !== undefined) {
//         e.refWay.forEach((ref) => {
//           newWaySet.add(ref);
//         });
//         delete e.refWay;
//       }
//     });
//     const wayResp = await Database.findMany(wayModel,
//       {
//         id: {
//           $in: Array.from(newWaySet)
//         }
//       });

//     console.log(wayResp[0].tags);
//     const layerResp = {
//       name: layer,
//       nodes: nodes,
//       ways: wayResp,
//     }
//     response.push(layerResp)
//     //console.log(layerResp);
//   }

//   return response;
// }

async function test(bound) {
  const response = {
    nodes: [],
    layers: {},
  };
  const query = {
    $and: [
      { lat: { $gt: bound.minLat } },
      { lat: { $lt: bound.maxLat } },
      { lon: { $lt: bound.maxLon } },
      { lon: { $gt: bound.minLon } },
    ],
  };
  const nodes = await Database.findMany(nodeModel, query);
  const layerName = new Set();
  nodes.forEach((node) => {
    node.layer.forEach((l) => {
      layerName.add(l);
    });
  });
  const layerNameList = Array.from(layerName);
  const newWaySet = new Set();
  const nodeResp = nodes.map((e) => {
    if (e.refWay !== undefined) {
      e.refWay.forEach((ref) => {
        newWaySet.add(ref);
      });
    }

    return {
      id: e.id,
      lat: e.lat,
      lon: e.lon,
    };
  });
  response.nodes = nodeResp;
  const wayResp = await Database.findMany(wayModel, {
    id: {
      $in: Array.from(newWaySet),
    },
  });
  wayResp.forEach((e) => {
    e.layer.forEach((l) => {
      if (layerNameList.includes(l)) {
        if (response.layers[l] === undefined) {
          response.layers[l] = [];
        }
        response.layers[l].push({
          id: e.id,
          refs: e.refs,
          tags: e.tags,
        });
      }
    });

    console.log(e.tags);
  });

  return response;
}

async function findWayNotExist() {
  const layerJson = await Script.getLayerInfo();
  const rels = await Database.findMany(relationModel, {});
  const relId = [];
  for (const rel of rels) {
    relId.push(rel.id);
  }
  const ways = await Database.findMany(wayModel, {});
  const waysId = [];
  ways.forEach((w) => {
    waysId.push(w);
  });
  for (const l of layerJson) {
    const res = await Script.query(l);
    if (Object.keys(res).length > 0) {
      const key = Object.keys(res)[0];
      if (key !== "text-poly-low-zoom") continue;
      const wayIdArray = new Set();
      res[key].forEach((e) => {
        if (e.name === "Hồ Bán Nguyệt") console.log(e);
        wayIdArray.add(e.osm_id);
      });

      console.log(wayIdArray.size, key);
      // waysId: from mongo vs wayIdArray from postgis
      const notExist = [];
      wayIdArray.forEach((e) => {
        if (!waysId.includes(e)) {
          notExist.push(e);
        }
      });

      notExist.forEach((n) => {
        if (relId.includes(n)) {
          console.log(n, "is a relation in", key);
        }
      });
      console.log(notExist.length, "not exist in", key);
    }
  }

  return "Done";
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
  findWayNotExist,
};
