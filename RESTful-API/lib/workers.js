/**
 * Worker related tasks
 * 
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

const _data = require('./data');
const helpers = require('./helpers');

// Instantiate worker object
const workers = {};

// Lookup all checks, get their data, send to validator
workers.gatherAllChecks = () => {
  // Get all checks
  _data.list('checks', (err, checks) => {

    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in check data
        _data.read('checks', check, (err, originalCheckData) => {

          if (!err && originalCheckData) {
            // Pass check data to validator
            workers.validateCheckData(originalCheckData);
          } else {
            console.log('Error reading check data');
          }

        });

      });

    } else {
      console.log('Error: Could not find any checks to process');
    }

  });

};

// Sanity check
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};

  let { id, userPhone, protocol, url, method, successCodes, timeoutSeconds } = originalCheckData;

  id =typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;
  userPhone =typeof(userPhone) == 'string' && userPhone.trim().length == 10 ? userPhone.trim() : false;
  protocol =typeof(protocol) == 'string' && ['http', 'https'].indexOf(protocol) > -1 ? protocol.trim() : false;
  url =typeof(url) == 'string' && url.trim().length > 0 ? url.trim() : false;
  method =typeof(method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(method) > -1 ? method.trim() : false;
  successCodes =typeof(successCodes) == 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes.trim() : false;
  timeoutSeconds =typeof(timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds.trim() : false;

  // Set keys that may not be set if workers have never seen the check
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked =typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked.trim() : false;

  // If all checks are cleared, pass data along
  if (id && protocol && url && method && successCodes && timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    console.log('Error: Check is not properly formatted. Skipping check');
  }

};



// Execute worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 60000);
};

// Init worker function
workers.init = () => {
  // Execute all checks on startup
  workers.gatherAllChecks();

  // Execute checks on interval
  workers.loop();

};

module.exports = workers;
