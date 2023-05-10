const Segment = require('./segment');
const Node = require('./node');
const Street = require('./street');
const NodesDirect = require('./node-direct');
const NodeOsm = require('./osm-models/node-osm');
const WayOsm = require('./osm-models/way-osm');
const WayOsmScale1000 = require('./osm-models/way-osm-scale-1000');
const RelationOsm = require('./osm-models/relation-osm');
const LayerOsm = require('./osm-models/layer-osm');
const MemberOsm = require('./osm-models/relation-osm-child/member-osm');
module.exports = {
  Segment,
  Node,
  Street,
  NodesDirect,
  NodeOsm,
  WayOsm,
  WayOsmScale1000,
  RelationOsm,
  MemberOsm,
  LayerOsm,
};
