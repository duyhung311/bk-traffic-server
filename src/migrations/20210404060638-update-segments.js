const fetch = require("node-fetch");
const axios = require('axios');
const modelNames  = require("../config/model-names");

module.exports = {
  async up(db, client) {
    const segments = await db.collection(modelNames.segment).find({street_name : undefined}).toArray();
    for(let i=0; i<segments.length; i++) {
      const segment = segments[i];
      const id = segment._id;
      const lon = ((segment.polyline.coordinates[0][0] + segment.polyline.coordinates[1][0]) / 2).toFixed(7);
      const lat = ((segment.polyline.coordinates[0][1] + segment.polyline.coordinates[1][1]) / 2).toFixed(7);
      let url = `https://nominatim.openstreetmap.org/reverse?format=geocodejson&lat=${lat}&lon=${lon}`;
      // console.log('url', url);
      await fetch(url)
      .then(response => response.json())
      .then(async res => {
        console.log('id', id);
        // console.log('res', res.features[0].properties.geocoding);
        const data = res.features[0].properties.geocoding;
        const type = segment.street_type === "unclassified" ? data.type : segment.street_type;
        let street = "";
        if (data.street && data.street !=="" ) {
          street = data.street;
        } else if (data.name && data.name !== "") {
          street =  data.name;
        } else if (data.district && data.district !== ""){
          street = data.district;
        } else if (data.city && data.city !== "") {
          street = data.city;
        }
        console.log('type', type);
        console.log('street', street);
        let now = new Date();
        await db.collection(modelNames.segment).updateOne({_id: id}, {$set: {street_name: street, street_type: type, updatedAt: now}});
      })
      .catch((error) => {
        console.error('Error:', error);
      });
    }
  },

  async down(db, client) {

  }
};
