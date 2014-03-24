
// general includes
var Tail    = require('tail').Tail,
    assert  = require('assert-plus'),
    bunyan  = require('bunyan'),
    fs      = require('fs'),
    moment  = require('moment'),
    os      = require('os'),
    restify = require('restify'),
    path    = require('path'),
    rest    = require('rest'),
    util    = require('util'),
    when    = require('when')

// sue me
var sleep = require('sleep');

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
   // req.log.error("Redis client error: " + err);
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

// status chex
var server_magic = {},
    client_magic = {},
    puck_events  = {}
    server       = ""

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

    someday_get_https('https://localhost:8080/puck/' + puck_id).then(onFulfilled, onRejected)

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
    puck_events = { new_puck : "" }

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
// http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
//

var ifaces=os.networkInterfaces();
var my_ips = {}
for (var dev in ifaces) {
    var alias=0
    ifaces[dev].forEach(function(details){
        if (details.family=='IPv4') {
            my_ips[details.address] = details.address
            console.log(dev+(alias?':'+alias:''),details.address)
            ++alias
        }
    })
}


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
    
        // xxx - for client openvpn - config
        var magic_client_up   = "/sbin/route add"
        var magic_client_down = "VPN is down"

        // xxx - server openvpn
        // var magic_server_up   = "PUSH_REPLY,route"
        var magic_server_up   = "Peer Connection Initiated"
        var magic_server_down = "ECONNREFUSED"

        var moment_in_time = moment().format('ddd  HH:mm:ss MM-DD-YY'),
            moment_in_secs =  (new Date).getTime();

        // console.log('moment: ' + moment_in_time + ' : ' + line)

        if (log_type.indexOf("Server")) {
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
        else if (log_type.indexOf("Client")) {

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

///--- Errors
function MissingValueError() {
    restify.RestError.call(this, {
        statusCode: 409,
        restCode: 'MissingValue',
        message: '"value" is a required parameter',
        constructorOpt: MissingValueError
    });

    this.name = 'MissingValueError';
}
util.inherits(MissingValueError, restify.RestError);


function PuckExistsError(key) {
    assert.string(key, 'key');

    restify.RestError.call(this, {
        statusCode: 409,
        restCode: 'PuckExists',
        message: key + ' already exists',
        constructorOpt: PuckExistsError
    });

    this.name = 'PuckExistsError';
}
util.inherits(PuckExistsError, restify.RestError);


function PuckNotFoundError(key) {
    assert.string(key, 'key');

    restify.RestError.call(this, {
        statusCode: 404,
        restCode: 'PuckNotFound',
        message: key + ' was not found',
        constructorOpt: PuckNotFoundError
    });

    this.name = 'PuckNotFoundError';
}
util.inherits(PuckNotFoundError, restify.RestError);

function NotImplementedError() {
    restify.RestError.call(this, {
        statusCode: 404,
        restCode: 'NotImplemented',
        message: 'This method is not implemented',
        constructorOpt: NotImplementedError
    });

    this.name = 'NotImplementedError';
}
util.inherits(NotImplementedError, restify.RestError);


// quick bit to get the user's ip addr

function getIP(req, res, next) {

   var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress

    res.send(200, '{"ip" : "' + ip + '"}');
    next(); 
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
    next()

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
    if (!req.allow) {
        req.log.debug('skipping authentication');
        next();
        return;
    }

    var authz = req.authorization.basic;
    if (!authz) {
        res.setHeader('WWW-Authenticate', 'Basic realm="puckapp"');
        next(new restify.UnauthorizedError('authentication required'));
        return;
    }

    if (authz.username !== allow.user || authz.password !== allow.pass) {
        next(new restify.ForbiddenError('invalid credentials'));
        return;
    }

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

    // var dh   = res.PUCK.vpn_client.dh.join('\n')
    // var tls  = res.PUCK.vpn_client.tlsauth.join('\n')

    var puck_dir = config.PUCK.keystore + '/' + puck['PUCK-ID']

    fs.mkdir(puck_dir, function(err){
        if(err) {
            // xxx - user error, bail
            console.log(err);
        }
    });

    // xxx - errs to user!
    fs.writeFile(puck_dir + '/puck.pid', puck['PUCK-ID'], function(err) {
        if (err) { console.log('err: ' + err) }
        else { console.log('wrote pid') }
    });
    fs.writeFile(puck_dir + '/puckroot.crt', ca, function(err) {
        if (err) { console.log('err: ' + err) }
        else { console.log('wrote root crt') }
    });
    fs.writeFile(puck_dir + '/puck.key', key, function(err) {
        if (err) { console.log('err: ' + err) }
        else { console.log('wrote key') }
    });
    fs.writeFile(puck_dir + '/puck.crt', cert, function(err) {
        if (err) { console.log('err: ' + err) }
        else { console.log('wrote crt') }
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

    if (!req.params.value) {
        req.log.warn('createPuck: missing value');
        console.log('createPuck: missing value');
        next(new MissingValueError());
        return;
    }

    var puck = {
        key: req.params.key || req.params.value.replace(/\W+/g, '_'),
        value:  JSON.stringify(req.params.value)
    };

    // TODO: Check if Puck exists using EXISTS and fail if it does

    req.log.debug("key: " + puck.key);
    req.log.debug("value: " + puck.value);

    rclient.set(puck.key, puck.value, function(err) {
        if (err) {
            req.log.warn(err, 'putPuck: unable to store in Redis db');
            next(err);
        } else {
            req.log.debug({puck: req.body}, 'putPuck: done');
            // if we still haven't loaded our PUCK data in, do so now
            if (isEmpty(bwana_puck)) {
                emitter.emit('loaded')
            }

            //
            // if it's from a remote system, wake up local UI and tell user
            //
            var client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            if (typeof my_ips[client_ip] == "undefined") {
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
            next();
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
    rclient.del(req.params.key, function (err) {
        if (err) {
            req.log.warn(err,
                         'deletePuck: unable to delete %s',
                         req.puck);
            next(err);
        } else {
            req.log.debug('deletePuck: success deleting %s', req.puck);
            res.send(204);
            next();
        }
    });
}


/**
 * Deletes all Pucks (in parallel)
 */
function deleteAll(req, res, next) {
        req.log.warn({params: req.params}, 'deleteAll: not implemented');
        next(new NotImplementedError());
        return;
}

/**
 * Loads a Puck by key
 */
function getPuck(req, res, next) {

    rclient.get(req.params.key, function (err, reply) {

        if (err) {
            req.log.warn(err, 'getPuck: unable to retrieve %s', req.puck);
            next(err);
        } else {
            if (reply == null) {
                req.log.warn(err, 'getPuck: unable to retrieve %s', req.puck);
                next(new PuckNotFoundError(req.params.key));
            } else {
                // console.log("Value retrieved: " + reply.toString());
                res.send(200, reply);
                next(); 
            }
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
            req.log.warn(err, 'putPuck: unable to store in Redis db');
            next(err);
        } else {
            req.log.debug({puck: req.body}, 'putPuck: done');
            console.log('success storing theirs...')
        }
    });

    // give them ours
    rclient.get(puck_id, function (err, reply) {

        if (err) {
            req.log.warn(err, 'getPuck: unable to retrieve %s', req.puck);
            next(err);
        } else {
            if (reply == null) {
                req.log.warn(err, 'getPuck: unable to retrieve %s', req.puck);
                next(new PuckNotFoundError(req.params.key));
            } else {
                // console.log("Value retrieved: " + reply.toString());
                console.log('taking a short nap...')
                sleep.sleep(5)
                res.send(200, reply);
                next(); 
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
            req.log.warn(err, 'listPuck: unable to retrieve all Pucks');
            next(err);            
        } else {
            req.log.warn('Number of Pucks found: ', keys.length);
            res.send(200, JSON.stringify(keys));
            next();
        }
    });
}

/**
 * Echo reply
 * TODO: Return actual Puck ID
 */
function echoReply(req, res, next) {

    console.log('pingasaurus')

    var response = {status: "OK", "name": bwana_puck.PUCK.name, "pid": puck_id}
    res.send(200, response)

    next();

}

/**
 * Echo reply status
 * TODO: Check that the ID is our own and only return OK if it is.
 *       Otherwise throw error.
 */
function echoStatus(req, res, next) {
    res.send(200, "{\"status\": \"OK\"}");
    next();
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
        req.log.debug('stop VPN stdout: ' + stdout);
        req.log.debug('stop VPN stderr: ' + stderr);
        if (error !== null) {
            req.log.error('exec error: ' + error);
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

            res.send(200, "{\"status\": \"Failed\"}");
            next();

        } else {
            res.send(200, "{\"status\": \"OK\"}");
            next();
        }
    });

}

 /**
 * Start the local OpenVPN server via an external bash script.
 */
function startVPN(req, res, next) {

    console.log('start vpn2')
    console.log(req.params)

    var puck_web_home  = "/puck.html"

    // bail if we don't get ID
    if (typeof req.params.puckid === 'undefined' || req.params.puckid == "") {
      console.log("error... requires a PUCK ID!");
      // redirect to the home-o-the-puck
      // fix ;)
      res.header('Location', puck_web_home);
      res.send(302);
      return next(false);
    }
   
    console.log('onto the execution...')

    puckid = req.params.puckid
    ipaddr = req.params.ipaddr

    console.log(puckid, ipaddr)

    var vpn   = '/etc/puck/exe/start_vpn.sh'

    args = [puckid, ipaddr]
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
    res.send(204)

    return next();

}


/**
 * Replaces a Puck completely
 */
function putPuck(req, res, next) {
    if (!req.params.value) {
        req.log.warn({params: req.params}, 'putPuck: missing value');
        next(new MissingValueError());
        return;
    }

    req.log.warn({params: req.params}, 'putPuck: not implemented');
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

    // console.log('handle form called with' + req.params)

    console.log('handle form')
    // console.log(req.params)

    if (typeof req.params.puck_action === 'undefined' || req.params.puck_action == "") {
        console.log("error... unrecognized action: " + req.params.puck_action);
    }

    else if (req.params.puck_action == 'CREATE') {
        formCreate(req, res, next)
        console.log('... suck... sess...?')
        // works, to some definition of working
//      res.send(201, {"status": "success"});
//      return next()
        return next()
    }

    else if (req.params.puck_action == 'DELETE') {
        formDelete(req, res, next)
    }
    // errror
    else {
        console.log("error... unrecognized action: " + req.params.action);
    }

back_to_home(res)

}

function formDelete(req, res, next) {

    console.log("deleting puck...")
    console.log(req.params.puckid)
    // script below needs: puck-id

    // have to have these
    var puckid = req.params.puckid

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
    console.log(puck_fs_home + '/../exe/delete_puck.sh', [puckid])
    var pucky = spawn(puck_fs_home + '/../exe/delete_puck.sh', [puckid])

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
// https ping a remote puck
//
function httpsPing(ipaddr, res, next) {

   var https    = require('https')

   console.log("pinging... " + ipaddr)

   // xxx - read port/+ from conf...!
   var url = 'https://' + ipaddr + ':8080/ping'

   https.get(url, function(resget) {
      console.log("statusCode: ", resget.statusCode);
      console.log("headers: ", resget.headers);

      resget.on('data', function(d) {
         console.log('ping werx')
         process.stdout.write(d);
         // {"status":"OK","name":"?","pid":"0FE4224CBE3E238BB06097192E424258D125626A"}Object null  HTTP/1.1
         var response = {status: "OK", "name": d.name, "pid": d.pid}

         res.send(200, response)
         next();
      })

   }).on('error', function(e) {
      console.log('sping to ' + ipaddr + ' is dead, jim')
      console.error(e);
      var response = {status: "dead", "name": e.code, "pid": e.syscall}
      res.send(200, response)
      next();
   })

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
    console.log(req.params)

    var ip_addr = req.params.ip_addr

    console.log(ip_addr)

    var url = 'https://' + ip_addr + ':8080/ping'

    console.log('get_https ' + url)

    // is it a puck?
    someday_get_https(url).done(function(res) {

        // console.log(res)

        if (res.indexOf("was not found") != -1) {
            console.log('no woman no ping: ' + res)
        }
        else {
            console.log('ping sez yes')
            console.log(res)

            console.log('starting... writing...')
            // make the puck's dir... should not exist!

            res = JSON.parse(res)
            // now get remote information
            url = 'https://' + ip_addr + ':8080/puck/' + res.pid

            var puck_dir = config.PUCK.keystore + '/' + res.pid

            fs.mkdir(puck_dir, function(err){
                if(err) {
                    // xxx - user error, bail
                    console.log(e);
                }
            });

            // if ping is successful, rustle up and write appropriate data
            someday_get_https(url).done(function(res) {

                res = JSON.parse(res)
                console.log('remote puck info in...!')

                // console.log(res);

                create_puck_key_store(res.PUCK)

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
                var pucky = spawn(puck_fs_home + '/../exe/create_puck.sh', [res.PUCK['PUCK-ID'], res.PUCK.image, res.PUCK.ip_addr, res.PUCK.owner.name, res.PUCK.owner.email])

                // now slice and dice output, errors, etc.
                pucky.stdout.on('data', function (data) { console.log('_ local stdout: ' + data); });
                pucky.stderr.on('data', function (data) { console.log('_ local stderr: ' + data); });
                pucky.on('exit', function (code) { console.log('_ create_puck.sh process exited with code ' + code); });

                if (!isEmpty(bwana_puck)) {
                    console.log("posting our puck to the puck who asked for ours....")
                    var remote_pucky = spawn(puck_fs_home + '/../exe/create_puck.sh', [puck_id, bwana_puck.PUCK.image, bwana_puck.PUCK.ip_addr, bwana_puck.PUCK.owner.name, bwana_puck.PUCK.owner.email, ip_addr])

                    // output, errors, etc.
                    remote_pucky.stdout.on('data', function (data) { console.log('# remote stdout: ' + data); });
                    remote_pucky.stderr.on('data', function (data) { console.log('# remote stderr: ' + data); });
                    remote_pucky.on('exit',        function (code) { console.log('remote create_puck.sh process exited with code ' + code) })
                    res.send(201, {"status": "zoomer"});
                }
            })
        }
    })

}
  

///--- API

/**
 * Returns a server with all routes defined on it
 */
function createServer(options) {

    assert.object(options, 'options');
    assert.object(options.log, 'options.log');

    // Cert stuff
    var key  = fs.readFileSync("/etc/puck/pucks/PUCK/puck.key")
    var cert = fs.readFileSync("/etc/puck/pucks/PUCK/puck.crt")
    var ca   = fs.readFileSync("/etc/puck/pucks/PUCK/ca.crt")

    // Create a server with our logger and custom formatter
    // Note that 'version' means all routes will default to
    // 1.0.0
    server = restify.createServer({
	    certificate    : cert,
	    key            : key,
	    ca             : ca,
	    puck_id        : puck_id,
        log            : options.log,
        handleUpgrades : true,
        name           : 'PuckApp',
        version        : '0.0.3',
        formatters: {
            'application/puck; q=0.9': formatPuck,
            'text/html': function(req, res, body){ return body; }
        }
    });

    // Ensure we don't drop data on uploads
    server.pre(restify.pre.pause());
    // Clean up sloppy paths like //puck//////1//
    server.pre(restify.pre.sanitizePath());
    // Handles annoying user agents (curl)
    server.pre(restify.pre.userAgentConnection());
    // Set a per request bunyan logger (with requestid filled in)
    server.use(restify.requestLogger());
    // Allow 5 requests/second by IP, and burst to 10
    server.use(restify.throttle({
        burst: 99,
        rate: 99,
        ip: true,
    }));

    // Use the common stuff you probably want
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.dateParser());
    server.use(restify.authorizationParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser());
    server.use(restify.jsonp());


    // zen
    server.use(restify.CORS());
    server.use(restify.fullResponse());

    // Now our own handlers for authentication/authorization
    // Here we only use basic auth, but really you should look
    // at https://github.com/joyent/node-http-signature
    server.use(function setup(req, res, next) {
        req.dir = options.directory;
        if (options.user && options.password) {
            req.allow = {
                user: options.user,
                password: options.password
            };
        }
        next();
    });

    server.use(authenticate);

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
    server.get('/sping/:key', function (req, res, next) {
        console.log('spinging')
        httpsPing(req.params.key, res, next)
    });


    // get your ip addr(s)
    server.get('/getip', getIP);

    // Return a Puck by key
    server.get('/puck/:key', getPuck);
    server.head('/puck/:key', getPuck);

    // send yours and get theirs
    server.post('/puck/swap', swapPuck);

    // With the body parser, req.body will be the fully JSON
    // parsed document, so we just need to serialize and save
    server.put({
        path: '/puck/:key',
        contentType: 'application/json'
    }, putPuck);

    // Delete a Puck by key
    server.del('/puck/:key', deletePuck);

    // Destroy everything
    server.del('/puck', deleteAll, function respond(req, res, next) {
        res.send(204);
        next();
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
        next();
    });

    server.del('/puck/:key', deletePuck);

    server.post('/form', handleForm);

    server.post('/vpn/start', startVPN);
    // stop
    server.get('/vpn/stop', stopVPN);

    // if all else fails
    server.get(".*", restify.serveStatic({
        directory: './public',
        default: 'index.html' 
    }))


    // Setup an audit logger
    if (!options.noAudit) {
        server.on('after', restify.auditLogger({
            body: true,
            log: bunyan.createLogger({
                level: 'error',         // 'info' is a bit much most of the time! :)
                name: 'PUCK-audit',
                stream: process.stdout
            })

        }));
    }

    return (server);
}



///--- Exports

module.exports = {
    createServer: createServer
}
