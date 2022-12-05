/* This file no more in used */

const RBush = require('rbush');
const RBushKNN = require('rbush-knn');

const Database = require('../../../core/database');

const Model = require('../models');

const RTree = new RBush(9);

async function findMany(query, { sort, limit, skip } = {}) {
  return Database.findMany(Model.NodesDirect.Name, query, sort, limit, skip);
}

async function initRTree() {
  // const dataForRTree = await findMany({}, {
  //   limit: 100,
  // });

  const dataForRTree = await findMany({});

  const formattedData = dataForRTree.map((item) => ({
    minX: item.coordinates[1],
    minY: item.coordinates[0],
    maxX: item.coordinates[1],
    maxY: item.coordinates[0],
    node: item.node,
  }));
  RTree.load(formattedData);
  // const treeData = RTree.toJSON();
}

function searchInTree(slat, slng, elat, elng) {
  let minX; let minY; let maxX; let
    maxY;
  if (slat < elat) {
    minX = slat;
    maxX = elat;
  } else {
    minX = elat;
    maxX = slat;
  }
  if (slng < elng) {
    minY = slng;
    maxY = elng;
  } else {
    minY = elng;
    maxY = slng;
  }

  // return RTree.search({
  //   minX: minX + 0.00000004,
  //   minY: minY - 0.00000004,
  //   maxX: maxX - 0.00000004,
  //   maxY: maxY + 0.00000004,
  // });

  return RTree.search({
    minX,
    minY,
    maxX,
    maxY,
  });
}

function findNeighbors(x, y, numOfPoints) {
  return RBushKNN(RTree, x, y, numOfPoints);
}

module.exports = {
  findMany,
  initRTree,
  RTree,
  searchInTree,
  findNeighbors,
};
