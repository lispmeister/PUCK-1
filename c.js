var constants = require('constants');
var https = require('https');
var fs = require("fs");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var options = {
    host: 'localhost',
    port: 8080,
    // path: '/kkk',
    // method: 'GET',
    key:        fs.readFileSync("/etc/d3ck/d3cks/vpn_client/vpn_client.key"),
    cert:       fs.readFileSync("/etc/d3ck/d3cks/vpn_client/vpn_client.crt"),
    ca:         fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt"),
    // key:        fs.readFileSync("bad.key"),
    // cert:       fs.readFileSync("bad.crt"),
    // ca:         fs.readFileSync("bad.ca"),
    // strictSSL:  false
};


var socket = require('socket.io-client')('https://localhost:8080/');

socket.on('connect', function(){

        console.log('connex!')

        socket.on('event', function(data){ 
            console.log('event') 
            console.log(data)
        });

        socket.on('disconnect', function(){ console.log('d/c') });

});


