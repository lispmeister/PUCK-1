//
// d3ck server
//

// var Tail       = require('tail').Tail,
var Tail       = require('./tail').Tail,
    async      = require('async'),
    bcrypt     = require('bcrypt'),
    compress   = require('compression'),
    cors       = require('cors'),
    crypto     = require('crypto'),
    dns        = require('native-dns'),
    express    = require('express'),
    flash      = require('connect-flash'),
    sh         = require('execSync'),
    fs         = require('fs'),
    formidable = require('formidable'),
    http       = require('http'),
    https      = require('https'),
    mkdirp     = require('mkdirp'),
    moment     = require('moment'),
    _static    = require('node-static'),
    os         = require('os'),
    passport   = require('passport'),
    l_Strategy = require('passport-local').Strategy,
    path       = require('path'),
    tcpProxy   = require('tcp-proxy'),
    redis      = require("redis"),
    candyStore = require('connect-redis')(express);
    request    = require('request'),
    response   = require('response-time'),
    rest       = require('rest'),
    restler    = require("restler"),
    sleep      = require('sleep'),
    sys        = require('sys'),
    d3ck       = require('./modules'),
    uuid       = require('node-uuid'),
    Q          = require('q'),
    __         = require('underscore');   // note; not one, two _'s, just for node


//
// Initial setup
//
// ... followed by all the various functions....
//
// ... which in turn is followed by the server setup...
//
// ... followed by the server start...
//


//
// init
//

// simple conf file...
var config = JSON.parse(fs.readFileSync('/etc/d3ck/D3CK.json').toString())
console.log('d3ck conf:')
console.log(config);
console.log(config.D3CK)

bwana_d3ck = {}   // the big d3ck, you!

// shortcuts
var d3ck_home         = config.D3CK.home
var d3ck_keystore     = d3ck_home + config.D3CK.keystore
var d3ck_bin          = d3ck_home + config.D3CK.bin
var d3ck_logs         = d3ck_home + config.D3CK.logs
var d3ck_public       = d3ck_home + config.D3CK.pub
var d3ck_secretz      = d3ck_home + config.D3CK.secretz
var default_image     = d3ck_home + config.D3CK.default_image

// oh, the tangled web we weave... "we"?  Well, I.
var d3ck_port_int     = config.D3CK.d3ck_port_int
var d3ck_port_ext     = config.D3CK.d3ck_port_ext
var d3ck_port_forward = config.D3CK.d3ck_port_forward
var d3ck_port_signal  = config.D3CK.d3ck_port_signal
var d3ck_proto_signal = config.D3CK.d3ck_proto_signal

// start with a clean slate
status_queue = []   // not to be confused with quo

// capabilities...
var capabilities      = config.capabilities

var d3ck = require('./modules');

// firing up the auth engine
init_capabilities(capabilities)

// user data, password, etc. Secret stuff.
var secretz = {}

// what the client is using to get to us
var d3ck_server_ip    = ""

//
// studid hax from studid certs - https://github.com/mikeal/request/issues/418
//
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// image uploads
var MAX_IMAGE_SIZE   = config.limits.max_image_size

// file transfers/uploads
var MAX_UPLOAD_SIZE  = config.limits.max_upload_size

// this many milliseconds to look to see if new data has arrived....
var PID_POLLING_TIME = config.misc.did_polling_time

// users must run quickstart if they haven't already
var redirect_to_quickstart = true
if (fs.existsSync(d3ck_secretz)) {
    redirect_to_quickstart = false
}

// owner user array
var d3ck_owners = []

var all_d3cks   = []


//
// URLs that anyone can contact
//
// d3ck    have think this over... can only get d3ck data if ID == server's id
/* stuff like -
   'login',
   'favicon.ico',
   'login.html',
   'loginFailure',
   'quikstart.html',// no logins have been created yet, so... ;)
*/
public_routes = config.public_routes

///--- Redis
rclient = redis.createClient();

rclient.on("error", function (err) {
    console.log("Redis client error: " + err);
    process.exit(3)
});

//
// file reads to string nodey stuff
//
var StringDecoder = require('string_decoder').StringDecoder;
var decoder       = new StringDecoder('utf8');

// global D3CK ID for this server's D3CK
try {
    d3ck_id = fs.readFileSync(d3ck_keystore + '/D3CK/d3ck.did').toString()
    d3ck_id = d3ck_id.replace(/\n/, '');
}
catch (e) {
    console.log("no D3CK ID for this potential D3CK... you won't get anywhere w/o it....\n")
    console.log(e)
    process.exit(2)
}

// suck up our own d3ck

rclient.get(d3ck_id, function (err, reply) {
    console.log('bwana!')
    console.log(d3ck_id)

    if (!err) {
        // console.log(reply)
        if (reply == null) {
            console.log('unable to retrieve our d3ck; id: %s', d3ck_id)
            sys.exit({'error': 'no D3CK Found'})
        }
        else {
            // console.log(reply)
            bwana_d3ck = JSON.parse(reply)
            console.log('d3ckaroo')
            // console.log(bwana_d3ck)
        }
    }
    else {
        console.log(err, 'get_d3ck: unable to retrieve d3ck: ' + d3ck_id)
        sys.exit({ "no": "d3ck"})
    }
})


//
// get the latest status... create the file if it doesn't exist...
//

// yes, yes, lazy too

var server           = "",
    d3ck2ip          = {},      // d3ck ID to IP mapping
    ip2d3ck          = {},      // IP mapping to d3ck ID
    // d3ck_status_file = d3ck_home   + '/status.d3ck',
    d3ck_status_file = d3ck_public + '/status.d3ck',
    d3ck_remote_vpn  = d3ck_public + '/openvpn_server.ip';
    d3ck_remote_did  = d3ck_public + '/openvpn_server.did';

// proxy up?
var d3ck_proxy_up  = false,
    proxy_server   = "",
    proxy          = "";

var all_client_ips = [],
    client_ip      = "";

var vpn_server_status = {}
var vpn_client_status = {}

// events/info/etc. that have been queued up for the client
var d3ck_queue        = []

// need to reset status from time to time
function empty_status () {

    var d3ck_status     = {}

    var server_magic    = { 
                            vpn_status  : "down",
                            start       : "n/a",
                            start_s     : "n/a",
                            duration    : "unknown",
                            stop        : "unknown",
                            stop_s      : "unknown",
                            client      : "unknown",
                            client_did  : "unknown"
                          }

    var client_magic    = { 
                            vpn_status  : "down",
                            start       : "n/a",
                            start_s     : "n/a",
                            duration    : "unknown",
                            stop        : "unknown",
                            stop_s      : "unknown",
                            server      : "unknown",
                            server_did  : "unknown"
                          }

    var file_magic      = { 
                            file_name   : "",
                            file_size   : "",
                            file_from   : "",
                            direction   : "",
                            did         : ""
                          }

    var d3ck_events     = { new_d3ck_ip  : "" }

    var browser_magic   = {}

    // till figure out something better... xxx
    var d3ck_request    = { 
            knock   : false,
            ip_addr : "",
            did     : ""
    }

    if (typeof bwana_d3ck.D3CK_ID != "undefined") {
        d3ck_status.d3ck_id = bwana_d3ck.D3CK_ID
    }

    d3ck_status.events         = d3ck_events
    d3ck_status.openvpn_server = server_magic
    d3ck_status.openvpn_client = client_magic
    d3ck_status.file_events    = file_magic
    d3ck_status.browser_events = browser_magic
    d3ck_status.d3ck_requests  = d3ck_request

    return(d3ck_status)

}

//
// toss the latest onto the stack, clear out the old for new things
//
function q_status(ds) {

    console.log('adding to status q')

    ds.time = cat_stamp()

    status_queue.push(ds)

}

//
// only exist after user has run startup
//
function get_d3ck_vital_bits () {

    //
    // THE VERY FIRST THING YOU SEE... might be the quick install.
    //
    // if we don't see d3ck owner data, push the user to the install page
    //
    if (fs.existsSync(d3ck_secretz)) {
        console.log('\nSECRETZ!!!!  Found secret file... does it check out?')
        secretz = JSON.parse(fs.readFileSync(d3ck_secretz).toString())
        console.log(JSON.stringify(secretz))

        // should be a single user, but keep this code in case we support more in future
        secretz.id = 0
        d3ck_owners[0] = secretz
    }

}

//
// pick up cat facts!
//

var cat_facts = []

// json scrobbled from bits at from - https://user.xmission.com/~emailbox/trivia.htm
console.log('hoovering up cat facts... look out, tabby!')

fs.readFile(d3ck_home + "/catfacts.json", function (err, data) {
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
    // console.log('cat fact! ' + fact)
    return(fact)
}


//
// All that auth stuff!
//
// authorization, authentication, and ... some other A :)
//

var user_archtypes = ['paranoid', 'moderate', 'trusting']

// for auth/salting/hashing
var N_ROUNDS = parseInt(config.crypto.bcrypt_rounds)

//
// authorization stuff
//
// Pretty simple in theory; there are capabilities that a d3ck has,
// like video, file transfer, etc.
//
// Each other d3ck (lookup by d3ck-ID) you know about has a yes/no/??? for
// each potential capability, They try to do something, you look it up,
// it will pass/fail/need-confirm/etc.
//

// the capabilities structure is in D3CK.json; it looks something like this:
//
//  "capabilities" : {
//      "friend request":       { "paranoid": "off", "moderate": "ask", "trusting": "on"  },
//      "VPN":                  { "paranoid": "ask", "moderate": "ask", "trusting": "on"  },
//
//      [...]
//
//  Each line is a capability; there are currently 3 types of user types,
// paranoid, moderate, and trusting, and they all have different defaults
// for various capabilities (the paranoid being the most... cautious.)
//
// These may all be overwritten on a d3ck-by-d3ck basis
//
// If you are a client d3ck initiating communications with another d3ck then
// the 2nd d3ck's capability matrix will be used.
//

//
// save an update of capabilities... usually it'll be called with something like -
//
//      capabilities['paranoid']
//
// but could be manual changes, etc.
//


//
// xxx - for now, just doing a blanket set for all... will go into individuals later
//
function assign_capabilities(_d3ck, new_capabilities) {

    if (typeof _d3ck == "string")
        _d3ck = JSON.parse(_d3ck)

    console.log('assigning capabilities to: ' + _d3ck.D3CK_ID)

    if (typeof new_capabilities != "undefined") {
        console.log('using user-given values...')
        _d3ck["capabilities"] = new_capabilities
    }
    else {
        var capz = {}

        console.log('taking from base defaults...')
        Object.keys(capabilities).forEach(function(k) {
            console.log(k + '\t: ' + capabilities[k].trusting)
            capz[k] = capabilities[k].trusting
        })

        _d3ck["capabilities"] = capz

    }

    update_d3ck(_d3ck)

}

//
// just reading out some basic #'s... not sure if
// this'll survive, but for now....
//
function init_capabilities(capabilities) {

    console.log('ennumerating capabilities...')

    console.log(__.keys(capabilities))

    var caps = __.keys(capabilities)

    for (var i = 0; i < caps.length; i++) {
        console.log(caps[i])
        console.log(capabilities[caps[i]])
    }

// sys.exit(1)

}

//
// auth/passport stuff
//
function findById(id, fn) {
    if (d3ck_owners[id]) {
        // console.log('found....')
        // console.log(d3ck_owners)
        // console.log(d3ck_owners[0])
        fn(null, d3ck_owners[id]);
    } else {
        // console.log('User ' + id + ' does not exist');
        // console.log(d3ck_owners)
        // console.log(d3ck_owners[0])
        return fn(null, null);
    }
}

function findByUsername(name, fn) {
  for (var i = 0, len = d3ck_owners.length; i < len; i++) {
    var user = d3ck_owners[i];
    if (user.name === name) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}


//
//
//
//
// authenticated or no?
//
//
//
//
function auth(req, res, next) {

    // console.log(req)

    var ip = get_client_ip(req)

    var url_bits = req.path.split('/')

    // console.log('contains...')
    if (__.contains(public_routes, url_bits[1])) {
        if (redirect_to_quickstart && url_bits[1] == "login.html") {
            console.log('almost let you go to login.html, but nothing to login to')
        }
        else {
            return next();
        }
    }

    // console.log('qs...')
    // I don't care if you are auth'd or not, you don't get much but quickstart until
    // you've set up your d3ck....
    if (redirect_to_quickstart) {
        console.log('redirecting to qs')
        res.redirect(302, '/quikstart.html')
        return
        // return next({ redirecting: 'quikstart.html'});
    }

    //
    // are you certifiable?
    //
    // hmm... is this safe?
    //
    // console.log('cert...?')
    // console.log(req.headers)
    if (typeof req.headers['x-ssl-client-verify'] != "undefined" && req.headers['x-ssl-client-verify'] == "SUCCESS"){
        console.log('authentication check for... ' + req.path)
        console.log(req.headers)
        console.log('my cert homie...?!!?!')
        //
        // xxx - need to check not only if valid, but start tracking to see if they
        // don't try to change their d3ck ID or something
        //
        return next();
    }

    //
    // are you logged in as a user, say, via the web?
    //

    // console.log('auth...?')

    if (req.isAuthenticated()) {
        // console.log('already chex: ' + req.path)
        return next();
    }

    // for now... let in localhost... may rethink
    // console.log('localhost')
    if (ip == '127.0.0.1') {
        console.log('pass... localhost' + req.path)
        return next();
    }

    // console.log('x-forw')
    if (typeof req.headers['x-forwarded-for'] != 'undefined' && typeof client_vpn_ip != 'undefined') {

        console.log('... ok... trying x-forw....')

        if (ip == client_vpn_ip) {
            console.log('... if I let you (' + client_ip + ') vpn, I let you...' + req.path)
            return next();
        }
        else {
            console.log('not client ip: ' + client_vpn_ip + ' != ' + ip)
        }
    }

    // console.log(req.headers)

    console.log('I pity da fool who tries to sneak by me!  ' + req.path, ip)
    res.redirect(302, '/login.html')

}

// Passport session setup.
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    findById(id, function (err, user) {
        done(err, user);
    });
});

