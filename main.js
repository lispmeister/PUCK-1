
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
    rest       = require('rest'),
    restler    = require("restler"),
    util       = require('util'),
    __         = require('underscore'),   // note; not one, two _'s, just for node
    puck       = require('./modules');

// sue me
var sleep = require('sleep');

var puck_port = 8080

// simple conf file...
var config = JSON.parse(fs.readFileSync('/etc/puck/puck.json').toString())
console.log(config);

console.log(config.PUCK)
console.log(config.PUCK.keystore)

//
// stupid hax from stupid certs - https://github.com/mikeal/request/issues/418
//
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

///--- Redis
var redis = require("redis"),
  rclient = redis.createClient();    

rclient.on("error", function (err) {
   console.log("Redis client error: " + err);
});

// file reads to string nodey stuff
var StringDecoder = require('string_decoder').StringDecoder;
var decoder       = new StringDecoder('utf8');


// global PUCK ID for this server's PUCK
try {
    puck_id = fs.readFileSync("/etc/puck/pucks/PUCK/puck.pid")
    puck_id = decoder.write(puck_id);
    puck_id = puck_id.replace(/\n/, '');
} 
catch (e) {
    console.log("no PUCK ID for this potential PUCK... you won't get anywhere w/o it....\n")
    console.log(e)
    process.exit(2)
}

//
// get the latest status... create the file if it doesn't exist...
//

// yes, yes, lazy too

// status and other bits
var server_magic  = {"vpn_status":"down","start":"n/a","start_s":"n/a","duration":"unknown","stop":"unknown","stop_s":"unknown", "client": "unknown", "client_pid":"unknown"},
    client_magic  = {"vpn_status":"down","start":"n/a","start_s":"n/a","duration":"unknown","stop":"unknown","stop_s":"unknown"}, 
    file_magic    = { "file_name" : "", "file_size" : "", "file_from" : ""},
    puck_events   = {"new_puck":""},
    browser_magic = {"127.0.0.1" :{ "notify_add":false, "notify_ring":false, "notify_file":false}},
    puck_status   = {}

    puck_status.events         = puck_events
    puck_status.openvpn_server = server_magic
    puck_status.openvpn_client = client_magic
    puck_status.file_events    = file_magic
    puck_status.browser_events = browser_magic


var server           = "",
    puck2ip          = {},      // puck ID to IP mapping
    ip2puck          = {},      // IP mapping to puck ID
    bwana_puck       = {},
    puck_status_file = "/etc/puck/status.puck";


// keep an eye on the above
pollStatus(puck_status_file)

// start with a clean slate
change_status()

//
// pick up cat facts!
//

var cat_facts = []

// json scrobbled from bits at from - https://user.xmission.com/~emailbox/trivia.htm
console.log('hoovering up cat facts... look out, tabby!')
    
fs.readFile("/etc/puck/catfacts.json", function (err, data) {
    if (err) {
        console.log('cant live without cat facts! ' + err)
        console.log('going down!')
        process.exit(code=666)
    }
    else {
        data = JSON.parse(data.toString())
        cat_facts = data.catfacts
    }
})


//
// return a fascinating detail about our furry friends
//
function random_cat_fact (facts) {
    // console.log('generating cat fact')
    var max  = facts.length

    var fact = facts[Math.floor(Math.random() * (max - 1) + 1)]
    console.log('cat fact! ' + fact)
    return(fact)
}


//
// watch vpn logs for incoming/outgoing connections
//
var server_vpn_log = "server_vpn"
var client_vpn_log = "client_vpn"
// xxxx - wonder if this shouldn't be done via REST
watch_logs(server_vpn_log, "OpenVPN Server")
watch_logs(client_vpn_log, "OpenVPN Client")

//
// promise her anything... buy her a chicken.  A json chicken, of course.
//
// function someday_get_https(url) {

var someday_get_https = function(url) {

    console.log('someday... I will get get_https ' + url)

    data = ""

    var deferred = Q.defer();

    https.get(url, function (res) {
        if (res.statusCode !== 200) {
            deferred.reject("HTTPs erz " + res.statusCode + " for " + url);
            return;
        }
        res.on("error", deferred.reject);
        res.on("data", function (chunk) {
            data += chunk;
        });
        res.on("end", function () { 
            console.log("... data is in...?")
            console.log(data)
            deferred.resolve(data); 
        });
    })

    return deferred.promise;

}

//
// drag in PUCK data to the server
//
// the very first time it's a bit of a chicken and egg thing;
// how do you get the PUCK data loaded into the server if 
// the client hasn't posted it yet? Wait for the first time
// something is posted, that should be the one that we can
// trigger on.
//

console.log('pulling in puck data for the server itself')

// wait for the first puck to be loaded in
events    = require('events');
emitter   = new events.EventEmitter();

var uber_puck = function uber_puck() {

    console.log("it's time...!")

    someday_get_https('https://localhost:' + puck_port + '/puck/' + puck_id).then(onFulfilled, onRejected)

    function onFulfilled(res) {
        console.log('finally got server response...')

        if (res.indexOf("was not found") != -1) {
            console.log('no woman no puck: ' + res)
            // trytryagain(options, callback);
        }
        else {
            console.log('puckarrific!')
            console.log(res)
            bwana_puck = JSON.parse(res)
            createEvent(get_client_ip(req), {event_type: "create", puck_id: bwana_puck.PUCK_ID})
       }
    }

    function onRejected(err) {
        console.log('Error: ', err);
        console.log("well... try again?")
        trytryagain(options, callback);
    }
}
// set the mousetrap
emitter.on('loaded', uber_puck);

// try it once
if (isEmpty(bwana_puck)) {
    emitter.emit('loaded')
}


//
// XXX - TBD - replace with socket.io
//
// send a message out that things are different
function change_status() {

    console.log('changing status...')

    // in with the old, out with the new... er, reverse that
    puck_status                = {}
    puck_status.events         = puck_events
    puck_status.openvpn_server = server_magic
    puck_status.openvpn_client = client_magic
    puck_status.file_events    = file_magic
    puck_status.browser_events = browser_magic

    //  "browser":{"xxx-ip-xxx": { "notify-ring":false, "notify-file":false}

    // wiping out manually once used
    // xxx zero ring ring?
    file_magic  = { "file_name" : "", "file_size" : "", "file_from" : ""},
    puck_events = {"new_puck":""},

    console.log("status: " + puck_status)

    // xxx - errs to user!
    fs.writeFile(puck_status_file, JSON.stringify(puck_status), function(err) {
        if (err) { console.log('err... no status... looks bad.... gasp... choke...' + err) }
        else { console.log('wrote status') }
    });

    console.log('end status')
}

