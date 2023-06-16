/* eslint-disable no-nested-ternary */
const mongoose = require('mongoose');
const Logger = require('../../core/logger');
const MapModule = require('../map');
const modelNames = require('../../config/model-names');
const trafficCache = require('../traffic-status/traffic-status.cache');
const utils = require('../../core/utils');
const { CodeError, ErrorType } = require('../../core/error');

async function getTrafficStatus(data) {
  try {
    let querySegments = {};
    let segments = [];
    const {
      type,
      coordinates,
      radius,
      time,
      option,
    } = data;
    if (type === 'rectangle') {
      querySegments = {
        polyline: {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [coordinates[0][1], coordinates[0][0]],
                  [coordinates[1][1], coordinates[1][0]],
                  [coordinates[2][1], coordinates[2][0]],
                  [coordinates[3][1], coordinates[3][0]],
                  [coordinates[0][1], coordinates[0][0]],
                ],
              ],
            },
          },
        },
      };
      // segments = await MapModule.Service.Segment.findMany(querySegments);
      segments = await mongoose.model(modelNames.segment)
        .find(querySegments).select({
          _id: 1, polyline: 1, street_name: 1, street_type: 1,
        });
    } else if (type === 'circle') {
      querySegments = {
        polyline: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates[0][1], coordinates[0][0]],
            },
            $minDistance: 0,
            $maxDistance: radius,
          },
        },
      };
      // segments = await MapModule.Service.Segment.findMany(querySegments);
      segments = await mongoose.model(modelNames.segment)
        .find(querySegments).select({
          _id: 1, polyline: 1, street_name: 1, street_type: 1,
        });
    } else if (type === 'line') {
      const roads = await MapModule.Service.Segment.direct(
        { lat: coordinates[0][0], lng: coordinates[0][1] },
        { lat: coordinates[1][0], lng: coordinates[1][1] },
        'distance',
        true,
      );
      segments = roads[option].coords.map((segment) => ({
        _id: segment.segment_id,
        polyline: {
          type: 'LineString',
          coordinates: [
            [segment.lng, segment.lat],
            [segment.elng, segment.elat],
          ],
        },
        street: segment.street,
      }));
    }

    const result = [];
    const step = 15 * 60000; // 15 minutes
    let timeStep = new Date(time.start);
    const timeEnd = new Date(time.end);
    while (timeStep <= timeEnd) {
      for (const segment of segments) {
        const query = {
          segment_id: segment.id,
          updatedAt: {
            $lte: timeStep,
          },
          expireAt: {
            $gte: timeStep,
          },
        };
        // let trafficStatuses = await Database.findMany(modelNames.trafficStatus, query);
        const trafficStatuses = mongoose.model(modelNames.trafficStatus).find(query)
          .select({ source: 1, velocity: 1, updatedAt: 1 });
        if (trafficStatuses && trafficStatuses.length > 0) {
          for (const trafficStatus of trafficStatuses) {
            result.push({
              segmentId: segment._id,
              polyline: segment.polyline,
              source: trafficStatus.source,
              velocity: trafficStatus.velocity,
              los: utils.getLOSFromVelocity(trafficStatus.velocity),
              time: utils.convertTimestampToDateTime(trafficStatus.createdAt, 'DD/MM/YYYY h:mm:ss'),
              street: (type === 'line') ? segment.street : (segment.street_name
                ? {
                  name: segment.street_name,
                  type: segment.street_type,
                }
                : {
                  name: 'Không xác định',
                  type: 'unclassified',
                }),
            });
          }
        } else {
          const trafficStatus = trafficCache.getStatusOfSegment(segment._id);
          if (!trafficStatus) {
            throw new CodeError({
              ...ErrorType.serviceError,
              message: 'Cache Status Segment is not complete!',
            });
          }
          const period = utils.getBaseStatusFieldOfTime(timeStep);
          const los = trafficStatus.segmentStatus[period];
          result.push({
            segmentId: segment._id,
            polyline: segment.polyline,
            source: 'base-data',
            velocity: utils.getVelocityFromLOS(los),
            los,
            time: utils.convertTimestampToDateTime(timeStep, 'DD/MM/YYYY hh:mm:ss'),
            street: (type === 'line') ? segment.street : (segment.street_name
              ? {
                name: segment.street_name,
                type: segment.street_type,
              }
              : {
                name: 'Không xác định',
                type: 'unclassified',
              }),
          });
        }
      }
      timeStep = new Date(new Date(timeStep).getTime() + step);
    }
    return result;
  } catch (error) {
    Logger.error(error);
    return [];
  }
}

module.exports = {
  getTrafficStatus,
};
