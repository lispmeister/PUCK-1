//
// helper functions for initial PUCK prototype
//
// draw pucks, delete pucks, start vpns... various things
//

var not_loaded = true

// track all puck IDs...
all_puck_ids   = []

// overall connection state
var puck_current            = {}
    puck_current.incoming   = false,
    puck_current.outgoing   = false,
    last_file               = "",
    killed_call             = false;

var puck_status     = {},
    old_puck_status = {}

var incoming_ip = "?"

var ring = ""

var browser_ip = ""

var poll = 500  // 2x a second
var poll = 1000  // once a second
var poll = 5000  // every 5 secs

var PUCK_SOCK_RETRY   = 5000

var LOCAL_VIDEO_WIDTH = 480

// helper from http://stackoverflow.com/questions/377644/jquery-ajax-error-handling-show-custom-exception-messages
function formatErrorMessage(jqXHR, exception) {

    if (jqXHR.status === 0) {
        return ('Please verify your network connection.');
    } else if (jqXHR.status == 404) {
        return ('The requested page not found. [404]');
    } else if (jqXHR.status == 500) {
        return ('Internal Server Error [500].');
    } else if (exception === 'parsererror') {
        return ('Requested JSON parse failed.');
    } else if (exception === 'timeout') {
        return ('Time out error.');
    } else if (exception === 'abort') {
        return ('Ajax request aborted.');
    } else {
        return ('Uncaught Error.\n' + jqXHR.responseText);
    }
}

// ping myself
function who_am_i() {
    $.get('/ping', function(puck) {
        console.log('my name/id/status are: ', puck.name, puck.pid, puck.status)
        puck_status = 'Name: ' + puck.name + '<br />Status: ' + puck.status + '<br />ID: ' + puck.pid
        // get my own data
        $.getJSON('/puck/' + puck.pid, function(puckinfo) {
            console.log('my PUCK:')
            my_puck = puckinfo
            console.log(my_puck)
        })
    })
}

//
// some funs to grab the event data
//
function list_events() {

    console.log('listing events')

    var url = "/events"

    var jqXHR_list = $.ajax({
        url: url,
        dataType: 'json'
    })

    jqXHR_list.done(function (data, textStatus, jqXHR) {
        console.log('jxq list events wootz')
        console.log(data)

        var cat_herd = []

        for (var i = 0; i < data.length; i++) {
            var cat = data[i]

            // do the in/out calls first
            if (cat == 'vpn_client_connected' || cat == 'vpn_server_connected') {
                populate_events(cat)
            }
            else {
                cat_herd[i] = cat
            }

        }

        // iterate over alphabetized list and suck in the data
        _.each(_.sortBy(cat_herd, function (catty) {return catty}), populate_events)

        //  populate_events(cat)

    }).fail(function(err) {
        console.log('events errz on hangup' + err)
    })

}

//
// put the category data where it belongs
//
function populate_events(cat) {

    console.log('sucking in table data for ' + cat)

    var url       = "/events/" + encodeURIComponent(cat)

    if      (cat == 'vpn_client_connected') _cat = 'Calls made'
    else if (cat == 'vpn_server_connected') _cat = 'Calls'
    else                                    _cat = cat

    var cat_e     = cat + "_table_events"

    var base_table = '<div class="row-fluid marketing">'                                                            +
                     '<div class="spacer20"> </div>'                                                                +
                     '<div><h4 class="text-primary">'    + _cat + '</h4></div>'                                     +
                     '<table class="table table-condensed table-hover table-striped" id="' + cat_e + '"></table>'   +
                     '<ul id="' + cat + '_pager"></ul>'                                                             +
                     '</div>'                                                                                       +
                     '</div>'

    var n = 0

    var t_headers = ""
    var t_rows    = ""

    $.getJSON(url, function(data) {
        console.log('chopping up event data for ' + cat)
        $.each(data, function(index) {
            t_headers = ""
            var obj   = data[index]

            t_rows    = t_rows + '<tr>'
            n++
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)){
                    t_headers = t_headers + '<td><strong>' + prop + '</strong></td>'
                    t_rows    = t_rows + '<td>' + obj[prop] + '</td>'
                }
            }
            t_rows = t_rows + '</tr>\n'
        })
        t_rows = "<tr>" + t_headers + "</tr>" + t_rows

        // finally paint everything on
        $('#event_messages').append(base_table)
        $('#' + cat_e).append(t_rows)

        // $('#' + cat_e + ' > tbody > tr:first').before('<tr><td></td>' + t_headers + '</tr>')
    })

}

// http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit
function post(url, parameters) {
    var form = $('<form></form>');

    form.attr("method", "post");
    form.attr("action", url);

    $.each(parameters, function(key, value) {
        var field = $('<input></input>');

        field.attr("type", "hidden");
        field.attr("name", key);
        field.attr("value", value);

        form.append(field);
    });

    // The form needs to be a part of the document in
    // order for us to be able to submit it.
    $(document.body).append(form);
    form.submit();
}

function state_cam(state, location) {

    console.log('cam will be... ' + state + ' @ ' + location)

    if (location == 'local') var loc = '/'
    // use proxy to other PUCK
    else                     var loc = ':7777'

    if (state == true) {
        // candid_camera(loc)
        candide(loc)
        state_audio('unmute')
        state_video('resume')
    }
    else if (state == false) {
        // candid_camera(loc)
        candide(loc)
        state_audio('mute')
        state_video('pause')
    }
    else {
        console.log('... well... you... blew it; unknown state: ' + state)
    }

}