//
// get the server's IP addrs, including localhost
//
// based on http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
//
var ifaces=os.networkInterfaces();
var my_net = {} // interfaces & ips
var my_ips = [] // ips only
var n      = 0
for (var dev in ifaces) {
    var alias = 0
    ifaces[dev].forEach(function(details){
        if (details.family=='IPv4') {

            my_net[details.address] = dev+(alias?':'+alias:'')
            console.log(dev+(alias?':'+alias:''),details.address)
            ++alias
            my_ips[n] = '"' + details.address + '"'

            n = n + 1
        }
    })
}

// console.log(my_ips)

//
// log file watcher
//
function watch_logs(logfile, log_type) {

    // create if doesn't exist...?
    if (!fs.existsSync(logfile)) {
        console.log('creating ' + logfile)
        fs.writeFileSync(logfile, "")
    }
    else {
        console.log('watching ' + logfile)
    }

    console.log('watching logs from ' + log_type)

    // status in public, logs in logs
//  var logfile_status = "/etc/puck/public/" + logfile + ".json",
//      status_data    = ""

    logfile = "/etc/puck/logs/" + logfile + ".log"

    var tail = new Tail(logfile)

    tail.on("line", function(line) {


        // console.log("got line from " + logfile + ":" + line)
    
        // xxx - for client openvpn - config... which ones to choose?  Another method?
        var magic_client_up     = "Initialization Sequence Completed",
            magic_client_up     = "/sbin/route add",
            magic_client_up     = "VPN is up",
            magic_client_up     = "Server : "

            magic_client_down   = "VPN is down",

            magic_server_up     = "Peer Connection Initiated",
            magic_server_down   = "ECONNREFUSED",
            magic_server_down   = "OpenVPN Server lost client",
            magic_server_remote = "Peer Connection Initiated",

            moment_in_time = moment().format('ddd  HH:mm:ss MM-DD-YY'),
            moment_in_secs =  (new Date).getTime(),
            client_remote_ip = "",
            server_remote_ip = "";

        // console.log('moment: ' + moment_in_time + ' : ' + line)

        if (log_type.indexOf("Server") > -1) {

            // shove raw logs to anyone who wants to listen
            ios.emit('openvpn_server_logs', { line: line })

            // Peer Connection Initiated with 192.168.0.141:41595
            if (line.indexOf(magic_server_remote) > -1) {
                // http://www.geekzilla.co.uk/view0CBFD9A7-621D-4B0C-9554-91FD48AADC77.htm
                // took out the \b at the beginning & end... hopefully won't burn
                client_remote_ip = line.match(/Peer Connection Initiated with.*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))/)[1]
                console.log('incoming call from ' + client_remote_ip)
            }


            // various states of up-id-ness and down-o-sity
            if (line.indexOf(magic_server_up) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn server up:\n\n')
                console.log(line)
                console.log('\n\n')

                server_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    client     : client_remote_ip,
                    client_pid : client_remote_ip,
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                createEvent('internal server', {event_type: "vpn_server_connected", puck_id: bwana_puck.PUCK_ID})
            }
            // down
            else if (line.indexOf(magic_server_down) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn server down:\n\n')
                console.log(line)
                console.log('\n\n')

                var v_duration = 0

                // if stopping read the status for when we started
    //          if (status_data != "" && status_data.vpn_status == "up") {
    //              v_duration = moment_in_secs - status_data.start_s
    //          }
    
                server_magic = {
                    vpn_status : "down",
                    start      : "n/a",
                    start_s    : "n/a",
                    client     : "",
                    client_pid : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                createEvent('internal server', {event_type: "vpn_server_disconnected", puck_id: bwana_puck.PUCK_ID})
            }
        }
        else if (log_type.indexOf("Client") > -1) {

            // shove raw logs to anyone who wants to listen
            ios.emit('openvpn_client_logs', { line: line })

            // Peer Connection Initiated with 192.168.0.141:41595
            if (line.indexOf(magic_client_up) == 0) {
                server_remote_ip = line.match(/^Server : ((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))/)[1]

                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client up!\n\n')
                console.log(line)
                console.log('ougoing call to ' + server_remote_ip)
                console.log('\n\n')
    
                // if starting simply take the current stuff
                client_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    server     : server_remote_ip,
                    server_pid : ip2puck[server_remote_ip],
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }
    
                createEvent('internal server', {event_type: "vpn_client_connected", puck_id: bwana_puck.PUCK_ID})
    
            }
            // down
            else if (line.indexOf(magic_client_down) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client Down!\n\n')
                console.log(line)
                console.log('\n\n')
    
                var v_duration = 0
    
                // if stopping read the status for when we started
    //          if (status_data != "" && status_data.vpn_status == "up") {
    //              v_duration = moment_in_secs - status_data.start_s
    //          }
    
                client_magic = {
                    vpn_status : "down",
                    start      : "n/a",
                    start_s    : "n/a",
                    server     : "",
                    server_pid : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }
    
                createEvent('internal server', {event_type: "vpn_client_disconnected", puck_id: bwana_puck.PUCK_ID})
    
            }
        }
        // I've gone feral... or it wasn't meant to be

   })

   tail.on('error', function(err) {
      console.log("\n\n\n*** error tailing *** :", err)
      console.log("stopping the watch of " + logfile)
      tail.unwatch()
   })

   console.log('trigger set')
   // Quis custodiet ipsos custodes?
   tail.watch()

}

function MissingValueError() {
    express.RestError.call(this, {
        statusCode: 409,
        restCode: 'MissingValue',
        message: '"value" is a required parameter',
        constructorOpt: MissingValueError
    });

    this.name = 'MissingValueError';
}

function PuckExistsError(key) {
    express.RestError.call(this, {
        statusCode: 409,
        restCode: 'PuckExists',
        message: key + ' already exists',
        constructorOpt: PuckExistsError
    });

    this.name = 'PuckExistsError';
}


function PuckNotFoundError(key) {
    express.RestError.call(this, {
        statusCode: 404,
        restCode: 'PuckNotFound',
        message: key + ' was not found',
        constructorOpt: PuckNotFoundError
    });

    this.name = 'PuckNotFoundError';
}

function NotImplementedError() {
    express.RestError.call(this, {
        statusCode: 404,
        restCode: 'NotImplemented',
        message: 'This method is not implemented',
        constructorOpt: NotImplementedError
    });

    this.name = 'NotImplementedError';
}

// the browser's IP
function get_client_ip(req) {

    var client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress

    if (typeof client_ip == "undefined") {
        console.log('no IP here...')
        return("") 
    }
    else
        return client_ip

}

// quick bit to get the user's ip addr

