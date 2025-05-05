const { Admin } = require("./kafka");
const admin = new Admin();

// admin.fetchMetaData();
// admin.createPartitions();
admin.getOffsetDataByTopic("simpleweb");
admin.getAllOffsets();
