var express = require('express');

var sh = require('execSync');


var server = express()

var fs = require('fs');
var https = require('https');
// var cca = require('client-certificate-auth');
// var clientCertificateAuth = require('client-certificate-auth');


var opts = {
  key                : fs.readFileSync('d3ck.key'),
  cert               : fs.readFileSync('d3ck.crt'),
  ca                 : fs.readFileSync('ca.crt'),
  requestCert        : true,
  strictSSL          : false,
  rejectUnauthorized : false
};

var checkAuth = function(cert) {
 /*
  * allow access if certificate subject Common Name is 'Doug Prishpreed'.
  * this is one of many ways you can authorize only certain authenticated
  * certificate-holders; you might instead choose to check the certificate
  * fingerprint, or apply some sort of role-based security based on e.g. the OU
  * field of the certificate. You can also link into another layer of
  * auth or session middleware here; for instance, you might pass the subject CN
  * as a username to log the user in to your underlying authentication/session
  * management layer.
  */
  console.log('certitude')
  console.log(cert)

  return 0

};


// various helpers
// server.use(express.logger());
server.use(express.compress());
server.use(express.methodOverride());
server.use(express.json());
server.use(express.urlencoded());
server.use(express.multipart());
server.use(express.methodOverride());
server.use(express.cookieParser());

// server.use(clientCertificateAuth(checkAuth));

server.use(server.router);


var d3ck_tmp = "/etc/d3ck/tmp"

//
// execute a command in the background, log stuff
//
function d3ck_spawn(command, argz) {

    cmd = command.split('/')[command.split('/').length -1]

    console.log('a spawn o d3ck emerges... ' + ' (' + cmd + ')\n\n\t' + command + ' ' + argz.join(' ') + '\n')

    var spawn   = require('child_process').spawn

    try {
        out = fs.openSync(d3ck_logs + '/' + cmd + '.out.log', 'a+')
        err = fs.openSync(d3ck_logs + '/' + cmd + '.err.log', 'a+')
    }
    catch (e) {
        console.log("log open error with " + command + ' => ' + e.message)
    }

    try {
        // toss in bg; output, errors, etc. get stashed
        var spawn_o = spawn(command, argz, {
            detached: true,
            stdio: [ 'ignore', out, err ]
        })
        spawn_o.unref();
    }
    catch (e) {
        console.log("exec error with " + command + ' => ' + e.message)
    }

}



//
//  req.connection.verifyPeer()
//
//  req.connection.getPeerCertificate()
//

server.get('/', function(req, res) {
    res.send('Hello world');
})

//
// sanity checking
//

// xxx - add sanity for cert checking!
function cert_validate (req, cert) {

    var res = {}

    console.log(req.client.authorized)

    console.log('checking cert...')

    console.log('executing... openssl fu')
    // openssl verify -purpose sslclient -CAfile ca.crt client.crt 

    var result = sh.exec('openssl verify -purpose sslclient -CAfile bad.crt client.crt')
    console.log('return code ' + result.code);
    console.log('stdout + stderr ' + result.stdout);

    res.err = ""

    return(res)

}

server.get('/kkk', function(req, res) {
// server.get('/kkk', clientCertificateAuth(checkAuth), function(req, res) {

    var cert = req.connection.getPeerCertificate()

    fs.writeFileSync(d3ck_tmp + "/_d3ck_remote.crt")

    var results = cert_validate(req, cert)

    console.log(results)

    if (results.err) {
        console.log('denied!')
        console.log(results.err)
        res.send('pity da fool who tries to sneak by me!')
    }
    else {
        console.log(cert)
        console.log('auth ok')
        res.send('Hello authorized user');
    }

});

https.createServer(opts, server, function() {
    console.log('listening on port 4000')
}).listen(4000);

