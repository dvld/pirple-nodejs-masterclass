/**
 * Library for storing and rotating logs
 * 
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Module container
const lib = {};

// Base directory
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file, create file if it does not exist
lib.append = (file, str, callback) => {
  // Open file to append
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to file and close it
      fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {

            if (!err) {
              callback(false);
            } else {
              callback('Error closing file');
            }

          });

        } else {
          callback('Error appending to file');
        }

      });

    } else {
      callback('Could not open file');
    }

  });

};

// List all logs, optionally include compressed logs
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames =[];
      data.forEach((fileName) => {
        // Add .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // Add on .gz files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of a .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destinationFile = `${newFileId}.gz.b64`;

  // Read source file
  fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send data to destination file
          fs.open(`${lib.baseDir}${destinationFile}`, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // Write to destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                if (!err) {
                  // Close destination file
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decompress contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;

  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress data
      const inputBuffer = Buffer.from(str, 'base64');

      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const outputString = outputBuffer.toString();
          callback(false, outputString);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Truncate a log file
lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, 0, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

module.exports = lib;