//
// pause/resume webrtc audio
//
function state_audio(state) {

    console.log('audio will be... ' + state)

    if (state == 'mute') {
        console.log('... muting audio...')
        // my_webrtc.pauseVideo
    }
    else if (state == 'unmute') {
        console.log('... audio on...')
        // my_webrtc.pauseVideo
    }
    else {
        console.log('... well... you... blew it; unknown state: ' + state)
    }
}

//
// pause/resume video
//
function state_video(state) {

    console.log('video will be... ' + state)

    if (state == 'pause') {
        console.log('... pausing vid...')
        // my_webrtc.pauseVideo
    }
    else if (state == 'resume') {
        console.log('... carry on...')
        // my_webrtc.pauseVideo
    }
    else {
        console.log('... well... you... blew it; unknown state: ' + state)
    }

}

//
// when vpn status/state changes... set lights flashing, whatever
//
function state_vpn(state, browser_ip) {

    if (state == "incoming") {
        // ensure video button is enabled if a call is in progress
        $('#puck_video').addClass('green').addClass('pulse')

        console.log('incoming ring from ' +  puck_status.openvpn_server.client)
        incoming_ip = puck_status.openvpn_server.client
        // ring them gongs, etc.

        if (!puck_status.browser_events[browser_ip].notify_ring) {
            event_connect("incoming", incoming_ip)
            puck_status.browser_events[browser_ip].notify_ring = true
        }

        puck_current.incoming = true
        puck_status.browser_events[browser_ip].notify_file = true
        other_puck = puck_status.openvpn_server.client
    }

    if (state == "outgoing") {
        $('#puck_video').addClass('green').addClass('pulse')
        console.log('outgoing ring!')
        state_ring('true')
        puck_status.browser_events[browser_ip].notify_ring = true

        fire_puck_status(puck_status)

        if (!puck_status.browser_events[browser_ip].notify_ring) {
            event_connect("outgoing", incoming_ip)
            puck_status.browser_events[browser_ip].notify_ring = true
        }

        other_puck = puck_status.openvpn_client.server

        puck_current.outgoing = true

        // go to vpn page
        $('body').removeClass('avgrund-active');
        $('#puck_vpn').click()
        window.location.href = "/puck.html#puck_vpn"
        // window.location.href = "vpn.html"
    }

}

// the bells... the bells... make them stop!
function state_ring(sound) {

    if (!sound) {
        try {
            ring.pause();
            ring.currentTime = 0;
            console.log('bells... no more?')
        }
        catch(e) {
            console.log("haven't played anything yet")
        }
    }
    else {
        // ring ring - play sound
        ring.play()
    }

}

//
// calls, in or out
//
function event_connect(direction, puck) {

    console.log('connexting')

    //
    // energize modals
    //
    // "Avgrund is Swedish for abyss"
    $('#' + direction).avgrund({
        height: 120,
        openOnEvent: false,
        width: 600,
        holderClass: 'custom',
        showClose: true,
        showCloseText: 'Close',
        enableStackAnimation: true,
        onBlurContainer: '.container',
        template: '<div class="row">' +
                  '<div id="puck_ring_img" class="col-md-4"></div>' +
                  '<a style="text-decoration: none" href="#puck_vpn"><div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="puck_answer" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span id="vpn_target" style="color: #fff !important;">Calling</span></button></div></a>'  +
                  '<div class="col-md-4 top-spacer50"><button data-loading-text="hanging up..." class="btn btn-warning nounderline" id="puck_disconnect" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Disconnect</span></a></button></div>' +
                  '</div>'
        })

    state_ring('true')

    // xxx - conf file, obv....
    var ring_img = '<img src="/img/ringring.gif">'

    // after things popup, add caller/callee
    if (direction == "incoming") {
        $('#vpn_target').on('change', '#vpn_target').html('Call from ' + puck)
    }
    else {
        $('#vpn_target').on('change', '#vpn_target').append(' ' + puck)
    }

    $('#puck_ring_img').on('change', '#puck_ring_img').html(ring_img)

}

//
// hang up the phone, return to home
//
function event_hang_up() {

    console.log('hanging up!')

    state_ring('false')

    // i has gone
    local_socket.emit('remove_puck', my_puck.PUCK_ID);

    var url = "/vpn/stop"

    var jqXHR_stopVPN = $.ajax({
        url: url,
        // probably shouldn't, but...
        // async:false,
        dataType: 'json',
    })

    jqXHR_stopVPN.done(function (data, textStatus, jqXHR) {
        console.log('jxq hangup wootz')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on hangup' + err)
        alert('error on hangup!')
    })

    // kill the CSS UI signs
    remove_signs_of_call()

    fire_puck_status(puck_status)

    console.log('waiting 2 secs to kill...?')

    setTimeout(function(){
        window.location.href = "/puck.html"
    }, 2000)

    $('body').removeClass('avgrund-active');

    // if (window.location.pathname.split( '/' )[1] != "puck.html") {
    //     setTimeout(window.location.href = "/puck.html", 2000)
    // }

}

//
// get the current user's IP addr, put it where the element is
//
function get_ip(element) {
    var url = "/getip"
    var jqXHR_getIP = $.ajax({
        url: url,
        dataType: 'json',
    })

    jqXHR_getIP.done(function (data, textStatus, jqXHR) {
        console.log('jxq getIP wootz')
        console.log(data)
        browser_ip = data.ip
        $('#ip_diddy').prepend("Your IP address is: " + browser_ip + " ... ");
    }).fail(function(err) {
        console.log('errz on getIP' + err)
    })

}

