/**
 * Request handlers
 * 
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

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

        // User already exists
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
// @TODO only let authenticated user access their own user object
handlers._users.get = (data, callback) => {

  let { phone } = data.queryStringObject;

  // Validate phone number
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  if (phone) {

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

    callback(400, {'Error': 'Missing required fields'});

  }

};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only let authenticated users update their own user object
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

      // Lookup user
      _data.read('users', phone, (err, data) => {

        if (!err && data) {

          // Update necessary fields
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

      callback(400, {'Error': 'Missing fields to update'});

    }

  } else {

    callback(400, {'Error': 'Missing required field'});

  }

};

// Users - delete
// Required data: phone
// Optional data: none
// @TODO Only let authenticated users delete their own user object
// @TODO Cleanup any other data files associated to the user
handlers._users.delete = (data, callback) => {

  let { phone } = data.queryStringObject;

  // Validate phone number
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  if (phone) {

    // Lookup user
    _data.read('users', phone, (err, data) => {

      if (!err && data) {

        _data.delete('users', phone, (err, data) => {

          if (!err) {

            callback(200);

          } else {

            callback(500, {'Error': 'Could not delete user'});

          }

        });

      } else {

        callback(400, {'Error': 'Could not find user'});

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