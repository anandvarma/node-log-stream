var Readable = require("stream").Readable,
    util = require("util"),
    fs = require("fs");

function LogStream(file, options) {
    if (!(this instanceof LogStream)) {
        return new LogStream(file, options);
    }

    this._file = file;
    this._fileStream = handleFileStreamOpen(file);
    this._tailReading = false;
    this._fileReadable = false;
    this._fileStreamEnded = false;
    this._bytesRead = 0;    // @todo: make configurable through options

    /* Initiate Event Listeners */
    this._fileStream.on('readable', fileReadHandler.bind(this));
    this._fileStream.on('end', fileEndHandler.bind(this));

    /* Subscribe to file change events */
    this._fsWatcher = fs.watch(file, fileWatchHandler.bind(this));

    Readable.call(this, options);
}
util.inherits(LogStream, Readable);


/* Function OverRide : _read */
LogStream.prototype._read = function(len) {
    this._tailReading = true;
    process.nextTick(this._readFileStreamTillChoke.bind(this));
};

/* Read from File and push, until either end chokes */
LogStream.prototype._readFileStreamTillChoke = function() {
    var chunk;
    var ret;

    while (this._tailReading && this._fileReadable) {
        chunk = this._fileStream.read();
        if (chunk == null) {
            this._fileReadable = false;
        }
        else {
            ret = this.push(chunk);
            this._bytesRead += chunk.length;
        }
        if (ret == false) this._tailReading = false;
    }
}

/* Shut it Down! */
LogStream.prototype.stopStream = function() {
    this.push(null);
    this._fsWatcher.close();
}

module.exports = LogStream;


/*
 * Event Callbacks & Helper Functions
 */
function handleFileStreamOpen(file) {
    var ret = fs.createReadStream(file);
    /* @todo: Handle Exceptions here */
    return (ret);
}

function fileReadHandler() {
    this._fileReadable = true;
    this._readFileStreamTillChoke();
}

function fileEndHandler() {
    this._fileStreamEnded = true;
}

function fileWatchHandler(event, fileName) {
    if (this._fileStreamEnded) {
        this._fileStreamEnded = false;

        /* Restart the stream and setup Callbacks */
        this._fileStream = fs.createReadStream(this._file, {
            start: this._bytesRead,
            end: Infinity,
                // @todo : support for fd option (will save on file open and close)
        });
        this._fileStream.on('readable', fileReadHandler.bind(this));
        this._fileStream.on('end', fileEndHandler.bind(this));

    }
}