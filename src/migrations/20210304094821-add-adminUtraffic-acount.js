const { ObjectId } = require("../core/database");
const  modelNames  = require("../config/model-names");

module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    const userData = {
      name: 'Admin Utraffic',
      username: 'admin_utraffic',
      status: 'active',
      email: 'admin.utraffifc@gmail.com',
      role: 'admin-utraffic',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.collection(modelNames.user).insertOne(userData);
    const currentUser = await db.collection(modelNames.user).findOne({username: 'admin_utraffic'});
    const accountData = {
      user: new ObjectId(currentUser._id),
      username: 'admin_utraffic',
      password: '$2a$10$zSE99MJeVGgPbc90VZcL5eGVf0WLE9W4tvotSxIXP1uOUx/BLdMnO', //123456789
      status: 'active',
      type: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.collection(modelNames.account).insertOne(accountData);
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
    await db.collection(modelNames.account).deleteOne({username: 'admin_utraffic'});
    await db.collection(modelNames.user).deleteOne({username: 'admin_utraffic'});
  }
};
