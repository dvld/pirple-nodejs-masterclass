/**
 * Worker related tasks
 * 
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const URL = require('url');
const util = require('util');
const debug = util.debuglog('workers');

const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

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
            debug('Error reading check data');
          }

        });

      });

    } else {
      debug('Error: Could not find any checks to process');
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
  successCodes =typeof(successCodes) == 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
  timeoutSeconds =typeof(timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

  // Set keys that may not be set if workers have never seen the check
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked =typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all checks are cleared, pass data along
  if (id && protocol && url && method && successCodes && timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    debug('Error: Check is not properly formatted. Skipping check');
  }

};

// Perform check, send original check data and outcome to next process
workers.performCheck = (originalCheckData) => {
  let { protocol, url, method, timeoutSeconds } = originalCheckData;

  // Prepare initial check outcome
  const checkOutcome = {
    'error': false,
    'responseCode': false
  };

  // Mark outcome has not been sent yet
  let outcomeSent = false;

  // Parse hostname and path out of original check data
  const parsedUrl = URL.parse(`${protocol}://${url}`, true);
  const { hostname, path } = parsedUrl;

  // Construct the request
  const requestDetails = {
    'protocol': `${protocol}:`,
    hostname,
    'method': method.toUpperCase(),
    path,
    'timeout': timeoutSeconds * 1000
  };

  // Instantiate request object (using either http or https)
  const _moduleToUse = protocol == 'http' ? http : https;

  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab status of sent request
    const status = res.statusCode;

    // Update checkOutcome and pass along data
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to error event
  req.on('error', (err) => {
    // Update check outcome and pass along data
    checkOutcome.error = {
      'error': true,
      'value': err
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to timeout event
  req.on('timeout', (err) => {
    // Update check outcome and pass along data
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End request
  req.end();

};

// Process check outcome and update check data as needed, and trigger alerts as needed
// Special logic for accomodating checks that have never been tested (no alert)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if check is considered 'up' or 'down'
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
  
  // log the outcome
  const timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Store update check data
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {

      // Send new check data to next phase if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug('Check outcome has not changed, no alert needed');
      }

    } else {
      debug('Error trying to save updates');
    }
  });

};

// Alert the user to a change in check status
workers.alertUserToStatusChange = (newCheckData) => {
  const { method, protocol, url, state, userPhone } = newCheckData;
  const message = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}`;

  helpers.sendTwilioSms(userPhone, message, (err) => {
    if (!err) {
      debug('Success: User was alerted to status change via SMS', message);
    } else {
      debug('Error: Could not send SMS alert to user who had a state change');
    }
  });

};

workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    'check': originalCheckData,
    'outcome': checkOutcome,
    state,
    'alert': alertWarranted,
    'time': timeOfCheck
  };

  // Convert data to a string
  const logString = JSON.stringify(logData);

  // Determine log file name
  const logFileName = originalCheckData.id;

  // Append log string to file
  _logs.append(logFileName, logString, (err) => {
    if (!err) {
      debug('Logging to file successful');
    } else {
      debug('Logging to file failed');
    }
  });

};

// Execute worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) all log files
workers.rotateLogs = () => {
  // List all (non compressed) log files
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach((logName) => {
        // Compress data to a different file
        const logId = logName.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, (err) => {
          if (!err) {
            // Truncate log
            _logs.truncate(logId, (err) => {
              if (!err) {
                debug('Success truncating log file');
              } else {
                debug('Error truncating log file');
              }
            });
          } else {
            debug('Error compressing log file', err);
          }
        });
      });
    } else {
      debug('Error: Could not find any logs to rotate');
    }
  });
};

// Timer to execute log rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60 * 60 * 24);
};

// Init worker function
workers.init = () => {

  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all checks on startup
  workers.gatherAllChecks();

  // Execute checks on interval
  workers.loop();

  // Compress all logs on startup
  workers.rotateLogs();

  // Call the compression loop periodically
  workers.logRotationLoop();

};

module.exports = workers;
