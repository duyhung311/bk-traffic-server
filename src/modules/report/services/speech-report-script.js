const Database = require('../../../core/database');
const Model = require('../models');

/**
 * Get N random speech report scripts
 * @param {Number} quantity number of scripts
 */
async function getNRandomScripts(quantity = 1) {
  const aggregate = Database.aggregate(Model.SpeechReportScript.Name, []);
  return aggregate.project({ _id: 1, script: 1 }).sample(quantity).exec();
}

module.exports = {
  getNRandomScripts,
};
