//
// d3ck server
//

var Tail       = require('tail').Tail,
    async      = require('async'),
    bcrypt     = require('bcrypt'),
    cors       = require('cors'),
    crypto     = require('crypto'),
    express    = require('express'),
    flash      = require('connect-flash'),
    fs         = require('fs'),
    formidable = require('formidable'),
    https      = require('https'),
    mkdirp     = require('mkdirp'),
    moment     = require('moment'),
    _static    = require('node-static'),
    os         = require('os'),
    passport   = require('passport'),
    l_Strategy = require('passport-local').Strategy,
    path       = require('path'),
    tcpProxy   = require('tcp-proxy'),
    request    = require('request'),
    response   = require('response-time'),
    rest       = require('rest'),
    restler    = require("restler"),
    sleep      = require('sleep'),
    sys        = require('sys'),
    puck       = require('./modules'),
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
var config = JSON.parse(fs.readFileSync('/etc/puck/puck.json').toString())
console.log(config);

console.log(config.PUCK)

// shortcuts
var puck_home         = config.PUCK.home
var puck_keystore     = puck_home + config.PUCK.keystore
var puck_bin          = puck_home + config.PUCK.bin
var puck_logs         = puck_home + config.PUCK.logs
var puck_public       = puck_home + config.PUCK.pub
var puck_secretz      = puck_home + config.PUCK.secretz

// oh, the tangled web we weave... "we"?  Well, I.
var puck_port_int     = config.PUCK.puck_port_int
var puck_port_ext     = config.PUCK.puck_port_ext
var puck_port_forward = config.PUCK.puck_port_forward
var puck_port_signal  = config.PUCK.puck_port_signal
var puck_proto_signal = config.PUCK.puck_proto_signal

// user data, password, etc. Secret stuff.
var secretz = {}

// what the client is using to get to us
var puck_server_ip    = ""

//
// stupid hax from stupid certs - https://github.com/mikeal/request/issues/418
//
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// for auth/salting/hashing
var N_ROUNDS = parseInt(config.crypto.bcrypt_rounds)

// image uploads
var MAX_IMAGE_SIZE   = config.limits.max_image_size

// file transfers/uploads
var MAX_UPLOAD_SIZE  = config.limits.max_upload_size

// this many milliseconds to look to see if new data has arrived....
var PID_POLLING_TIME = config.misc.pid_polling_time

// users must run quickstart if they haven't already
var redirect_to_quickstart = true
if (fs.existsSync(puck_secretz)) {
    redirect_to_quickstart = false
}

// owner user array
var puck_owners = []

//
// URLs that anyone can contact
//
// puck    have think this over... can only get puck data if ID == server's id
/* stuff like -
   'login',
   'favicon.ico',
   'login.html',
   'loginFailure',
   'quikstart.html',// no logins have been created yet, so... ;)
   'quik',          // post
   'qs',            // post
   'js',            // hmm....
   'css'            //
*/
public_routes = config.public_routes

///--- Redis
var redis = require("redis"),
rclient   = redis.createClient();    

rclient.on("error", function (err) {
    console.log("Redis client error: " + err);
    process.exit(3)
});

//
// file reads to string nodey stuff
//
var StringDecoder = require('string_decoder').StringDecoder;
var decoder       = new StringDecoder('utf8');

// global PUCK ID for this server's PUCK
try {
    puck_id = fs.readFileSync(puck_keystore + '/PUCK/puck.pid')
    puck_id = decoder.write(puck_id);
    puck_id = puck_id.replace(/\n/, '');
} 
catch (e) {
    console.log("no PUCK ID for this potential PUCK... you won't get anywhere w/o it....\n")
    console.log(e)
    process.exit(2)
}
    
// suck up our own puck
    
rclient.get(puck_id, function (err, reply) {
    console.log('bwana!')
    console.log(puck_id)

    if (!err) {
        // console.log(reply)
        if (reply == null) {
            console.log('unable to retrieve our puck; id: %s', puck_id)
            sys.exit({'error': 'no PUCK Found'})
        }
        else {
            bwana_puck = JSON.parse(reply)
            console.log('puckaroo')
            // console.log(bwana_puck)
        }
    }
    else {
        console.log(err, 'getPuck: unable to retrieve %s', req.puck);
        sys.exit({ "no": "puck"})
    }
})

//
// get the latest status... create the file if it doesn't exist...
//

// yes, yes, lazy too

// status and other bits
var server_magic    = {"vpn_status":"down","start":"n/a","start_s":"n/a","duration":"unknown","stop":"unknown","stop_s":"unknown", "client": "unknown", "client_pid":"unknown"},
    client_magic    = {"vpn_status":"down","start":"n/a","start_s":"n/a","duration":"unknown","stop":"unknown","stop_s":"unknown"}, 
    file_magic      = { "file_name" : "", "file_size" : "", "file_from" : ""},
    puck_events     = {"new_puck":""},
    browser_magic   = {}
    old_puck_status = {},
    puck_status     = {};

    puck_status.events         = puck_events
    puck_status.openvpn_server = server_magic
    puck_status.openvpn_client = client_magic
    puck_status.file_events    = file_magic
    puck_status.browser_events = browser_magic


var server           = "",
    puck2ip          = {},      // puck ID to IP mapping
    ip2puck          = {},      // IP mapping to puck ID
    bwana_puck       = {},
    puck_status_file = puck_home   + '/status.puck',
    puck_remote_vpn  = puck_public + '/openvpn_server.ip';

// proxy up?
var puck_proxy_up  = false,
    proxy_server   = "",
    proxy          = "";

var all_client_ips = [],
    client_ip      = "";

// keep an eye on the above
pollStatus(puck_status_file)

// start with a clean slate
change_status()


