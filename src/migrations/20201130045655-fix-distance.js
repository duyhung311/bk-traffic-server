const { ObjectId } = require("../core/database");
const  modelNames  = require("../config/model-names");

module.exports = {
  async up(db, client) {
    const accounts = await db.collection(modelNames.account)
    .find({type: {$ne: "password"}}).toArray();    
    for(let i = 0; i < accounts.length; i++){
      const distance = await db.collection(modelNames.distance)
      .findOne({user: accounts[i].user});
      if (!distance) {
        const data = {
          user: new ObjectId(accounts[i].user),
          distance: 0,
          point_received: 0,
          last_time_updated: new Date(accounts[i].createdAt),
        }
        await db.collection(modelNames.distance).insertOne(data)
      }      
    }
  },

  async down(db, client) {
    
  }
};
