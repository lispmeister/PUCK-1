//
// Setup the socket.io client against our proxy
//
client = require('socket.io-client');

//var ws = client.connect('ws://localhost:8008');
var wss = client.connect('wss://localhost:8009');

wss.on('message', function (msg) {
    console.log('Got message: ' + msg);
    wss.send('I am the client');
});