function getIP(req, res, next) {

    var ip = get_client_ip(req)

    res.send(200, '{"ip" : "' + ip + '"}');
}

//
// watch the status file for changes
//
function pollStatus(file) {

    console.log('here to statusfy you...')

    // read or create it initially
    if (puck_status == {}) {
        if (!fs.existsSync(puck_status_file)) {
            console.log('creating ' + puck_status_file)
            fs.writeFileSync(puck_status_file, JSON.stringify(puck_status))
        }
    }
    fs.readFile(puck_status_file, function (err, data) {
        if (err) {
            console.log('file errz - ' + err)
        }
        else {
            console.log(data.toString())
            puck_status = JSON.parse(data.toString())
        }
    })

    //
    // now keep an eye on the above...if it changes, change
    // the status with the new contents
    //

    console.log("I'm watching you, punk " + puck_status_file)

    fs.watchFile(puck_status_file, function (curr, prev) {
        console.log('changezor')
        // simple conf file...
        fs.readFile(puck_status_file, function (err, data) {
            if (err) {
                console.log('errz - ' + err)
            }
            else {
                console.log(data.toString())
                puck_status = JSON.parse(data.toString())
            }
         })
    })

    console.log('trigger set')

}

//
// hand out the latest news
//
function puckStatus(req, res, next) {

    // console.log('puck status check... ' + JSON.stringify(puck_status))

    res.send(200, JSON.stringify(puck_status))

}

//
// as MG said, what's going on?
//
function postStatus (req, res, next) {

    console.log ("posting browser's status")
    console.log (req.body)

    var client_ip      = get_client_ip(req)

    console.log('posting from : ' + client_ip)

    puck_events   = req.body.events
    file_magic    = req.body.file_events
    browser_magic = req.body.browser_events
    server_magic  = req.body.openvpn_server
    client_magic  = req.body.openvpn_client

    change_status()

    res.send(200, {"status" : "OK"})

}


/**
 * This is a nonsensical custom content-type 'application/puck', just to
 * demonstrate how to support additional content-types.  Really this is
 * the same as text/plain, where we pick out 'value' if available
 */
function formatPuck(req, res, body) {
    if (body instanceof Error) {
        res.statusCode = body.statusCode || 500;
        body = body.message;
    } else if (typeof (body) === 'object') {
        body = body.value || JSON.stringify(body);
    } else {
        body = body.toString();
    }

    return (body);
}



///--- Handlers

/**
 * Only checks for HTTP Basic Authenticaion
 *
 * Some handler before is expected to set the accepted user/pass combo
 * on req as:
 *
 * req.allow = { user: '', pass: '' };
 *
 * Or this will be skipped.
 */
function authenticate(req, res, next) {
    next();
}

//
// write the crypto key stuff to the FS
//
function create_puck_key_store(puck) {

    console.log('PUUUUUUCKKKKKK!')
    console.log(puck)

    if (typeof puck != 'object') {
        puck = JSON.parse(puck)
    }

    console.log('typeof : ' + typeof puck)

    console.log(puck)

    var ca   = puck.vpn_client.ca.join('\n')
    var key  = puck.vpn_client.key.join('\n')
    var cert = puck.vpn_client.cert.join('\n')
    var tls  = puck.vpn.tlsauth.join('\n')

    var puck_dir = config.PUCK.keystore + '/' + puck.PUCK_ID

    fs.mkdir(puck_dir, function(err){
        if(err) {
            // xxx - user error, bail
            console.log(err);
        }
    });

    // xxx - errs to user!
    fs.writeFile(puck_dir + '/puck.pid', bwana_puck.PUCK_ID, function(err) {
        if (err) { console.log('err writing pid - : ' + err) }
        else     { console.log('wrote pid') }
    });
    fs.writeFile(puck_dir + '/puckroot.crt', ca, function(err) {
        if (err) { console.log('err writing ca - : ' + err) }
        else     { console.log('wrote root crt') }
    });
    fs.writeFile(puck_dir + '/puck.key', key, function(err) {
        if (err) { console.log('err writing key - : ' + err) }
        else     { console.log('wrote key') }
    });
    fs.writeFile(puck_dir + '/puck.crt', cert, function(err) {
        if (err) { console.log('err writing crt - : ' + err) }
        else     { console.log('wrote crt') }
    });
    fs.writeFile(puck_dir + '/ta.key', tls, function(err) {
        if (err) { console.log('err writing tls - : ' + err) }
        else     { console.log('wrote tls') }
    });

}

//
// Redis PUCKs key are all upper case+digits
//
function createPuck(req, res, next) {

    console.log ('creating puck')
    console.log (req.params)

    var ip_addr = req.body.ip_addr

    if (!req.body.value) {
        console.log('createPuck: missing value');
        next(new MissingValueError());
        return;
    }

    var client_ip      = get_client_ip(req)
    var all_client_ips = req.body.value.all_ips

    // if the IP we get the add from isn't in the ips the other puck
    // says it has... add it in; they may be coming from a NAT or
    // something weird
    console.log('looking to see if your current ip is in your pool')
    var found = false
    for (var i = 0; i < all_client_ips.length; i++) {
        if (all_client_ips[i] == client_ip) {
            console.log('found it!')
            found = true
            break
        }
    }
    if (! found) {
        console.log("You're coming from an IP that isn't in your stated IPs... adding it to your IP pool just in case")
        req.body.value.all_ips[all_client_ips.length] = client_ip
    }


    var puck = {
        key: req.body.key || req.body.value.replace(/\W+/g, '_'),
        value:  JSON.stringify(req.body.value)
    }


    // TODO: Check if Puck exists using EXISTS and fail if it does

    console.log("key: " + puck.key);
    console.log("value: " + puck.value);

    rclient.set(puck.key, puck.value, function(err) {
        if (err) {
            console.log(err, 'putPuck: unable to store in Redis db');
            next(err);
        } else {
            console.log({puck: req.body}, 'putPuck: done');
            // if we still haven't loaded our PUCK data in, do so now
            if (isEmpty(bwana_puck)) {
                emitter.emit('loaded')
            }

            //
            // if it's from a remote system, wake up local UI and tell user
            //
            if (typeof my_net[client_ip] == "undefined") {
                console.log(req)
                console.log('create appears to be coming from remote: ' + client_ip)
                puck_events = { new_puck : client_ip }
                create_puck_key_store(puck.value)
            }
            else {
                puck_events = { new_puck : "" }
                console.log('create appears to be coming from local PUCK/host: ' + client_ip)
            }

            createEvent(get_client_ip(req), {event_type: "create", puck_id: req.body.value.PUCK_ID})

            res.send(204);
        }
    })

}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Deletes a Puck by key
 */
