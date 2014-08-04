#!/usr/bin/env node

var port        = 8081,
    fs          = require('fs'),
    https       = require('https'),
    static      = require('node-static'),
    file        = new static.Server('.'),
    home        = "/etc/d3ck/d3cks/D3CK",
    key         = fs.readFileSync(home + "/d3ck.key"),
    cert        = fs.readFileSync(home + "/d3ck.crt"),
    ca          = fs.readFileSync(home + "/ca.crt"),
    credentials = {key: key, cert: cert, ca: ca};

// HTTPs server
server = require('https').createServer({
    key                 : key, 
    cert                : cert, 
    ca                  : ca,
    ciphers             : 'ECDHE-RSA-AES256-SHA384:AES256-SHA256:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    secureOptions       : require('constants').SSL_OP_CIPHER_SERVER_PREFERENCE,
    honorCipherOrder    : true,
    requestCert         : true,
    rejectUnauthorized  : false,
    strictSSL           : false
    }, function (request, response) {
    request.addListener('end', function () {
        // Serve files!
        file.serve(request, response);
    }).resume();
})

// eio = require('engine.io').attach(server);

// io  = require('socket.io').listen({'transports': [ 'websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling' ]},server);
// io.set('transports', [ 'websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling' ]);

io  = require('socket.io').listen(server);

// io.set('transports',[ 'xhr-polling' , 'jsonp-polling' ]);


// io.set('log level', 4);
// enable all transports (optional if you want flashsocket)
//eio.transports= [
//    'websocket'
//  , 'flashsocket'
//  , 'htmlfile'
//  , 'xhr-polling'
//  , 'jsonp-polling'
//];


io.sockets.on('connection', function (socket) {
    console.log('a user connected... well, a browser, actually')

    // console.log(socket)

    socket.on('message', function (data) {
        console.log('bcast: ' + JSON.stringify(data))
        socket.broadcast.emit('message', data);
    });


    socket.on('disconnect', function(data){
        console.log('user disconnected');
        console.log(JSON.stringify(data))
    });


});

server.listen(port, function () {
    console.log('listening to https://0.0.0.0:' + port)
})


server.on('error', function (e) {
    console.log('Server error: ' + JSON.stringify(e))
})

