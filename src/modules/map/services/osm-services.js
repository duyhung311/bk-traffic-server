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
const wayModelScale1000 = Model.WayOsmScale1000.Name;
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
  await updateMany(wayModelScale1000, {}, { $set: { tags: {} } }).catch(er => console.log(er));

  console.log('** Fetching ways **');
  const ways = new Set((await Database.findMany(wayModelScale1000, {})).map((e) => e.id));
  for (const a in layerJson) {
    const i = Number(a);

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

    const limit = pLimit(100000);
    if (res) {
      const updateErr = [];
      let updatedWays = [];
      if (res.length > 0) {
        const awaitAll = res
          .map((r) => {
            const osmId = Number(r.osm_id);
            if (osmId === undefined || !ways.has(osmId)) {
              // console.log("Skip", osmId);
              return;
            }
            updatedWays.push(osmId);
            const query = {
              id: osmId,
            };
            if (osmId === 32575788) {
              console.log(r);
            }

            return limit(() =>
              Database.updateOne(wayModelScale1000, query, {
                $set: {
                  [`tags.${key}`]: r,
                },
              })
              .then((e) => {
                //console.log("Updated", osmId);
              })
              .catch((e) => {
                updateErr.push(osmId);
              })
            );

          })
          .filter((e) => e !== undefined);

        // awaitAll.push(Database.updateMany(wayModel, {id : {$in: updatedWays}}, {$addToSet: {layer: key}})
        //   .then(e => {
        //     console.log(e);
        //     if (e.nModified !== updatedWays.length && e.n !== updatedWays.length ) {
        //       console.error("Not match")
        //     }
        //   }))
        console.log("awaitAll", awaitAll.length);

        const segment = 100000;
        const segmentArr = [];
        for (let i = 0; i < awaitAll.length; i += segment) {
          segmentArr.push(Promise.all(awaitAll.slice(i, i + segment)));
        }

        await Promise.all(segmentArr);

        console.log("Updated", updatedWays.length, "ways");
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

async function test(bound) {
  const boundMinLat = bound.minLat;
  const boundMaxLat = bound.maxLat;
  const boundMinLon = bound.minLon;
  const boundMaxLon = bound.maxLon;

  const wayQuery = {
    $or: [
      {
        // check if obj1 contains obj2
        minLat: {$lte: boundMinLat},
        maxLat: {$gte: boundMaxLat},
        minLon: {$lte: boundMinLon},
        maxLon: {$gte: boundMaxLon},
      },
      {
        // check if obj2 contains obj1
        minLat: { $gte: boundMinLat },
        maxLat: { $lte: boundMaxLat },
        minLon: { $gte: boundMinLon },
        maxLon: { $lte: boundMaxLon },
      },
      {
        // check if obj1 and obj2 intersect
        $nor: [
          {minLat: {$gt: boundMaxLat}},
          {maxLat: {$lt: boundMinLat}},
          {minLon: {$gt: boundMaxLon}},
          {maxLon: {$lt: boundMinLon}},
        ],
      },
    ],
  }

  const sortedLayers = {};
  const ways = (await Database.findMany(wayModel, wayQuery)).map(w => {
    Object.keys(w.tags).forEach(k => {
      if (sortedLayers[k] === undefined) {
        sortedLayers[k] = [];
      }
      sortedLayers[k].push(w.id);
    })
    return {
    id: w.id,
    refs: w.refs,
    tags: { ...w.tags, postgisOrder: undefined}
    }
  });
  const nodeIds = new Set(ways.map(w => w.refs).flat());
  const nodes = (await Database.findMany(nodeModel, { id: { $in: Array.from(nodeIds) } }).catch(console.error))
    .map(n => ({
      id: n.id,
      lat: n.lat,
      lon: n.lon
    }));

  return {
    ways,
    nodes,
    layersOrder: sortedLayers
  }
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

async function addBoundToWay() {
  await Database.updateMany(wayModelScale1000, {}, {$unset: {maxLat: 1, maxLon: 1, minLat: 1, minLon: 1}});
  console.log("Cleared bbox");
  const ways = await Database.findMany(wayModelScale1000, {});
  console.log("Found", ways.length, "ways");
  const nodes = (await Database.findMany(nodeModel, {})).reduce((acc, cur) => {
    acc[cur.id] = {
      lat: cur.lat,
      lon: cur.lon
    };
    return acc;
  }, {});
  console.log("Found", Object.keys(nodes).length, "nodes");

  const limit = pLimit(1e5);
  let numNodesNotInDb = 0;
  const awaitAll = ways.map(w => {
    let maxLat = 0;
    let minLat = 2000;
    let maxLon = 0;
    let minLon = 2000;
    //console.log(nodesInWay.length);
    w.refs.forEach((r) => {
      const n = nodes[r.toString()];
      if (n === undefined) {
        numNodesNotInDb++;
        return;
      }
      maxLat = Math.max(maxLat, n.lat);
      minLat = Math.min(minLat, n.lat);
      maxLon = Math.max(maxLon, n.lon);
      minLon = Math.min(minLon, n.lon);
    });
    const update = {
      $set: {
        maxLat: maxLat,
        minLat: minLat,
        maxLon: maxLon,
        minLon: minLon,
      }
    }
    //console.log("------inserting", update, "to WayOSM with id =", w.id)
    return limit(() => Database.updateOne(wayModelScale1000, { id: w.id }, update));
  });

  console.log("Found", numNodesNotInDb, "nodes not in db");
  console.log("Updating", awaitAll.length, "ways");

  const segment = 100000;
  const segmentArr = [];
  for (let i = 0; i < awaitAll.length; i += segment) {
    segmentArr.push(Promise.all(awaitAll.slice(i, i + segment)));
  }

  await Promise.all(segmentArr);
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
  addBoundToWay,
};