function deletePuck(req, res, next) {

    console.log('NUKE it from orbit!')

    rclient.del(req.params.key, function (err) {
        if (err) {
            console.log(err, 'deletePuck: unable to delete %s', req.params.key)
            next(err);
        } else {
            console.log('deletePuck: success deleting %s', req.params.key)
            createEvent(get_client_ip(req), {event_type: "delete", puck_id: req.params.key})
            res.send(204);
        }
    });
}


/**
 * Deletes all Pucks (in parallel)
 */
function deleteAll(req, res, next) {
        console.log({params: req.params}, 'deleteAll: not implemented');
        next(new NotImplementedError());
        return;
}


function webProxy(req, res, next) {

    console.log('proxie!' + '\n' + JSON.stringify(req.headers, true, 2))

    res.send(request(req.url).pipe(res))

}

//
// creates a tcp proxy to a given host.  For instance, you could call it with:
//
//  curl -k 'https://192.168.0.1:8080/setproxy?proxy_remote_host=10.0.0.1&proxy_remote_port=22&proxy_local_port=6666'
//
// From now on connections to 192.168.0.1 on port 6666 will be 
// redirected to port 22 on the host 10.0.0.1
//
function setTCPProxy(req, res, next) {

    console.log('set proxy')

    if (typeof req.query.proxy_remote_host == "undefined" || 
        typeof req.query.proxy_remote_port == "undefined" ||
        typeof req.query.proxy_local_port  == "undefined") {
            console.log('requires both remote & local ports and remote host to be defined')
            next({"error": "proxy_remote_host, proxy_remote_port, and proxy_local_port must all be defined"})
    }

    proxy_remote_host = req.query.proxy_remote_host
    proxy_remote_port = req.query.proxy_remote_port
    proxy_local_port  = req.query.proxy_local_port

    var proxy = tcpProxy.createServer({
        target: {
            host: proxy_remote_host,
            port: proxy_remote_port
        }
    })

    proxy.listen(proxy_local_port)

    console.log('set proxy to listen on port ' + proxy_local_port)

    res.send(200, {"puck_local_port": proxy_local_port, "proxy_remote_port": proxy_remote_port, "proxy_remote_host": proxy_remote_host})

}


//
// info about events is stored here.
//
// Redis keys will all be lowercase, while PUCKs are all upper case+digits
//
function createEvent(client_ip, event_data) {

    console.log('in createEvent - ' + JSON.stringify(event_data))

    console.log(event_data)


    var e_type      = event_data.event_type
    event_data.from = client_ip
    // event_data.time = Date.now()
    event_data.time = Date()
    var key         = e_type + ":" + event_data.time

    rclient.set(key, JSON.stringify(event_data), function(err) {
        if (err) {
            console.log(err, e_type + ' Revent: unable to store in Redis db');
            next(err);
        } else {
            console.log({key: event_data}, e_type + ' event : saved');
        }
    })

    change_status() // make sure everyone hears this

}

//
// async helper function to get list data... moved from lists, so this is defunct for now
//
function red_getAsync(lists, cb) {

    console.log('redasy')

    var keys  = Object.keys(lists)

    keys.forEach(function (k) {

        console.log(keys)

        var data = {}

        rclient.lrange(lists[k], 0, -1, function(err, objs) {
            if (err) { 
                console.log('listing errz') 
                console.log(err) 
                cb({})
            } 
            else {
                console.log('all ' + key)
                console.log(objs)
                cb(objs)
                // data.push(objs);
            }
        })

    })

}

/**
 *  lists the types of events and #'s of events in each... this is the list version
 */
function _old_listEvents(req, res, next) {

    console.log('listEvents')

    var data = []

    // non PUCKs
    rclient.keys('[^A-Z0-9]*', function(err, lists) {
        var multi = rclient.multi()
        var keys  = Object.keys(lists)
        var i     = 0
 
        console.log('all lists...')
        // console.log(lists)
        // console.log(keys)

        red_getAsync(lists, function(resu) {
            console.log('done!')
            // reply = { events: JSON.stringify(resu) }
            reply = { events: JSON.parse(resu) }
            console.log(reply)
            res.send(200, reply);
        })
    })

}


/**
 *  lists the types of events
 */
function listEvents(req, res, next) {

    var you_nique = []

    rclient.keys('[^A-Z0-9]*', function (err, keys) {
        if (err) {
            console.log(err, 'listEvents: unable to retrieve events');
            next(err);
        } else {
            var len = you_nique.length
            you_nique = __.uniq(__.map(keys, function(p){ return p.substr(0,p.indexOf(":"))}))
        }

        console.log('Number of Events found: ', len)
        res.send(200, JSON.stringify(you_nique));
    })

}

/**
 *  gets a particular event type's data
 *
 */
function getEvent(req, res, next) {

    console.log('getting event')

    if (typeof req.params.key == "undefined") {
        console.log('type of event required')
        var reply = {error: "missing required event type"}
        res.send(200, reply);
    }


    // get keys first, then data for all keys

    rclient.keys(req.params.key + '*', function (err, replies) {
        if (!err) {
            // console.log(replies)
            if (replies == null) {
                console.log(err, 'getEvent: unable to retrieve keys matching %s', req.params.key);
                // next(new PuckNotFoundError(req.params.key));
                next({'error': 'Event Not Found'})
                res.send(418, replies)  // 418 I'm a teapot (RFC 2324)
            } 
            else {
                // console.log("keys retrieved: ")
                // console.log(replies)

                // get data that matches the keys we just matched
                rclient.mget(replies, function (err, data) {

                    if (!err) {
                        // console.log(data)
                        if (data == null) {
                            console.log('no data returned with key ', req.params.key);
                            // next(new PuckNotFoundError(req.params.key));
                            next({'error': 'Event data not found'})
                            res.send(418, data)  // 418 I'm a teapot (RFC 2324)
                        } 
                        else {
                            // console.log("event data retrieved: " + data.toString());
                            jdata = data.toString()
                            // hack it into a json string
                            jdata = JSON.parse('[{' + jdata.substr(1,jdata.length-1) + ']')
                            // console.log(jdata)
                            res.send(200, jdata)
                        }
                    }
                    else {
                        console.log(err, 'getEvent: unable to retrieve data from keys matching %s', req.params.key);
                        res.send(418, data);   // 418 I'm a teapot (RFC 2324)
                    }
                })
            }

        }
        else {
            console.log(err, 'getEvent: unable to retrieve %s', req.puck);
            res.send(418, reply);   // 418 I'm a teapot (RFC 2324)
        }
    })

}

/**
 * Loads a Puck by key
 */
