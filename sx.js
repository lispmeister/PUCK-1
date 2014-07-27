
var fs = require('fs')

port = 8080

var key  = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.key")
var cert = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.crt")
var ca   = fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt")
// var server = https.createServer({key: key, cert: cert, ca: ca}, app)

var sockjs = require('sockjs'),
    fs = require('fs'),
    https = require('https')

function handle(conn, chunk) {
  conn.write(chunk);
}

var httpsServer = https.createServer({ 
  key: key,
  cert: cert,
  ca: ca
}, function(req, res) {
  res.writeHead(200); 
  res.end('connect a WebSocket please'); 
});
httpsServer.listen(port);

var sockServer = sockjs.createServer();
sockServer.on('connection', function(conn) {
  conn.on('data', function(chunk) {
    handle(conn, chunk);
  });
});
sockServer.installHandlers(httpsServer, {
  prefix:'/sock'
});
console.log('Running on port '+ port);

