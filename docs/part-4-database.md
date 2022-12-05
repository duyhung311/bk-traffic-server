# 4. Database

The following fields require special index in order to make server work properly:

|Collection|Field Name|Index Type|
|-|-|-|
|Nodes|location|2dpshere|
|Segments|polyline|2dpshere|
|SegmentReports|center_point|2dpshere|
|~~SegmentStatus~~|~~polyline~~|~~2dpshere~~|
|~~Basic_Traffic_Status~~|~~polyline~~|~~2dpshere~~|

Note that the server will create these index automatically, you don't need create it manual.