//
// only exist after user has run startup
//
function get_puck_vital_bits () {

    //
    // THE VERY FIRST THING YOU SEE... might be the quick install.
    //
    // if we don't see d3ck owner data, push the user to the install page
    //
    if (fs.existsSync(puck_secretz)) {
        console.log('\n\n\nSECRETZ!!!!\n\n\nfound secret file... does it check out?\n\n\n')
        secretz = JSON.parse(fs.readFileSync(puck_secretz).toString())
        console.log(JSON.stringify(secretz))
        console.log('\n\n\n')
    
        // should be a single user, but keep this code in case we support more in future
        secretz.id = 0
        puck_owners[0] = secretz
    }
    

}
    
//
// pick up cat facts!
//

var cat_facts = []

// json scrobbled from bits at from - https://user.xmission.com/~emailbox/trivia.htm
console.log('hoovering up cat facts... look out, tabby!')

fs.readFile(puck_home + "/catfacts.json", function (err, data) {
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
// watch vpn logs for incoming/outgoing connections
//
// xxxx - should have a rest call for this...?
watch_logs("server_vpn", "OpenVPN Server")
watch_logs("client_vpn", "OpenVPN Client")

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

wait_for_puck = null


//
// suck in our PUCK's data
//
// if it doesn't exist yet, spin and wait until it does... can't go anywhere without this
//
var deferred = Q.defer();

var sleepy_time = 5

var init = false

// xxx null for now
while (init) {

    console.log('suckit, puck!')

    var url = 'https://localhost:' + puck_port_int + '/puck/' + puck_id

    console.log('requesting puck from: ' + url)

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // success
            console.log('finally got server response...')
            // console.log(body)

            if (body.indexOf("was not found") != -1) {
                console.log('no woman no puck: ' + body)
                // trytryagain(options, callback);
            }
            else {
                console.log('puckarrific!')
                // console.log(body)
                bwana_puck = JSON.parse(body)
                createEvent('internal server', {event_type: "create", puck_id: bwana_puck.PUCK_ID})
                init = true
            }
        }
        else {
            // error
            console.log('Error: ', error);
        }
    })

    sleep.sleep(sleepy_time)

}

//
// auth/passport stuff
//
function findById(id, fn) {
    if (puck_owners[id]) {
        // console.log('found....')
        // console.log(puck_owners)
        // console.log(puck_owners[0])
        fn(null, puck_owners[id]);
    } else {
        // console.log('User ' + id + ' does not exist');
        // console.log(puck_owners)
        // console.log(puck_owners[0])
        return fn(null, null);
    }
}