//
// fire up the VPN
//
function puck_vpn(element, puckid, ipaddr) {

    console.log('firing up VPN')
    console.log(puckid, ipaddr)

    $(element).text("connecting...").removeClass("btn-success").addClass("btn-danger")

    var pvpn = $.ajax({
        type: "POST",
        url: "/vpn/start",
        data: {"puckid": puckid, "ipaddr": ipaddr}
    })

    pvpn.done(function(msg) {
        console.log("posto facto")
    })
    pvpn.fail(function(xhr, textStatus, errorThrown) {
        console.log('failzor -> ' + xhr)
    })

}

// whimsey
function go_puck_or_go_home() {
    console.log('go puck or...')
    window.location.href = location.href
}

function puck_create(element, ip_addr) {

    $(element).text("creating...").removeClass("btn-success").addClass("btn-danger")

    // adapted from http://css-tricks.com/css3-progress-bars/
    console.log('barberizing -> ' + ip_addr)
    // get width, nuke width, animate to old width
    $(element).data("oldWidth", $(element).width() * 2)
        .width(0)
        .animate({ width: $(element).data("oldWidth") }, 1000);

    console.log('touch the hand of ... ')
    console.log('ip addr: ' + ip_addr)

    var post_data         = {}
    post_data.ip_addr     = ip_addr
    post_data.puck_action = "CREATE"
    post_data = JSON.stringify(post_data)

    console.log(post_data)

    $.ajax({
        type: "POST",
        url: "/form",
        headers: { 'Content-Type': 'application/json', },
        data: post_data,
        success: function(data, status) {
            console.log(data)
            console.log('suck... sess.... ')
            // yes... I suck
            setTimeout(go_puck_or_go_home, 2000)
        },
        fail: function(data, err) {
            console.log('fuck... me')
            // yes... I suck
            setTimeout(go_puck_or_go_home, 2000)
        }
    })

}

//
// well...  sort of... pingish... send ping request to PUCK server
//
// farm out https requests to remote systems since js/jquery balk at that kinda shit
//
function puck_ping(all_ips, puckid, url) {

    console.log('in puck_ping')
    console.log(puckid, url)
    console.log(all_ips)

    // var ping_url = '/sping/' + puckid + "/" + all_ip_string
    var ping_url = '/sping/' + puckid + "/" + all_ips

    console.log('pinging ' + puckid + ' ... URL ... ' + ping_url)

    var ping_id  = ''

    // if we're alive, this will get put in
    var vpn_form = 'vpn_form_' + puckid

    // element_id='puck_' + id + '_ip_addr'
    var element_id='puck_vpn_' + puckid

    $.ajax({url: ping_url, cache: false,
        success: function(data) {
            console.log('success with ' + element_id)
            console.log(data)

            // make the button clickable and green
            if (data.status == "OK") {
                console.log('success with ' + element_id)
                // console.log('ok...')
                $('#'+element_id).addClass('btn-success').removeClass('disabled')
            }
            else {
                console.log('not ok...')
                $('#'+element_id).removeClass('btn-success').addClass('disabled')
            }

        },
        error: function(error){
            console.log( "ping error for " + ping_url)
            $('#'+element_id).removeClass('btn-success').addClass('disabled')
            console.log(error)
        },
        fail: function(error) {
            console.log( "ping failure for " + ping_url)
            console.log(error)
            $('#'+element_id).removeClass('btn-success').addClass('disabled')
        }
        })

// console.log('post-pingy ' + puckid + '... putting into ' + element_id)

}

//
// until I find a good one
//
function truncate(string){
  var MAX_STRING = 20
  if (string.length > MAX_STRING)
     return string.substring(0,MAX_STRING - 3)+'...';
  else
     return string;
}


//
// xxx... don't want to harass the user by ringing all the time...
// may or may not be needed
//
function check_ring() {
    console.log("have I rang?");
}

function ajaxError( jqXHR, textStatus, errorThrown ) {
    console.log('jquery threw a hair ball on that one: ' + textStatus + ' - ' + errorThrown);
}

//
// ... snag /status
//
function get_status() {

    console.log('get STATUS')

    var url = "/status"

    var jqXHR_get_status = $.ajax({ url: url, })

    jqXHR_get_status.done(function (data, textStatus, jqXHR) {
        // console.log('status wootz\n' + data)
        puck_status = JSON.parse(data)
        console.log("INITIAL STATUS: " + JSON.stringify(puck_status))
    }).fail(ajaxError);

}


