
var Tail    = require('tail').Tail,
    cors    = require('cors'),
    crypto  = require('crypto'),
    express = require('express'),
    fs      = require('fs'),
    https   = require('https'),
    moment  = require('moment'),
    os      = require('os'),
    path    = require('path'),
    request = require('request'),
    rest    = require('rest'),
    util    = require('util'),
    puck    = require('./modules');


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
var server_magic = {},
    client_magic = {},
    puck_events  = {},
    server       = "",
    current_ip   = {}

var puck_status      = "{}",
    puck_status_file = "/etc/puck/status.puck"

// keep an eye on the above
pollStatus(puck_status_file)

// start with a clean slate
change_status()

//
// watch vpn logs for incoming/outgoing connections
//
var server_vpn_log = "server_vpn"
var client_vpn_log = "client_vpn"
// xxxx - wonder if this shouldn't be done via REST
watch_logs(server_vpn_log, "OpenVPN Server")
watch_logs(client_vpn_log, "OpenVPN Client")

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
var bwana_puck = {}

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
            // console.log(res)
            res = JSON.parse(res)
            bwana_puck = res
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

// send a message out that things are different
function change_status() {

    console.log('changing status...')

    // in with the old, out with the new... er, reverse that
    puck_status                = {}
    puck_status.events         = puck_events
    puck_status.openvpn_server = server_magic
    puck_status.openvpn_client = client_magic

    puck_status                = JSON.stringify(puck_status)

    // this one I'm wiping out manually once used
    // xxx zero ring ring?
    puck_events = { ring_ring : "", new_puck : "" }

    console.log("status: " + puck_status)

    // xxx - errs to user!
    fs.writeFile(puck_status_file, puck_status, function(err) {
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
        var magic_client_up   = "Initialization Sequence Completed"
        var magic_client_up   = "/sbin/route add"
        var magic_client_up   = "VPN is up"

        var magic_client_down = "VPN is down"

        // xxx - server openvpn
        // var magic_server_up   = "PUSH_REPLY,route"
        var magic_server_up   = "Peer Connection Initiated"
        var magic_server_down = "ECONNREFUSED"
        var magic_server_down = "OpenVPN Server lost client"

        var moment_in_time = moment().format('ddd  HH:mm:ss MM-DD-YY'),
            moment_in_secs =  (new Date).getTime();

        // console.log('moment: ' + moment_in_time + ' : ' + line)

        if (log_type.indexOf("Server") > -1) {
            // various states of up-id-ness and down-o-sity
            if (line.indexOf(magic_server_up) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn server up:\n\n')
                console.log(line)
                console.log('\n\n')

                server_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                change_status() // tell the world about it
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
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                change_status() // tell the world about it

            }
        }
        else if (log_type.indexOf("Client") > -1) {

            if (line.indexOf(magic_client_up) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client up!\n\n')
                console.log(line)
                console.log('\n\n')
    
                // if starting simply take the current stuff
                client_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }
    
                change_status() // tell the world about it
    
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
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }
    
                change_status() // tell the world about it
    
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
    if (puck_status == "{}") {
        if (!fs.existsSync(puck_status_file)) {
            console.log('creating ' + puck_status_file)
            fs.writeFileSync(puck_status_file, puck_status)
        }
    }
    fs.readFile(puck_status_file, function (err, data) {
        if (err) {
            console.log('file errz - ' + err)
        }
        else {
            console.log(data.toString())
            puck_status = data.toString()
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
                puck_status = data.toString()
            }
         })
    })

    console.log('trigger set')

}