function getPuck(req, res, next) {

    console.log('getPuck')

    console.log(req.params)

    rclient.get(req.params.key, function (err, reply) {

        if (!err) {
            if (reply == null) {
                console.log(err, 'getPuck: unable to retrieve %s', req.puck);
                // next(new PuckNotFoundError(req.params.key));
                next({'error': 'PUCK Not Found'})
            } 
            else {
                // console.log("Value retrieved: " + reply.toString());
                res.send(200, reply);
            }
        }
        else {
            console.log(err, 'getPuck: unable to retrieve %s', req.puck);
            next(err);
        }
    });
}

/**
 * Simple returns the list of Puck Ids that are stored in redis
 */
function listPucks(req, res, next) {
    rclient.keys('[A-F0-9]*', function (err, keys) {
        if (err) {
            console.log(err, 'listPuck: unable to retrieve all Pucks');
            next(err);            
        } else {
            console.log('Number of Pucks found: ', keys.length);
            res.send(200, JSON.stringify(keys));
        }
    });
}

/**
 * Echo reply
 * TODO: Return actual Puck ID
 */
function echoReply(req, res, next) {

    var client_ip = get_client_ip(req)

    console.log('pingasaurus from ' + client_ip)

    if (typeof bwana_puck == "undefined") {
        console.log('no echo here...')
        var response = {status: "bad"}
    }
    else {
        console.log('echo, echo, echo....')
        var response = {status: "OK", "name": bwana_puck.name, "pid": puck_id}
    }

    res.send(200, response)

}

/**
 * Echo reply status
 * TODO: Check that the ID is our own and only return OK if it is.
 *       Otherwise throw error.
 */
function echoStatus(req, res, next) {
    res.send(200, "{\"status\": \"OK\"}");
}

 /**
 * Stop the local OpenVPN client via an external bash script.
 */
function stopVPN(req, res, next) {
    var exec    = require('child_process').exec;
    var command = '/etc/puck/exe/stop_vpn.sh';

    console.log('stop VPN!')
    var child = exec(command,
    function (error, stdout, stderr) {
        console.log('stop VPN stdout: ' + stdout);
        console.log('stop VPN stderr: ' + stderr);

        client_magic = {
            vpn_status : "down",
            start      : "n/a",
            start_s    : "n/a",
            duration   : "unknown",
            stop       : "unknown",
            stop_s     : "unknown"
        }

        // createEvent('internal server', {event_type: "vpn_client_stop", puck_id: bwana_puck.PUCK_ID})
        res.send(200, {"status": "vpn down"});

    });

}

/*
 *
 * knock on the door... anyone home?
 *
 * Check welcome/black lists to see if your PUCK will talk
 *
*/
function knockKnock(req, res, next) {

    console.log('knock knock')
    //console.log(req.params)

    // bail if we don't get ID
    if (typeof req.params.puckid === 'undefined' || req.params.puckid == "") {
      var bad_dog = "No ID, no love";
      console.log(bad_dog)
      res.send(403, { "bad": "dog"});
    }
   
    console.log("you've passed the first test...")

    var client_ip = get_client_ip(req)

    // You're not from around here, are ya, boy?
    if (typeof my_net[client_ip] == "undefined") {
       // console.log(req)
        console.log('appears to be coming from remote: ' + client_ip)
        puck_events = { ring_ring : client_ip }
    }
    // Local
    else {
      console.log('local yokel')
    }

//    var invisible_girl = "I can't see you, no IP...?";
//    console.log(invisible_girl)
//    res.send(403, invisible_girl);
//    return next(false);

    console.log(req.url, req.params.puckid)

    res.send(200, {"hey" : client_ip});

}

// upload and download some content from the vaults

function downloadStuff (req, res, next) {

    console.log('in DL stuff')

    var uploadz = "/etc/puck/public/uploads"

    var files = fs.readdirSync(uploadz)

    console.log(files)

    res.send(200, {"files" : files });

}

// helper
function createMultipartBuffer(boundary, size) {
      var head =
            '--'+boundary+'\r\n'
          + 'content-disposition: form-data; name="field1"\r\n'
          + '\r\n'
        , tail = '\r\n--'+boundary+'--\r\n'
        , buffer = new Buffer(size);
    
      buffer.write(head, 'ascii', 0);
      buffer.write(tail, 'ascii', buffer.length - tail.length);
      return buffer;
}
    
// req.files contains all the goods, including:
//
//  size
//  path        local on server
//  name        filename
//  type        mimetype, aka image/png and such

function uploadSchtuff(req, res, next) {

    console.log('uploadz!')

    if (typeof req.params.key == "undefined") {
        console.log('correct type of upload required')
        var reply = {error: "type of upload required"}
        res.send(200, reply);
    }

    // currently local & remote
    var upload_target = req.params.key

    console.log('striving to upload....' + upload_target)

    console.log(req.files)

    var client_ip = get_client_ip(req)

    console.log('from : ' + client_ip)

    for (var i=0; i<req.files.uppity.length; i++) {

        var target_size = req.files.uppity[i].size
        var target_file = req.files.uppity[i].name
        var target_path = __dirname + "/public/uploads/" + target_file
        var tmpfile     = req.files.uppity[i].path

        console.log('trying ' + tmpfile + ' -> ' + target_path)

        //
        // NOTE - target & orig file MUST be in same file system
        //
        // also... slight race condition.  Life goes on.

            console.log('trying to rename....')
    
            // XXX if on different FS, have to copy
//          fs.readFile(tmpfile, function (err, data) {
//              console.log('reading file...')
                // XXX
                // if exists... dont overwrite; reject, pick new filename, etc.
                //
//              fs.writeFile(target_path, data, function (err) {
                fs.rename(tmpfile, target_path, function (err) {
                    if (err)  {
                        console.log('errz - ')
                        console.log(err)
                    }
                    else {
                        console.log('renamed complete');
                        console.log('woohoo')

                        file_magic = {
                            file_name : target_file,
                            file_size : target_size,
                            file_from : client_ip
                        }

                        //
                        // LOCAL or remote?
                        //
                        console.log('moment of truth.. local or no?  => ' + upload_target)

                        //
                        // LOCAL - file still stashed here for now
                        //
                        if (upload_target == "local") {
                            console.log('local')
                            createEvent(client_ip, {event_type: "file_upload", "file_name": target_file, "file_size": target_size, "puck_id": ip2puck[client_ip]})
                            res.send(204, {"status" : target_file})
                        }

                        //
                        // REMOTE
                        //
                        // post to a remote PUCK, if connected... first look up IP based on PID, then post to it
                        else {
                            console.log("going to push it to the next in line: " + upload_target)

                            restler.post("https://" + upload_target + ":8080/up/local", {
                                multipart: true,
                                data: { "uppity[]": restler.file(target_path, null, target_size, null, "image/jpg") }
                            }).on("complete", function(data) {

                                if (data instanceof Error) {
                                    console.log('Error:', data.message);
                                    res.send(200, {"error" : data.message})
                                } 
                                else {
                                    console.log('upload to ' + upload_target + ' complete')
                                    createEvent(client_ip, {event_type: "remote_upload", "file_name": target_file, "file_size": target_size, "puck_id": ip2puck[upload_target]})
                                    console.log(data);
                                    res.send(204, {"status" : target_file})
                                }
                            })
                        }
                    }
                })

//      })
    }

}

 /**
 * Start the local OpenVPN client via an external bash script
 */
