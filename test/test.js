var LogStream = require("../index.js");

var tail = LogStream("growingLog.txt");
tail.pipe(process.stdout);

// Kill LogStream after 60 seconds
setTimeout(tail.stopStream.bind(tail), 60000);