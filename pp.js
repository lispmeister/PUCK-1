var Tail       = require('tail').Tail,
    Q          = require('q'),
    cors       = require('cors'),
    crypto     = require('crypto'),
    express    = require('express'),
    fs         = require('fs'),
    formidable = require('formidable'),
    https      = require('https'),
    moment     = require('moment'),
    os         = require('os'),
    path       = require('path'),
    tcpProxy   = require('tcp-proxy'),
    request    = require('request'),
    response   = require('response-time'),
    util       = require('util'),
    __         = require('underscore'),   // note; not one, two _'s, just for node
    puck       = require('./modules');

var puck_port = 8080

var httpProxy = require('http-proxy')


var proxy_port  = 7777,
    remote_host = '192.168.0.7',
    remote_port = puck_port;

    remote_port = 8081

var remote_url  = "https://" + remote_host + ":" + remote_port

console.log('\n\n[+] proxying from the local server on port ' + proxy_port + ' => ' + remote_url)

var key  = fs.readFileSync("/etc/puck/pucks/PUCK/puck.key"),
    cert = fs.readFileSync("/etc/puck/pucks/PUCK/puck.crt"),
    ca   = fs.readFileSync("/etc/puck/pucks/PUCK/ca.crt")

var credentials = {key: key, cert: cert, ca: ca};

var whitelist = ['https://localhost:7777', 'https://192.168.0.250:7777', 'https://192.168.0.250:8080', remote_url]

var corsOptions = {
    origin: function(origin, callback){
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, originIsWhitelisted);
        },
    credentials: true
    }

var express_proxy = express()

// various helpers

// important
//express_proxy.use(cors(corsOptions))

// express_proxy.use(express.logger())
// express_proxy.use(express.compress())
// express_proxy.use(express.methodOverride())
// express_proxy.use(express.json())
// express_proxy.use(express.urlencoded())
// express_proxy.use(express.multipart())
// express_proxy.use(express.methodOverride())
//express_proxy.use(express_proxy.router)

var proxy = new httpProxy.createProxyServer({
    ssl: credentials,
    target: {
        host: remote_host,
        port: remote_port
    },
    secure: false
})

proxy_server = https.createServer(credentials, function(req, res) {
    console.log('sending request along...')
    proxy.web(req, res, { target: remote_url }, function (err) {
        // if (err) throw err;
        console.log('proxy hairball - ')
        console.log(err)
        res.writeHead(502)
        res.end("proxy error") 
    })
})

proxy.on('proxyRes', function (res) {
    console.log('RAW Response from the target', JSON.stringify(res.headers, true, 2));
});

// WebSocket stuff
proxy.on('upgrade', function (req, socket, head) {
    console.log('upgrade caught')
    proxy.wss(req, socket, head, function (err) {
        console.log('wss proxy hairball - ')
        console.log(err)
        res.writeHead(502)
        res.end("proxy error") 
        // socket.close();
    })
})

try {
    proxy_server.listen(proxy_port, function() {
        console.log('proxy web/sockets server for ' + remote_host + ' created, listening on ' + proxy_port)
    })
}
catch (e) {
    console.log('.... fix this... need to close proxy....')
}

