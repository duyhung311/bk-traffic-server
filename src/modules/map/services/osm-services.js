const Database = require("../../../core/database");
const Model = require("../models");
const nodeModel = Model.NodeOsm.Name;
const wayModel = Model.WayOsm.Name;

async function fetchLayer(bound) {
  const boundMinLat = bound.minLat;
  const boundMaxLat = bound.maxLat;
  const boundMinLon = bound.minLon;
  const boundMaxLon = bound.maxLon;

  const wayQuery = {
    $or: [
      {
        // check if obj1 contains obj2
        minLat: { $lte: boundMinLat },
        maxLat: { $gte: boundMaxLat },
        minLon: { $lte: boundMinLon },
        maxLon: { $gte: boundMaxLon },
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
          { minLat: { $gt: boundMaxLat } },
          { maxLat: { $lt: boundMinLat } },
          { minLon: { $gt: boundMaxLon } },
          { maxLon: { $lt: boundMinLon } },
        ],
      },
    ],
  };

  const ways = (await Database.findMany(wayModel, wayQuery)).map((w) => {
    return {
      id: w.id,
      refs: w.refs,
      tags: w.tags,
    };
  });
  const nodeIds = new Set(ways.map((w) => w.refs).flat());
  const nodes = (
    await Database.findMany(nodeModel, {
      id: { $in: Array.from(nodeIds) },
    }).catch(console.error)
  ).map((n) => ({
    id: n.id,
    lat: n.lat,
    lon: n.lon,
  }));

  return {
    ways,
    nodes,
  };
}

module.exports = {
  fetchLayer,
};