// return hash of password on N rounds
function hashit(password, N_ROUNDS) {

    // console.log('hashing ' + password)

    var hash = bcrypt.hashSync(password, N_ROUNDS, function(err, _hash) {
        if (err) {
            console.log("hash error: " + err)
            return("")
        }
        else {
            // console.log('hashing ' + password + ' => ' + _hash);
            return(_hash)
        }
    })

    return(hash)
}

// Use the LocalStrategy within Passport.
passport.use(new l_Strategy(

    function(name, password, done) {
        // var _hash = hashit(password, N_ROUNDS)

        // XXXXXX - uncomment this if you want to see what the user typed for a password!
        // console.log('checking password ' + password + ' for user ' + name)

        process.nextTick(function () {
            findByUsername(name, function(err, user) {
                if (err)   { console.log("erzz in pass: " + err);  return done(err); }
                if (!user) { console.log("unknown user: " + name); return done(null, false, { message: 'Unknown user ' + name }); }

                // if (_hash == d3ck_owners[0].hash) {
                console.log('tick....')
                console.log(d3ck_owners[0].hash)

                if (bcrypt.compareSync(password, d3ck_owners[0].hash)) {
                    console.log('password matches, successsssss....!')
                    return done(null, user)
                    }
                else {
                    console.log('password failzor')
                    return done(null, false)
                }
            })
        })
    }

))

//
// watch vpn logs for incoming/outgoing connections
//
// xxxx - should have a rest call for this...?
watch_logs("server_vpn", "OpenVPN Server")
watch_logs("client_vpn", "OpenVPN Client")

//
// drag in D3CK data to the server
//
// the very first time it's a bit of a chicken and egg thing;
// how do you get the D3CK data loaded into the server if
// the client hasn't posted it yet? Wait for the first time
// something is posted, that should be the one that we can
// trigger on.
//

console.log('pulling in d3ck data for the server itself')

// wait for the first d3ck to be loaded in
events    = require('events');
emitter   = new events.EventEmitter();

wait_for_d3ck = null


//
// suck in our D3CK's data
//
// if it doesn't exist yet, spin and wait until it does... can't go anywhere without this
//
var sleepy_time = 5

var init = false

// xxx null for now...?
// while (init) {

    console.log('suckit, d3ck!')

    var url = 'https://localhost:' + d3ck_port_int + '/d3ck/' + d3ck_id

    console.log('requesting d3ck from: ' + url)

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // success
            console.log('finally got server response...')
            // console.log(body)

            if (body.indexOf("was not found") != -1) {
                console.log('no woman no d3ck: ' + body)
            }
            else {
                console.log('d3ckarrific!')
                // console.log(body)
                bwana_d3ck = JSON.parse(body)

                createEvent('internal server', {event_type: "create", d3ck_id: bwana_d3ck.D3CK_ID})
                init = true
            }
        }
        else {
            // error
            console.log('Error: ', error);
        }
    })

//  sleep.sleep(sleepy_time)

// }


//
// get the server's IP addrs, including localhost
//
// based on http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
//
var ifaces=os.networkInterfaces();
var my_net  = {} // interfaces & ips
var my_ips  = [] // ips only
var my_devs = [] // dev2ip
var n       = 0
for (var dev in ifaces) {
    var alias = 0
    ifaces[dev].forEach(function(details){
        if (details.family=='IPv4') {

            my_net[details.address] = dev+(alias?':'+alias:'')
            console.log(dev+(alias?':'+alias:''),details.address)
            ++alias
            my_ips[n]    = '"' + details.address + '"'
            my_devs[dev] = details.address

            n = n + 1
        }
    })
}

// set to local VPN int
cat_fact_server = my_devs["tun0"]

// write the IP addr to a file
write_2_file(d3ck_remote_vpn, cat_fact_server)

// console.log(my_ips)

