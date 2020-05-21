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

    // Send the response
    res.end('hello world');
  
    // Log the request path
    const requestLog = {
      path,
      method,
      queryStringObject,
      headers,
      payload
    };

    console.log(`
      Request received...
      ${JSON.stringify(requestLog)}`
    );

  });

});

// Start server and listen on provided port
server.listen(3000, () => {
  console.log('Server now listening on port 3000');
});