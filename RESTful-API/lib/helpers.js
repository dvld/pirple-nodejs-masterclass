/**
 * Helper functions
 * 
 */

// Dependencies
const crypto = require('crypto');

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

module.exports = helpers;