//
// log file watcher
//
function watch_logs(logfile, log_type) {

    logfile = d3ck_logs + "/" + logfile + ".log"

    var d3ck_status = empty_status()

    // create if doesn't exist...?
    if (!fs.existsSync(logfile)) {
        console.log('creating ' + logfile)
        write_2_file(logfile, "")
    }
    else {
        console.log('watching ' + logfile)
    }

    console.log('watching logs from ' + log_type)

    var tail = new Tail(logfile)

    tail.on("line", function(line) {

        if (line == "" || line == null || typeof line == "undefined") return

        // console.log("got line from " + logfile + ":" + line)

        // xxx - for client openvpn - config... which ones to choose?  Another method?
        var magic_client_up     = "Initialization Sequence Completed",
            magic_client_up     = "/sbin/route add",
            magic_client_up     = "VPN is up",
            magic_client_up     = "Server : ",
            magic_client_down   = "VPN is down";

        var magic_server_up     = "Peer Connection Initiated",
            magic_server_down   = "ECONNREFUSED",
            magic_server_down1  = "OpenVPN Server lost client",
            magic_server_down2  = "Client Disconnect",
            magic_server_remote = "Peer Connection Initiated",
            magic_server_rvpn   = "Client Connect :",

            moment_in_time = moment().format('ddd  HH:mm:ss MM-DD-YY'),
            moment_in_secs =  (new Date).getTime(),
            client_remote_ip = "",
            server_remote_ip = "";

        // console.log('moment: ' + moment_in_time + ' : ' + line)

        if (log_type.indexOf("Server") > -1) {

            // shove raw logs to anyone who wants to listen
            var msg = {type: "openvpn_server", line: line}
            cat_power(msg)

            // Peer Connection Initiated with 192.168.0.141:41595
            if (line.indexOf(magic_server_remote) > -1) {
                // http://stackoverflow.com/questions/106179/regular-expression-to-match-hostname-or-ip-address
                // client_remote_ip = line.match(/((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]){3})/)[0]
                client_remote_ip = line.match(/((([0-9]+\.){3}([0-9]+){1}))/)[0]
                // client_remote_ip = line.match(/ip_regexp/)[1]
                console.log('incoming call from ' + client_remote_ip)
                console.log(line)

            }

            // the remote client's IP addr... looking for lines that look like:
            //
            //      Client Connect : 10.105.154.6
            //
            if (line.indexOf(magic_server_rvpn) > -1) {
                client_vpn_ip = line.match(/((([0-9]+\.){3}([0-9]+){1}))/)[0]
                console.log('\n------> ' + client_vpn_ip + '<--- openvpn client IP\n\n')
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
                    client_did : ip2d3ck[client_remote_ip],
                    server_ip  : cat_fact_server,
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                var browser_magic = { "notify_add":false, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_server = server_magic
                vpn_server_status          = server_magic

                createEvent('internal server', {event_type: "vpn_server_connected", call_from: client_remote_ip, d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)

                d3ck_queue.push({type: 'info', event: 'vpn_server_connected', 'd3ck_status': d3ck_status})

            }
            // down
            else if (line.indexOf(magic_server_down1) > -1 || line.indexOf(magic_server_down2) > -1) {
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
                    client_did : "",
                    server_ip  : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                var browser_magic = { "notify_add":false, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_server = server_magic
                vpn_server_status          = server_magic
                createEvent('internal server', {event_type: "vpn_server_disconnected", d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'vpn_server_disconnected', 'd3ck_status': d3ck_status})
            }
        }
        else if (log_type.indexOf("Client") > -1) {

            // shove raw logs to anyone who wants to listen
            var msg = {type: "openvpn_client", line: line}
            cat_power(msg)

            // Peer Connection Initiated with 192.168.0.141:41595
            if (line.indexOf(magic_client_up) == 0) {
                server_remote_ip = line.match(/^Server : ((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))/)[1]

                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client up!\n\n')
                console.log(line)
                console.log('outgoing call to ' + server_remote_ip)
                console.log('\n\n')

                // reset to remote
                cat_fact_server = server_remote_ip

                //
                // forward a port for web RTC
                //

                // clear the decks and put back the original port forwarding stuff
                forward_port_and_flush(d3ck_port_forward, cat_fact_server, d3ck_port_signal, d3ck_proto_signal)

                // if starting simply take the current stuff
                client_magic = {
                    vpn_status : "up",
                    start      : moment_in_time,
                    start_s    : moment_in_secs,
                    server     : server_remote_ip,
                    server_did : ip2d3ck[server_remote_ip],
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                var browser_magic = { "notify_add":true, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_client = client_magic
                vpn_client_status          = client_magic
                createEvent('internal server', {event_type: "vpn_client_connected", call_to: server_remote_ip, d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'vpn_client_connected', 'd3ck_status': d3ck_status})

            }
            // down
            else if (line.indexOf(magic_client_down) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client Down!\n\n')
                console.log(line)
                console.log('\n\n')

                var v_duration = 0

                // clear the decks and put back the original port forwarding stuff
                forward_port_and_flush(d3ck_port_forward, my_devs["tun0"], d3ck_port_signal, d3ck_proto_signal)

                client_magic = {
                    vpn_status : "down",
                    start      : "n/a",
                    start_s    : "n/a",
                    server     : "",
                    server_did : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                var browser_magic = { "notify_add":true, "notify_ring":true, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.openvpn_client = client_magic
                vpn_client_status          = client_magic

                // reset to local
                cat_fact_server = my_devs["tun0"]

                // write the IP addr to a file
                write_2_file(d3ck_remote_vpn, cat_fact_server)

                createEvent('internal server', {event_type: "vpn_client_disconnected", d3ck_id: bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'vpn_client_disconnected', 'd3ck_status': d3ck_status})

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

function d3ckExistsError(key) {
    express.RestError.call(this, {
        statusCode: 409,
        restCode: 'd3ckExists',
        message: key + ' already exists',
        constructorOpt: d3ckExistsError
    });

    this.name = 'd3ckExistsError';
}


function d3ckNotFoundError(key) {
    express.RestError.call(this, {
        statusCode: 404,
        restCode: 'd3ckNotFound',
        message: key + ' was not found',
        constructorOpt: d3ckNotFoundError
    });

    this.name = 'd3ckNotFoundError';
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

// who is talking to us?
function get_client_ip(req) {

    if (typeof req.headers != "undefined" && typeof req.headers['x-real-ip'] != "undefined")
        client_ip = req.headers['x-real-ip']
    else if (typeof req.headers != "undefined" && typeof req.headers['x-forwarded-for'] != "undefined")
        client_ip = req.headers['x-forwarded-for']
    else if (typeof req.ip != "undefined")
        client_ip = req.ip
    else if (typeof req.connection.remoteAddress != "undefined")
        client_ip = req.connection.remoteAddress
    else if (typeof req.socket.remoteAddress != "undefined")
        client_ip = req.socket.remoteAddress
    else if (typeof req.connection.socket.remoteAddress != "undefined")
        client_ip = req.connection.socket.remoteAddress
    else {
        console.log('no IP here...')
        return("")
    }

    // console.log("C-ip: " + client_ip)

    return client_ip

}

// quick bit to get the user's ip addr

function getIP(req, res, next) {

    var ip = get_client_ip(req)

    res.send(200, '{"ip" : "' + ip + '"}');
}

//
// given an IP addr, return looks like...
//
// { range: [ 3479299040, 3479299071 ],
//   country: 'US',
//   region: 'CA',
//   city: 'San Francisco',
//   ll: [37.7484, -122.4156] 
// }
//
var geo_cache_threshold = 60 * 60 * 24
var old_secz = new Date() / 1000;
var ip2geo   = []

function getGeo(req, res, next) {

    console.log('get geo')

    var deferred = Q.defer();

    if (typeof req.query.ip == "undefined") {
        console.log('bad dog, no IP')
        res.send(400, { error: 'bad dog, no IP, no dog treat!' })
        return
    }

    var ip_addr = req.query.ip

    var url     = 'https://freegeoip.net/json/' + ip_addr

    console.log('resolving geo stuff from: ' + url)

    // cache until can't cache no more (restart)
    if (typeof ip2geo[ip_addr] !== "undefined") {
        console.log('returning cached geo result')
        console.log(ip2geo[ip_addr])
        res.send(200, {ip_addr: ip_addr, geo : ip2geo[ip_addr] } )
        return
    }

    Q.fcall(function() {
        var geo_data = resolveGeo(ip_addr)
        res.send(200, geo_data )
        return (geo_data)
    })

//  https_get(url).then(function (geo_data) {
//      console.log('geo hmmm....')
//      console.log( { geo: geo_data } )
//      // ip2geo[ip_addr] = JSON.stringify(geo_data)
//      ip2geo[ip_addr] = geo_data
//      d3ck_queue.push({type: 'info', event: 'geo', ip_addr: ip_addr, geodata: geo_data })
//      // return geo_data
//      res.send(200, geo_data )
//      return deferred.resolve(geo_data)
//  })

    return deferred.promise;

}

function resolveGeo(ip_addr) {

    // free geo service
    var url = 'https://freegeoip.net/json/' + ip_addr

    console.log('in resolve_geo: ' + url)

    var deferred = Q.defer();

//  var secz = new Date() / 1000;
//  // cache for 24 hours
//  var diff = secz - old_secz
//  if (typeof old_geo[ip_addr] != "undefined" && diff <= geo_cache_threshold) {
//      console.log('using cached value: ' + old_geo[ip_addr])
//      return old_geo[ip_addr]
//  }

    // cache until can't cache no more (restart)
//  if (typeof ip2geo[ip_addr] !== "undefined") {
//      console.log('returning cached geo result')
//      console.log(ip2geo[ip_addr])
//      return({ip_addr: ip_addr, geo : ip2geo[ip_addr] })
//  }

    https_get_certified(url, ip2d3ck[ip_addr]).then(function (geo_data) {

        console.log('geo hmmm....')
        console.log( { geo: geo_data } )

        geo_data = JSON.parse(geo_data)

        // ip2geo[ip_addr] = JSON.stringify(geo_data)
        ip2geo[ip_addr] = geo_data

        // d3ck_queue.push({type: 'info', event: 'geo', ip_addr: ip_addr, geodata: geo_data })
        // return geo_data
        // res.send(200, geo_data )

        return deferred.resolve(geo_data)


    }).catch(function (error) {
        console.log('geo err! What or where - is the world coming to?')
        console.log(error)
        return deferred.reject(error)
    })
    .done();


    return deferred.promise;

}
    
//
// do a IP-> hostname lookup, cache until restart
//

// should only do when record timesout, but for now... it's just retreiving a cached value

var ip2fqdns = [];

function getDNS (req, res, next) {

    console.log('dns lookup...?')

    var deferred = Q.defer();

    if (typeof req.query.ip === 'undefined') {
        console.log('need an IP to resolve it')
        res.json(400, { "error" : "?"})
    }

    var ip = req.query.ip

    var fqdn = []

    console.log(ip)

    var question = dns.Question({
        address: ip,
        type: 'A',
    });

    // cache until can't cache no more (restart)
    if (typeof ip2fqdns[ip] !== "undefined") {
        console.log('returning cached ip2fqdns result')
        console.log(ip2fqdns[ip])
        res.send(200,    {ip: ip, fqdn : ip2fqdns[ip] } )
    }

    // xxx - yeah, bad... will figure out a better dns call later
    var d = require('domain').create();
    d.on('error', function(err) {
        if (err.message != 'connect ECONNREFUSED') {
            console.log('shuxx0r, dns blew a gastket, could be an issue: ' + err.message);
        }
        deferred.reject({ip: ip, fqdn : err } )
        res.send(420,   {ip: ip, fqdn : err } )

    });
    d.run(function() {
        console.log("lookin' up " + ip)
        dns.reverse(ip, function (err, fqdn) {
            if (err) {
                ip2fqdns[ip] = err
                console.log(err) 
                deferred.reject({ip: ip, fqdn : err } )
                res.send(420,   {ip: ip, fqdn : err } )
            }
            else {
                fqdn         = fqdn.join()
                ip2fqdns[ip] = fqdn

                console.log('reverse for ' + ip + ': ' + fqdn);

                deferred.resolve({ip: ip, fqdn : fqdn } )
                res.send(200,    {ip: ip, fqdn : fqdn } )
            }
        });
    });

    return deferred.promise;

}


all_p33rs = [];

//
// send a note to a sockio channel ... channel broadcast == broadcast
//
function cat_power(msg) {

    console.log('kitty Powa!  => ' + JSON.stringify(msg))

// used to use sockets to communicate this...

//    if (msg.type != "openvpn_server") {
//
//        try {
//            console.log('catpower writez:  catFax, ' + JSON.stringify(msg))
//            // cat_sock.write(JSON.stringify(msg))
//            cat_sock.emit('catFax', JSON.stringify(msg))
//        }
//        catch (e) {
//            // need a browser...
//            console.log('channel not up yet....? ' + e)
//        }
//    }

}

//
// time stamp for cat chat
//
function cat_stamp() {
    var stamp = new Date()
    var h     = stamp.getHours()
    var mins  = stamp.getMinutes()
    var secs  = stamp.getSeconds()
    var tz    = stamp.toString().match(/\(([A-Za-z\s].*)\)/)[1]

    // noon... who knows!

    period = "AM"

    if (h > 11)       { period  = "PM" }

    if (h < 10)       { h       = "0" + h    }
    else if (h >= 12) { h       = h - 12     }
    if (mins < 10)    { mins    = "0" + mins }
    if (secs < 10)    { secs    = "0" + secs }

    stamp = '[' + h + ':' + mins + ':' + secs + ' ' + period + ' ' + tz + ']'

    return(stamp)
}


//
// pour out the latest queue
//
function d3ckQueue(req, res, next) {

    // console.log('d3ck Q query')

    // the usual usualness
    if (d3ck_queue.length > 0) {
        console.log('clearing out the queue (' + d3ck_queue.length + ')....')
    }
    else {
        // console.log('empty queue...')
        res.send(200, [])
        return
    }

    var quo    = d3ck_queue

    d3ck_queue = [] // not to be confused with quo

    console.log('sending quo... ' + JSON.stringify(quo))

    res.send(200, quo)

}


//
// as marvin once said, what's going on?
//
function d3ckStatus(req, res, next) {

    // if the magic flag... sent when client first connects
    if (typeof req.query.first_blood != "undefined") {
        console.log('They drew first blood, not me....')
        var _status = empty_status()

        _status.openvpn_server = vpn_server_status
        _status.openvpn_client = vpn_client_status

        res.send(200, [_status])

    }
    // the usual usualness
    else {

        if (status_queue.length > 0) {
            console.log('clearing out the status (' + status_queue.length + ')....')
        }
        else {
            //console.log('empty queue...')
            res.send(200, [])
        }

        // console.log('d3ck status check... ' + JSON.stringify(status_queue))

        //tmp_status = JSON.parse(JSON.stringify(status_queue))

        //console.log(status_queue)

        var quo = []
        for (var i = 0; i < status_queue.length; i++) {
            quo[i] = status_queue[i]
        }

        status_queue = [] // not to be confused with quo

        // console.log('sending quo... ' + JSON.stringify(quo))

        res.send(200, quo)

    }

}



/**
 * This is a nonsensical custom content-type 'application/d3ck', just to
 * demonstrate how to support additional content-types.  Really this is
 * the same as text/plain, where we pick out 'value' if available
 */
function format_d3ck(req, res, body) {
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



//
// take a d3ck, update it in the DB and the filesystem, do error checking, etc., etc.
//
function update_d3ck(_d3ck) {

    console.log('updating data for ' + _d3ck.D3CK_ID)
// 
    rclient.set(_d3ck.D3CK_ID, JSON.stringify(_d3ck), function(err) {
        if (err) {
            console.log(err, 'update_d3ck failed ' + JSON.stringify(err));
            return(err);
        } else {
            _d3ck_events = { updated_d3ck : '127.0.0.1' }

            // reate_d3ck_key_store(_d3ck)
            // create_d3ck_image(_d3ck)

            createEvent('127.0.0.1', {event_type: "update", "d3ck_id": _d3ck.D3CK_ID})
            console.log('redis update_d3ck success')

        }
    })


}

//
// via REST... executes a program, creates client certs, stashes them
// in the querying d3ck's dir, then returns the certs back
//
function create_cli3nt_rest(req, res, next) {

    // XXXX - have to verify that they're requesting for themselves,
    // not for others!

    var target  = ''
    var command = d3ck_bin + '/bundle_certs.js'
    var argz    = []
    var ip_addr = get_client_ip(req)

    //
    // url
    //
    console.log('doing it the hard way, from IP: ' + ip_addr)

    if (typeof req.query.did == "undefined") {
        console.log('bad dog, no DiD!')
        res.send(400, { error: 'bad dog, no DiD, no tasty bites!' })
    }

    var did = req.query.did

    console.log('DiD: ' + did)

    var keyout = d3ck_spawn_sync(command, [did])

    if (keyout.code) {
        console.log("error!\n\n\n")
        res.send(420, { error: "couldn't retreive client certificates" } )
    }
    else {
        console.log('looks good...')
        console.log(d3ck_keystore +'/'+ did + "/_cli3nt.all")

        var cli3nt_bundle = JSON.parse(fs.readFileSync(d3ck_keystore +'/'+ did + "/_cli3nt.json").toString())

        write_2_file(d3ck_keystore +'/'+ did + "/_cli3nt.key", cli3nt_bundle.vpn.key.join('\n'))
        write_2_file(d3ck_keystore +'/'+ did + "/_cli3nt.cert", cli3nt_bundle.vpn.cert.join('\n'))

        //
        // if !exist, create their d3ck locally as well
        //
        if (!fs.existsSync(d3ck_keystore +'/'+ did + '/' + did + '.json')) {
            console.log("Hmm, we don't have their data... try to get it")
            create_d3ck_locally(ip_addr)
        }
        try       { res.send(200, JSON.stringify(cli3nt_bundle)) }
        catch (e) { console.log('failzor?  ' + JSON.stringify(e)); res.send(200, cli3nt_bundle) }
    }

}


//
// grab remote d3ck and stuff it locally
//
function create_full_d3ck (data) {

    //console.log(certz)
    var cmd  = d3ck_bin + '/create_server_d3ck.sh'

    console.log('executing ' + cmd + ' to add locally')

    var argz = [data.D3CK_ID, 
                data.image, 
                data.ip_addr, 
                "\"all_ips\": [\"" + data.all_ips + "\"]", 
                data.owner.name, 
                data.owner.email]

    d3ck_spawn(cmd, argz)

    assign_capabilities(data)

}


//
// Redis D3CKs key are all upper case+digits
//
function create_d3ck(req, res, next) {

    console.log ('creating d3ck')

    // console.log(req.body)
    // console.log(req.body.value)

    if (!req.body.value) {
        console.log('create_d3ck: missing value');
        next(new MissingValueError());
        return;
    }

    var data = req.body.value
    if (typeof data != 'object') {
        data = JSON.parse(data)
    }

    var d3ck_status = empty_status()

    var ip_addr = data.ip_addr

    client_ip  = get_client_ip(req)
    all_client_ips = data.all_ips

    // if the IP we get the add from isn't in the ips the other d3ck
    // says it has... add it in; they may be coming from a NAT or
    // something weird
    if (client_ip != '127.0.0.1') {
        console.log('looking to see if your current ip (' + client_ip  +') is in your pool')
        var found = false
        for (var i = 0; i < all_client_ips.length; i++) {
            if (all_client_ips[i] == client_ip) {
                console.log('found it!')
                found = true
                break
            }
        }
        if (! found) {
            console.log("[create_d3ck] You're coming from an IP that isn't in your stated IPs... adding [" + client_ip + "] to your IP pool just in case")
            data.all_ips[all_client_ips.length] = client_ip
        }
    }

    var d3ck = {
        key    : req.body.key || data.replace(/\W+/g, '_'),
        value  : JSON.stringify(data)
    }

    // TODO: Check if d3ck exists using EXISTS and fail if it does
    // console.log("key: " + d3ck.key);
    // console.log("value: " + d3ck.value);

    rclient.set(d3ck.key, d3ck.value, function(err) {
        if (err) {
            console.log(err, 'put_d3ck: unable to store in Redis db');
            next(err);
        } else {
            // console.log({d3ck: req.body}, 'put_d3ck: done');

            //
            // if it's from a remote system, wake up local UI and tell user
            //
            console.log('redis saved data from: ' + data.name)

            d3ck_events = { new_d3ck_ip : client_ip, new_d3ck_name: data.name }

            d3ck_status.events = d3ck_events

            // create_d3ck_key_store(d3ck.value)
            create_d3ck_image(d3ck.value)

            // can they do this, that, or the other
            assign_capabilities(d3ck.value)

            createEvent(get_client_ip(req), {event_type: "create", d3ck_id: data.D3CK_ID}, d3ck_status)
            d3ck_queue.push({type: 'info', event: 'd3ck_create', 'd3ck_status': d3ck_status})

        }
    })

    res.send(204);

}

function create_d3ck_image(data) {

    if (typeof data != 'object') {
        data = JSON.parse(data)
    }

    console.log('create d3ck img')
    // console.log(data)

    console.log(typeof data.image_b64)

    var image = b64_decode(data.image_b64)

    console.log('trying to decode: ' + data.image)
    // console.log(data.image_b64)

    if (image == "") {
        console.log("Couldn't decode " + data.image)
        return
    }

    msg = ""

    if (image.size > MAX_IMAGE_SIZE) {
        msg += 'maximum file size is ' + MAX_IMAGE_SIZE + ', upload image size was ' + image.size
        image = b64_decode(default_image)
    }

    // just stick to one ending please....
    data.image = data.image.replace(new RegExp("jpeg$"),'jpg')

    var iname  = data.image
    var suffix = data.image.substr(iname.length-4, data.image.length).toLowerCase()

    // sanity check suffix
    if (suffix != '.png' && suffix != '.jpg' && suffix != '.gif') {
        msg = 'Invalid suffix (' + suffix + '), only accept: GIF, JPG, and PNG'
    }

    d3ck_image      =               '/img/' + data.D3CK_ID + suffix
    full_d3ck_image = d3ck_public + '/img/' + data.D3CK_ID + suffix

    if (msg) {
        console.log('err in processing remote image: ' + msg)
    }
    else {
        write_2_file(full_d3ck_image, image)
    }


}

//
// write the crypto key stuff to the FS
//
function create_d3ck_key_store(data) {

    console.log('PUUUUUUCKKKKKK!')

    var client_key  = ""
    var client_cert = ""

    // console.log(data)

    if (typeof data != 'object') {
         data = JSON.parse(data)
    }

    var ca          = data.vpn.ca.join('\n')
    var key         = data.vpn.key.join('\n')
    var cert        = data.vpn.cert.join('\n')
    var tls         = data.vpn.tlsauth.join('\n')
    var d3ck_dir    = d3ck_keystore + '/' + data.D3CK_ID

    console.log('... news certs are going to live in: ' + d3ck_dir)

    // has to exist before the below will work...
    mkdirp.sync(d3ck_dir, function () {
        if(err) {
            // xxx - user error, bail
            console.log(err);
        }
    })

    // xxx - errs to user!
    write_2_file(d3ck_dir + '/d3ck.did',     data.D3CK_ID)
    write_2_file(d3ck_dir + '/d3ck.key',     key)
    write_2_file(d3ck_dir + '/d3ck.crt',     cert)
    write_2_file(d3ck_dir + '/ta.key',       tls)


    try {
        client_cert = data.vpn_client.cert.join('\n')
        write_2_file(d3ck_dir + '/cli3nt.crt',  client_cert)

        client_key  = data.vpn_client.key.join('\n')
        write_2_file(d3ck_dir + '/cli3nt.key',  client_key)

    }
    catch (e) {
        console.log('missing data...' + JSON.stringify(e))
        write_2_file(d3ck_dir + '/d3ckroot.crt', ca)
    }

    // and the entire json card
    write_2_file(d3ck_dir + '/' + data.D3CK_ID + '.json', JSON.stringify(data))

}


// a few snippets

//
// the pi's storage media can take awhile to register a
// write... so I'm using sync'd writes, where I don't have
// to on other systems. At least... that's what seems to
// be happening... so that's my story and I'm sticking to it!
//
// assumes data is an object
function write_O2_file(file, obj) {

    var stringy = JSON.stringify(obj)

    console.log('trying to write ' + stringy.length + ' bytes to ' + file)

    try {
        fs.writeFileSync(file, stringy)
        console.log('...o2-w-success...')
    }
    catch (e) {
        console.log('err writing to ' + file + '...' + stringy)
    }

}

// non-obj version
function write_2_file(file, stringy) {

    console.log('trying to write string ' + stringy.length + ' bytes to ' + file)

    try {
        fs.writeFileSync(file, stringy)
        console.log('...w-success...')
    }
    catch (e) {
        console.log('err writing to ' + file + '...' + stringy)
    }

}

function b64_encode(data) {
    return new Buffer(data).toString('base64');
}

function b64_decode(str) {
    return new Buffer(str, 'base64');
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Deletes a d3ck by key
 */
function delete_d3ck(req, res, next) {

    console.log('NUKE it from orbit!')

    rclient.del(req.params.key, function (err) {
        if (err) {
            console.log(err, 'delete_d3ck: unable to delete %s', req.params.key)
            next(err);
        } else {
            console.log('delete_d3ck: success deleting %s', req.params.key)

            createEvent(get_client_ip(req), {event_type: "delete", d3ck_id: req.params.key})
            d3ck_queue.push( {type: 'info', event: 'd3ck_delete', d3ck: req.params.key} )

            delete all_d3cks[req.params.key]

            res.send(204);
        }
    });
}


/**
 * Deletes all d3cks (in parallel)
 */
function deleteAll(req, res, next) {
        console.log({params: req.params}, 'deleteAll: not implemented');
        next(new NotImplementedError());
        return;
}


//
// sends a URL request at the url encoded site; for http://cnn.com you'd send:
//
//      /url?http%3A%2F%2Fcnn.com
//
function webProxy(req, res, next) {

    console.log('proxie!' + '\n' + JSON.stringify(req.headers, true, 2))

    if (typeof req.query.url == "undefined") {
        console.log('bad dog, no URL')
        res.send(400, { error: 'bad dog, no URL, no biscuit!' })
    }
    else {
        console.log('... trying... ' + req.query.url)
        req.pipe(request(req.query.url)).pipe(res)
    }
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

    var tcp_proxy = tcpProxy.createServer({
        target: {
            host: proxy_remote_host,
            port: proxy_remote_port
        }
    })

    tcp_proxy.listen(proxy_local_port)

    console.log('set proxy to listen on port ' + proxy_local_port)

    res.send(200, {"d3ck_local_port": proxy_local_port, "proxy_remote_port": proxy_remote_port, "proxy_remote_host": proxy_remote_host})

}


//
// info about events is stored here.
//
// Redis keys will all be lowercase, while D3CKs are all upper case+digits
//
function createEvent(ip, event_data, ds) {

    console.log('in createEvent - ' + ip + ', ' + JSON.stringify(event_data))

    console.log(event_data)

    event_data.from  = ip
    event_data.time  = Date()

    var e_type       = event_data.event_type
    var key          = e_type + ":" + event_data.time

    rclient.set(key, JSON.stringify(event_data), function(err) {
        if (err) {
            console.log(err, e_type + ' Revent: unable to store in Redis db');
            next(err);
        } else {
            console.log({key: event_data}, e_type + ' event : saved');
        }
    })

    // eventually this will go to client... if we have any status along
    // with the event, toss it in the queue
    if (typeof ds != "undefined") {
        console.log('adding ds: ' + JSON.stringify(ds))
        q_status(ds)
    }

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

    // non D3CKs
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
                // next(new d3ckNotFoundError(req.params.key));
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
                            // next(new d3ckNotFoundError(req.params.key));
                            next({'error': 'Event data not found'})
                            res.send(418, data)  // 418 I'm a teapot (RFC 2324)
                        }
                        else {
                            // console.log("event data fetched: " + data.toString());
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
            console.log(err, 'getEvent: unable to retrieve %s', req.d3ck);
            res.send(418, reply);   // 418 I'm a teapot (RFC 2324)
        }
    })

}

/**
 * Loads a d3ck by key
 */
function get_d3ck(req, res, next) {

    console.log('get_d3ck: ' + req.params.key)

    // console.log(req.params)

    rclient.get(req.params.key, function (err, reply) {

        if (!err) {
            if (reply == null) {
                console.log(err, 'get_d3ck: unable to retrieve %s', req.d3ck);
                // next(new d3ckNotFoundError(req.params.key));
                next({'error': 'D3CK Not Found'})
            }
            else {
                // console.log("Value retrieved: " + reply.toString());
                console.log("data retrieved...")

                res.send(200, reply)

                // var obj_reply = JSON.parse(reply)

                // console.log('\n\n\nbefore...')
                // console.log(obj_reply.vpn.key)

                // kill things you don't want others knowing
                // obj_reply.vpn.key = obj_reply.vpn_client.key
                // obj_reply.vpn.crt = obj_reply.vpn_client.crt
                // console.log(obj_reply.vpn)

                // console.log('\n\nafter...')
                // console.log(obj_reply.vpn.key)
                // console.log('\n\n\n')
            }
        }
        else {
            console.log(err, 'get_d3ck: unable to retrieve %s', req.d3ck);
            res.send(404, { "no": "d3ck"});
        }
    });
}

/**
 * Simple returns the list of d3ck Ids that are stored in redis
 */
function list_d3cks(req, res, next) {
    rclient.keys('[A-F0-9]*', function (err, keys) {
        if (err) {
            console.log(err, 'list_d3ck: unable to retrieve all d3cks');
            next(err);
        } else {
            console.log('Number of d3cks found: ', keys.length);
            res.send(200, JSON.stringify(keys));
        }
    });
}

/**
 * Echo reply
 * TODO: Return actual d3ck ID
 */
function echoReply(req, res, next) {

    client_ip = get_client_ip(req)

    // & what's our IP addr?
    // looks like host: '192.168.0.250:12034',
    d3ck_server_ip = req.headers.host.split(':')[0]

    // console.log('pingasaurus from ' + client_ip + ' hitting us at ' + d3ck_server_ip)

    if (typeof bwana_d3ck == "undefined") {
        console.log('no echo here...')
        var response = {status: "bad"}
    }
    else {
        // console.log('echo, echo, echo....')
        var response = {status: "OK", "name": bwana_d3ck.name, "did": d3ck_id}
    }

    // res.send(200, response)
    res.send(response)

}

/**
 * Echo reply status
 * TODO: Check that the ID is our own and only return OK if it is.
 *       Otherwise throw error.
 */
function echoStatus(req, res, next) {
    res.send(200, {status: "OK"});
}

 /**
 * Stop the local OpenVPN client via an external bash script.
 */
function stopVPN(req, res, next) {

    console.log('stop VPN!')

    var cmd = d3ck_bin + '/stop_vpn.sh';

    if (typeof req.query.did == "undefined") {
        console.log('local server dying...')
        d3ck_spawn(cmd, [])

        createEvent(client_ip, {event_type: "vpn_stop" })
        d3ck_queue.push({type: 'info', event: 'vpn_stop' })

        res.send(200, {"status": "vpn down"});
        return
    }
    else {

        var did = req.query.did

        // pass it along to the other side!
        if (did != bwana_d3ck.D3CK_ID) {

            console.log('pass the stop along...')

            var url = 'https://' + d3ck2ip[did] + ':' + d3ck_port_ext + '/vpn/stop?host=' + did

            console.log(url)

            // use client-side certz
            var options = load_up_cert_by_did(did)

            options.headers = { 'x-d3ckID': bwana_d3ck.D3CK_ID }

            console.log(options)


            // request.get(url, options, function cb (err, resp) {
            https_get_certified(url, ip2d3ck[did]).then(function (resp) {

                if (err) {
                    console.error('vpn stop request failed:', JSON.stringify(err))
                    res.send(200, {"errz": "vpn stop request failed"});
                    }
                else {
                    console.log('vpn stop request successful...?')

                    // this is done by watching logs
                    // createEvent(client_ip, {event_type: "vpn_client_disconnected" })
                    // d3ck_queue.push({type: 'info', event: 'vpn_client_disconnected' })

                    res.send(200, {"status": "vpn down"});
                }
            }).catch(function (error) {
                console.log('vpn-stop err')
                console.log(error)
                res.send(420, {"error": "error brining down vpn"});
            })
            .done();


        }
        else {

            // validate they're who they say they are

            console.log('hmm... why should I believe you...?')

            // so headers will look like -
            //  req.headers['x-ssl-client-verify'] == "SUCCESS"
            //          console.log(req.headers)

            // and this one has the CN:
            // 'x-ssl-client-s-dn': '/C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=43a1299fa24e22afb28bb624f3308332',

            // kill local vpn!
            if (check_CN(req.headers['x-ssl-client-s-dn'], did)) {
                console.log('local server dying via remote control')
                d3ck_spawn(cmd, [])

                // this is done by watching logs
                // createEvent(client_ip, {event_type: "vpn_server_disconnected" })
                // d3ck_queue.push({type: 'info', event: 'vpn_server_disconnected' })

                res.send(200, {"status": "vpn down"});
                return
            }
        }

    }


}

//
// This is a check to see if the client-side cert matches up;
// 
// when a d3ck is created a set of keys is generated and passed
// to the remote d3ck; anyone claiming the same d3ckid must have
// the cert we earlier gave to them. This may be verified by the
// openssl command, which will look like:
//
//   $ openssl x509 -noout -subject -in keyfile.crt
//   subject= /C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=8fd983b93ee52e80ddbf457b5ba8f0ec
//
// the keys were previously stored in their key subdir (tbd - add to redis)
//
function check_CN(cn, did) {

    console.log('verifying CN matches the d3ck ID')

    var cmd  = 'openssl'

    var argz = ['x509', '-noout', '-subject', '-in', d3ck_keystore +'/'+ did + "/d3ck.crt"]
    
    var cn   = d3ck_spawn_sync(cmd, argz)

    // subject= /C=AQ/ST=White/L=D3cktown/O=D3ckasaurusRex/CN=8fd983b93ee52e80ddbf457b5ba8f0ec

    var disk_cn = substring(cn.indexOf('/CN=')+4)

    console.log('cn vs. cn on disk: ' + cn + ' <=> ' + disk_cn)

    if (cn == disk_cn)
        return true
    else
        return false

}

function mrSulu(req, res, next) {

    console.log("For god's sake, Mr. Sulu!")

    var direction = req.params.key

    var cmd       = d3ck_bin + '/shields.sh';

    var argz      = direction

    // d3ck_spawn(cmd, argz)

    res.send(200, {"result": "mr. sulu sez - shields are " + direction });

}


function load_up_cc_cert(did) {

    // console.log('loading up cert for cs-auth ' + did)

    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ did + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ did + "/d3ck.crt").toString(),
    };
    return(certz)

}

function load_up_cert_by_ip(ip) {

    console.log('loading up client cert for ' + ip)

    console.log(ip)
    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ ip2d3ck[ip] + "/d3ck.crt").toString(),
    };
    return(certz)
}

function load_up_cert_by_did(d3ck) {

    console.log('loading up client cert for ' + d3ck)
    var certz = {
        // ca      : fs.readFileSync(d3ck_keystore +'/'+ d3ck + "/d3ckroot.crt").toString(),
        key     : fs.readFileSync(d3ck_keystore +'/'+ d3ck + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ d3ck + "/d3ck.crt").toString(),
    };
    return(certz)

}

/*
 *
 * knock on the door... anyone home?
 *
 * Check welcome/black lists to see if your D3CK will talk
 *
*/
function knock(req, res, next) {

    console.log('knock knock')

    //console.log(req.params)
    // console.log(req)

    // bail if we don't get ID
    // var ip_addr  = req.body.ip_addr
    var ip_addr   = get_client_ip(req)
    var d3ckid    = req.body.d3ckid
    var from      = req.body.from
    var from_d3ck = req.body.from_d3ck
    var owner     = req.body.owner

    // bwana_d3ck.owner.name  = name


    console.log(ip_addr, d3ckid)

    if (typeof d3ckid == "undefined") {
      var bad_dog = "No ID, no love";
      console.log(bad_dog)
      res.send(403, { "bad": "dog"});
      return
    }
    else {
        console.log("you've passed the first test...", d3ckid)
    }

    console.log('moving on...')


    // is it for us, or are we passing it on?
    if (d3ckid == bwana_d3ck.D3CK_ID) {

        console.log("for me? You shouldn't have!")

        resolveGeo(ip_addr)

        var d3ck_request    = { 
            knock       : true,
            ip_addr     : ip_addr,
            from        : from,
            'from_d3ck' : from_d3ck,
            did         : d3ckid
        }

        var d3ck_status            = empty_status()

        d3ck_status.d3ck_requests  = d3ck_request

        createEvent(client_ip, {event_type: "knock", "ip_addr": ip_addr, "from_d3ck": from_d3ck, "d3ck_id": d3ckid}, d3ck_status)
        d3ck_queue.push({type: 'request', event: 'knock' , 'd3ck_status': d3ck_status })

        console.log('sending back... <3!!!')

        res.send(200, { emotion: "<3" })

        return

    }

    else {
        console.log('... you want the next door down....')

        if (typeof d3ck2ip[d3ckid] == "undefined") {
            console.log("Can't find IP addr for " + d3ckid)
            res.send(420, { error: "enhance your calm! Can't find IP addr for " + d3ckid })
        }

        var ip = d3ck2ip[d3ckid]

        var url = 'https://' + ip + ':' + d3ck_port_ext + '/knock'

        console.log(url)

        var options = load_up_cc_cert(d3ckid)

        options.url  = url
        options.form = { 'ip_addr' : ip_addr, 'd3ckid'  : d3ckid, from_d3ck: bwana_d3ck.D3CK_ID, from: bwana_d3ck.owner.name }

        console.log(options)

        var d3ck_request    = { 
            knock       : true,
            ip_addr     : ip_addr,
            'from_d3ck' : bwana_d3ck.D3CK_ID,
            did         : d3ckid
        }
        var d3ck_status            = empty_status()
        d3ck_status.d3ck_requests  = d3ck_request

        d3ck_queue.push({type: 'info', event: 'remote_knock_sent', 'd3ck_status': d3ck_status})

        request.post(options, function cb (err, resp) {
            if (err) {
                console.error('post to remote failed:', JSON.stringify(err))
                // createEvent(client_ip, {event_type: "remote-knock", "ip_addr": ip_addr, "from_d3ck": bwana_d3ck.D3CK_ID, }, d3ck_status)
                // d3ck_queue.push({type: 'info', event: 'remote_knock_fail', 'd3ck_status': d3ck_status})
                d3ck_queue.push({type: 'info', event: 'remote_knock_fail', 'd3ck_status': d3ck_status})

                res.send(200, {"err" : err});
                }
            else {
                console.log('knock returned... something - RC: ' + res.statusCode)

                // console.log(res)

                if (resp.statusCode != 200) {
                    d3ck_queue.push({type: 'info', event: 'remote_knock_return', statusCode: resp.statusCode , 'd3ck_status': d3ck_status})
                    console.log(resp.body)
                    res.send(resp.statusCode, resp.body)
                }
                else {
                    d3ck_queue.push({type: 'info', event: 'remote_knock_success','d3ck_status': d3ck_status })
                    console.log(resp.body)
                    res.send(200, resp.body)
                }
            }
        })

    }

}

// server.post('/knockReply/:did/:answer', auth, knockReply);

function knockReply(req, res, next) {

    console.log("who is it going to...? " + req.params.d3ckid)
    console.log("you say... " + req.params.answer)

    answer = req.params.answer
    d3ckid = req.params.d3ckid

    client_ip = get_client_ip(req)

    // is it for us, or are we passing it on?
    if (d3ckid == bwana_d3ck.D3CK_ID) {
        console.log("about time you answered, I've been knocking!")
        console.log(req.body)

        // mark it as an event, which will be picked up by the client
        var d3ck_response   = {
            knock    : true,
            answer   : answer,
            did      : req.body.did,
            did_from : req.body.did_from
        }

        var d3ck_status            = empty_status()
        d3ck_status.d3ck_requests  = d3ck_response

        createEvent(client_ip, {event_type: "knock_response", "d3ck_id": d3ckid}, d3ck_status)

        d3ck_queue.push({type: 'info', event: 'knock_response', 'from_d3ck': req.body.did_from, 'd3ck_status': d3ck_status})

        res.send(200, { emotion: "^..^" })

    }
    else {                                                                                                                             
        if (typeof d3ck2ip[d3ckid] == "undefined") {
            console.log("Can't find IP addr for " + d3ckid)
            res.send(420, { error: "enhance your calm! Can't find IP addr for " + d3ckid })
        }

        var ip  = d3ck2ip[d3ckid]
        var url = 'https://' + ip + ':' + d3ck_port_ext + '/knockReply/' + d3ckid + '/' + answer

        console.log('answer going to : ' + url)

        var d3ck_status     = empty_status()
        var d3ck_response   = { 
            knock       : true,
            answer      : answer,
            did         : bwana_d3ck.D3CK_ID
        }

        d3ck_status.d3ck_requests = d3ck_response

        createEvent(client_ip, {event_type: "knock_request", "d3ck_id": d3ckid}, d3ck_status)

        d3ck_queue.push({type: 'info', event: 'knock_request', 'd3ck_status': d3ck_status})

        var options = load_up_cc_cert(d3ckid)

        options.form = { ip_addr : d3ck_server_ip, did: bwana_d3ck.D3CK_ID, did_from: d3ckid }

        request.post(url, options, function cb (err, resp) {
            if (err) {
                console.error('post to remote failed:', JSON.stringify(err))
                res.send(200, {"err" : err});
                }
            else {
                console.log('knock answer success...!')
                console.log(resp.body)
                res.send(200, resp.body)
            }
        })
    }

}



// upload and download some content from the vaults
function downloadStuff (req, res, next) {

    console.log('in DL stuff')

    var uploadz = d3ck_public + "/uploads"

    var files = fs.readdirSync(uploadz)

    console.log(files)

    res.send(200, {"files" : files });

}

// req.files contains all the goods, including:
//
//  size
//  path        local on server
//  name        filename
//  type        mimetype, aka image/png and such
//

function uploadSchtuff(req, res, next) {

    console.log('uploadz!')

    var d3ck_status = empty_status()

    if (typeof req.params.key == "undefined") {
        console.log('correct type of upload required')
        var reply = {error: "type of upload required"}
        res.send(200, reply);
    }

    // currently local & remote
    var upload_target = req.params.key

    console.log('striving to upload....' + upload_target)

    // console.log(req)

    client_ip = get_client_ip(req)

    console.log('from : ' + client_ip)

    // console.log(req)


    //
    // yet another hack in a long line of hacks...
    // this time, multipart forms... let's just try to see
    // if I can figure this out; this is only d3ck-2-d3ck
    // 
    if (typeof req.files.uppity == 'undefined') {

        console.log('another d3ck sending something...?')

        // req.setBodyEncoding("binary");
        console.log(req.headers)


        var file_name   = req.headers['x-filename']
        var file_size   = req.headers['x-filesize']

        // xxx
        // when self-testing through a NAT... ips started getting weird... really
        // should figure out from cert matching
        var file_d3ckid = req.headers['x-d3ckid']

        // var ws = fs.createWriteStream(d3ck_public + '/uploads/lucky.png')
        var ws = fs.createWriteStream(d3ck_public + '/uploads/' + file_name)

        // fs.createWriteStream(d3ck_public + "/uploads/" + req.body.filename).pipe(req);

        req.pipe(ws)

        ws.on('error', function (err) {
            console.log('ws writing error: ' + JSON.stringify(err))
        });

        req.on('end', function() {

            console.log('someday has come for upload....?')

            var file_magic = {
                file_name : file_name,
                file_size : file_size,
                file_from : client_ip,
                did       : file_d3ckid,
                direction : "local"
            }

            var browser_magic = { "notify_add":true, "notify_ring":false, "notify_file":true}

            d3ck_status.browser_events = browser_magic

            d3ck_status.file_events    = file_magic

            createEvent(client_ip, {event_type: "remote_upload", "file_name": file_name, "file_size": file_size, "d3ck_id": file_d3ckid}, d3ck_status)

            d3ck_queue.push({type: 'info', event: 'remote_upload', 'd3ck_status': d3ck_status})

            res.send(204, {"status" : file_name})

        })

    }

    else {

        console.log('normal stuff')

        for (var i=0; i<req.files.uppity.length; i++) {

            var target_size = req.files.uppity[i].size
            var target_file = req.files.uppity[i].name
            var target_path = d3ck_public + "/uploads/" + target_file
            var tmpfile     = req.files.uppity[i].path
            var headers     = req.files.uppity[i].headers

            // skip if too big
            if (target_size > MAX_UPLOAD_SIZE) {
                // XXX-errz to user
                console.log('upload size (' + target_size + ') exceeds limit: ' + target_size)
                continue
            }


            console.log('trying ' + tmpfile + ' -> ' + target_path)

            //
            // LOCAL or remote?
            //
            console.log('moment of truth.. local or no?  => ' + upload_target)

            //
            // LOCAL - file still stashed here for now
            //
            if (upload_target == "local") {
                console.log('local...')

                var file_magic = {
                    file_name : target_file,
                    file_size : target_size,
                    file_from : client_ip,
                    did       : bwana_d3ck.D3CK_ID,
                    direction : "local"
                }

                //
                // NOTE - target & orig file MUST be in same file system
                //
                // also... slight race condition.  Life goes on.

                console.log('trying to rename....')

                // XXX if on different FS, have to copy
                // also check to see if exists!
                fs.rename(tmpfile, target_path, function (err) {
                    if (err)  {
                        console.log('errz - ')
                        console.log(err)
                    }
                    else {
                        console.log('rename complete');
                        console.log('woohoo')
                    }
                })

                var browser_magic              = { "notify_add":false, "notify_ring":false, "notify_file":true}
                d3ck_status.browser_events = browser_magic
                d3ck_status.file_events    = file_magic

                createEvent(client_ip, {event_type: "file_upload", "file_name": target_file, "file_size": target_size, "d3ck_id": bwana_d3ck.D3CK_ID}, d3ck_status)
                d3ck_queue.push({type: 'info', event: 'file_upload', 'd3ck_status': d3ck_status})

                res.send(204, {"status" : target_file})

            }

            //
            // REMOTE
            //
            // post to a remote D3CK... first look up IP based on PID, then post to it using
            // client-side certs for auth
            //
            else {
                console.log("going to push it to the next in line: " + upload_target)

                var file_magic = {
                    file_name  : target_file,
                    file_size  : target_size,
                    file_from  : client_ip,
                    did        : bwana_d3ck.D3CK_ID,
                    direction  : upload_target
                }

                var url = 'https://' + d3ck2ip[upload_target] + ':' + d3ck_port_ext + '/up/' + upload_target

                console.log(url)

                var options = load_up_cert_by_did(upload_target)

                options.headers = { 'x-filename': target_file, 'x-filesize': target_size, 'x-d3ckID': bwana_d3ck.D3CK_ID }
                // var file_data = fs.readFileSync(tmpfile) 

                console.log('FN: ' + target_file + '  Opts:')

                console.log(options)

                fs.createReadStream(tmpfile).pipe(request.post(url, options, function cb (err, resp) {
                    if (err) {
                        console.error('upload failed:', err);
                        }
                    else {
                        console.log('Upload successful...?')
                        console.log(resp)

                        var browser_magic          = { "notify_add":false, "notify_ring":false, "notify_file":true}
                        d3ck_status.browser_events = browser_magic
                        d3ck_status.file_events    = file_magic
                        createEvent(client_ip, {event_type: "remotely_uploaded", "file_name": target_file, "file_size": target_size, "d3ck_id": upload_target, "target ip": d3ck2ip[upload_target] }, d3ck_status)

                        d3ck_queue.push({type: 'info', event: 'remotely_uploaded', 'd3ck_status': d3ck_status})

                        res.send(204, {"status" : file_name})
                    }
                }))
            }





        }
    }

}

//
// execute a command in the background, log stuff
//
function d3ck_spawn(command, argz) {

// xxx - add time/date

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
// execute a command synchronously(!) and return output
//
function d3ck_spawn_sync(command, argz) {

    console.log('a sync emerges... ' + ' (' + command + ')\n\n\t')

    var cmd_string = command + ' ' + argz.join(' ')

    console.log("-->" + cmd_string + "<---\n\n\n")

    var result = sh.exec(cmd_string)

    console.log('return code ' + result.code);
    console.log('stdout + stderr ' + result.stdout);

    try {
        out = fs.writeFileSync(d3ck_logs + '/' + command.replace(/\\/g,'/').replace( /.*\//, '' )  + '.out.log', 'a+')
        err = fs.writeFileSync(d3ck_logs + '/' + command.replace(/\\/g,'/').replace( /.*\//, '' )  + '.err.log', 'a+')
    }
    catch (e) {
        console.log("error writing log file with " + command + ' => ' + e.message)
    }

    return(result)

}

 /**
 * Start the local OpenVPN client via an external bash script
 */
function startVPN(req, res, next) {

    console.log('start vpn2')
    console.log(req.body)

    var home  = "/"

    // bail if we don't get ID
    if (typeof req.body.d3ckid === 'undefined' || req.body.d3ckid == "") {
        console.log("error... requires a D3CK ID!");
        res.redirect(302, home)
    }

    console.log('onto the execution...')

    var d3ckid = req.body.d3ckid
    var ipaddr = req.body.ip_addr

    console.log(d3ckid, ipaddr)

    // this means you're trying to do it despite ping not working
    if (typeof d3ck2ip[d3ckid] == 'undefined') {
        console.log("hmmm... trying to VPN when ping couldn't reach it... good luck!")
        args = [d3ckid, ipaddr]
    }

    else {
        console.log("using pinged IP addr to VPN: " + d3ck2ip[d3ckid])
        args = [d3ckid, d3ck2ip[d3ckid]]
    }

    var cmd   = d3ck_bin + '/start_vpn.sh'

    // fire up vpn
    d3ck_spawn(cmd, args)

    createEvent(get_client_ip(req), {event_type: "vpn_start", remote_ip: d3ck2ip[d3ckid], remote_d3ck_id: d3ckid})

    d3ck_queue.push({type: 'info', event: 'vpn_start', remote_ip: d3ck2ip[d3ckid], remote_d3ck_id: d3ckid})

    // write the IP addr to a file
    write_2_file(d3ck_remote_vpn, d3ck2ip[d3ckid])
    write_2_file(d3ck_remote_did, d3ckid)

    // finis
    res.send(204)

}

//
// forward or unforward a port to go to your VPN to facilitate web RTC/sockets/etc
//
// if we're doing the calling, we want to set it up so that browser web requests
// can go into the tunnel vs. trying to flail at some random IP
//
// normally you have something like:
//
//    computer-1 <-> browser-1 <-> D3CK-1 <-- .... network .... --> D3CK-2 <-> browser-2 <-> computer-2
//
// computer1  & 2 may well not have connectivty to the other, but the js executing
// in the browser comes from them... but they can always talk to their own D3CK.
//
function forward_port(req, res, next) {

    console.log('forwarding portz...')

    if (typeof req.query.direction   == "undefined" ||
        typeof req.query.local_port  == "undefined" ||
        typeof req.query.remote_ip   == "undefined" ||
        typeof req.query.remote_port == "undefined" ||
        typeof req.query.proto       == "undefined") {
            var err = 'port forwarding requires direction, local_port, remote_ip, remote_port, and proto all to be set'
            console.log(err)
            next({error: err})
            return
    }

    direction   = req.query.direction
    local_port  = req.query.local_port
    remote_ip   = req.query.remote_ip
    remote_port = req.query.remote_port
    proto       = req.query.proto

    console.log(direction, local_port, remote_ip, remote_port, proto)

    // flush the past away and then add iptables rules
    var cmd = d3ck_bin + '/forward_port_n_flush.sh'

    var args  = [direction, d3ck_server_ip, local_port, remote_ip, remote_port, proto]

    d3ck_spawn(cmd, args)

    createEvent(get_client_ip(req), {event_type: "port_forwarding", remote_ip: d3ck2ip[d3ckid], remote_d3ck_id: d3ckid})
    d3ck_queue.push({type: 'info', event: 'port_forwarding', 'd3ck_status': d3ck_status})

    res.send(204)

}

//
// flush all IP tables rules and then add a given forwarding
//
// this is done differently because of sync/async... need to absolutely
// be sure flushing is done before adding other rules, or they'll simply
// get tossed
//
// IN ADDITION. Forwards traffic for the IP that outsiders might be sending to us
//
function forward_port_and_flush(local_port, remote_ip, remote_port, proto) {

    console.log('... skipping iptables for now... using proxy here instead...')
    return

    console.log('flushing iptables+routes, adding... ', local_port, remote_ip, remote_port, proto)

    // flush the past away and then add iptables rules
    var cmd  = d3ck_bin + '/forward_port_n_flush.sh'
    var args = ["up", d3ck_server_ip, local_port, remote_ip, remote_port, proto]

    d3ck_spawn(cmd, args)

    createEvent("internal server", {event_type: "flush forwarding", d3ck_id: bwana_d3ck.D3CK_ID})

}


/**
 * Replaces a d3ck completely
 */
function put_d3ck(req, res, next) {
    if (!req.params.value) {
        console.log({params: req.params}, 'put_d3ck: missing value');
        next(new MissingValueError());
        return;
    }

    console.log({params: req.params}, 'put_d3ck: not implemented');
    next(new NotImplementedError());
    return;
}


function back_to_home (res) {
    console.log('on my way home')
    var home = "/"
    // res.redirect(302, home)
    res.redirect(303, home)
}

//
// create and delete form handlers
//

function handleForm(req, res, next) {

    console.log('handle form called with')
    console.log(req.body)

    // console.log(req.params)

    if (typeof req.body.d3ck_action === 'undefined' || req.body.d3ck_action == "") {
        console.log("error... unrecognized action: " + req.body.d3ck_action);
    }

    var action = req.body.d3ck_action

    if (action == 'CREATE') {
        var ip_addr  = req.body.ip_addr

        create_d3ck_by_ip(ip_addr).then( function () {
            console.log('... suck... sess...?')
        })
    }

    else if (action == 'DELETE') {
        formDelete(req, res, next)
    }

    // errror
    else {
        console.log("error... unrecognized action: " + action);
    }

    back_to_home(res)

}

function formDelete(req, res, next) {

    console.log("deleting d3ck...")
    console.log(req.body)
    console.log(req.body.d3ckid)

    // script below needs: d3ck-id

    // have to have these
    var d3ckid = req.body.d3ckid

    //
    // execute a shell script with appropriate args to create a d3ck.
    // ... of course... maybe should be done in node/js anyway...
    // have to ponder some imponderables....
    //
    // this simply takes the pwd and finds the exe area... really
    // want to use a reasonable d3ck home here!
    d3ck_spawn(d3ck_bin + '/delete_d3ck.sh', [d3ckid])


}


//
// https ping a remote d3ck... it can have multiple
// IP addrs, so ping them all at once and take the
// first answer that matches their IP/PID
//

// URL looks something like...
//
//      /sping/686C2025589E6AEF898E3A9E96B5A723429872AB/192.168.0.250?_=1410057086534533
//

var ping_done = false

function httpsPing(ping_d3ckid, ipaddr, res, next) {

    // console.log("++++pinging... " + ping_d3ckid + ' / ' + ipaddr)

    ping_done = false

    var all_ips   = ipaddr.split(','),
        done      = false,
        responses = 0;

    var err = {}

    //  cache results, do that first... or do in browser?


//  if (defined d3ck2ip[ip])
//     https_get_certified(url, ip2dck[ip]).then(function (ping_data) {
//     have any of these seen a cert?
//  all_ips.forEach(function(ip, i) {

    all_ips.forEach(function(ip, i) {

        // skip loopback
        if (ip == "127.0.0.1") {
            // console.log('skipping ' + ip);
            responses++
            return;
        }

        // console.log('pinging  ' + ip);

        var url = 'https://' + ip + ':' + d3ck_port_ext + '/ping'

        // var req = https.get(url, function(response) {
        https_get_certified(url, ping_d3ckid).then(function (ping_data) {
            // console.log('+++ someday has come for ' + ip + ' ... ping response back')
            // console.log(ping_data)
            try {
                ping_data = JSON.parse(ping_data)
            }
            catch (e) {
                if (JSON.stringify(e) != "{}") {
                    console.log('errz socket parsing: ' + JSON.stringify(e))
                    response = {status: "ping failure", "error": e}
                    // synchronicity... II... shouting above the din of my rice crispies
                    try { res.send(408, response) }
                    catch (e) { console.log('sPing error ' + e) }
                }
                return
            }

            // data.ip = ip
            // console.log('ip: ' + ip + ', data: ' + JSON.stringify(ping_data))

            ping_data.ip = ip

            if (ping_data.did != ping_d3ckid) {
                console.log("ID mismatch - the ping you d3cked doesn't match the d3ck-id you gave")
                console.log(ping_data.did + ' != ' + ping_d3ckid)
                response = {status: "mismatch", "name": 'mismatched PID'}
                // res.send(420, response) // enhance your calm!
                res.send(420, { error: "ID mismatch - the ping you d3cked doesn't match the d3ck-id you gave" })
            }

            else if (typeof ping_data != "undefined" && ping_data.status == "OK" && !ping_done) {
                ping_done = true
                d3ck2ip[ping_d3ckid] = all_ips[i]
                ip2d3ck[all_ips[i]] = ping_d3ckid

                // console.log('ping cool: ' + ping_d3ckid + ' -> ' + all_ips[i] + ' -> ' + ip2d3ck[all_ips[i]])

                res.send(200, ping_data)
            }

            responses++

            if ((responses+1) == all_ips.length && !ping_done) {
                ping_done = true
                console.log('ran out of pings for ' + ip)
                response = {status: "no answer"}
                res.send(408, response)
            }

        }).catch(function (error) {

                // res.send(420, {"error": "error ring a ping ping"});
                // console.log("ping ping err err " + JSON.stringify(error))

            responses++

            if (responses == all_ips.length && !ping_done) {
                // console.log('+++ someday has come... in a bad way for ' + ip + ' ... ping failure')
                ping_done = true
                response = {status: "ping failure", "error": error }
                // synchronicity... II... shouting above the din of my rice crispies
                try       { res.send(408, response) }
                catch (e) { console.log('sPing error ' + JSON.stringify(e)) }
            }

        })
        .done();

//         .on('error', function(e) {
//             // console.log(e)
//             // console.log(responses + ' v.s. ' + all_ips.length)
// 
//             if (responses == all_ips.length && !ping_done) {
//                 console.log('+++ someday has come... in a bad way for ' + ip + ' ... ping failure')
//                 ping_done = true
//                 response = {status: "ping failure", "error": e}
//                 // synchronicity... II... shouting above the din of my rice crispies
//                 try { res.send(408, response) }
//                 catch (e) { console.log('sPing error ' + e) }
//             }
//         })


    })

}

//
// after first thing the user sees... what have they said in the form?
//
function quikStart(req, res, next) {

    var name       = "JaneDoe",
        email      = "jane@example.com",
        d3ck       = "d3ckimusRex",
        stance     = "reasonable",
        password   = "",                  // sigh... should allow nulls, but libs don't like it... bah
        d3ck_image = ""


    console.log('quicky!')

    console.log(req.body)

    if (typeof req.body.user_name == "undefined") {
        console.log('user name is required, but using defaults')
    }
    else {
        name = req.body.user_name
    }

    if (typeof req.body.email_address == "undefined") {
        console.log('user name is required, but using defaults')
    }
    else {
        email = req.body.email_address
    }

    if (typeof req.body.d3ck_name == "undefined") {
        console.log('d3ck name is required, but using defaults')
    }
    else {
        d3ck = req.body.d3ck_name
    }

    if (typeof req.body.d3ck_password == "undefined") {
        console.log('password is required, but using defaults (can ... we...?)')
    }
    else {
        password = req.body.d3ck_password
    }

    if (typeof req.body.radio_free_d3ck == "undefined") {
        console.log('security stance is required, but using default')
    }
    else {
        stance = req.body.radio_free_d3ck
    }

    // console.log(name, email, d3ck, password, stance)

    bwana_d3ck.name        = d3ck
    bwana_d3ck.owner.name  = name
    bwana_d3ck.owner.email = email
    bwana_d3ck.stance      = stance

    console.log(req.files)
    // grab the file from whereever it's stashed, write it
    // if (req.files.d3ck_image.path != "" && typeof req.files.d3ck_image.type != "undefined") {
    if (req.files.d3ck_image.path != "" && typeof req.files.d3ck_image.type != "undefined") {

        msg = ""

        if (req.files.d3ck_image.type != 'image/png' && req.files.d3ck_image.type != 'image/jpeg' && req.files.d3ck_image.type != 'image/gif') {
            msg = 'Invalid image format (' + req.files.d3ck_image.type + '), only accept: GIF, JPG, and PNG'

        }

        if (req.files.d3ck_image.size > MAX_IMAGE_SIZE) {
            msg += 'maximum file size is ' + MAX_IMAGE_SIZE + ', upload image size was ' + req.files.d3ck_image.size
        }

        if (msg) {
            req.files.d3ck_image.type = "image/png"
            req.files.d3ck_image.name = "d3ck.png"
        }

        // just stick to one ending please....
        var iname = req.files.d3ck_image.name.replace(new RegExp("jpeg$"),'jpg')
        var suffix = iname.substr(iname.length-4, iname.length).toLowerCase()

        console.log('real img name: ' + req.files.d3ck_image.name + '<-')
        console.log('new  img name: ' + iname + '<-')
        console.log('suffix       : ' + suffix + '<-')

        d3ck_image      = '/img/' + d3ck_id + suffix
        full_d3ck_image = d3ck_public + '/img/' + d3ck_id + suffix

        var data = ""

        if (msg) {
            data = fs.readFileSync(default_image)
            console.log('reading... ' + default_image)
        }
        else {
            data = fs.readFileSync(req.files.d3ck_image.path)
        }

        var image_b64 = b64_encode(data)

        // in case someone tries some monkey biz...
        if (suffix != '.png' && suffix != '.gif' && suffix != '.jpg') {
            console.log('err: filename suffix borked: ' + suffix)
        }
        else {
            console.log('trying to write... ' + d3ck_image)
            // weirdness... writefile returns nada
            try {
                fs.writeFileSync(full_d3ck_image, data, 'utf8')
                console.log('updating d3ck image on disk')

                bwana_d3ck.image     = d3ck_image
                bwana_d3ck.image_b64 = image_b64

                console.log(JSON.stringify(bwana_d3ck))

            }
            catch (err) {
                console.log('error writing image file "' + full_d3ck_image + '": ' + JSON.stringify(err))
            }
        }

    }
    else {
        console.log('error uploading: ' + msg)
    }

    if (typeof bwana_d3ck.image == undefined || bwana_d3ck.image == "" || bwana_d3ck.image == "img") {
        console.log('no image found... setting it to the default')

        var data             = fs.readFileSync(default_image)
        var image_b64        = b64_encode(data)

        bwana_d3ck.image     = d3ck_image
        bwana_d3ck.image_b64 = image_b64

        fs.writeFileSync(full_d3ck_image, data, 'utf8')

    }


    // update
    // update_d3ck(bwana_d3ck)
    assign_capabilities(bwana_d3ck)     // does update


    secretz          = {}
    secretz.id       = 0
    secretz.name     = name
    secretz.email    = email
    secretz.d3ck     = d3ck
    secretz.stance   = stance
    secretz.image    = d3ck_image

    secretz.hash     = hashit(password, N_ROUNDS)

    // console.log(name, email, d3ck, stance, password, secretz.hash, d3ck_image)

    console.log('SZ: ' + JSON.stringify(secretz))
    console.log(secretz.hash)

    write_O2_file(d3ck_secretz, secretz)

    // no longer go here
    redirect_to_quickstart = false

    res.redirect(302, '/')

}


//
// grab a https url
//
function https_get(url) {

    // console.log('getting... ' + url)

    var deferred = Q.defer();
    var str      = ""


    // xxx - yeah, yeah....
    var d = require('domain').create();

    d.run(function() {
        console.log("https snaggin' " + url)

        request(url, function (err, res, body) {
            if (!err) {
                // success
                // console.log("we're going home, ma!")
                // console.log(body)
                deferred.resolve(body)
            }
            if (err) {
                // console.log('errz on snags: ' + JSON.stringify(err) )
                deferred.reject(err)
            }
        });

    });

    d.on('error', function(err) {
        if (err.code == 'ECONNREFUSED' || err.code == 'EHOSTUNREACH') {
            console.log('https.get !lucky: ' + JSON.stringify(err));
            deferred.reject(err)
        }
        else {
            console.log('https.get (' + url + ') cronked on some weird/bad shit: ' + JSON.stringify(err.message));
            deferred.reject(err)
        }
    });

    return deferred.promise;


}

//
// grab a https url... with client side certs
//
function https_get_certified(url, d3ckid) {

    // console.log('getting... ' + url)

    var deferred = Q.defer();
    var str      = ""

    var options = load_up_cc_cert(d3ckid)

    options.url  = url

    // console.log(options)

    // xxx - yeah, yeah....
    var d = require('domain').create();

    d.run(function() {
        // console.log("snaggin' " + url)

        request(options, function cb (err, resp, body) {
            if (err) {
                console.error('CSC nab of remote failzor:', JSON.stringify(err))
                deferred.reject(err)
                }
            else {
                // console.log('CSC https got... something - RC: ' + resp.statusCode)
                deferred.resolve(body)
                }
        })
    })

    d.on('error', function(err) {
        if (err.code == 'ECONNREFUSED' || err.code == 'EHOSTUNREACH') {
            console.log('CSC https.get !lucky: ' + JSON.stringify(err));
            deferred.reject(err)
        }
        else {
            console.log('CSC https.get (' + url + ') cronked on some weird/bad shit: ' + JSON.stringify(err.message));
            deferred.reject(err)
        }
    });

    return deferred.promise;


}

//
// take the ip/data pushed to us from the UI and create something... beautiful!
// a virtual butterfly, no less
//
function create_d3ck_by_ip(ip_addr) {

    console.log("creating d3ck by " + ip_addr)
    // console.log(req.body)

    var deferred = Q.defer();

    // do all the create stuff
    create_d3ck_locally(ip_addr).then(function(data) {

        console.log('created local -> ' + JSON.stringify(data))

        if (typeof data.did == "undefined" || typeof data.owner.name == "undefined") {
            return deferred.reject({ error: "couldnt get remote d3ck ID or owner name"} )
        }

        //
        // get client keys
        //
        console.log("posting our d3ck data to the d3ck we just added with create_d3ck.sh....")

        var cmd  = d3ck_bin + '/create_client_d3ck.sh'

        argz = [bwana_d3ck.D3CK_ID, 
                bwana_d3ck.image, 
                bwana_d3ck.ip_addr, 
                "\"all_ips\": [" + my_ips + "]", 
                bwana_d3ck.owner.name, 
                bwana_d3ck.owner.email, 
                ip_addr, 
                data.did]

        d3ck_spawn(cmd, argz)

        createEvent(ip_addr, {event_type: "create", d3ck_id: data.did})

        d3ck_queue.push({type: 'info', event: 'd3ck_create', 'd3ck_status': d3ck_status})

        return deferred.resolve();
    })

    return deferred.promise;

}

//
// grab d3ck info from an ip address, write cert/d3ck stuff into keystore, etc
//
// basic sequence:
//
//  - d3ck ping to see if it's alive and to get its d3ck id
//  - get the data from the remote system
//  - save all that stuff it seems valid
//  
//
function create_d3ck_locally(ip_addr) {

    console.log('create_d3ck_locally ' + ip_addr)

    var deferred = Q.defer();

    var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/ping'

    console.log('ping get_https ' + url)

    var data = ""

    // ping first
    https_get(url).then(function (ping_data) {

        var p_deferred = Q.defer();

        ping_data = JSON.parse(ping_data)

        console.log(ping_data)

        console.log(url + ' nabbed')

        if (typeof ping_data.did == "undefined") {
            console.log('not a d3ck...?')
            p_deferred.reject({'error': "not a d3ck...?"})
        }

        if (typeof all_d3cks[ping_data.did] != "undefined") {
            console.log('duplicate... pass.')
            p_deferred.reject({'error': "duplicate... alreadydone"})
        }

        else {
            console.log('ping seemz ok')
            p_deferred.resolve(ping_data)
        }

        return p_deferred.promise;

    }).then(function (data) {

        console.log('post ping')

        //
        // now get client certs
        //
        c_url      = 'https://' + ip_addr + ':' + d3ck_port_ext + '/cli3nt?did=' + bwana_d3ck.D3CK_ID

        console.log("getting cli3nt data we'll use from: " + c_url)

        var c_data = ""

        // grab a d3ck's data via URL
        https_get(c_url).then(function (c_data) {

            var c_deferred = Q.defer();

            console.log('\ncheckin client data from ' + c_url + ' nabz => ' + c_data.substring(0,1024))

            if (c_data.indexOf("was not found") != -1) {
                console.log('no certy love: ' + c_data)
                c_deferred.reject({'error': "other side didn't cough up our certz"})
            }
            else {

                var r_deferred = Q.defer();

                c_data = JSON.parse(c_data)

                console.log('remote client d3ck info in...!')

                console.log(c_data.all_ips)

                // if the IP we get the add from isn't in the ips the other d3ck
                // says it has... add it in; they may be coming from a NAT or
                // something weird
                console.log('looking 2 see if your current ip is in your pool')

                var found = false

                for (var i = 0; i < c_data.all_ips.length; i++) {
                    if (c_data.all_ips[i] == ip_addr) {
                        console.log('remote ip found in d3ck data')
                        found = true
                        break
                    }
                }
                if (! found) {
                    console.log("You're coming from an IP that isn't in your stated IPs... adding [" + ip_addr + "] to your IP pool just in case")
                    c_data.all_ips[all_client_ips.length] = ip_addr
                }

                create_d3ck_key_store(c_data)

                //
                // execute a shell script with appropriate args to create a d3ck.
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
                create_full_d3ck(c_data)

                all_d3cks[c_data.D3CK_ID] = c_data.D3CK_ID

                // write image
                console.log('image...')

                // console.log(c_data.image_b64)
                write_2_file(d3ck_public + c_data.image, b64_decode(c_data.image_b64))

                // self added
                d3ck_events = { new_d3ck_ip : '127.0.0.1', new_d3ck_name: c_data.name }

                r_deferred.resolve({ "did": c_data.D3CK_ID })

            }

        }).fail(function (error) {
            console.log("in c-form error occured: " + error);
            r_deferred.reject({ "error": JSON.stringify(error)})
        });

    }).fail(function (error) {
        console.log("in create d3ck errz: " + error);
        r_deferred.reject({ "error": error })
    });

    return deferred.promise;

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

    var command = "/etc/init.d/d3ck"
    var argz    = ["stop"]

    d3ck_spawn(command, argz)

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

    var cmd  = "/etc/init.d/d3ck"
    var argz = ["restart"]

    d3ck_spawn(cmd, argz)

}


///
///
///
///--- Server
///
///
///

// Cert stuff
var key  = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.key")
var cert = fs.readFileSync("/etc/d3ck/d3cks/D3CK/d3ck.crt")
var ca   = fs.readFileSync("/etc/d3ck/d3cks/D3CK/ca.crt")

var credentials = {key: key, cert: cert, ca: ca}


//
// Ciphers... is a bit mysterious.
//
// I've cobbled together what I think is a reasonable set of
// options from a variety of sources. Having ECDHE enabled
// seems to be a key.  I'm not even sure what the below options
// do, but testing by hand with openssl, ala:
//
//      http://baudehlo.com/2013/06/24/setting-up-perfect-forward-secrecy-for-nginx-or-stud/
//
// via:
//
//      openssl s_client -connect 127.0.0.1:8080 -cipher AES256-SHA256:RC4-SHA
//
// returns a bunch of stuff, including the line:
//
//      Secure Renegotiation IS supported
//
// which appears to be the magic phrase.
//
// TBD - still need to test with qualys openssl labs - https://www.ssllabs.com/ssltest/
//
// Some additional info from https://github.com/joyent/node/issues/2727,
// https://github.com/joyent/node/commit/f41924354a99448f0ee678e0be77fedfab988ad2,
// and other places ;(
//
// Why do crypto people hate us?  Just tell me what to put there for reasonable
// security... or make it the default ;(
//

var server_options = {
    // key                 : key,
    // cert                : cert,
    // ca                  : ca,
    //ciphers:            : 'ECDHE-RSA-AES128-SHA256:AES128-GCM-SHA256:RC4:HIGH:!MD5:!aNULL:!EDH',
    // ciphers             : 'ECDHE-RSA-AES256-SHA384:AES256-SHA256:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    // ciphers             : 'ECDHE-RSA-AES256-SHA384:AES256-SHA256:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    // secureOptions       : require('constants').SSL_OP_CIPHER_SERVER_PREFERENCE,
    // honorCipherOrder    : true,
    // requestCert         : true,
    // rejectUnauthorized  : false,
    // strictSSL           : false
}

server = express()

server.enable('trust proxy');

// various helpers
server.use(response());

server.use(express.limit('1gb'))

// server.use(express.logger());
server.use(compress());

server.use(express.methodOverride());

server.use(express.json({limit: '1gb'}));
server.use(express.urlencoded());
server.use(express.multipart());

server.use(express.methodOverride());

server.use(cors());

// passport/auth stuff
server.use(express.cookieParser());


//
// need n randomnish bytes... I can wait all night... defaults to 16 hex pairs
//
function gen_somewhat_random(n) {

    if (typeof n == "undefined") n = 16

    console.log('generating ' + n + ' bytes for the secret secret.')

    // when you get lemons... ah, you know the drill
    var lemons   = d3ck_bin + "/gen_randish.sh " + n
    var lemonade = sh.exec(lemons)

    console.log('squeezing the lemons, they reveal their secrets! ' + JSON.stringify(lemonade))

    return(lemonade.stdout)

}

//
// not sure about the store stuff... does passport do the same below (/aaa)?
// ... so much dox in so little time. Think this will work. Maybe.
//
server.use(express.session({ 
    secret: gen_somewhat_random()
//  store: new candyStore({
//      client: rclient
//  })
}));


server.use(flash());
server.use(passport.initialize());
server.use(passport.session());
// server.use(express.bodyParser());
server.use(server.router);

// passport auth
server.use(auth)



var everyauth = require('everyauth')

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

everyauth
  .twitter
  .entryPath('/twitter')
  .callbackPath('/twitter/callback')
  .consumerKey(conf.twit.consumerKey)
  .consumerSecret(conf.twit.consumerSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
      return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
  })
  .redirectPath('/');

server.get('/twitter/user', function (req, res) {
  console.log(req.user);  // FTW!
});





//
//
// actual routes n stuff
//
//
//

// have we seen them before this login session?  True/false
cookie = ""

server.get('/aaa', function(req, res) {

    console.log('AAA? ')

    cookie = req.client._httpMessage.req.sessionID

    rclient.get('session_cookie', function (err, scookie) {
        // failzor getting cookie
        if (err) {
            console.log(err, 'no cookie, no fun');
            next(err);
            // res.send(200, {session_cookie: req.client._httpMessage.req.sessionID})
            res.send(200, {session_cookie: false })
        }
        else {
            if (cookie == scookie) {
                console.log('seen this cookie before... stale... old... used up... but still good...')
                res.send(200, { session_cookie: true } )
            }
            // no dice
            else {
                cookie = scookie
                console.log('fresh cookie, mon: ', cookie)
                res.send(200, { session_cookie: false } )
            }
        }
    });

});


// initial starting form - no auth
server.post('/quik', quikStart)

server.get('/logout', function(req, res) {
    rclient.del('session_cookie')
    req.logout();
    res.redirect('/');
});

server.get('/loginFailure', function(req, res, next) {
  res.send('Failed authentication, try again...?');
});

// before this really don't answer to much other than the user startup
console.log('adding routes')
//fire_up_server_routes()


//
// wait until user has run startup
//
async.whilst(
    function () {
        if (fs.existsSync(d3ck_secretz)) {
            console.log('ready to rock-n-roll')
            // means the startup has run and the D3CK has an ID, which must be done before anything else

            console.log('get user data')
            get_d3ck_vital_bits()

            // before this really don't answer to much other than the user startup
            // console.log('adding routes')
            // fire_up_server_routes()

            return false
        }

        return true

    },

    function (callback) {
        setTimeout(callback, PID_POLLING_TIME);
    },

    function (err) {
        if (typeof err != "undefined") {
            console.log('something terrible has happened....?')
            console.log(err)
        }
        else {
            console.log('whilst terminated normally')
        }
    }
)

// Ping action - no auth
server.get('/ping', echoReply)

// get a new client key pair
server.get('/cli3nt', auth, create_cli3nt_rest)

// get or list d3cks
server.post('/d3ck', auth, create_d3ck)

server.get('/d3ck', auth, list_d3cks)

// Return a d3ck by key
server.get('/d3ck/:key', auth, get_d3ck);

// Delete a d3ck by key
server.del('/d3ck/:key', auth, delete_d3ck);

// Destroy everything
server.del('/d3ck', auth, deleteAll, function respond(req, res, next) {
    res.send(204);
});


server.post('/form', auth, handleForm);

// get your ip addr(s)
server.get('/getip', auth, getIP);

// get your geo on
server.get('/geo', auth, getGeo);

// get your geo on
server.get('/dns', auth, getDNS);

// Ping another
server.get('/ping/:key', auth, echoStatus)

// knock knock proto to request access to a system that doesn't trust you
server.post('/knock', auth, knock);
// reply to the first
server.post('/knockReply/:d3ckid/:answer', auth, knockReply);

server.post('/vpn/start', auth, startVPN);

// stop
server.get('/vpn/stop', auth, stopVPN);

//
// server stuff... start, stop, restart, etc.
//
server.get('/server',         auth, serverStatus);   // status
server.get('/server/stop',    auth, serverDie);      // die, die, die!
server.get('/server/restart', auth, serverRestart);  // die and restart

// setup a tcp proxy
server.get('/setproxy', auth, setTCPProxy)

// forward a port
server.get('/forward', auth, forward_port)

//
// events... what's going on?  Maybe should be /marvin?
//
// list event types
server.get('/events',           auth, listEvents);
// get elements of a particular kind of event (create, delete, etc.);
server.get('/events/:key',      auth, getEvent);

//
// D3CK filestore - send up and getting down
//
// send stuff up the pipe....
server.post('/up/:key', auth, uploadSchtuff)
// get down with what's up
server.get('/down', auth, downloadStuff)


// get a url from wherever the d3ck is
server.all('/url', auth, webProxy)

server.post('/login',
    passport.authenticate('local', { failureRedirect: '/loginFailure', failureFlash: true }),
    function(req, res) {

        cookie = ""

        // cookie baking
        // rclient.set('session_cookie', req.client._httpMessage.req.sessionID, function(err) {
        rclient.set('session_cookie', gen_somewhat_random(), function(err) {
            if (err) {
                console.log(err, 'session cookie crumbled: ' + JSON.stringify(err));
                return(err);
            } else {
                console.log('cookie baking complete')
                // console.log('houston, we have a go, prepare for liftoff')
                // these aren't the droids you're looking for
                // console.log("these *are* the droids you're looking for, arrest them!")
            }
        })
        res.redirect('/');
    }
)

// get peerjs peers
server.get('/p33rs', auth, function(req, res, next) {
    console.log('returning peers...')
    return res.json(all_p33rs);
})

// cuz ajax doesn't like to https other sites...
server.get('/sping/:key1/:key2', auth, function (req, res, next) {
    // console.log('spinging')
    httpsPing(req.params.key1, req.params.key2, res, next)
})

// send me anything... I'll give you a chicken.  Or... status.
server.get("/status", auth, d3ckStatus)

// packet filter up or down...?
server.get("/shields/:key", auth, mrSulu)

//
// send any actions done on client... like ringing a phone or whatever
// this is to help keep state in case of moving off web page, browser
// crashes, etc.
//
// what's in the q?
server.get("/q", auth, d3ckQueue)


// XXX - update!
server.get('/rest', function root(req, res, next) {
    var routes = [
        'Routes with * are unauthenticated',
        'GET     /cli3nt',
        'GET     /down',
        'GET     /events',
        'GET     /events/:key',
        'GET     /forward',
        '* POST  /login',
        'GET     /logout',
        'GET     /rest',
        'GET     /getip',
        'GET     /geo',
        'POST    /d3ck',
        'GET     /d3ck',
        'DELETE  /d3ck',
        'PUT     /d3ck/:key',
        'GET     /d3ck/:key',
        'DELETE  /d3ck/:key',
        'GET     /p33rs',
        'GET     /ping',
        'GET     /ping/:key',
        'GET     /q',
        'GET     /server',
        'GET     /server/stop',
        'GET     /server/restart',
        'GET     /setproxy',
        'GET     /shields/:key',
        'GET     /sping/:key1/:key2',
        'GET     /status',
        'POST    /up/:key',
        'GET     /url',
        'POST    /vpn/start',
        'GET     /vpn/stop'
    ];
    res.send(200, routes);
});

// if all else fails... serve up an index or public
server.use(express.static(d3ck_public))


//
// after all that, start firing up the engines
//

//
// promise her anything... buy her a chicken.  A json chicken, of course.
//
var d3cky = http.createServer(server)

var cat_sock = {}

//
// signaling
//
var io_sig = {}

var cool_cats = {}

console.log('\n\nfiring up sockets... trying... to set up... on port ' + d3ck_port_forward + '\n\n')

io_sig = require('socket.io').listen(d3cky)

// xxx?
// io_sig.disable('browser client cache');

function describeRoom(name) {
    var clients = io_sig.sockets.clients(name);
    var result = { clients: {} };
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

io_sig.set('log level', 1);


io_sig.sockets.on('connection', function (ss_client) {

    console.log("CONNEEEEECTION.....!")
    // console.log(ss_client)

    ss_client.resources = {
        screen: false,
        video: true,
        audio: false
    };

    // pass a message to another id
    ss_client.on('message', function (details) {
        // console.log('mess: ' + JSON.stringify(details))

        if (!details) return;

        var otherClient = io_sig.sockets.sockets[details.to];

        // console.log(io_sig.sockets.sockets)

        if (!otherClient) return;

        // ... well...
        cool_cats[otherClient] = otherClient

        // console.log(otherClient)

        details.from = ss_client.id;
        otherClient.emit('message', details);
    });


    // all import cat chat!
    ss_client.on('cat_chat', function (kitten) {

        console.log('A kitten? For me? ' + JSON.stringify(kitten))

        // if (!kitten) return;
        // if (!otherClient) return;

        kitten.from = ss_client.id;

        console.log('sending free kittens from... ' + ss_client.id)

        // console.log(ss_client)

        for (var cat_client in io_sig.sockets.sockets) {
            console.log('sending to... ' + JSON.stringify(cat_client))
            // console.log('sending to... ' )
            // var c = io_sig.sockets.sockets[
            io_sig.sockets.sockets[cat_client].emit('cat_chat', kitten);
        }

    });


    ss_client.on('shareScreen', function () {
        ss_client.resources.screen = true;
    });

    ss_client.on('unshareScreen', function (type) {
        ss_client.resources.screen = false;
        removeFeed('screen');
    });

    ss_client.on('join', join);

    function removeFeed(type) {
        console.log('ss-remove-feed')
        if (ss_client.room) {
            io_sig.sockets.in(ss_client.room).emit('remove', {
                id: ss_client.id,
                type: type
            });
            if (!type) {
                ss_client.leave(ss_client.room);
                ss_client.room = undefined;
            }
        }
    }

    function join(name, cb) {
        console.log('joining... ' + name)

        // sanity check
        if (typeof name !== 'string') return;

        // leave any existing rooms
        removeFeed();
        safeCb(cb)(null, describeRoom(name));
        ss_client.join(name);
        ss_client.room = name;
    }

    // we don't want to pass "leave" directly because the
    // event type string of "socket end" gets passed too.
    ss_client.on('disconnect', function () {
        console.log('ss-D/C')
        removeFeed();
    });
    ss_client.on('leave', function () {
        console.log('ss-leave')
        removeFeed();
    });

    ss_client.on('create', function (name, cb) {
        console.log('ss-create')
        if (arguments.length == 2) {
            cb = (typeof cb == 'function') ? cb : function () {};
            name = name || uuid();
        } else {
            cb = name;
            name = uuid();
        }
        // check if exists
        if (io_sig.sockets.ss_clients(name).length) {
            safeCb(cb)('taken');
        } else {
            join(name);
            safeCb(cb)(null, name);
        }
    });

    // ss_client.emit('stunservers', [])
    // var credentials = [];
    // ss_client.emit('turnservers', credentials);

});


// http://stackoverflow.com/questions/5223/length-of-javascript-object-ie-associative-array
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}


//
//
// and... relax and listen....
//
//

//
// promise her anything... buy her a chicken.  A json chicken, of course.
d3cky.listen(d3ck_port_int, function() {
        console.log('[+] server listening at %s', d3ck_port_int)
})