function findByUsername(name, fn) {
  for (var i = 0, len = puck_owners.length; i < len; i++) {
    var user = puck_owners[i];
    if (user.name === name) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

// authenticated or no?
function auth(req, res, next) {

    var url_bits = req.path.split('/')
    if (__.contains(public_routes, url_bits[1])) {
        if (redirect_to_quickstart && url_bits[1] == "login.html") {
            console.log('almost let you go to login.html, but nothing to login to')
        }
        else {
            console.log('public: ' + req.path)
            return next();
        }
    }

    // I don't care if you are auth'd or not, you don't get much but quickstart until
    // you've set up your d3ck....
    if (redirect_to_quickstart) {
        res.redirect(302, '/quikstart.html')
        return
        // return next({ redirecting: 'quikstart.html'});
    }

    if (req.isAuthenticated()) { 
        console.log('already chex')
        return next(); 
    }

    console.log('authentication check for... ' + req.path)

    if (req.body.ip_addr == '127.0.0.1') {
        console.log('pass... localhost')
        return next();
    }

    console.log('bad luck, off to dancing school')
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

    console.log('hashing ' + password)

    var hash = bcrypt.hashSync(password, N_ROUNDS, function(err, _hash) { 
        if (err) {
            console.log("hash error: " + err)
            return("")
        }
        else {
            console.log('hashing ' + password + ' => ' + _hash); 
            return(_hash)
        }
    })

    return(hash)
}

// Use the LocalStrategy within Passport.
passport.use(new l_Strategy(

    function(name, password, done) {
        // var _hash = hashit(password, N_ROUNDS)

        console.log('checking password ' + password + ' for user ' + name)

        process.nextTick(function () {
            findByUsername(name, function(err, user) {
                if (err)   { console.log("erzz in pass: " + err);  return done(err); }
                if (!user) { console.log("unknown user: " + name); return done(null, false, { message: 'Unknown user ' + name }); }

                // if (_hash == puck_owners[0].hash) {
                bcrypt.compare(password, puck_owners[0].hash, function(err, res) {
                    if (err) {
                        console.log('password failzor')
                        return done(null, false)
                    }
                    else {
                        console.log('password matches, successsssss....!')
                        return done(null, user)
                    }
                });
                // if (_hash == puck_owners[0].hash) {
                //     return done(null, false, { message: 'Invalid password' });
                // }
            })
        })
    }

))



//
// send a message out that things are different
//
function change_status() {

    console.log('changing status...')

    // in with the old, out with the new... er, reverse that
    puck_status                = {}
    puck_status.openvpn_server = server_magic
    puck_status.openvpn_client = client_magic

    puck_status.events         = puck_events
    puck_status.file_events    = file_magic
    puck_status.browser_events = browser_magic

    //  "browser":{"xxx-ip-xxx": { "notify-ring":false, "notify-file":false}

    console.log("status: " + puck_status)

    var msg = {type: "status", status: puck_status}
    cat_power(msg)

    // xxx - errs to user!
    _writeObj2File(puck_status_file, puck_status)

    console.log('end status')

    // reset/clear
    file_magic                 = { "file_name" : "", "file_size" : "", "file_from" : ""}
    puck_events                = {"new_puck":""}
    browser_magic[client_ip]   = { "notify_add":false, "notify_ring":false, "notify_file":false}
    puck_status.events         = puck_events
    puck_status.file_events    = file_magic
    puck_status.browser_events = browser_magic

}

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
_write2File(puck_remote_vpn, cat_fact_server)

// console.log(my_ips)

//
// log file watcher
//
function watch_logs(logfile, log_type) {

    logfile = puck_logs + "/" + logfile + ".log"

    // create if doesn't exist...?
    if (!fs.existsSync(logfile)) {
        console.log('creating ' + logfile)
        _write2File(logfile, "")
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
                    client_pid : ip2puck[client_remote_ip],
                    server_ip  : cat_fact_server,
                    duration   : "n/a",             // this should only hit once per connection
                    stop       : "n/a",
                    stop_s     : "n/a"
                    }

                createEvent('internal server', {event_type: "vpn_server_connected", call_from: client_remote_ip, puck_id: bwana_puck.PUCK_ID})

                change_status() // make sure everyone hears the news
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
                    client_pid : "",
                    server_ip  : "",
                    duration   : v_duration,
                    stop       : moment_in_time,
                    stop_s     : moment_in_time
                    }

                createEvent('internal server', {event_type: "vpn_server_disconnected", puck_id: bwana_puck.PUCK_ID})
                change_status() // make sure everyone hears the news
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
                forward_port_and_flush(puck_port_forward, cat_fact_server, puck_port_signal, puck_proto_signal)

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

                createEvent('internal server', {event_type: "vpn_client_connected", call_to: server_remote_ip, puck_id: bwana_puck.PUCK_ID})
                change_status() // make sure everyone hears the news

            }
            // down
            else if (line.indexOf(magic_client_down) > -1) {
                console.log('\n\n\n++++++++++++' + logfile + ' \n\n Openvpn client Down!\n\n')
                console.log(line)
                console.log('\n\n')

                var v_duration = 0

                // clear the decks and put back the original port forwarding stuff
                forward_port_and_flush(puck_port_forward, my_devs["tun0"], puck_port_signal, puck_proto_signal)

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

                // reset to local
                cat_fact_server = my_devs["tun0"]

                // write the IP addr to a file
                _write2File(puck_remote_vpn, cat_fact_server)

                change_status() // make sure everyone hears the news

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

    // client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
    client_ip = req.ip

    // console.log("C-ip: " + client_ip)

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
// send a note to a sockio channel ... channel broadcast == broadcast
//
function cat_power(msg) {

    // console.log('channel ' + channel + ' => ' + JSON.stringify(msg))

    try {
        cat_sock.write(JSON.stringify(msg))
        console.log('catpower writez!  ' + JSON.stringify(msg))
    }
    catch (e) {
        // need a browser...
        // console.log('channel not up yet....? ' + e)
    }

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
// watch the status file for changes
//
function pollStatus(file) {

    console.log('here to statusfy you...')

    // read or create it initially
    if (puck_status == {}) {
        if (!fs.existsSync(puck_status_file)) {
            console.log('creating ' + puck_status_file)
            _writeObj2File(puck_status_file, puck_status)
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

//  fs.watchFile(puck_status_file, function (curr, prev) {
//      console.log('changezor')
        // simple conf file...
//      fs.readFile(puck_status_file, function (err, data) {
//          if (err) {
//              console.log('errz - ' + err)
//          }
//          else {
//              console.log(data.toString())
//              puck_status = JSON.parse(data.toString())
//          }
//       })
//  })

    console.log('trigger set')

}

//
// hand out the latest news
//
function puckStatus(req, res, next) {

    // console.log('puck status check... ' + JSON.stringify(puck_status))

    if (typeof ios == "object") { 
        // console.log('boosting status on iOS ' + JSON.stringify(puck_status))
        var msg = {type: "status", status: puck_status}
        cat_power(msg)
    }
    else { console.log('iOS not ready') }

    res.send(200, JSON.stringify(puck_status))

}

//
// as marvin said, what's going on?
//
function postStatus (req, res, next) {

    console.log ("got browser's status posted")

    console.log (req.body)

    client_ip = get_client_ip(req)

    console.log('posting from : ' + client_ip)

    puck_events   = req.body.events
    file_magic    = req.body.file_events
    browser_magic = req.body.browser_events
    server_magic  = req.body.openvpn_server
    client_magic  = req.body.openvpn_client

    if (! __.isEqual(old_puck_status, puck_status)) {
        change_status()
        old_puck_status = puck_status
    }

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


//
// write the crypto key stuff to the FS
//
function create_puck_key_store(puck) {

    console.log('PUUUUUUCKKKKKK!')
    // console.log(puck)

    if (typeof puck != 'object') {
        puck = JSON.parse(puck)
    }

    var ca   = puck.vpn_client.ca.join('\n')
    var key  = puck.vpn_client.key.join('\n')
    var cert = puck.vpn_client.cert.join('\n')
    var tls  = puck.vpn.tlsauth.join('\n')

    var puck_dir = puck_keystore + '/' + puck.PUCK_ID

    // has to exist before the below will work...
    mkdirp.sync(puck_dir, function () {
        if(err) {
            // xxx - user error, bail
            console.log(err);
        }
    })

    // xxx - errs to user!
    _write2File(puck_dir + '/puck.pid', bwana_puck.PUCK_ID)
    _write2File(puck_dir + '/puckroot.crt', ca)
    _write2File(puck_dir + '/puck.key', key)
    _write2File(puck_dir + '/puck.crt', cert)
    _write2File(puck_dir + '/ta.key', tls)

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

    client_ip  = get_client_ip(req)
    all_client_ips = req.body.value.all_ips

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

            //
            // if it's from a remote system, wake up local UI and tell user
            //
            
            // garrr... openvpn breaks this too... 
            puck_events = { new_puck : client_ip }

            create_puck_key_store(puck.value)

            create_puck_image(puck.value)

            // if (typeof my_net[client_ip] == "undefined") {
            //     console.log('create appears to be coming from remote: ' + client_ip)
            //     puck_events = { new_puck : client_ip }
            //     create_puck_key_store(puck.value)
            // }
            // else {
            //     puck_events = { new_puck : "" }
            //     console.log('create appears to be coming from local PUCK/host: ' + client_ip)
            // }

            createEvent(get_client_ip(req), {event_type: "create", puck_id: req.body.value.PUCK_ID})

            res.send(204);
        }
    })

}

function create_puck_image(data) {

    if (typeof data != 'object') {
        data = JSON.parse(data)
    }

    var image = b64_decode(data.image_b64)

    console.log('trying to decode: ' + data.image)

    if (image == "") {
        console.log("Couldn't decode " + data.image)
        return
    }

    msg = ""

    if (image.size > MAX_IMAGE_SIZE) {
        msg += 'maximum file size is ' + MAX_IMAGE_SIZE + ', upload image size was ' + image.size
    }

    // just stick to one ending please....
    data.image.replace('jpeg$','jpg')

    var iname  = data.image
    var suffix = data.image.substr(iname.length-4, data.image.length).toLowerCase()

    // sanity check suffix
    if (suffix != '.png' && suffix != '.jpg' && suffix != '.gif') {
        msg = 'Invalid suffix (' + suffix + '), only accept: GIF, JPG, and PNG'
    }

    puck_image      = '/img/' + data.PUCK_ID + suffix
    full_puck_image = puck_public + '/img/' + data.PUCK_ID + suffix

    if (msg) {
        console.log('err in processing remote image: ' + msg)
    }
    else {
        _write2File(full_puck_image, image)
    }


}

// a few useful snippets

// the pi's storage media can take awhile to register a
// write... so I'm using sync'd writes, where I don't have
// to on other systems. At least... that's what seems to
// be happening... so that's my story and I'm sticking to it!

// assumes data is an object
function _writeObj2File(file, obj) {

    var stringy = JSON.stringify(obj)

    console.log('trying to write ' + stringy.length + ' bytes to ' + file)

    try {
        fs.writeFileSync(file, stringy)
        console.log('...success...')
    }
    catch (e) {
        console.log('err writing to ' + file + '...' + stringy)
    }

}

// non-obj version
function _write2File(file, stringy) {

    console.log('trying to write string ' + stringy.length + ' bytes to ' + file)

    try {
        fs.writeFileSync(file, stringy)
        console.log('...success...')
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

    var tcp_proxy = tcpProxy.createServer({
        target: {
            host: proxy_remote_host,
            port: proxy_remote_port
        }
    })

    tcp_proxy.listen(proxy_local_port)

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

    // console.log(req.params)

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
            res.send(404, { "no": "puck"});
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

    // & what's our IP addr?
    // looks like host: '192.168.0.250:12034',
    puck_server_ip = req.headers.host.split(':')[0]

    // console.log('pingasaurus from ' + client_ip + ' hitting us at ' + puck_server_ip)

    if (typeof bwana_puck == "undefined") {
        console.log('no echo here...')
        var response = {status: "bad"}
    }
    else {
        // console.log('echo, echo, echo....')
        var response = {status: "OK", "name": bwana_puck.name, "pid": puck_id}
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
    var cmd     = puck_bin + '/stop_vpn.sh';

    console.log('stop VPN!')

    puck_spawn(cmd, [])

    res.send(200, {"status": "vpn down"});

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
    console.log(typeof req.params.puckid)
    if (typeof req.params.puckid == "undefined") {
      var bad_dog = "No ID, no love";
      console.log(bad_dog)
      res.send(403, { "bad": "dog"});
      return
    }
    else {
        console.log("you've passed the first test...", req.params.puckid)
    }

    console.log('moving on...')

    client_ip = get_client_ip(req)

    console.log("x-for  : " + req.headers['x-forwarded-for'])
    console.log("conn-RA: " + req.connection.remoteAddress)
    console.log("sock-RA: " + req.socket.remoteAddress)
    console.log("conn-sock-RA: " + req.connection.socket.remoteAddress)

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

    var uploadz = puck_public + "/uploads"

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

    client_ip = get_client_ip(req)

    console.log('from : ' + client_ip)

    for (var i=0; i<req.files.uppity.length; i++) {

        var target_size = req.files.uppity[i].size
        var target_file = req.files.uppity[i].name
        var target_path = puck_public + "/uploads/" + target_file
        var tmpfile     = req.files.uppity[i].path

        // skip if too big
        if (target_size > MAX_UPLOAD_SIZE) {
            // XXX-errz to user
            console.log('upload size (' + target_size + ') exceeds limit: ' + target_size)
            continue
        }


        console.log('trying ' + tmpfile + ' -> ' + target_path)

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

                            // get rid of evidence
                            fs.unlink(target_path, function (err) {
                                if (err) console.log("couldn't delete uploaded file? " + target_path + " ... " + JSON.stringify(err))
                                console.log('successfully deleted ' + target_path)
                            });


                            res.send(204, {"status" : target_file})
                        }
                    })
                }
            }
        })
    }

}