function startVPN(req, res, next) {

    console.log('start vpn2')
    console.log(req.body)

    var home  = "/puck.html"

    // bail if we don't get ID
    if (typeof req.body.puckid === 'undefined' || req.body.puckid == "") {
        console.log("error... requires a PUCK ID!");
        res.redirect(302, home)
    }

    console.log('onto the execution...')

    puckid = req.body.puckid
    ipaddr = req.body.ipaddr

    console.log(puckid, ipaddr)

    var vpn   = '/etc/puck/exe/start_vpn.sh'

    // this means you're trying to do it despite ping not working
    if (typeof puck2ip[puckid] == 'undefined') {
        console.log("hmmm... trying to VPN when ping couldn't reach it... good luck!")
        args = [puckid, ipaddr]
    }

    else {
        console.log("using pinged IP addr to VPN: " + puck2ip[puckid])
        args = [puckid, puck2ip[puckid]]
    }
    
    cmd = vpn

    var spawn = require('child_process').spawn,
          out = fs.open('/etc/puck/tmp/std.log', 'a'),
          err = fs.open('/etc/puck/tmp/err.log', 'a');

    var child = spawn(cmd, args, {
        detached: true,
        stdio: [ 'ignore', out, err ]
    });

    child.unref();

    console.log('post execution')

    createEvent(get_client_ip(req), {event_type: "vpn_start", remote_ip: puck2ip[puckid], remote_puck_id: puckid})

    var vpn_home = "/vpn.html"

    // prevents calling form from leaving page
// XXX ?
    res.send(204)

}


/**
 * Replaces a Puck completely
 */
function putPuck(req, res, next) {
    if (!req.params.value) {
        console.log({params: req.params}, 'putPuck: missing value');
        next(new MissingValueError());
        return;
    }

    console.log({params: req.params}, 'putPuck: not implemented');
    next(new NotImplementedError());
    return;
}


//
// ... zen added
//

function back_to_home (res) {
    console.log('on my way home')
    var home = "/puck.html"
    res.redirect(302, home)
}

// this... unfortunately... is mine
function handleForm(req, res, next) {

    console.log('handle form called with')
    console.log(req.body)

    // console.log(req.params)

    if (typeof req.body.puck_action === 'undefined' || req.body.puck_action == "") {
        console.log("error... unrecognized action: " + req.body.puck_action);
        back_to_home(res)
    }

    else if (req.body.puck_action == 'CREATE') {
        formCreate(req, res, next)
        console.log('... suck... sess...?')

        back_to_home(res)
        // res.statusCode = 201;
        // res.end()
    }

    else if (req.body.puck_action == 'DELETE') {
        formDelete(req, res, next)
        back_to_home(res)
    }

    // errror
    else {
        console.log("error... unrecognized action: " + req.body.action);
        back_to_home(res)
    }


}

function formDelete(req, res, next) {

    console.log("deleting puck...")
    console.log(req.body)
    console.log(req.body.puckid)

    // script below needs: puck-id

    // have to have these
    var puckid = req.body.puckid

    // TODO - figure out how/create some global vars to read in
    var puck_fs_home = __dirname

    //
    // execute a shell script with appropriate args to create a puck.
    // ... of course... maybe should be done in node/js anyway...
    // have to ponder some imponderables....
    //
    var util  = require('util')
    var spawn = require('child_process').spawn

    // this simply takes the pwd and finds the exe area... really 
    // want to use a reasonable puck home here!
    console.log('/etc/exe/delete_puck.sh', [puckid])
    var pucky = spawn('/etc/puck/exe/delete_puck.sh', [puckid])

    // now slice and dice output, errors, etc.
    pucky.stdout.on('data', function (data) {
        console.log('delete_puck.sh stdout: ' + data);
    });

    pucky.stderr.on('data', function (data) {
        console.log('delete_puck.sh stderr: ' + data);
    });

    pucky.on('exit', function (code) {
        console.log('delete_puck.sh process exited with code ' + code);
    });

}


//
// https ping a remote puck... it can have multiple
// IP addrs, so ping them all at once and take the
// first answer that matches their IP/PID
//
function httpsPing(puckid, ipaddr, res, next) {

    console.log("\n\n++++pinging... " + puckid + ' / ' + ipaddr)

    var all_ips = ipaddr.split(','),
        n       = all_ips.length,
        response  = "",
        responses = 0,
        errorz    = "",
        all_done  = false

    // console.log(all_ips)

    // use the last known good one, if it exists
    if (typeof puck2ip[puckid] != "undefined") {
        // console.log('using CACHED! ' + puck2ip[puckid])
        restler.get('https://' + puck2ip[puckid] + ':' + puck_port + '/ping').on('complete', function(result) {
            if (result instanceof Error) {
                console.log('Error:', result.message);
            } 
            else {
                console.log('(cached) ' + JSON.stringify(result))
                results[all_ips[i]] = result
                // cache the latest
                done = true
                res.send(200, result)
            }
        })
    }

    for (var i = 0; i < all_ips.length; i++) {

        var done = false,
            results = {},
            ip      = all_ips[i]

        if (ip == "127.0.0.1" || (typeof puck2ip[puckid] != "undefined" && puck2ip[puckid] == ip)) {
            responses = responses + 1
            continue
        }

        // console.log('pinging ' + ip)

        request('https://' + all_ips[i] + ':8080/ping', function (err, resu, msg) {

            if (done) return

            if (err) {
                console.log('errzz...')
                console.log(err)
            }
            else {
                console.log('ping werx?  ' + msg)

                msg = JSON.parse(msg)

                var remote = resu.request.host

                if (msg.pid != puckid) {
                    console.log("ID mismatch - the ping you pucked doesn't match the puck-id you gave")
                    console.log(msg.pid + ' != ' + puckid)
                    response = {status: "mismatch", "name": 'mismatched PID'}
                    // res.send(420, response) // enhance your calm!
                }
                else {

                    console.log('worked - caching ' + remote)
                    // console.log(msg)
                    results[all_ips[i]] = msg
                    // cache the latest
                    puck2ip[puckid] = remote
                    ip2puck[remote] = puckid
                    done = true
                    res.send(200, msg)
                }
            }

            if (i == (all_ips.length - 1) && !done) {
                response = {status: "ping failure", "name": 'unknown problem'}
                res.send(408, response)
            }

        })

    }
}