//
// ... snag all the various socket chatter
//
function socket_looping(){

    console.log('status loop')

    // local == our PUCK
    local_socket = io.connect('/', {
        'connect timeout': PUCK_TIMEOUT,
        // 'try multiple transports': true,
        'reconnect': true,
        'reconnection delay': PUCK_RECONNECT_DELAY,
        'reconnection limit': PUCK_TIMEOUT,
        'max reconnection attempts': Infinity,
        'sync disconnect on unload': false,
        'auto connect': true,
        'force new connection': true
        })

    local_socket.socket.on('connect', function(sock){
        // console.log('[+++] - general connext note')

        // everyone loves cat facts!
        cat_chat(local_socket, 'local')

//      setTimeout(function(){
//         console.log('... cam... er... a?')
//         candid_camera('/')
//          candide('/')
//      }, 10000)


    })

    local_socket.on('puck_status', function (data) {
        console.log('[@] + cat facts... wait...no... status :!:')
        console.log(JSON.stringify(data))
        console.log(typeof data)

        if (not_loaded) {
            $.getScript("/js/PeerConnection.js", function(){
                // alert("ps loaded and executed")
                not_loaded = false
            })
        }

        // puck_status = JSON.parse(data)
        puck_status = data

        // if something is new, do something!
        if (! _.isEqual(old_puck_status, puck_status)) {
            console.log('something new in the state of denmark!')
            console.log(puck_status)
            console.log('vs\n')
            console.log(old_puck_status)

            console.log(typeof puck_status)
            console.log(typeof old_puck_status)
            old_puck_status = puck_status
            status_or_die()

            // try to connect to the remote puck socket.io
            try {
                console.log('trying...')
                console.log(data.openvpn_client)
                if (data.openvpn_client.vpn_status == "up") {
                    var url = ':7777'
                    console.log('trying to connect to... ' + url)
                    // try remote connecting, and keep it up until javascript wears itself out
                    put_a_sock_in_it(url)
                    setInterval(put_a_sock_in_it, PUCK_SOCK_RETRY, url)
                    // try_try_again = setInterval('put_a_sock_in_it', PUCK_SOCK_RETRY, url)
                }
            }
            catch (e) { console.log('vpn aint ready') }

        }
        else {
            console.log('same ol, same ol')
        }
    })

    local_socket.on('error', function(err){
        console.log('local errz ' + JSON.stringify(err))
    })

    local_socket.on('reconnect', function(d) {
        console.log ('reconnect')
        fire_puck_status(puck_status)
    })

    local_socket.on('error',            function(d) { console.log ('error') ; console.log(d) })
    local_socket.on('connecting',       function(d) { console.log ('connecting') })
    local_socket.on('reconnecting',     function(d) { console.log ('reconnecting') })
    local_socket.on('connect_failed',   function(d) { console.log ('connect failed') })
    local_socket.on('reconnect_failed', function(d) { console.log ('reconnect failed') })
    local_socket.on('close',            function(d) { console.log ('close') })
    local_socket.on('disconnect',       function(d) { console.log ('disconnect') })


    // OVPN logs for client/server
    local_socket.on(ovpn_clogs, function (data) {
        // console.log('client: ' + data.line)
        $("#ovpn_client_infinity .mCSB_container").append('<div class="log_line">' + data.line + "</div>")
        $("#ovpn_client_infinity").mCustomScrollbar("update")
        $("#ovpn_client_infinity").mCustomScrollbar("scrollTo",".log_line:last",{scrollInertia:2500,scrollEasing:"easeInOutQuad"})
    })

    local_socket.on(ovpn_slogs, function (data) {
        // console.log('server: ' + data.line)
        $("#ovpn_server_infinity .mCSB_container").append('<div class="log_line">' + data.line + "</div>")
        $("#ovpn_server_infinity").mCustomScrollbar("update")
        $("#ovpn_server_infinity").mCustomScrollbar("scrollTo",".log_line:last",{scrollInertia:2500,scrollEasing:"easeInOutQuad"})
    })

}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


//
// get events, status... or... well....
//
// this processes missives from the server and potentially says something about it
//
function status_or_die() {

    console.log('sailing on the sneeze of cheeze')
    console.log(puck_status)
    console.log('I hear something... from... ' + browser_ip)

    if (typeof puck_status.browser_events == "undefined" || typeof puck_status.browser_events[browser_ip] == "undefined") {
        console.log('stuffing browser events...')
        puck_status.browser_events = {}
        puck_status.browser_events[browser_ip] = { "notify_add":false, "notify_ring":false, "notify_file":false}
    }

    // if someone has added you, create a modest sized bit of text that tells you
    // and hopefully won't fuck up anything you're doing

    console.log('a friend...?')
    if (puck_status.events.new_puck.length && ! puck_status.browser_events[browser_ip].notify_add) {
        var remote_ip = puck_status.events.new_puck
        console.log(remote_ip + ' added!')
        // a bit down from the top, and stay until wiped away or refreshed
        $.bootstrapGrowl(remote_ip + " added your PUCK as a friend (refresh page to see details)", {offset: {from: 'top', amount: 70}, delay: -1})

        puck_status.browser_events[browser_ip].notify_add = true
// <input type="button" value="Reload Page" onClick="history.go(0)">
    }

    console.log('incoming...?')

    // server... incoming ring
    if (puck_status.openvpn_server.vpn_status == "up") {
        state_vpn('incoming', browser_ip)
    }

    console.log('outgoing...?')

    // client... outgoing ring
    if (puck_status.openvpn_client.vpn_status == "up") {
        state_vpn('outgoing', browser_ip)
        // cat facts!
        state_cam(true, 'local')
    }

    // if nothing up now, kill any signs of a call, just to be sure
    if (puck_status.openvpn_client.vpn_status != "up" && puck_status.openvpn_server.vpn_status != "up") {
        other_puck = "local"
        // xxx - one for out, one for in?
        puck_status.browser_events[browser_ip].notify_ring = false
        remove_signs_of_call()
        $('body').removeClass('avgrund-active');
    }

    if (puck_status.openvpn_client.vpn_status != "up") puck_current.outgoing = false
    if (puck_status.openvpn_server.vpn_status != "up") puck_current.incoming = false

    // did santa come?
    console.log('new toyz...?')
    if (puck_status.file_events.file_name.length && ! puck_status.browser_events[browser_ip].notify_file) {
        console.log('new file(z)!')
        // put in or lookup PiD, then owner/puck's name!
        $.bootstrapGrowl("New file: <strong>" + puck_status.file_events.file_name + "</strong>  ("  + puck_status.file_events.file_size + " bytes); from " + puck_status.file_events.file_from, {offset: {from: 'top', amount: 70}, delay: -1})

        puck_status.browser_events[browser_ip].notify_file = true
    }

    fire_puck_status(puck_status)

}

