var fs = require('fs');

var PeerServer = require('peer').PeerServer;

var peerid = "foo"

var server = new PeerServer({
    key: 'mysupersecretkey',
    port: 9000,
    ssl: {
        key: fs.readFileSync('/etc/d3ck/d3cks/D3CK/d3ck.key'),
        certificate: fs.readFileSync('/etc/d3ck/d3cks/D3CK/d3ck.crt')
    }
})

