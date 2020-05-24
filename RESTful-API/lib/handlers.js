/**
 * Request handlers
 * 
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define handlers
const handlers = {};

// Users
handlers.users = (data, callback) => {

  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }

};

// Users submethod container
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  let { firstName, lastName, phone, password, tosAgreement } = data.payload;

  // check for all required fields
  firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false;
  lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false;
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;
  tosAgreement = typeof(tosAgreement) == 'boolean' && tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure user doesnt already exist
    _data.read('users', phone, (err, data) => {

      if (err) {
        // Hash password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            'tosAgreement': true
          };

          // Store the user
          _data.create('users', phone, userObject, (err) => {

            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {'Error': 'Could not create a new user'});
            }

          });

        } else {
          callback(500, {'Error': 'Could not hash user password'});
        }

      } else {
        callback(400, {'Error': 'A user with that phone number already exists'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  let { phone } = data.queryStringObject;

  // Validate phone number
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  if (phone) {
    // Get token from headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify token is valid for user
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {

      if (tokenIsValid) {
        // Lookup user
        _data.read('users', phone, (err, data) => {

          if (!err && data) {
            // Remove the hashed password from the user object before returning
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }

        });

      } else {
        callback(403, {'Error': 'Missing required token in headers, or token is invalid'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  let { phone, firstName, lastName, password } = data.payload;

  // Validate phone number
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  // Validate optional field
  firstName = typeof(firstName) == 'string' && firstName.trim().length > 0 ? firstName : false;
  lastName = typeof(lastName) == 'string' && lastName.trim().length > 0 ? lastName : false;
  password = typeof(password) == 'string' && password.trim().length > 0 ? password : false;

  if (phone) {

    if (firstName || lastName || password) {
      // Get token from headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify token is valid for user
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {

        if (tokenIsValid) {
          // Lookup user
          _data.read('users', phone, (err, data) => {

            if (!err && data) {

              if (firstName) {
                data.firstName = firstName;
              }

              if (lastName) {
                data.lastName = lastName;
              }

              if (password) {
                data.hashedPassword = helpers.hash(password);
              }

              // Store updated data
              _data.update('users', phone, data, (err) => {

                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, {'Error': 'Could not update user data'});
                }

              });

            } else {
              callback(400, {'Error': 'User does not exist'});
            }

          });

        } else {
          callback(403, {'Error': 'Missing required token in headers, or token is invalid'});
        }

      });

    } else {
      callback(400, {'Error': 'Missing fields to update'});
    }

  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

// Users - delete
// Required data: phone
// Optional data: none
handlers._users.delete = (data, callback) => {
  let { phone } = data.queryStringObject;

  // Validate phone number
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  if (phone) {
    // Get token from headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify token is valid for user
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {

      if (tokenIsValid) {
        // Lookup user
        _data.read('users', phone, (err, userData) => {

          if (!err && userData) {
            _data.delete('users', phone, (err) => {

              if (!err) {
                // Delete all checks associated to the user
                const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                const checksToDelete = userChecks.length;

                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;

                  userChecks.forEach((checkId) => {
                    // Delete check
                    _data.delete('checks', checkId, (err) => {

                      if (err) {
                        deletionErrors = true;
                      }

                      checksDeleted++;

                      if (checksDeleted == checksToDelete) {

                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {'Error': 'An error was encountered while attempting to delete users checks, all checks may not have been deleted successfully'});
                        }

                      }

                    });

                  });

                } else {
                  callback(200);
                }

              } else {
                callback(500, {'Error': 'Could not delete user'});
              }

            });

          } else {
            callback(400, {'Error': 'Could not find user'});
          }

        });

      } else {
        callback(403, {'Error': 'Missing required token in headers, or token is invalid'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }

};

// Token submethod container
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  let { phone, password } = data.payload;

  // Validate required fields
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  password = typeof(password) == 'string' && password.trim().length > 0 ? password.trim() : false;

  if (phone && password) {
    //Lookup user
    _data.read('users', phone, (err, data) => {

      if (!err && data) {
        // Hash sent password and compare to password stored in user object
        const hashedPassword = helpers.hash(password);

        if (hashedPassword == data.hashedPassword) {
          // If valid create new token and set expiration
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;

          // Create token object
          const tokenObject = {
            phone,
            expires,
            'id': tokenId
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (err) => {

            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {'Error': 'Could not create new token'});
            }

          });

        } else {
          callback(400, {'Error': 'Password did not match stored password'});
        }

      } else {
        callback(400, {'Error': 'Could not find user'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  let { id } = data.queryStringObject;

  // Validate id
  id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // Lookup token
    _data.read('tokens', id, (err, data) => {

      if (!err && data) {
        callback(200, data);
      } else {
        callback(404);
      }

    });

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  let { id, extend } = data.payload;

  // Validate data
  id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;
  extend = typeof(extend) == 'boolean' && extend == true ? true : false;

  if (id && extend) {
    // Lookup token
    _data.read('tokens', id, (err, data) => {

      if (!err && data) {

        if (data.expires > Date.now()) {
          // Update expiration by one hour
          data.expires = Date.now() + 1000 * 60 * 60;

          // Store updated token
          _data.update('tokens', id, data, (err) => {

            if (!err) {
              callback(200);
            } else {
              callback(500, {'Error': 'Could not update token expiration'});
            }

          });

        } else {
          callback(400, {'Error': 'Token has expired and cannot be extended'});
        }

      } else {
        callback(400, {'Error': 'Token does not exist'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'});
  }

};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  let { id } = data.queryStringObject;

  // Validate id
  id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // Lookup token
    _data.read('tokens', id, (err, data) => {

      if (!err && data) {
        _data.delete('tokens', id, (err, data) => {

          if (!err) {
            callback(200);
          } else {
            callback(500, {'Error': 'Could not delete token'});
          }

        });

      } else {
        callback(400, {'Error': 'Could not find token'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

// Verify if a given token is valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
  //Lookup token
  _data.read('tokens', id, (err, data) => {

    if (!err && data) {

      // Ensure token is not expired
      if (data.phone == phone && data.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }

    } else {
      callback(false);
    }

  });

};

// Checks
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }

};

// Checks submethod container
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  let { protocol, url, method, successCodes, timeoutSeconds } = data.payload;

  // Validate input
  protocol = typeof(protocol) == 'string' && ['https', 'http'].indexOf(protocol) > -1 ? protocol : false;
  url = typeof(url) == 'string' && url.trim().length > 0 ? url.trim() : false;
  method = typeof(method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(method) > -1 ? method : false;
  successCodes = typeof(successCodes) == 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
  timeoutSeconds = typeof(timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get token from headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    _data.read('tokens', token, (err, tokenData) => {

      if (!err && tokenData) {
        const userPhone = tokenData.phone;

        // Lookup user
        _data.read('users', userPhone, (err, userData) => {

          if (!err && userData) {
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify maxChecks limit is not reached
            if (userChecks.length < config.maxChecks) {
              // Create a random id for check
              const checkId = helpers.createRandomString(20);

              // Create check object, and include user's phone
              const checkObject = {
                'id': checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };

              // Store check object
              _data.create('checks', checkId, checkObject, (err) => {

                if (!err) {
                  // Add the checkId to the user object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Store new user data
                  _data.update('users', userPhone, userData, (err) => {

                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {'Error': 'Could not update user with new check'});
                    }

                  });

                } else {
                  callback(500, {'Error': 'Could not create the new check'});
                }

              });

            } else {
              callback(400, {'Error': `User has already reached the max number of checks (${config.maxChecks})`});
            }

          } else {
            callback(403);
          }

        });

      } else {
        callback(403);
      }

    });

  } else {
    callback(400, {'Error': 'Missing required inputs or inputs are invalid'});
  }

};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  let { id } = data.queryStringObject;

  // Validate id
  id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // Lookup check
    _data.read('checks', id, (err, checkData) => {

      if (!err && checkData) {
        // Get token from headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify token is valid for user
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {

          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(403);
          }

        });

      } else {
        callback(404);
      }

    });

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (at least one must be provided)
handlers._checks.put = (data, callback) => {
  let { id, protocol, url, method, successCodes, timeoutSeconds } = data.payload;

  // Validate input
  id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;
  protocol = typeof(protocol) == 'string' && ['https', 'http'].indexOf(protocol) > -1 ? protocol : false;
  url = typeof(url) == 'string' && url.trim().length > 0 ? url.trim() : false;
  method = typeof(method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(method) > -1 ? method : false;
  successCodes = typeof(successCodes) == 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
  timeoutSeconds = typeof(timeoutSeconds) == 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

  if (id) {

    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup check
      _data.read('checks', id, (err, checkData) => {

        if (!err && checkData) {
          // Get token from headers
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

          // Verify token belongs to user
          handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {

            if (tokenIsValid) {
              // Update check where necessary
              if (protocol) {
                checkData.protocol = protocol;
              }

              if (url) {
                checkData.url = url;
              }

              if (method) {
                checkData.method = method;
              }

              if (successCodes) {
                checkData.successCodes = successCodes;
              }

              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store updated data
              _data.update('checks', id, checkData, (err) => {

                if (!err) {
                  callback(200);
                } else {
                  callback(500, {'Error': 'Could not update check'});
                }

              });

            } else {
              callback(403);
            }

          });

        } else {
          callback(400, {'Error': 'Check id does not exist'});
        }

      });

    } else {
      callback(400, {'Error': 'Missing fields to update'});
    }

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }

};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  let { id } = data.queryStringObject;

  // Validate phone number
  id = typeof(id) == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // Lookup check
    _data.read('checks', id, (err, checkData) => {

      if (!err && checkData) {
        // Get token from headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify token is valid for user
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {

          if (tokenIsValid) {
            // Delete check data
            _data.delete('checks', id, (err) => {

              if (!err) {
                // Lookup user
                _data.read('users', checkData.userPhone, (err, userData) => {

                  if (!err && userData) {
                    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove deleted check from user checks array
                    const checkPosition = userChecks.indexOf(id);

                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);

                      // Store updated user data
                      _data.update('users', checkData.userPhone, userData, (err) => {

                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {'Error': 'Could not delete user'});
                        }

                      });

                    } else {
                      callback(500, {'Error': 'Coulod not find check on user object'}); 
                    }

                  } else {
                    callback(500, {'Error': 'Could not find user to delete check'});
                  }

                });

              } else {
                callback(500, {'Error': 'Could not delete check'});
              }

            });

          } else {
            callback(403, {'Error': 'Missing required token in headers, or token is invalid'});
          }

        });

      } else {
        callback(400, {'Error': 'Check id does not exist'});
      }

    });

  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

// Ping handler
handlers.ping = (data, callback) => {
  callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;