//
// when disconnected, kill all the UI signs we put up
//
function remove_signs_of_call() {

    console.log('killing call signatures...')
    $('.puck_vpn').text("Call").removeClass("btn-danger")
    $('#puck_video').addClass('disabled')
    $('#puck_video').removeClass('green').removeClass('pulse')
    $('.avgrund-popin').remove();

}

//
// drag filenames from what's stored
//

function load_vault() {

    console.log('loadin n setting up vault!')

    var jqXHR_files = $.ajax({
        url: '/down',
        dataType: 'json'
    })

    var table_rowz = []

    jqXHR_files.done(function (data, textStatus, jqXHR) {
        console.log('jxq file vault listing')
        console.log(data.files)

        var vault = []

        for (var i = 0; i < data.files.length; i++) {
            console.log(data.files[i])
            var file = data.files[i]
            table_rowz.push('<tr><td><a target="_blank" href="/uploads/' + data.files[i] + '">' + data.files[i] + '</a></td></tr>')
        }

        console.log(table_rowz)

        $('#puck_cloud_file_listing').append(table_rowz)

    })

}

function panic_button() {

    console.log('panic... not implemented yet... start really panicing!')

}

function restart_server() {

    var url = "/server/restart"

    var jqXHR_restart_server = $.ajax({
        url: url,
        dataType: 'json',
    })

    jqXHR_restart_server.done(function (data, textStatus, jqXHR) {
        console.log('jxq restart server wootz... of course...if the server were really restarting...')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on restart... or is it?  ' + err)
    })

}

function stop_server() {

    var url = "/server/stop"

    var jqXHR_stopVPN = $.ajax({
        url: url,
        dataType: 'json',
    })

    jqXHR_stopVPN.done(function (data, textStatus, jqXHR) {
        console.log('jxq stop server wootz... of course...if the server were really dead...')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on stop server... or maybe not ;) ' + err)
    })

}

//
// fire status to puck
//
// sinc == async or sync
//
function fire_puck_status(jstatus) {

    console.log('firing status off')
    console.log(typeof jstatus)
    jstatus = JSON.stringify(jstatus)

    var status_xhr = $.ajax({
        type: "POST",
        url: "/status",
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: jstatus,
        success: function(res) {
            console.log('status off!')
            console.log(res)
        },
        error: function (txtstat, e) {
            console.log('status failzor -> ' + JSON.stringify(txtstat))
            console.log(e)
        }
    })
        // ?
        // async: sink,
}


// draws the drag-n-drop box... need to call it anytime
// vpn state changes
function drag_and_puck() {

    console.log('draggin n puckin')

    console.log('drawin the box')

        // out with the old, in with the new
    $('.dragDropBox').remove()

    $('#uppity').filer({
        changeInput: '<div class="dragDropBox"><span class="message">CLICK -or- DROP files to upload <span style="font-size:200%"><br />' + other_puck + '</span></div>',
        appendTo   : '.dragDropBox',
        template   : '<img src="%image-url%" title="%original-name%" /><em>%title%</em>',
        maxSize    : 1024,
        uploadFile: {
            // url:         'https://10.217.62.1:8080/up',
            url:         '/up/' + other_puck,
            data:        {},
            beforeSend:  function(parent){parent.append('<div class="progress-bar" />');},
            success:     function(data, parent, progress){ },
            error:       function(e, parent, progress){ },
            progressEnd: function(progress){progress.addClass('done-erase');},
            onUploaded:  function(parent){ }
        },
        dragDrop: {
            dropBox:  '.dragDropBox',
            dragOver: function(e, parent){ $('.dragDropBox').addClass('hover'); },
            dragOut:  function(e, parent){ $('.dragDropBox').removeClass('hover'); },
            drop:     function(e, formData, parent){ $('.dragDropBox').removeClass('hover'); },
        },
        onEmpty    : function(parent, appendBox){ $(appendBox).removeClass('done'); },
        onSelect   : function(e,parent,appendBox){ $(appendBox).addClass('done'); }
    })

}


