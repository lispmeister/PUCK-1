#!/usr/bin/env node

var fs = require('fs');
var PeerServer = require('peer').PeerServer;

var server = new PeerServer({
  port: 9000,
  ssl: {
    key: fs.readFileSync('/etc/d3ck/d3cks/D3CK/d3ck.key'),
    certificate: fs.readFileSync('/etc/d3ck/d3cks/D3CK/d3ck.crt')
  }
//path: '/d3ck'
});

console.log( 'Started PeerServer, port: 9000');

server.on('uncaughtException', function(e) {
  console.error('Error: ' + e);
});


server.on('connection', function(id) { 
    console.log('connex') 
    console.log(id)
})

server.on('disconnect', function(id) { 
    console.log('disconnect') 
    console.log(id)
})