function formCreate(req, res, next) {

    console.log("creating puck...")
    console.log(req.body)

    var ip_addr = req.body.ip_addr

    var url = 'https://' + ip_addr + ':' + puck_port + '/ping'

    console.log('ping get_https ' + url)

    // is it a puck?
    someday_get_https(url).then(function(data) {

        console.log('... trying... hard')

        console.log(data)

        if (data.indexOf("was not found") != -1) {
            console.log('no woman no ping: ' + data)
        }

        else {
            console.log('ping sez yes')
            console.log(data)
    
            console.log('starting... writing...')
            // make the puck's dir... should not exist!
    
            data = JSON.parse(data)
            // now get remote information
            url = 'https://' + ip_addr + ':' + puck_port + '/puck/' + data.pid
    
            var puck_dir = config.PUCK.keystore + '/' + data.pid
    
            fs.mkdir(puck_dir, function(err){
                if(err) {
                    // xxx - user error, bail
                    console.log(err);
                }
            });
    
            // if ping is successful, rustle up and write appropriate data
            someday_get_https(url).then(function(data) {
    
                data = JSON.parse(data)
                console.log('remote puck info in...!')
    
                // console.log(data);
    
                create_puck_key_store(data)
    
                var puck_fs_home = __dirname
    
                //
                // execute a shell script with appropriate args to create a puck.
                // ... of course... maybe should be done in node/js anyway...
                // have to ponder the ponderables....
                //
                // Apparently the word ponder comes from the 14th century, coming from the
                // word heavy or weighty in the physical sense... which makes a certain
                // amount of sense... funny how we continually grasp for physical analogues (!)
                // to our philosophical or digital concepts.
                //
                // ... back to the program, dog!
                //
                var util  = require('util')
                var spawn = require('child_process').spawn
    
                console.log("executing create_puck.sh")
    
                // this simply takes the pwd and finds the exe area...
                var pucky = spawn('/etc/puck/exe/create_puck.sh', [data.PUCK_ID, data.image, data.ip_addr, "\"all_ips\": [\"" + data.all_ips + "\"]", data.owner.name, data.owner.email])
                console.log('remote puck add - /etc/puck/exe/create_puck.sh', data.PUCK_ID, data.image, data.ip_addr, "\"all_ips\": [\"" + data.all_ips + "\"]", data.owner.name, data.owner.email)
    
                // now slice and dice output, errors, etc.
                pucky.stdout.on('data', function (data) { console.log('_ local stdout: ' + data); });
                pucky.stderr.on('data', function (data) { console.log('_ local stderr: ' + data); });
                pucky.on('exit', function (code) { console.log('_ create_puck.sh process exited with code ' + code); });
    
                if (puck_id != data.PUCK_ID && !isEmpty(bwana_puck)) {
                    console.log("posting our puck data to the puck we just added....")
                    console.log('/etc/puck/exe/create_puck.sh [' + puck_id, bwana_puck.image, bwana_puck.ip_addr, "\"all_ips\": [" + my_ips + "]", bwana_puck.owner.name, bwana_puck.owner.email, ip_addr)
                    var remote_pucky = spawn('/etc/puck/exe/create_puck.sh', [puck_id, bwana_puck.image, bwana_puck.ip_addr, "\"all_ips\": [" + my_ips + "]", bwana_puck.owner.name, bwana_puck.owner.email, ip_addr])
    
                    // output, errors, etc.
                    remote_pucky.stdout.on('data', function (data) { console.log('# remote stdout: ' + data); });
                    remote_pucky.stderr.on('data', function (data) { console.log('# remote stderr: ' + data); });
                    remote_pucky.on('exit',        function (code) { console.log('remote create_puck.sh process exited with code ' + code) })
                    // res.send(200, {"status": "zoomer"});
                }
            })
            .fail(function(err) {
                console.log('create Error... no puck data back? ', err);
            })
        }
    })
    .fail(function(err) {
        console.log('create Error... no ping? ', err);
    })

}
  
//
// server stuff... perhaps a bit odd... but so am I
//
function serverStatus(req, res, next) {

    console.log('status masta?')

    var response = {status: "still kicking", version: server.version}
    res.send(200, response)
}

//
// goodbye sweet world... nodemon doesn't really die; instead it
// puts up a note like:
//
//   24 Mar 14:26:42 - [nodemon] app crashed - waiting for file changes before starting...
//
//
function serverDie(req, res, next) {

    console.log('et tu, zen?')

    process.exit(code=666)

    // presumably never get here ;)
    var response = {status: "I'm not dead yet... just a flesh wound"}
    res.send(200, response)
}

//
// presumes on, and relies upon, nodemon to bring me back to life
//
// simply "touch main.js" and let node, mon, to do the work
//
function serverRestart(req, res, next) {

    console.log('laying my hands upon the server, killin it, and bringing it back from the abys')

    var exec    = require('child_process').exec;
    var command = 'touch /etc/puck/main.js';

    var child = exec(command, function (error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log('exec error: ' + error);
            res.send(200, {status: "Failed"});

        } else {
            res.send(200, {status: "goodbye... I'll be back!"});
        }
    })

}

///--- Server

// Cert stuff
var key  = fs.readFileSync("/etc/puck/pucks/PUCK/puck.key")
var cert = fs.readFileSync("/etc/puck/pucks/PUCK/puck.crt")
var ca   = fs.readFileSync("/etc/puck/pucks/PUCK/ca.crt")

var credentials = {key: key, cert: cert, ca: ca};
var server      = express()

// various helpers
server.use(cors());
server.use(response());

server.use(express.limit('1gb'))

// server.use(express.logger());
server.use(express.compress());
server.use(express.methodOverride());

server.use(express.json());
server.use(express.urlencoded());
server.use(express.multipart());

server.use(express.methodOverride());
server.use(server.router);

// if all else fails
server.use(express.static(__dirname + '/public'));


//
// routes
//

// send me anything... I'll give you a chicken.  Or... status.
server.get("/status", puckStatus);

//
// send any actions done on client... like ringing a phone or whatever
// this is to help keep state in case of moving off web page, browser
// crashes, etc.
//
server.post("/status", postStatus);

/// Now the real handlers. Here we just CRUD on Puck blobs