//
// try to go put a sock on the other PUCK
//
function put_a_sock_in_it(url) {

    console.log('keep trying...')

    try { 
        if (remote_socket.socket.connected) {
            console.log('looks good')
            return
        }
    }
    catch (e) {
        console.log('nice catch of bad sock')
        console.log(e)
    }

    //if (puck_current.outgoing)
    //    return
    // try { remote_socket.disconnect() }
    // catch (e) { console.log('nice catch of D/C!'); console.log(e) }

    remote_socket = io.connect(url, {
        'connect timeout': 5000, // 5 seconds should be enough
        'try multiple transports': true,
        'reconnect': true,
        'reconnection delay': 500,
        'reconnection limit': 5000,
        'max reconnection attempts': Infinity,
        'sync disconnect on unload': false,
        'auto connect': true,
        'force new connection': true
    })

    remote_socket.socket.on('connect', function(){

        console.log('[+++] remote - connected to ' + url)

        // if (typeof data != undefined && data.server != "undefined") {
        //     $('#conversation').append('<div class="muted small"><i>connected to ' + data.server + '</i></div>')
        // }

        remote_socket.on('cat_facts', function (data) {

            console.log('[@@@] - cat facts!')
            console.log(data)

            if (typeof data != undefined && data.fact != "undefined") {
                $('#ip_diddy').append('<br />' + data.fact)
                console.log(data.fact)
                console.log(data.server)
            }

            state_cam(true, 'remote')

        })

        remote_socket.emit('puck', 'foo', function (data) {
            console.log('[@] + hey pucks... ')
            console.log(data)
        })

        remote_socket.on('puck_status', function (data) {
            console.log('[@] + cat facts... wait...no... remote status!')
            status_or_die()
            console.log(data)
        })

        remote_socket.on('error', function(err){
            console.log('remote errz ' + JSON.stringify(err))
        })

        //cat_chat(remote_socket, my_puck.PUCK_ID)
        cat_chat(remote_socket, 'remote')

    })

    remote_socket.on('anything', function(data) {
        console.log('... something... anything.... ')
        console.log(data)
    })

    remote_socket.on('error',            function(d) { console.log ('error') ; console.log(d) })
    remote_socket.on('reconnect',        function(d) { console.log ('reconnect') })
    remote_socket.on('connecting',       function(d) { console.log ('connecting') })
    remote_socket.on('reconnecting',     function(d) { console.log ('reconnecting') })
    remote_socket.on('connect_failed',   function(d) { console.log ('connect failed') })
    remote_socket.on('reconnect_failed', function(d) { console.log ('reconnect failed') })
    remote_socket.on('close',            function(d) { console.log ('close') })
    remote_socket.on('disconnect',       function(d) { console.log ('disconnect') })

}

//
// magic time, courtesy of rtc.. many of the RTC functions below
// taken from the marvelous https://github.com/muaz-khan demos;
//

rtc_peer       = {}
local_connect  = false
remote_connect = false

function getUserMedia(callback) {

    var hints = {
        audio: true,
        video:{
            optional: [],
            mandatory: {
                minWidth: 1280,
                minHeight: 720,
                maxWidth: 1920,
                maxHeight: 1080,
                minAspectRatio: 1.77
                // minWidth: 640,
                // minHeight: 380,
                // maxWidth: 1024,
                // maxHeight: 1024,
                // minAspectRatio: 1.77
            }
        }
    }

    navigator.getUserMedia(hints,function(stream) {

        var video      = document.createElement('video')
        video.src      = URL.createObjectURL(stream);
        video.controls = true
        video.muted    = true

        rtc_peer.onStreamAdded({
            mediaElement: video,
            userid: 'self',
            stream: stream
        })

        callback(stream)

    })

}

function candid_camera(url) {

    console.log('turning on cam cam : ' + url)

    // local
    if (url == '/') {

        console.log('... local')

        // rtc_peer = new PeerConnection(url)
        rtc_peer = new PeerConnection(local_socket)

        // on connect... actually paint up the vid
        rtc_peer.onStreamAdded = function(e) {
            console.log('local on!')
            if (!local_connect) {
                var video = e.mediaElement;
                video.setAttribute('width', LOCAL_VIDEO_WIDTH)
                $('#local_video').append(video)

                video.play();
                rotateVideo(video);
                scaleVideos();

                $('#puck_vid_notes').append('local ')

                local_connect = true
            }
        }

        // tear down
        rtc_peer.onStreamEnded = function(e) {
            var video = e.mediaElement;
            if (video) {
                video.style.opacity = 0;
                rotateVideo(video)
                setTimeout(function() {
                    $('#local_video').html()
                    scaleVideos()
                }, 1000)
            }
        }

        // hey, who are you?
        rtc_peer.onUserFound = function(userid) {
            console.log('++++ onUser: ' + userid)
        }

        // next two straight from demos RE: above
        function rotateVideo(video) {
            video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(0deg)';
            setTimeout(function() {
                video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(360deg)';
            }, 1000);
        }

        function scaleVideos() {
            var videos = document.querySelectorAll('video'),
                length = videos.length, video;

            var minus = 130;
            var windowHeight = 700;
            var windowWidth = 600;
            var windowAspectRatio = windowWidth / windowHeight;
            var videoAspectRatio = 4 / 3;
            var blockAspectRatio;
            var tempVideoWidth = 0;
            var maxVideoWidth = 0;

            for (var i = length; i > 0; i--) {
                blockAspectRatio = i * videoAspectRatio / Math.ceil(length / i);
                if (blockAspectRatio <= windowAspectRatio) {
                    tempVideoWidth = videoAspectRatio * windowHeight / Math.ceil(length / i);
                } else {
                    tempVideoWidth = windowWidth / i;
                }
                if (tempVideoWidth > maxVideoWidth)
                    maxVideoWidth = tempVideoWidth;
            }
            for (var i = 0; i < length; i++) {
                video = videos[i];
                if (video)
                    video.width = maxVideoWidth - minus;
            }
        }

        // go with grace
        window.onresize = scaleVideos;

        // if someone leaves, nuke vid
        rtc_peer.onuserleft = function (userid) {
            $('#puck_vid_notes').append('i diez ' + userid)
            local_connect = false
        }

        // connect if not already connected
        if (! local_connect) getUserMedia(function(stream) {
            rtc_peer.addStream(stream);
            rtc_peer.startBroadcasting();
            local_connect = true
        })


    }
    else {

        console.log('... remotely')
        var rtc_peer = new PeerConnection(remote_socket)

        rtc_peer.onStreamAdded = function(e) {
            console.log('remote on!')
            $('#local_video').html()
            $('#remote_video').append(e.mediaElement)
            $('#puck_vid_notes').append('remote ')
            remote_connect = true
        }
        // if someone leaves, nuke vid
        rtc_peer.onuserleft = function (userid) {
            $('#puck_vid_notes').append('userleft ' + userid)
        }

    }

}


