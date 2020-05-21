/**
 * API server
 */

// Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

// Server should respond to all requests with a string
const server = http.createServer((req, res) => {

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
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request
      console.log(`
        Request received...
        Responding...
        Status Code: ${statusCode}
        Payload: ${payloadString}`
      );

    })

  });

});

// Start server and listen on provided port
server.listen(3000, () => {
  console.log('Server now listening on port 3000');
});

// Define handlers
const handlers = {};

// Sample handler
handlers.sample = (data, callback) => {
  callback(406, {'name': 'sample handler'});
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Define a request router
const router = {
  'sample': handlers.sample
};