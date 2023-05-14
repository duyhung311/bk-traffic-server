fs = require("fs");
const path = require("path");
var parser = require("xml2json");
const { Pool } = require("pg");
const { clearInterval } = require("timers");

let pool;

// function findQuery(obj) {
//   for (var property in obj) {
//     if (typeof obj[property] == "object") {
//       findQuery(obj[property]);
//     } else {
//       console.log(property + " = " + obj[property]);
//     }
//   }
// }

const pixel_width = 1 / 256;
const pixel_height = 1 / 256;
const scale_denominator = 1000;

function getLayerInfo() {
  return setup();
}

async function setup() {
  console.log(
    "Pixel width: " +
      pixel_width +
      " Pixel height: " +
      pixel_height +
      " Scale denominator: " +
      scale_denominator
  );

  const xml = await fs.readFileSync(
    "/Users/hungluong/Documents/u-traffic-modules/osm-scripts/mapnik.xml",
    "utf8"
  );

  const json = JSON.parse(parser.toJson(xml));
  let a = await parseXML(json);
  //console.log("aqqq: ", a);
  return a;
}

async function parseXML(json) {
  const layerJson = [];
  json.Map.Layer.forEach((layer) => {
    const name = layer.name;
    const styleNames =
      layer.StyleName instanceof Array ? layer.StyleName : [layer.StyleName];
    let srid;
    let extent;
    let table;
    layer.Datasource.Parameter.forEach((parameter) => {
      switch (parameter.name) {
        case "srid":
          srid = parameter.$t;
          break;
        case "extent":
          extent = parameter.$t;
          break;
        case "table":
          table = parameter.$t;
          table = table.replace(/!pixel_width!/g, pixel_width);
          table = table.replace(/!pixel_height!/g, pixel_height);
          table = table.replace(/!scale_denominator!/g, scale_denominator);
          table = table.replace(
            /!bbox!/g,
            `ST_MakeEnvelope(${extent}, ${srid})`
          );
          // find final presence substring "AS" and remove from the position of "AS" to the end of the string
          const asIndex = table.lastIndexOf("AS");
          if (asIndex > 0) {
            table = table.substring(0, asIndex);
          }
          break;
      }
    });
    layerJson.push({
      name,
      styleNames,
      srid,
      extent,
      table,
    });
  });
  return layerJson;
}

function startPool() {
  pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "gis",
    password: "123456",
    port: 5432, // the default port for PostgreSQL is 5432
  });
}

async function endPool() {
  await pool.end();
}

async function query(layerInfo) {
  let result = null;
  const rowInfo = [];
  let done = false;
  pool.query(layerInfo.table, (err, res) => {
    if (err) {
      // console.error(err);
    } else {
      res.rows.forEach(({ way, ...r }, index) => {
        rowInfo.push({
          ...r,
          postgisOrder: index,
        });
      });
      result = rowInfo;
      // console.log("result {}: ", result[layerInfo.name]);
    }
    done = true;
  });
  await new Promise((resolve) => {
    const intervalId = setInterval(() => {
      if (done) {
        clearInterval(intervalId);
        resolve(result);
      }
    }, 500);
  });
  console.log("result before return", result && result.length);
  return result;
}


module.exports = {
  getLayerInfo,
  query,
  startPool,
  endPool,
};
