/*
  proxy-https-to-http.js: Basic example of proxying over HTTPS to a target HTTP server
    (Rest of copyright @ bottom)
*/ 

var https  = require('https'), http   = require('http'), static = require('node-static'), file   = new static.Server('.'), util   = require('util'), path   = require('path'), fs     = require('fs'), colors = require('colors'), httpProxy = require('http-proxy')

var home = "/etc/d3ck/d3cks/D3CK"

var key         = fs.readFileSync(home + "/d3ck.key"),
    cert        = fs.readFileSync(home + "/d3ck.crt"),
    ca          = fs.readFileSync(home + "/ca.crt")

var io = require('socket.io')



var express = require('express');

var app = express();

// Create the HTTPS proxy server listening on port 8000
var proxy = httpProxy.createServer(app)

// Add headers
app.use(function (req, res, next) {

    console.log('trying... ' + req.url)

    res.setHeader('Access-Control-Allow-Origin', 'https://192.168.0.250:8081');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});



// app.use(cors({ origin: "https://192.168.0.250:8080", credentials: false }));
// app.use(cors({ origin: "https://192.168.0.250:8080" })
// app.use(cors({ credentials: false }))

// io.set('transports', ['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile', 'flashsocket']);
// io.set('origins', '*:*');

// Create the target HTTP server 
//http.createServer(function (req, res) {
//    console.log('all is clear on the inside, serving up: ' + req.url)
//    file.serve(req, res);
//}).listen(8081);


// var ios = io.listen(8008);

mega_server = https.createServer({
    key                 : key, 
    cert                : cert, 
    ca                  : ca,
    // wss                 : true,
//  ciphers             : 'ECDHE-RSA-AES256-SHA384:AES256-SHA256:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
//  secureOptions       : require('constants').SSL_OP_CIPHER_SERVER_PREFERENCE,
//  honorCipherOrder    : true,
//  requestCert         : true,
//  rejectUnauthorized  : false,
//  strictSSL           : false
    },
    app,
    function (req, res) {
        console.log('i live to serve')
        proxy.web(req, res, { target: 'https://192.168.0.250:8080 })
    }
).listen(8081);

//ios.sockets.on('connection', function (client) {
//    util.debug('Got websocket connection');

//    client.on('message', function (msg) {
//        util.debug('Got message from client: ' + msg);
//    });

//    client.send('... from server ...!');

//});


util.puts('https proxy server'.blue + ' started '.green.bold + 'on port '.blue + '8081'.yellow);
//util.puts('http server '.blue + 'started '.green.bold + 'on port '.blue + '9009'.yellow);
//util.puts('socket.io server '.blue + 'started '.green.bold + 'on port '.blue + '8008'.yellow);





/*
  Copyright (c) Nodejitsu 2013

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

