/**
 * API server
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');

const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');
const config = require('./lib/config');

// Extract config values
const { httpPort, httpsPort, envName } = config;

// Instantiate http server
const httpServer = http.createServer((req, res) => {

  unifiedServer(req, res);

});

// Start http server
httpServer.listen(httpPort, () => {

  console.log(`Server now listening on port ${httpPort} in ${envName}`);

});

// Instantiate https server
const httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {

  unifiedServer(req, res);

});

// Start https server
httpsServer.listen(httpsPort, () => {

  console.log(`Server now listening on port ${httpsPort} in ${envName}`);

});

// Server logic for both http and https
const unifiedServer = (req, res) => {

  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get headers as an object
  const headers = req.headers;

  // Get payload, if any
  const decoder = new StringDecoder('utf-8');
  let payload = '';

  req.on('data', (data) => {

    payload += decoder.write(data);

  });

  req.on('end', () => {

    payload += decoder.end();
    payload = helpers.parseJsonToObject(payload);

    // Determine request handler
    const chosenHandler = typeof(router[path]) !== 'undefined' ? router[path] : handlers.notFound;

    // construct data object to send to handler
    const data = {
      path,
      method,
      queryStringObject,
      headers,
      payload
    };

    // Route request to chosen handler
    chosenHandler(data, (statusCode, payload) => {

      // use status code or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // use payload or default to empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // convert payload to string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request
      console.log(`
        Request received...
        Responding...
        Status Code: ${statusCode}
        Payload: ${payloadString}`
      );

    });

  });

};

// Define request router
const router = {
  'ping': handlers.ping,
  'users': handlers.users
};