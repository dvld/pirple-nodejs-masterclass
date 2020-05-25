/**
 * Helper functions
 * 
 */

// Dependencies
const crypto = require('crypto');
const queryString = require('querystring');
const https = require('https');

const config = require('./config');

// Helpers container
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {

  if (typeof(str) == 'string' && str.length > 0) {
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }

};

// Parse a JSON string to object in all cases without throwing
helpers.parseJsonToObject = (str) => {

  try {
    const obj = JSON.parse(str);
    return obj;
  } catch ({ message }) {
    console.log(message);
    return {};
  }

};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (stringLength) => {
  stringLength = typeof(stringLength) == 'number' && stringLength > 0 ? stringLength : false;

  if (stringLength) {
    // Define all possible characters
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Initialize final string
    let finalString = '';

    for (let i = 1; i <= stringLength; i++) {
      // Get random character from possible characters
      const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

      // Append character to final string
      finalString += randomCharacter;
    }

    return finalString;

  } else {
    return false;
  }

};

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, message, callback) => {
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone : false;
  message = typeof(message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

  if (phone && message) {
    // Configure request payload
    const payload = {
      'From': config.twilio.fromPhone,
      'To': `+1${phone}`,
      'Body': message
    };

    // Stringify payload
    const stringPayload = queryString.stringify(payload);

    // Configure request details
    const requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    const req = https.request(requestDetails, (res) => {
      // Get status of sent request
      const status = res.statusCode;

      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback(`Status code returned: ${status}`);
      }

    });

    // Bind to error event
    req.on('error', (err) => {
      callback(err);
    });

    // Add payload to request
    req.write(stringPayload);

    // End/Send request
    req.end();

  } else {
    callback('Given parameters are missing or invalid');
  }
};

module.exports = helpers;