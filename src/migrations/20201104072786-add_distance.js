const { ObjectId } = require("../core/database");
const  modelNames  = require("../config/model-names");

module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    const userList = await db.collection(modelNames.user).find({}).toArray();
    userList.forEach( async (user) => {
      const userId = user._id;
      const timeUpdated = user.createdAt;
      const data = {
        user: new ObjectId(userId),
        distance: 0,
        point_received: 0,
        last_time_updated: new Date(timeUpdated),
      }
      await db.collection(modelNames.distance).insertOne(data)
    });
  },
  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // return db.collection('Distance').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
    await db.collection(modelNames.distance).deleteMany();
  },
};