//
// Cat chat (TM) - for moar cat fax.
//
// Cat chat guts on display
//
var all_cats = []
function cat_chat(sock, where) {

    if (typeof my_puck.ip_addr == "undefined") user = "local"
    else user = my_puck.ip_addr

    if (typeof all_cats[user] == "undefined") {
        console.log('catting as : ' + user)
        all_cats[user] = user
    }

    // i is here
    sock.emit('new_puck', user);

    // listener, whenever the server emits 'chat_receive', this updates the chat body
    sock.on('chat_receive', function (stamp, username, data) {

        if (typeof username == "undefined") { username = '<unknown>'; }

        console.log('cat chat => ' + data)
        $('#cat_chat').prepend('<div>' + stamp + '<b>'+username + ':</b> ' + data + '<br></div>')

    });

    // click send
    $('#datasend').click( function() {
        var message = $('#meow').val();
        $('#meow').val('');
        if (message != "") {
            console.log('sending...' + message)

            // pack it off to the server... try remote first, then....
            try       {
                remote_socket.emit('chat_send', message);
                console.log('[remote] + ' + message)
            }
            catch (e) {
                console.log('[local] + ' + message)
                sock.emit('chat_send', message);
            }

        }
        else {
            console.log('not sending blanx')
        }
    });

    // when hit enter
    $('#meow').keypress(function(e) {
        if(e.which == 13) {
            $(this).blur();
            console.log('hit enter')
            $('#datasend').focus().click();
            $('#meow').focus()
        }
    })

}

//
// print out an indented list from an object
//
function owalk( name, obj, str, depth ) {
    var name  = name  || 0
    var depth = depth || 0
    var str   = str   || ''

    var index = true

    if (obj.toString() != "[object Object]") {
        index = false
    }

    str = str + '<ul css="li { margin-left:' + depth * 50 + 'px}">'
    str = str + '\n<lh><strong>' + name + '</strong>\n'

    for( var i in obj ) {
        var padding = 0
        if( typeof obj[i] === 'object' ) {
            padding = Array(depth * 4 ).join(' ')
            owalk(i, obj[i], str, ++depth)
            depth--
            str = str + '</ul>'

        } else {
            padding = Array(depth * 4 ).join(' ')
            // console.log( Array(depth * 4 ).join(' ') + i + ' : ' + obj[i] )

            if (index)
                var s = i + ' : ' + obj[i]
            else
                var s = obj[i]

//          console.log('S: ' + index + ' ' + s)

            str = str + '\n' + padding + '<li css="li { margin-left:' + depth * 50 + 'px}">' + s + '\n'
        }
    }

    console.log(str)

    return(str)

}

// owalk("puck", x)

//
// basic puck stuff... 3 things, basics, vpn server, and vpn client stuff
//
function print_puck(ipuck, puckinfo, elements) {

    console.log('printing puck')
    console.log(ipuck)
    console.log(puckinfo)
    console.log(elements)

    var vpn = {
        port       : puckinfo.vpn.port,
        protocol   : puckinfo.vpn.protocol,
        ca         : puckinfo.vpn.ca.join('\n'),
        key        : puckinfo.vpn.key.join('\n'),
        cert       : puckinfo.vpn.cert.join('\n'),
        tlsauth    : puckinfo.vpn.tlsauth.join('\n'),
        dh         : puckinfo.vpn.dh.join('\n')
    }

    var vpn_client = {
        port       : puckinfo.vpn_client.port,
        protocol   : puckinfo.vpn_client.protocol,
        ca         : puckinfo.vpn_client.ca.join('\n'),
        key        : puckinfo.vpn_client.key.join('\n'),
        cert       : puckinfo.vpn_client.cert.join('\n')
    }

    var puck = {
        puckid     : ipuck,
        name       : name,
        owner      : puckinfo.owner.name,
        email      : puckinfo.owner.email,
        image      : puckinfo.image,
        ip         : puckinfo.ip_addr,
        vpn_ip     : puckinfo.vpn_ip,
        all_ips    : puckinfo.all_ips.join(', ')
       }

    var vpn_template = '<div><h4>VPN</h4></div>' +
                   '<strong>port</strong>: {{port}} <br />' +
                   '<strong>protocol</strong>: {{protocol}} <br />' +
                   '<strong>ca</strong>: {{ca}} <br />' +
                   '<strong>key</strong>: {{key}} <br />' +
                   '<strong>cert</strong>: {{cert}} <br />' +
                   '<strong>tlsauth</strong>: {{tls_auth}} <br />' +
                   '<strong>DH</strong>: {{dh}} <br />'

    var vpn_client_template = '<div><h4>VPN Client</h4></div>' +
                   '<strong>port</strong>: {{port}} <br />' +
                   '<strong>protocol</strong>: {{protocol}} <br />' +
                   '<strong>ca</strong>: {{ca}} <br />' +
                   '<strong>key</strong>: {{key}} <br />' +
                   '<strong>cert</strong>: {{cert}} <br />'

    var template = '<div><h4>ID: <span id="puckid">{{puckid}}</span></h4> <br />' +
                   '<strong>PUCK\'s name</strong>: {{user}} <br />' +
                   '<strong>Owner</strong>: {{user}} <br />' +
                   '<strong>Email</strong>: {{email}} <br />' +
                   '<strong>ip address</strong>: {{ip}} <br />' +
                   '<strong>vpn ip address</strong>: {{vpn_ip}} <br />' +
                   '<strong>all ips known</strong>: {{all_ips}} <br />' +
                   '<div style="width: 200px"><img style="max-width:100%" src="{{image}}"></div>'

    var v_html   = Mustache.to_html(vpn_template, vpn)
    var v_c_html = Mustache.to_html(vpn_client_template, vpn_client)
    var p_html   = Mustache.to_html(template, puck)

    $(elements[0]).html(p_html)
    $(elements[1]).html(v_html)
    $(elements[2]).html(v_c_html)

}