server.post('/puck', createPuck);
server.get('/puck', listPucks);
server.head('/puck', listPucks);

// Ping action
server.get('/ping', echoReply);
server.get('/ping/:key', echoStatus);

// cuz ajax doesn't like to https other sites...
server.get('/sping/:key1/:key2', function (req, res, next) {
    // console.log('spinging')
    httpsPing(req.params.key1, req.params.key2, res, next)
});


// get your ip addr(s)
server.get('/getip', getIP);

// Return a Puck by key
server.get('/puck/:key', getPuck);
server.head('/puck/:key', getPuck);

// Delete a Puck by key
server.del('/puck/:key', deletePuck);

// Destroy everything
server.del('/puck', deleteAll, function respond(req, res, next) {
    res.send(204);
});


// Register a default '/' handler

// xxx - update!
server.get('/', function root(req, res, next) {
    var routes = [
        'GET     /',
        'POST    /puck',
        'GET     /puck',
        'DELETE  /puck',
        'PUT     /puck/:key',
        'GET     /puck/:key',
        'DELETE  /puck/:key',
        'GET     /ping',
        'GET     /ping/:key',
        'GET     /sping/:key',
        'POST    /vpn/start',
        'GET     /vpn/stop'
    ];
    res.send(200, routes);
});

server.post('/form', handleForm);

// knock knock?
server.post('/vpn/knock', knockKnock);

server.post('/vpn/start', startVPN);

// stop
server.get('/vpn/stop', stopVPN);

//
// server stuff... start, stop, restart, etc.
//
server.get('/server',         serverStatus);   // status
server.get('/server/stop',    serverDie);      // die, die, die!
server.get('/server/restart', serverRestart);  // die and restart


// setup a tcp proxy
server.get('/setproxy', setTCPProxy)

//
// events... what's going on?  Maybe should be /marvin?
//
// list event types
server.get('/events',           listEvents);
// get elements of a particular kind of event (create, delete, etc.); 
server.get('/events/:key',      getEvent);

//
// PUCK filestore - send up and getting down
//
// send stuff up the pipe....
server.post('/up/:key', uploadSchtuff)
// get down with what's up
server.get('/down', downloadStuff)


// get a url from wherever the puck is
server.all('/url', webProxy)


//
//
// and... finally... relax and listen
//
//
var pucky = https.createServer(credentials, server)

pucky.listen(puck_port)

console.log('server listening at %s', puck_port)

// tack on socket.io
var io = require('socket.io').listen(pucky, {key:key,cert:cert,ca:ca})

console.log('-- signal master is running --')

//
// smoke signalz below, for RTC!
//

var stunservers = [ {"url": "stun:stun.l.google.com:19302"} ],
    turnservers = [ /* { "url": "turn:your.turn.server.here", "secret": "turnserversharedsecret" "expiry": 86400 } */ ]

var uuid = require('node-uuid'),
    crypto = require('crypto')
    
function describeRoom(name) {
    var clients = io.sockets.clients(name);
    var result = {
        clients: {}
    };
    clients.forEach(function (client) {
        result.clients[client.id] = client.resources;
    });
    return result;
}

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}


//
// for socket channel stuff - both video and log watching and chat and all that stuff
//

var ios = io.sockets.on('connection', function (client) {

    console.log('connext from ' + client.handshake.address)

    client.resources = {
        screen: false,
        video: true,
        audio: false
    }

// listen for any chatty pucks out there

    client.on('puck_chat', function(res) {
        console.log('- cat chat -')
        console.log(res)
        console.log('- cat facts -')
    })


// slip them a friendly cat fact

    client.on('puck', function(res) {
        var cool_cat_fact = random_cat_fact(cat_facts)

        console.log('- cat facts -')
        console.log('- ' + cool_cat_fact + ' -')
        console.log('- cat facts -')

        var ip_addr = client.handshake.address
        console.log(ip_addr)

        // if connected via VPN, use remote PUCK as server
        var cat_fact_server = ""
        console.log(puck_status)
        console.log(puck_status.openvpn_client)
        console.log(puck_status.openvpn_client.server_remote_ip)
        if (typeof puck_status.openvpn_client.server != "undefined" && puck_status.openvpn_client.server != "") {
            cat_fact_server = puck_status.openvpn_client.server
        }

        console.log('cat fax server is: ' + cat_fact_server)

        var cool_cat_data    = {}

        cool_cat_data.fact   = cool_cat_fact
        cool_cat_data.server = cat_fact_server

        console.log(cat_fact_server)

        client.emit( 'cat_facts', {"data": "welcome to cat facts!"})
        client.emit( 'cat_facts', cool_cat_data)

    })


// most of the code below is from github.com:andyet/signal-master.git

    // pass a message to another id
    client.on('message', function (details) {
        var otherClient = io.sockets.sockets[details.to];
        if (!otherClient) return;
        details.from = client.id;
        otherClient.emit('message', details);
    });

    client.on('shareScreen', function () {
        client.resources.screen = true;
    });

    client.on('unshareScreen', function (type) {
        client.resources.screen = false;
        if (client.room) removeFeed('screen');
    });

    client.on('join', join);

    function removeFeed(type) {
        io.sockets.in(client.room).emit('remove', {
            id: client.id,
            type: type
        });
    }

    function join(name, cb) {
        // sanity check
        if (typeof name !== 'string') return;
        // leave any existing rooms
        if (client.room) removeFeed();
        safeCb(cb)(null, describeRoom(name));
        client.join(name);
        client.room = name;
    }

    // we don't want to pass "leave" directly because the
    // event type string of "socket end" gets passed too.
    client.on('disconnect', function () {
        removeFeed();
    });
    client.on('leave', removeFeed);

    client.on('create', function (name, cb) {
        if (arguments.length == 2) {
            cb = (typeof cb == 'function') ? cb : function () {};
            name = name || uuid();
        } else {
            cb = name;
            name = uuid();
        }
        // check if exists
        if (io.sockets.clients(name).length) {
            safeCb(cb)('taken');
        } else {
            join(name);
            safeCb(cb)(null, name);
        }
    });

    // tell client about stun and turn servers and generate nonces
    if (stunservers) {
        client.emit('stunservers', stunservers);
    }
    if (turnservers) {
        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        turnservers.forEach(function (server) {
            var hmac = crypto.createHmac('sha1', server.secret);
            // default to 86400 seconds timeout unless specified
            var username = new Date().getTime() + (server.expiry || 86400) + "";
            hmac.update(username);
            credentials.push({
                username: username,
                credential: hmac.digest('base64'),
                url: server.url
            });
        });
        client.emit('turnservers', credentials);
    }
})

