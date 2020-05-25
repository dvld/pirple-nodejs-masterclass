/**
 * Server related tasks
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');

const handlers = require('./handlers');
const helpers = require('./helpers');
const config = require('./config');

// Instantiate server module object
const server = {};

// Extract config values
const { httpPort, httpsPort, envName } = config;

// Instantiate http server
server.httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Instantiate https server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});

// Server logic for both http and https
server.unifiedServer = (req, res) => {
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
    const chosenHandler = typeof(server.router[path]) !== 'undefined' ? server.router[path] : handlers.notFound;

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
server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
};

// Init server function
server.init = () => {
  // Start http server
  server.httpServer.listen(httpPort, () => {
    console.log(`Http server now listening on port ${httpPort} in ${envName}`);
  });

  // Start https server
  server.httpsServer.listen(httpsPort, () => {
    console.log(`Https server now listening on port ${httpsPort} in ${envName}`);
  });
};

module.exports = server;