// mostly from https://www.webrtc-experiment.com/DetectRTC/
//
// can you walk and talk the ... walking talk
//
function detect_webRTC(element) {

    // ~ two per row
    $('#' + element).append('' +
                '<tr><td>Microphone    </td><td>'     + DetectRTC.hasMicrophone               + '</td>' +
                    '<td>Webcam        </td><td>'     + DetectRTC.hasWebcam                   + '</td></tr>' +
                '<tr><td>Screen Capture</td><td>'     + DetectRTC.isScreenCapturingSupported  + '</td>' +
                    '<td>WebRTC</td><td>'             + DetectRTC.isWebRTCSupported           + '</td></tr>' +
                '<tr><td>WebAudio API</td><td>'       + DetectRTC.isAudioContextSupported     + '</td>' +
                '    <td>SCTP Data Channels</td><td>' + DetectRTC.isSctpDataChannelsSupported + '</td></tr>' +
                '<tr><td>RTP Data Channels</td><td>'  + DetectRTC.isRtpDataChannelsSupported  + '</td></tr>')

}


var peer = {}

function candide(url) {

    try {
        if (url == "/") {
            console.log('local connect')
            peer = new PeerConnection(local_socket);
        }
        else {
            console.log('remote connect')
            peer = new PeerConnection(remote_socket);
        }
    }
    catch (e) {
        console.log('hmm... candide started a bit early...' + e)
    }

    peer.onUserFound = function(userid) {

        console.log('+++ user found...')

        getUserMedia(function(stream) {
            peer.addStream(stream);
            peer.sendParticipationRequest(button.id);
        })
        roomsList.appendChild(tr);

    }

    peer.onStreamAdded = function(e) {
        var video = e.mediaElement;
        video.setAttribute('width', 600);
        videosContainer.insertBefore(video, videosContainer.firstChild);

        video.play();
        rotateVideo(video);
        scaleVideos();
    }

    peer.onStreamEnded = function(e) {
        var video = e.mediaElement;
        if (video) {
            video.style.opacity = 0;
            rotateVideo(video);
            setTimeout(function() {
                video.parentNode.removeChild(video);
                scaleVideos();
            }, 1000);
        }
    }

    $('#start-broadcasting').click(function (e) { 
        console.log('--> user clicked go')
        getUserMedia(function(stream) {
            peer.addStream(stream);
            peer.startBroadcasting();
        })
    })

    peer.userid = puckid

    var videosContainer = document.getElementById('videos-container') || document.body;
    var btnSetupNewRoom = document.getElementById('setup-new-room');
    var roomsList = document.getElementById('rooms-list');

    function rotateVideo(video) {
        video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(0deg)';
        setTimeout(function() {
            video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(360deg)';
        }, 1000);
    }

    function scaleVideos() {
        var videos = document.querySelectorAll('video'),
            length = videos.length, video;

        var minus = 130;
        var windowHeight = 700;
        var windowWidth = 600;
        var windowAspectRatio = windowWidth / windowHeight;
        var videoAspectRatio = 4 / 3;
        var blockAspectRatio;
        var tempVideoWidth = 0;
        var maxVideoWidth = 0;

        for (var i = length; i > 0; i--) {
            blockAspectRatio = i * videoAspectRatio / Math.ceil(length / i);
            if (blockAspectRatio <= windowAspectRatio) {
                tempVideoWidth = videoAspectRatio * windowHeight / Math.ceil(length / i);
            } else {
                tempVideoWidth = windowWidth / i;
            }
            if (tempVideoWidth > maxVideoWidth)
                maxVideoWidth = tempVideoWidth;
        }
        for (var i = 0; i < length; i++) {
            video = videos[i];
            if (video)
                video.width = maxVideoWidth - minus;
        }
    }

    window.onresize = scaleVideos;
    
    // you need to capture getUserMedia yourself!
    function getUserMedia(callback) {
        var hints = {audio:true,video:{
            optional: [],
            mandatory: {
                minWidth: 1280,
                minHeight: 720,
                maxWidth: 1920,
                maxHeight: 1080,
                minAspectRatio: 1.77
            }
        }};
        navigator.getUserMedia(hints,function(stream) {
            var video = document.createElement('video');
            video.src = URL.createObjectURL(stream);
            video.controls = true;
            video.muted = true;
            
            peer.onStreamAdded({
                mediaElement: video,
                userid: 'self',
                stream: stream
            });
            
            callback(stream);
        });
    }

}