//
// hand out the latest news
//
function puckStatus(req, res, next) {

    // console.log('puck status check...' + puck_status)

    res.send(200, puck_status)

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

    res.setHeader('Content-Length', Buffer.byteLength(body));
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
        puck = puck.PUCK
    }

    console.log('typeof : ' + typeof puck)

    console.log(puck)

    var ca   = puck.vpn_client.ca.join('\n')
    var key  = puck.vpn_client.key.join('\n')
    var cert = puck.vpn_client.cert.join('\n')
    var tls  = puck.vpn.tlsauth.join('\n')

    var puck_dir = config.PUCK.keystore + '/' + puck['PUCK-ID']

    fs.mkdir(puck_dir, function(err){
        if(err) {
            // xxx - user error, bail
            console.log(err);
        }
    });

    // xxx - errs to user!
    fs.writeFile(puck_dir + '/puck.pid', bwana_puck['PUCK-ID'], function(err) {
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

/**
 * Note this handler looks in `req.params`, which means we can load request
 * parameters in a "mixed" way, like:
 *
 * POST /puck?key=foo HTTP/1.1
 * Host: localhost
 * Content-Type: application/json
 * Content-Length: ...
 *
 * {"value": "json value of Puck data"}
 *
 * Which would have `key` and `value` available in req.params
 */
function createPuck(req, res, next) {

    console.log (req.params)
    console.log (req.body)

    if (!req.body.value) {
        console.log('createPuck: missing value');
        next(new MissingValueError());
        return;
    }

    var client_ip      = get_client_ip(req)
    var all_client_ips = req.body.value.PUCK.all_ips

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
        req.body.value.PUCK.all_ips[all_client_ips.length] = client_ip
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

            change_status() // make sure everyone hears this

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
            console.log(err, 'deletePuck: unable to delete %s', req.puck);
            next(err);
        } else {
            console.log('deletePuck: success deleting %s', req.puck);
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

/**
 * Loads a Puck by key
 */
function getPuck(req, res, next) {

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
 *  Swap PUCK data - you give yours, it gives its back
 */
function swapPuck(req, res, next) {

    console.log('swap meat')
    console.log(req.params)
    // console.log(req.params.PUCK)

    var their_puck = req.params.PUCK['PUCK-ID']

    var puck = {
        key: their_puck,
        value:  '{ "PUCK":'  + JSON.stringify(req.params.PUCK) + "}"
    };

    console.log('their_puck: ' + their_puck)

    // store theirs
    rclient.set(puck.key, puck.value, function(err) {
        console.log('trying to store theirs...')
        if (err) {
            console.log('failzor...')
            console.log(err, 'putPuck: unable to store in Redis db');
            next(err);
        } else {
            console.log({puck: req.body}, 'putPuck: done');
            console.log('success storing theirs...')
        }
    });

    // give them ours
    rclient.get(puck_id, function (err, reply) {

        if (err) {
            console.log(err, 'getPuck: unable to retrieve %s', req.puck);
            next(err);
        } else {
            if (reply == null) {
                console.log(err, 'getPuck: unable to retrieve %s', req.puck);
                next(new PuckNotFoundError(req.params.key));
            } else {
                // console.log("Value retrieved: " + reply.toString());
                console.log('taking a short nap...')
                sleep.sleep(5)
                res.send(200, reply);
            }
        }
    })
}

/**
 * Simple returns the list of Puck Ids that are stored in redis
 */
function listPucks(req, res, next) {
    rclient.keys('*', function (err, keys) {
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

    if (typeof bwana_puck.PUCK.name == "undefined") {
        console.log('no echo here...')
        var response = {status: "bad"}
    }
    else {
        console.log('echo, echo, echo....')
        var response = {status: "OK", "name": bwana_puck.PUCK.name, "pid": puck_id}
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
 * Stop the local OpenVPN server via an external bash script.
 */
function stopVPN(req, res, next) {
    var exec    = require('child_process').exec;
    var command = '/etc/puck/exe/stop_vpn.sh';

    console.log('stop VPN!')
    var child = exec(command,
    function (error, stdout, stderr) {
        console.log('stop VPN stdout: ' + stdout);
        console.log('stop VPN stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log('exec error: ' + error);
            // if we get an error something is borked... so crush the status so
            // we dont get harassed again
            client_magic = {
                vpn_status : "down",
                start      : "n/a",
                start_s    : "n/a",
                duration   : "unknown",
                stop       : "unknown",
                stop_s     : "unknown"
            }
            change_status() // make sure everyone hears this

            res.send(200, {"status": "Failed"});

        } else {
            res.send(200, {"status": "OK"});
        }
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

 /**
 * Start the local OpenVPN server via an external bash script.
 */
function startVPN(req, res, next) {

    console.log('start vpn2')
    console.log(req.body)

    var puck_web_home  = "/puck.html"

    // bail if we don't get ID
    if (typeof req.body.puckid === 'undefined' || req.body.puckid == "") {
      console.log("error... requires a PUCK ID!");
      // redirect to the home-o-the-puck
      // fix ;)
      res.header('Location', puck_web_home);
      res.send(302);
    }
   
    console.log('onto the execution...')

    puckid = req.body.puckid
    ipaddr = req.body.ipaddr

    console.log(puckid, ipaddr)

    var vpn   = '/etc/puck/exe/start_vpn.sh'

    // this means you're trying to do it despite ping not working
    if (typeof current_ip[puckid] == 'undefined') {
        console.log("hmmm... trying to VPN when ping couldn't reach it... good luck!")
        args = [puckid, ipaddr]
    }

    else {
        console.log("using pinged IP addr to VPN: " + current_ip[puckid])
        args = [puckid, current_ip[puckid]]
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
    var home = "/puck.html"
    res.statusCode = 302;
    res.setHeader("Location", home)
    res.end()
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
        res.statusCode = 201;
        res.end()
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

    console.log("pinging... " + puckid + ' / ' + ipaddr)

    var all_ips = ipaddr.split(','),
        n       = all_ips.length,
        response  = "",
        responses = 0,
        errorz    = "",
        all_done  = false

    console.log(all_ips)

    // use the last known good one, if it exists
    if (typeof current_ip[puckid] != "undefined") {
        request.get('https://' + current_ip[puckid] + ':' + puck_port + '/ping', cb)
    }

    // make sure we've tried the other IPs for them?
    for (var i = 0; i<all_ips.length ; i++ ) {
        var ip = all_ips[i]

        if (ip == "127.0.0.1" || (typeof current_ip[puckid] != "undefined" && current_ip[puckid] == ip))
            continue

        console.log(ip)

        // xxx - read port/+ from conf
        var url = 'https://' + ip + ':' + puck_port + '/ping'
        console.log('trying... ' + url)

        request.get(url, cb)
    }

    // process the ping results
    function cb(error, result, body) {

        console.log('ping werx')
        console.log(body)

        responses = responses + 1

        if (!error && result.statusCode == 200) {
            var datum = JSON.parse(body);
            var remote = result.request.uri.hostname

//          if (typeof current_ip[puckid] == "undefined" || datum.pid != puckid) {
            var ret = {status: "OK", "name": datum.name, "pid": datum.pid}
            current_ip[puckid] = remote
            all_done = true
            console.log('ping werked: ' + puckid + ' -> ' + remote)
            res.send(200, datum)
//          }
//          else {
//              console.log('dup... someone else is using their IP now -> ' + remote)
//          }
        }
        else if (error) {
            console.log('errzz...' + error)
        }
        else {
            console.log('hmmm... weirdz - code; ' + res.statusCode)
        }

        if (!all_done && responses == all_ips.length) {
            console.log('no dice')
            console.log(datum)

            if (datum) response = {status: "dead", "name": datum.code, "pid": datum.syscall}
            else response = {status: "dead", "name": 'unknown error'}
            res.send(200, response)
        }

    }
}

//
// promise her anything... buy her a chicken.  A json chicken, of course.
//
function someday_get_https(url) {

    console.log('someday... I will get get_https ' + url)

    var Q        = require('q')
    var deferred = Q.defer();
    var https    = require('https')

    https.get(url, function(res) {
        res.on('error', function(e) {
            console.log("Erz: " + e.message);
        })
        res.on('data', function(data) {
            console.log("... data is in...!")
            var res = decoder.write(data)
            deferred.resolve(res)
        })
    })

    return deferred.promise;

}


function formCreate(req, res, next) {

    console.log("creating puck...")
    console.log(req.body)

    var ip_addr = req.body.ip_addr

    var url = 'https://' + ip_addr + ':' + puck_port + '/ping'

    console.log('get_https ' + url)

    // is it a puck?
    someday_get_https(url).done(function(data) {

        // console.log(data)

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
            someday_get_https(url).done(function(data) {

                data = JSON.parse(data)
                console.log('remote puck info in...!')

                // console.log(data);

                create_puck_key_store(data.PUCK)

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
                var pucky = spawn('/etc/puck/exe/create_puck.sh', [data.PUCK['PUCK-ID'], data.PUCK.image, data.PUCK.ip_addr, "\"all_ips\": [\"" + data.PUCK.all_ips + "\"]", data.PUCK.owner.name, data.PUCK.owner.email])
                console.log('remote puck add - /etc/puck/exe/create_puck.sh', data.PUCK['PUCK-ID'], data.PUCK.image, data.PUCK.ip_addr, "\"all_ips\": [\"" + data.PUCK.all_ips + "\"]", data.PUCK.owner.name, data.PUCK.owner.email)

                // now slice and dice output, errors, etc.
                pucky.stdout.on('data', function (data) { console.log('_ local stdout: ' + data); });
                pucky.stderr.on('data', function (data) { console.log('_ local stderr: ' + data); });
                pucky.on('exit', function (code) { console.log('_ create_puck.sh process exited with code ' + code); });

                if (puck_id != data.PUCK['PUCK-ID'] && !isEmpty(bwana_puck)) {
                    console.log("posting our puck data to the puck we just added....")
                    console.log('/etc/puck/exe/create_puck.sh [' + puck_id, bwana_puck.PUCK.image, bwana_puck.PUCK.ip_addr, "\"all_ips\": [" + my_ips + "]", bwana_puck.PUCK.owner.name, bwana_puck.PUCK.owner.email, ip_addr)
                    var remote_pucky = spawn('/etc/puck/exe/create_puck.sh', [puck_id, bwana_puck.PUCK.image, bwana_puck.PUCK.ip_addr, "\"all_ips\": [" + my_ips + "]", bwana_puck.PUCK.owner.name, bwana_puck.PUCK.owner.email, ip_addr])

                    // output, errors, etc.
                    remote_pucky.stdout.on('data', function (data) { console.log('# remote stdout: ' + data); });
                    remote_pucky.stderr.on('data', function (data) { console.log('# remote stderr: ' + data); });
                    remote_pucky.on('exit',        function (code) { console.log('remote create_puck.sh process exited with code ' + code) })
                    // res.send(200, {"status": "zoomer"});
                }
            })
        }
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

// server.use(express.logger());
server.use(express.compress());
server.use(express.methodOverride());

server.use(express.bodyParser());


//
// routes
//

// send me anything... I'll give you a chicken.  Or... status.
server.get("/status", puckStatus);

/// Now the real handlers. Here we just CRUD on Puck blobs

server.post('/puck', createPuck);
server.get('/puck', listPucks);
server.head('/puck', listPucks);

// Ping action
server.get('/ping', echoReply);
server.get('/ping/:key', echoStatus);

   // cuz ajax doesn't like to https other sites...
server.get('/sping/:key1/:key2', function (req, res, next) {
    console.log('spinging')
    httpsPing(req.params.key1, req.params.key2, res, next)
});


// get your ip addr(s)
server.get('/getip', getIP);

// Return a Puck by key
server.get('/puck/:key', getPuck);
server.head('/puck/:key', getPuck);

// send yours and get theirs
server.post('/puck/swap', swapPuck);

// Delete a Puck by key
server.del('/puck/:key', deletePuck);

// Destroy everything
server.del('/puck', deleteAll, function respond(req, res, next) {
    res.send(204);
});


// Register a default '/' handler

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

// server stuff
server.get('/server',         serverStatus);   // status
server.get('/server/stop',    serverDie);      // die, die, die!
server.get('/server/restart', serverRestart);  // die and restart

// if all else fails
server.use(express.static(__dirname + '/public'));


// and... listen
https.createServer(credentials, server).listen(puck_port, function(){
    console.log('server listening at %s', server.get('port'));
})

