/**
 * API server
 */

// Dependencies
const http = require('http');
const url = require('url');

// Server should respond to all requests with a string
const server = http.createServer((req, res) => {

  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Send the response
  res.end('hello world');

  // Log the request path
  console.log(`
    Request received...
    Path: ${trimmedPath}
    Method: ${method}
    Query Strings: ${JSON.stringify(queryStringObject)}`
  );

});

// Start server and listen on provided port
server.listen(3000, () => {
  console.log('Server now listening on port 3000');
});