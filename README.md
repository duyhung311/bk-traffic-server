# BKTraffic backend

## Requirements

1. Nodejs
2. Mongodb

## Build

1. Add .env file (copy from env.example)
2. Install packages and start server
```
yarn install
yarn start
```

## Response document

[Read here](./docs/part-3-response-definition.md)

## Database requirements

Open Mongo Shell and create index for all fields that are geolocation type:
```
db.getCollection('SegmentReports').createIndex({center_point: "2dsphere"})
db.getCollection('Segments').createIndex({start_node: 1})
db.getCollection('Segments').createIndex({end_node: 1})
```