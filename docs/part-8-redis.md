# 8. Redis

Redis is config to store data backup file in:

- Ubuntu: /var/lib/redis/dump.rdb (BKTraffic server)
- MacOs: /usr/local/var/db/redis/dump.rdb

How to keep track current capacity?

- First approach, using HSET with expiration time:
Everytime a segment is routed, BKTrafic server will generate a key:value pair in format `cap:${segment_id}:${uuid}`:{activate_time, deactivate_time} and store in Redis with expiration time = eta (travel time estimated from the begining to the end of that segment). We use KEYS to achieve the current capacity. Using KEYS `cap:${segment_id}:*` will return a list of segment_id that are existing in Redis. Then, we will check whether these segments being activate or not (activate_time < current_time < deactivate_time). If true, count up the current capacity one value.
-> To get current capacity: O(N) with N being the number of keys in the database.
Pros: Can set expiration time for every segment.
Cons: Query time is too large in case we have many keys in database. (We need to cache LOS for 4 periods so at least we always have at least 300000 keys in database)
- Second approach, using ZADD with exipartion time:
Everytime a segment is routed, it will be stored in Redis using ZADD(segment_id, {active_time, uuid}). So each time the segment is in used, the new specified uuid with the specified active_time will be add to the sorted set stored at key=segment_id. To get the current capacity, we use ZRANGEBYSCORE(segment_id, start_time, end_time). This query will return a set of uuid in the sorted set stored at key=segment_id with start_time < active_time < end_time.
-> To get current capacity: O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements being returned.
Pros: Query time is short regardless of number of keys being stored in database.
Cons: Cannot set expiration time or each member in sorted set. Solution is that we will delete all sorted set at 12pm (Maybe).