//
// execute a command in the background, log stuff
//
function puck_spawn(command, argz) {

    cmd = command.split('/')[command.split('/').length -1]

    console.log('a spawn o puck emerges... ' + ' (' + cmd + ')\n\n\t' + command + ' ' + argz.join(' ') + '\n')

    var spawn   = require('child_process').spawn

    try {
        out = fs.openSync(puck_logs + '/' + cmd + '.out.log', 'a+')
        err = fs.openSync(puck_logs + '/' + cmd + '.err.log', 'a+')
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

 /**
 * Start the local OpenVPN client via an external bash script
 */
function startVPN(req, res, next) {

    console.log('start vpn2')
    console.log(req.body)

    var home  = "/puck.html"

    var ip_addr = req.body.ip_addr

    // bail if we don't get ID
    if (typeof req.body.puckid === 'undefined' || req.body.puckid == "") {
        console.log("error... requires a PUCK ID!");
        res.redirect(302, home)
    }

    console.log('onto the execution...')

    puckid = req.body.puckid
    ipaddr = req.body.ipaddr

    console.log(puckid, ipaddr)

    // this means you're trying to do it despite ping not working
    if (typeof puck2ip[puckid] == 'undefined') {
        console.log("hmmm... trying to VPN when ping couldn't reach it... good luck!")
        args = [puckid, ipaddr]
    }

    else {
        console.log("using pinged IP addr to VPN: " + puck2ip[puckid])
        args = [puckid, puck2ip[puckid]]
    }

    var cmd   = puck_bin + '/start_vpn.sh'

    // fire up vpn
    puck_spawn(cmd, args)

    createEvent(get_client_ip(req), {event_type: "vpn_start", remote_ip: puck2ip[puckid], remote_puck_id: puckid})

    // write the IP addr to a file
    fs.writeFile(puck_remote_vpn, puck2ip[puckid], function(err) {
        if (err) { console.log('err... no status... looks bad.... gasp... choke...' + err) }
        else { console.log('wrote remote vpn server IP') }
    });

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
//    computer-1 <-> browser-1 <-> PUCK-1 <-- .... network .... --> PUCK-2 <-> browser-2 <-> computer-2
//
// computer1  & 2 may well not have connectivty to the other, but the js executing
// in the browser comes from them... but they can always talk to their own PUCK.
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
    var cmd = puck_bin + '/forward_port_n_flush.sh'

    var args  = [direction, puck_server_ip, local_port, remote_ip, remote_port, proto]

    puck_spawn(cmd, args)

    createEvent(get_client_ip(req), {event_type: "vpn_stop", remote_ip: puck2ip[puckid], remote_puck_id: puckid})

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

    console.log('flushing iptables+routes, adding... ', local_port, remote_ip, remote_port, proto)

    // flush the past away and then add iptables rules
    var cmd  = puck_bin + '/forward_port_n_flush.sh'
    var args = ["up", puck_server_ip, local_port, remote_ip, remote_port, proto]

    puck_spawn(cmd, args)

    createEvent("internal server", {event_type: "flush forwarding", puck_id: bwana_puck.PUCK_ID})

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


function back_to_home (res) {
    console.log('on my way home')
    var home = "/puck.html"
    res.redirect(302, home)
}

//
// create and delete form handlers
//

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

    //
    // execute a shell script with appropriate args to create a puck.
    // ... of course... maybe should be done in node/js anyway...
    // have to ponder some imponderables....
    //
    // this simply takes the pwd and finds the exe area... really 
    // want to use a reasonable puck home here!
    puck_spawn(puck_bin + '/delete_puck.sh', [puckid])


}


function sping_get(url, all_ips, puckid, n) {

    var request = https.get(url, function(resp) {
        console.log('trying.... ' + url)
        resp.setEncoding('utf8');
        resp.on("data", function(d) {

            console.log('data!')
            // console.log(d)

            d = JSON.parse(d)

            if (d.pid != puckid) {
                    console.log("ID mismatch - the ping you pucked doesn't match the puck-id you gave")
                    console.log(d.pid + ' != ' + puckid)
                    response = {status: "mismatch", "name": 'mismatched PID'}
                    // xxx - need to squawk, but return isnt the way... sock.io?
                    // res.send(420, response) // enhance your calm!
            }
            else {
                    ping_done = true
                    console.log('sping worked - ' + all_ips[n])
                    puck2ip[puckid] = all_ips[n]
                    ip2puck[all_ips[n]] = puckid
                    return(d)
            }

        })

        if (n == all_ips.length && !ping_done) {
            console.log('no response, ping failure!')
            response = {status: "ping failure", "name": 'unknown problem'}
            res.send(408, response)
        }

    })
    .on('error', function(e) {
        console.log("Got error: " + e.message);
        if (responses == all_ips.length) {
            console.log('no response, ping failure!')
            response = {status: "ping failure", "name": 'unknown problem'}
            res.send(408, response)
        }
    })



}

//
// https ping a remote puck... it can have multiple
// IP addrs, so ping them all at once and take the
// first answer that matches their IP/PID
//

var ping_done = false

function httpsPing(puckid, ipaddr, res, next) {

    // console.log("++++pinging... " + puckid + ' / ' + ipaddr)

    ping_done = false

    var all_ips   = ipaddr.split(','),
        done      = false,
        responses = 0;

    var err = {}

//  cache results, do that first
//  if (defined puck2ip[ip]) 

    all_ips.forEach(function(ip, i) {

        // skip loopback
        if (ip == "127.0.0.1") { 
            // console.log('skipping ' + ip); 
            responses++
            return; 
        }

        // console.log('pinging  ' + ip);

        var url = 'https://' + ip + ':' + puck_port_ext + '/ping'

        var req = https.get(url, function(response) {

            var data = ''
            response.on('data', function(chunk) {
                data += chunk
            })
            response.on('end', function() {
                // console.log('+++ someday has come for ' + ip + ' ... ping worked')
                // console.log(data)
                data = JSON.parse(data)

                if (data.pid != puckid) {
                    console.log("ID mismatch - the ping you pucked doesn't match the puck-id you gave")
                    console.log(data.pid + ' != ' + puckid)
                    response = {status: "mismatch", "name": 'mismatched PID'}
                    // res.send(420, response) // enhance your calm!
                }

                else if (typeof data != "undefined" && data.status == "OK" && !ping_done) {
                    ping_done = true
                    puck2ip[puckid] = all_ips[i]
                    ip2puck[all_ips[i]] = puckid
                    res.send(200, data)
                }
                responses++

                if ((responses+1) == all_ips.length && !ping_done) {
                    ping_done = true
                    console.log('ran out of pings for ' + ip)
                    response = {status: "no answer"}
                    res.send(408, response)
                }
            })
        })
        .on('error', function(e) {
            // console.log(e)
            // console.log(responses + ' v.s. ' + all_ips.length)
            responses++

            if (responses == all_ips.length && !ping_done) {
                console.log('+++ someday has come... in a bad way for ' + ip + ' ... ping failure')
                ping_done = true
                response = {status: "ping failure", "error": e}
                // synchronicity... II... shouting above the din of my rice crispies
                try { res.send(408, e) }
                catch (e) { console.log('sPing error ' + e) }
            }
        })

    })

}

//
// after first thing the user sees... what have they said in the form?
//
function quikStart(req, res, next) {

    var name       = "JaneDoe",
        email      = "jane@example.com",
        puck       = "PuckimusRex",
        stance     = "reasonable",
        password   = "",                  // sigh... should allow nulls, but libs don't like it... bah
        puck_image = ""


    console.log('quicky!')

    console.log(req.body)

    if (typeof req.body.user_name == "undefined") {
        console.log('user name is required')
    }
    else {
        name = req.body.user_name
    }

    if (typeof req.body.email_address == "undefined") {
        console.log('user name is required')
    }
    else {
        email = req.body.email_address
    }

    if (typeof req.body.puck_name == "undefined") {
        console.log('puck name is required')
    }
    else {
        puck = req.body.puck_name
    }

    if (typeof req.body.puck_password == "undefined") {
        console.log('password is required')
    }
    else {
        password = req.body.puck_password
    }

    if (typeof req.body.radio_free_puck == "undefined") {
        console.log('security stance is required')
    }
    else {
        stance = req.body.radio_free_puck
    }

    // grab the file from whereever it's stashed, write it
    if (req.files.puck_image.path != "" && typeof req.files.puck_image.type != "undefined") {
        msg = ""
        if (req.files.puck_image.type != 'image/png' && req.files.puck_image.type != 'image/jpeg' && req.files.puck_image.type != 'image/gif') {
            msg = 'Invalid image format (' + req.files.puck_image.type + '), only accept: GIF, JPG, and PNG'
        }

        if (req.files.puck_image.size > MAX_IMAGE_SIZE) {
            msg += 'maximum file size is ' + MAX_IMAGE_SIZE + ', upload image size was ' + req.files.puck_image.size
        }

        // just stick to one ending please....
        req.files.puck_image.name.replace('jpeg$','jpg')

        if (msg == "") {
            var iname  = req.files.puck_image.name
            var suffix = iname.substr(iname.length-4, iname.length).toLowerCase()

            puck_image      = '/img/' + puck_id + suffix
            full_puck_image = puck_public + '/img/' + puck_id + suffix

            fs.readFile(req.files.puck_image.path, function (err, data) {
                var image_b64 = b64_encode(data)

                if (err) {
                    console.log("Couldn't read " + req.files.puck_image.path)
                    return
                }

                // in case someone tries some monkey biz...
                if (suffix != '.png' && suffix != '.gif' && suffix != '.jpg') {
                    console.log('err: filename suffix borked: ' + suffix)
                }
                else {
                    console.log('trying to write... ' + puck_image)
                    // weirdness... writefile returns nada
                    try {
                        fs.writeFileSync(full_puck_image, data, 'utf8')
                        console.log('updating puck json')

                        bwana_puck.image     = puck_image
                        bwana_puck.image_b64 = image_b64

                        console.log(JSON.stringify(bwana_puck))

                        rclient.set(puck_id, JSON.stringify(bwana_puck), function(err) {
                            if (err) {
                                console.log(err, 'd3ck: unable to update Redis db');
                                console.log(err)
                            } else {
                                console.log('puck updated')
                            }
                        })
                    }
                    catch (err) {
                        console.log('error writing image file "' + full_puck_image + '": ' + JSON.stringify(err))
                    }
                }
            })
        }
        else {
            console.log('error uploading: ' + msg)
        }
    }

    console.log("PUCK image... " + puck_image)

    secretz          = {}
    secretz.id       = 0
    secretz.name     = name
    secretz.email    = email
    secretz.puck     = puck
    secretz.stance   = stance
    secretz.image    = puck_image

    secretz.hash     = hashit(password, N_ROUNDS)

    console.log(name, email, puck, stance, password, secretz.hash, puck_image)

    console.log('SZ: ' + JSON.stringify(secretz))
    console.log(secretz.hash)

    _writeObj2File(puck_secretz, secretz)

    // no longer go here
    redirect_to_quickstart = false

    res.redirect(302, '/')

}

//
// take the data pushed to us from the command line and create something... beautiful!
// a virtual butterfly, no less
//
function formCreate(req, res, next) {

    console.log("creating puck...")
    console.log(req.body)

    var ip_addr = req.body.ip_addr

    var url = 'https://' + ip_addr + ':' + puck_port_ext + '/ping'

    console.log('ping get_https ' + url)

    // is it a puck?
    var req = https.get(url, function(response) {
        var data = ''
        response.on('data', function(chunk) {
            data += chunk
        })
        response.on('end', function() {
            console.log(url + ' nabbed => ' + data)
            console.log('... trying... hard')
            console.log(data)

            if (data.indexOf("was not found") != -1) {
                console.log('no woman no ping: ' + data)
            }

            else {
                console.log('ping sez yes')
                // console.log(data)

                console.log('starting... writing...')
                // make the puck's dir... should not exist!

                data = JSON.parse(data)
                // now get remote information
                url = 'https://' + ip_addr + ':' + puck_port_ext + '/puck/' + data.pid

                var puck_dir = config.PUCK.keystore + '/' + data.pid

                mkdirp.sync(puck_dir, function () {
                    if(err) {
                        // xxx - user error, bail
                        console.log(err);
                    }
                })

                // if ping is successful, rustle up and write appropriate data
                var req = https.get(url, function(response) {
                    var data = ''
                    response.on('data', function(chunk) {
                        data += chunk
                    })
                    response.on('end', function() {

                        data = JSON.parse(data)
                        console.log('remote puck info in...!')

                        // if the IP we get the add from isn't in the ips the other puck
                        // says it has... add it in; they may be coming from a NAT or
                        // something weird
                        console.log('looking 2 see if your current ip is in your pool')

                        // if you're coming from a NAT or someplace weird...
                        var found = false
                        for (var i = 0; i < data.all_ips.length; i++) {
                            if (data.all_ips[i] == ip_addr) {
                                console.log('remote ip found in puck data')
                                found = true
                                break
                            }
                        }
                        if (! found) {
                            console.log("You're coming from an IP that isn't in your stated IPs... adding it to your IP pool just in case")
                            data.all_ips[all_client_ips.length] = ip_addr
                        }

                        // console.log(data);

                        create_puck_key_store(data)

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
                        console.log("executing create_puck.sh")

                        // this simply takes the pwd and finds the exe area...
                        var cmd  = puck_bin + '/create_puck.sh'
                        var argz = [data.PUCK_ID, data.image, data.ip_addr, "\"all_ips\": [\"" + data.all_ips + "\"]", data.owner.name, data.owner.email]
                        puck_spawn(cmd, argz)

                        // now write the image data for the d3ck in question
                        _write2File(puck_public + data.image         , b64_decode(data.image_b64))
                        _write2File(puck_public + data.image + ".b64", data.image_b64)

                        console.log(bwana_puck)
                        console.log(typeof bwana_puck)

                        if (puck_id != data.PUCK_ID && !isEmpty(bwana_puck)) {
                            console.log("posting our puck data to the puck we just added....")
                            argz = [puck_id, bwana_puck.image, bwana_puck.ip_addr, "\"all_ips\": [" + my_ips + "]", bwana_puck.owner.name, bwana_puck.owner.email, ip_addr]

                            puck_spawn(cmd, argz)
                        }
                        createEvent(ip_addr, {event_type: "create", puck_id: data.PUCK_ID})
                    })
                    req.on('error', function(e) {
                        console.log('create Error... no puck data back? ', e.message)
                    })
                })
            }
        })
        req.on('error', function(e) {
            console.log("Got error: " + e.message)
            console.log('errz snatchin ' + url + ' ... ' + e.message)
            return(e)
        })
    })
    req.on('error', function(e) {
        console.log('errz snatchin ' + url + ' ... ' + e.message)
        return(e)
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
    // this works if using auto-restart on touch...
    // var command = 'touch /etc/puck/main.js';

    var cmd  = "/etc/init.d/puck"
    var args = ["restart"]

    puck_spawn(cmd, args)

}

//
// setup signal socket server - almost all from https://github.com/muaz-khan/WebRTC-Experiment
//
// In production/whatever, BLOCK THE PORT FROM THE WORLD
// if it's even running - ONLY expose it to the VPN or local
//
function SSSUp () {

    console.log('Socket Signal Server!')

    var file = new _static.Server('./public');

    var CHANNELS = {};

    var WebSocketServer = require('websocket').server;

    var wss_pucky = https.createServer(credentials, function (request, response) {
        request.addListener('end', function () {
            file.serve(request, response);
        }).resume();
        console.log('[+] wss/https server listening at %s', puck_port_signal)
    }).listen(puck_port_signal);

    new WebSocketServer({
        httpServer: wss_pucky,
        autoAcceptConnections: false
    }).on('request', onRequest);


// from signaler.js in WebRTC-Experiment/MultiRTC
function onRequest(socket) {
    var origin = socket.origin + socket.resource;

    var websocket = socket.accept(null, origin);

    websocket.on('message', function (message) {
        if (message.type === 'utf8') {
            onMessage(JSON.parse(message.utf8Data), websocket);
        }
    });

    websocket.on('close', function () {
        truncateChannels(websocket);
    });
}

function onMessage(message, websocket) {
    if (message.checkPresence)
        checkPresence(message, websocket);
    else if (message.open)
        onOpen(message, websocket);
    else
        sendMessage(message, websocket);
}

function onOpen(message, websocket) {
    var channel = CHANNELS[message.channel];

    if (channel)
        CHANNELS[message.channel][channel.length] = websocket;
    else
        CHANNELS[message.channel] = [websocket];
}

function sendMessage(message, websocket) {
    message.data = JSON.stringify(message.data);
    var channel = CHANNELS[message.channel];
    if (!channel) {
        console.error('no such channel exists');
        return;
    }

    for (var i = 0; i < channel.length; i++) {
        if (channel[i] && channel[i] != websocket) {
            try {
                channel[i].sendUTF(message.data);
            } catch (e) {}
        }
    }
}

function checkPresence(message, websocket) {
    websocket.sendUTF(JSON.stringify({
        isChannelPresent: !! CHANNELS[message.channel]
    }));
}

function swapArray(arr) {
    var swapped = [],
        length = arr.length;
    for (var i = 0; i < length; i++) {
        if (arr[i])
            swapped[swapped.length] = arr[i];
    }
    return swapped;
}

function truncateChannels(websocket) {
    for (var channel in CHANNELS) {
        var _channel = CHANNELS[channel];
        for (var i = 0; i < _channel.length; i++) {
            if (_channel[i] == websocket)
                delete _channel[i];
        }
        CHANNELS[channel] = swapArray(_channel);
        if (CHANNELS && CHANNELS[channel] && !CHANNELS[channel].length)
            delete CHANNELS[channel];
    }
}




}

///--- Server

// Cert stuff
var key  = fs.readFileSync("/etc/puck/pucks/PUCK/puck.key")
var cert = fs.readFileSync("/etc/puck/pucks/PUCK/puck.crt")
var ca   = fs.readFileSync("/etc/puck/pucks/PUCK/ca.crt")

var credentials = {key: key, cert: cert, ca: ca}
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

// passport/auth stuff
server.use(express.cookieParser());
server.use(express.session({ secret: 'kittykittykittycat' }));
server.use(flash());
server.use(passport.initialize());
server.use(passport.session());
server.use(server.router);

// passport auth
server.use(auth)

//
// actual routes n stuff
//

// always serve up the install page
// server.use(express.static(puck_public + '/qs'))

// initial starting form - no auth
server.post('/quik', quikStart)

server.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

server.get('/loginFailure', function(req, res, next) {
  res.send('Failed to authenticate');
});

// before this really don't answer to much other than the user startup
console.log('adding routes')
fire_up_server_routes()


//
// wait until user has run startup
//
async.whilst(
    function () { 
        if (fs.existsSync(puck_secretz)) {
            console.log('ready to rock-n-roll')
            // means the startup has run and the PUCK has an ID, which must be done before anything else

            console.log('get user data')
            get_puck_vital_bits()

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

function fire_up_server_routes() {

    // Ping action - no auth
    server.get('/ping', echoReply)

    // get or list pucks
    server.post('/puck', auth, createPuck)
    server.get('/puck', auth, listPucks)

    // Return a Puck by key
    server.get('/puck/:key', auth, getPuck);

    // Delete a Puck by key
    server.del('/puck/:key', auth, deletePuck);

    // Destroy everything
    server.del('/puck', auth, deleteAll, function respond(req, res, next) {
        res.send(204);
    });


    server.post('/form', auth, handleForm);

    // get your ip addr(s)
    server.get('/getip', auth, getIP);

    // knock knock proto to request access to a system that doesn't trust you
    server.post('/knock', auth, knockKnock);

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
    // PUCK filestore - send up and getting down
    //
    // send stuff up the pipe....
    server.post('/up/:key', auth, uploadSchtuff)
    // get down with what's up
    server.get('/down', auth, downloadStuff)


    // get a url from wherever the puck is
    server.all('/url', auth, webProxy)

    server.post('/login',
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/loginFailure'
        })
    )

    // Ping another
    server.get('/ping/:key', auth, echoStatus)
    
    // cuz ajax doesn't like to https other sites...
    server.get('/sping/:key1/:key2', auth, function (req, res, next) {
        // console.log('spinging')
        httpsPing(req.params.key1, req.params.key2, res, next)
    })
    
    // send me anything... I'll give you a chicken.  Or... status.
    server.get("/status", auth, puckStatus)
    
    //
    // send any actions done on client... like ringing a phone or whatever
    // this is to help keep state in case of moving off web page, browser
    // crashes, etc.
    //
    server.post("/status", auth, postStatus)

    // XXX - update!
    server.get('/rest', function root(req, res, next) {
        var routes = [
            'GET     /down',
            'GET     /events',
            'GET     /events/:key',
            'GET     /forward',
            'GET     /logout',
            'GET     /rest',
            'GET     /getip',
            'POST    /puck',
            'GET     /puck',
            'DELETE  /puck',
            'PUT     /puck/:key',
            'GET     /puck/:key',
            'DELETE  /puck/:key',
            'GET     /ping',
            'GET     /ping/:key',
            'GET     /server',
            'GET     /server/stop',
            'GET     /server/restart',
            'GET     /setproxy',
            'GET     /sping/:key',
            'GET     /status',
            'POST    /status',
            'GET     /up/:key',
            'GET     /url',
            'POST    /vpn/start',
            'GET     /vpn/stop'
        ];
        res.send(200, routes);
    });
    
    // if all else fails... serve up an index or public
    server.use(express.static(puck_public))

    console.log('rtz')
    console.log(server.routes)
}
 
//
// after all that, start firing up the engines
//

//
// promise her anything... buy her a chicken.  A json chicken, of course.
//
var pucky = https.createServer(credentials, server)

// socket signal server
SSSUp()

// fire up web sockets
var sockjs = require('sockjs')
var ios = sockjs.createServer()
ios.installHandlers(pucky, {prefix: '/pux'})

//
// socket time
//
var puck_users      = {},
    cat_sock        = {},
    all_cats        = []

ios.on('connection', function (sock_puppet) {

    console.log('[+] NEW connext from ' + sock_puppet.remoteAddress)

    cat_sock = sock_puppet

    // a friendly cat fact
    var cool_cat_fact = random_cat_fact(cat_facts)

    var msg = {type: "cat_fact", fact: cool_cat_fact}

    cat_power(msg)

    sock_puppet.on('data', function(res) {
        console.log('data received ')
        console.log(res)
    })
})


//
//
// and... finally... relax and listen....
//
//

//
// promise her anything... buy her a chicken.  A json chicken, of course.
try {
    pucky.listen(puck_port_int, function() {
        console.log('[+] server listening at %s', puck_port_int)
    })
}
catch (e) {
    console.log('The PUCK server died when trying to start: ' + e)
}

