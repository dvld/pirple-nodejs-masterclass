/**
 * Library for storing and editing data
 * 
 */

// Dependencies
const fs = require('fs');
const path = require('path');

const helpers = require('./helpers');

// Module container
const lib = {};

// Base directory of data
lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {

  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {

    if (!err && fileDescriptor) {

      // Convert data to a string
      const stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, (err) => {

        if (!err) {

          fs.close(fileDescriptor, (err) => {

            if (!err) {

              callback(false);

            } else {

              callback('Error closing new file');

            }

          });

        }

      });

    } else {

      callback('Could not create new file, file may already exist');

    }

  });

};

// Read data from a file
lib.read = (dir, file, callback) => {

  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf-8', (err, data) => {

    if (!err && data) {

      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);

    } else {

      callback(err, data);

    }

  });

};

// Update data inside a file
lib.update = (dir, file, data, callback) => {

  // Open file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {

    if (!err && fileDescriptor) {

      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate file
      fs.ftruncate(fileDescriptor, (err) => {

        if (!err) {

          // write file and close it
          fs.writeFile(fileDescriptor, stringData, (err) => {

            if (!err) {

              fs.close(fileDescriptor, (err) => {

                if (!err) {

                  callback(false);

                } else {

                  callback('Error closing file');

                }

              });

            } else {

              callback('Error writing to existing file');

            }

          });

        } else {

          callback('Error truncating file');

        }

      });

    } else {

      callback('Could not open file, it may not exist yet');

    }

  });

};

// Delete a file
lib.delete = (dir, file, callback) => {

  // Unlink the file
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, (err) => {

    if (!err) {

      callback(false);

    } else {

      callback('Error deleting file');

    }

  });

};

module.exports = lib;