const mongoose = require('mongoose');
const Segment = require('./segment');
const Routing = require('./routing');
const MapCache = require('./map-cache');
const modelNames = require('../../../config/model-names');
const setting = require('../../../config/setting');
const Logger = require('../../../core/logger');
const FindStreetService = require('./findStreet');
const DirectFixService = require('./direct-fix');
const DynamicRouting = require('./dynamic-routing');
const OsmService = require('./osm-services')
module.exports = {
  Segment,
  Routing,
  FindStreetService,
  DirectFixService,
  DynamicRouting,
  OsmService,
  init: async () => {
    await MapCache.init(Segment.findMany, Segment.count);
    const notLevelStreet = await mongoose
      .model(modelNames.street)
      .findOne({ level: { $exists: false } });
    if (notLevelStreet) {
      await mongoose.model(modelNames.street).updateMany(
        {
          type: { $in: setting.streetTypesByLevel['4'] },
        },
        { level: 4 },
      );
      await mongoose.model(modelNames.street).updateMany(
        {
          type: { $in: setting.streetTypesByLevel['3'] },
        },
        { level: 3 },
      );
      await mongoose.model(modelNames.street).updateMany(
        {
          type: { $in: setting.streetTypesByLevel['2'] },
        },
        { level: 2 },
      );
      await mongoose.model(modelNames.street).updateMany(
        {
          type: { $in: setting.streetTypesByLevel['1'] },
        },
        { level: 1 },
      );
    }

    const notStreetLevelSegment = await mongoose
      .model(modelNames.segment)
      .findOne({ street_level: { $exists: false } });
    if (notStreetLevelSegment) {
      Logger.info('Start update street level for segments');
      const segments = await mongoose
        .model(modelNames.segment)
        .find({}, undefined, { populate: 'street' });

      await Promise.all(segments.map(async (segment, idx) => {
        Logger.info('Update %d %d', idx + 1, segments.length);
        const { street } = segment;
        segments[idx].street_level = street.level;
        segments[idx].street_name = street.name;
        segments[idx].street_type = street.type;
        return segments[idx].save();
      }));
    }
  },
};
