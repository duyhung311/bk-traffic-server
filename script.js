db = connect('mongodb://localhost:27017/bktraffic')
let way = db.getCollection('WayOSM');
way.count({"tags.landcover":{$exists: true}})