//
// helper functions for initial D3CK prototype
//
// draw d3cks, delete d3cks, start vpns... various things
//

// track all d3ck IDs...
all_d3ck_ids   = []

// overall connection state
var d3ck_current            = {}
    d3ck_current.incoming   = false,
    d3ck_current.outgoing   = false,
    d3ck_current.busy       = false,
    last_file               = "",
    killed_call             = false;

var d3ck_status     = {},
    old_d3ck_status = {},
    webrtc          = {}

var incoming_ip = "?"

var ring = ""

var browser_ip = ""
var remote_ip  = ""

var poll = 500  // 2x a second
var poll = 1000  // once a second
var poll = 5000  // every 5 secs

var SHORT_WAIT = 1000  // 1 sec


var D3CK_SOCK_RETRY   = 3000
var LOCAL_VIDEO_WIDTH = 480

var ONE_HOUR = 60*60    // seconds


var sock = null

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
    $.get('/ping', function(d3ck) {
        console.log('my name/id/status are: ', d3ck.name, d3ck.did, d3ck.status)
        d3ck_status = 'Name: ' + d3ck.name + '<br />Status: ' + d3ck.status + '<br />ID: ' + d3ck.did
        // get my own data
        $.getJSON('/d3ck/' + d3ck.did, function(d3ckinfo) {
            console.log('my D3CK:')
            my_d3ck = d3ckinfo
            console.log(my_d3ck)
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
        console.log('events errz on event listing' + err)
    })

}

//
// put the category data where it belongs
//
function populate_events(cat) {

    console.log('sucking in table data for ' + cat)

    // added sess should have a better way... xxx
    if (typeof cat == "undefined" || cat == "" || cat == "sess") return

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
    // use proxy to other D3CK
    else                     var loc = ':7777'

    if (state == true) {
        // candid_camera(loc)
        state_audio('unmute')
        state_video('resume')
    }
    else if (state == false) {
        // candid_camera(loc)
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

    // an incoming connect was successful
    if (state == "incoming") {
        console.log('incoming call')

        set_up_RTC() // fly free, web RTC!

        console.log(d3ck_status.browser_events[browser_ip].notify_ring)

        // is anything else going on?  If so, for now dont do anything
        if (! d3ck_current.busy) {
            d3ck_current.incoming = true

            console.log('\t[+] fire up the alarms')

            // ensure video button is enabled if a call is in progress
            $('#d3ck_video').addClass('green').addClass('pulse')
            $('button:contains("connecting")').text('connected from')
            $('#d3ck_vpn_' + d3ck_status.openvpn_server.client_did).text('connected').removeClass('btn-primary').addClass('btn-success')

            console.log('incoming ring from ' + d3ck_status.openvpn_server.client)
            incoming_ip = d3ck_status.openvpn_server.client
            // ring them gongs, etc.

            if (!d3ck_status.browser_events[browser_ip].notify_ring) {
                event_connect("incoming", incoming_ip)
                d3ck_status.browser_events[browser_ip].notify_ring = true
            }

            // d3ck_status.browser_events[browser_ip].notify_file = true

        }
        else {
            console.log('\t[-] not doing anything with incoming call, currently busy')
        }

    }

    // an outgoing connect was successful
    if (state == "outgoing") {

        console.log('outgoing call is up')


        remote_ip = d3ck_status.openvpn_client.server

        set_up_RTC(remote_ip) // fly free, web RTC!

        if (! d3ck_current.busy) {
            console.log('\t[+] fire up the outbound signs')

            $('#d3ck_video').addClass('green').addClass('pulse')
            $('button:contains("connecting"),button:contains("Call")').text('End').addClass("hang_up").removeClass('btn-danger').addClass('btn-warning')

            // ... setup bye bye
            $('button:contains("connecting"),button:contains("Call")').click(false)

            $('body').on('click', '.hang_up', function() {
                $(this).text('hanging up...')
                event_hang_up()
            })

            d3ck_current.outgoing = true

            $('body').removeClass('avgrund-active');
            state_ring(false)

        }
        else {
            console.log('\t[-] not doing anything with outgoing call, currently busy')
        }

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
        console.log("ding a ling ring")
        ring.play()
    }

}

//
// calls, in or out
//
function event_connect(direction, caller) {

    console.log('connexting')

    //
    // energize modals
    //
    // "Avgrund is Swedish for abyss"

    // first destroy
    $('.avgrund-popin').remove()

    // then create
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
                  '<div id="d3ck_ring_img" class="col-md-4"></div>' +
                  '<a style="text-decoration: none" href="#"><div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="d3ck_answer" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span id="vpn_target" style="color: #fff !important;">Calling</span></button></div></a>'  +
                  '<div class="col-md-4 top-spacer50"><button data-loading-text="hanging up..." class="btn btn-warning nounderline" id="d3ck_disconnect" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Disconnect</span></a></button></div>' +
                  '</div>'
        })

    state_ring(true)

    // xxx - conf file, obv....
    var ring_img = '<img src="/img/ringring.gif">'

    // after things popup, add caller/callee
    if (direction == "incoming") {

        // tell who is calling
        $('#vpn_target').on('change', '#vpn_target').html('Call from ' + caller)

        // if answer, remove avg
        $(document).on('click', '#d3ck_answer', function() {
            $("body").removeClass("avgrund-active")
            state_ring(false)
        })

    }
    else {
        $('#vpn_target').on('change', '#vpn_target').append(' ' + caller)
    }

    $('#d3ck_ring_img').on('change', '#d3ck_ring_img').html(ring_img)

}

// video toyz on/off
function toggle_special_FX() {

    // turn on/off special video FX
    $('#video_effect_div').toggleClass('hidden')

//  $('#remoteVideos').html('')
//  $('#localVideo').html('')

// <div class='title'>
//     TitleText 1
//     <a class='delete' href="#">delete...</a>
// </div>


}

//
// hang up the phone, return to home
//
function event_hang_up() {

    toggle_special_FX()

    // i has gone
    console.log('hanging up!')

    state_ring(false)

    // don't change anything until the call efforts pass/fail
    d3ck_current.busy = true

    var url = "/vpn/stop"

    var jqXHR_stopVPN = $.ajax({
        url: url,
        // async:false,
        dataType: 'json',
    })

    jqXHR_stopVPN.done(function (data, textStatus, jqXHR) {
        console.log('jxq hangup wootz')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on hangup' + JSON.stringify(err))
        alert('error on hangup!')
    })

    // kill the CSS UI signs
    remove_signs_of_call()

    $('body').append("<span class='dead_center animated fadeOut'><h1>Disconnected!</h1></span>")

}

//
// get the current user's IP addr, put it where the element is
//

//
// this broke when OpenVPN started forwarding along the https traffic ;(
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
        $('#ip_diddy').prepend("[" + browser_ip + "] ");
    }).fail(function(err) {
        console.log('errz on getIP' + err)
    })

}

//
// fire up the VPN
//
function d3ck_vpn(element, d3ckid, ipaddr) {

    console.log('starting up VPN to ' + d3ckid + ' : ' + ipaddr)

    $(element).text("connecting...").removeClass("btn-primary").addClass("btn-danger")

    event_connect("outgoing", ipaddr)

    // don't change anything until the call efforts pass/fail
    d3ck_current.busy = true

    var pvpn = $.ajax({
        type: "POST",
        url: "/vpn/start",
        data: {"d3ckid": d3ckid, "ipaddr": ipaddr}
    })

    pvpn.done(function(msg) {
        console.log("posto facto")
    })
    pvpn.fail(function(xhr, textStatus, errorThrown) {
        console.log('failzor -> ' + xhr)
    })

}

// whimsey
function go_d3ck_or_go_home() {
    console.log('go d3ck or...')
    window.location.href = location.href
}

function d3ck_create(element, ip_addr) {

    $(element).text("creating...").removeClass("btn-primary").addClass("btn-danger")

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
    post_data.d3ck_action = "CREATE"
    post_data = JSON.stringify(post_data)

    // console.log(post_data)

    $.ajax({
        type: "POST",
        url: "/form",
        headers: { 'Content-Type': 'application/json', },
        data: post_data,
        success: function(data, status) {
            console.log('suck... sess.... ')
            // yes... I suck
            setTimeout(go_d3ck_or_go_home, 2000)
        },
        fail: function(data, err) {
            console.log('fuck... me')
            // yes... I suck
            setTimeout(go_d3ck_or_go_home, 2000)
        }
    })

}

//
// well...  sort of... pingish... send ping request to D3CK server
//
// farm out https requests to remote systems since js/jquery balk at that kinda shit
//

var draggers = {} // track drag-n-drop areas

function d3ck_ping(all_ips, d3ckid, url) {

    console.log('in d3ck_ping')
    // console.log(d3ckid, url)
    // console.log(all_ips)

    // var ping_url = '/sping/' + d3ckid + "/" + all_ip_string
    var ping_url = '/sping/' + d3ckid + "/" + all_ips

    // console.log('pinging ' + d3ckid + ' ... URL ... ' + ping_url)

    var ping_id  = ''

    // if we're alive, this will get put in
    var vpn_form   = 'vpn_form_' + d3ckid
    var element_id = 'd3ck_vpn_' + d3ckid

    var jqXHR_get_ping = $.ajax({
        url: ping_url, 
        cache: false
    })


    //
    // XXX -
    //
    // this won't bring back up the drag-n-drop if the connection is up,
    // then goes down, then comes back up... have to reload browser
    //
    jqXHR_get_ping.done(function (data, textStatus, jqXHR) {
        var ret = data
        console.log("pingzor " + JSON.stringify(data))

        var safe_id = 'uppity_' + data.ip.replace(/\./g, '_')

        // make the button clickable and green
        if (data.status == "OK") {
            console.log('success with ' + ping_url)
            $('#'+element_id).addClass('btn-primary').removeClass('disabled')

            var ele = $('#'+element_id).parent().closest('div').find('.remote_ip strong')

            // change IP address to the one who answered
            // $('#'+element_id).parent().closest('div').find('.remote_ip strong').html('<strong>' + data.ip + '</strong>')
            $(ele).html('<strong>' + data.ip + '</strong>')

            var current_time_in_seconds = new Date().getTime() / 1000;

            //
            // haven't seen this before... potential problems with ips in the future... sigh
            // 
            // don't change it more than once per hour...?
            //
            if (typeof draggers[data.ip] == "undefined" || (current_time_in_seconds - draggers[data.ip]) > ONE_HOUR ) {
                // make it actionable
                // remove old, add new form
                $('#' + safe_id).remove()
                console.log('drag -n- drop away!')
                draggers[data.ip] = current_time_in_seconds
                drag_and_d3ck(safe_id, d3ckid, data.ip)
            }
            else {
                console.log('not your time yet, young jedi')
            }

        }
        else {
            $('#' + safe_id).remove() // remove old, add new form
            console.log('not ok...')
            $('#'+element_id).removeClass('btn-primary').addClass('disabled')
        }
    }).fail(function(err) {
            // console.log( "ping fail for " + ping_url)
            // console.log(err)
            $('#'+element_id).removeClass('btn-primary').addClass('disabled')
            $('#'+element_id).closest('form').find('div').remove()
    }).error(function(err) {
            // console.log( "ping error for " + ping_url)
            // console.log(err)
            $('#'+element_id).removeClass('btn-primary').addClass('disabled')
            $('#'+element_id).closest('form').find('div').remove()
    })

// console.log('post-pingy ' + d3ckid + '... putting into ' + element_id)

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
first_news = true
function get_status() {

    // console.log('get STATUS')

    var url = "/status"

    var jqXHR_get_status = $.ajax({ url: url })

    jqXHR_get_status.done(function (data, textStatus, jqXHR) {
        // console.log('status wootz\n' + data)
        d3ck_status = JSON.parse(data)
        // console.log("got status?  " + JSON.stringify(d3ck_status))
        console.log('got status? ...' + JSON.stringify(d3ck_status.events) + '...')
        // status_or_die()

        // if something is new, do something!
        if (! _.isEqual(old_d3ck_status, d3ck_status)) {
            console.log('something new in the state of denmark!')
            old_d3ck_status = JSON.parse(JSON.stringify(d3ck_status))
            status_or_die()
        }
        else {
            // console.log('same ol, same ol')
        }

    }).fail(ajaxError);

}


function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


/*

states and desired implications

Basics:

incoming call -

    if (first notice) ring, say who from

    else    keep ring indicator on UNLESS user has turned it off


outgoing call -

    if (first notice) ring, say who to

    else    keep ring indicator on UNLESS user has turned it off


Two other states exist - setting up or tearing down a call/connection.
With both:

    indicate this intermediate state

    freeze all other UI changes

*/

//
// get events, status... or... well....
//
// this processes missives from the server and potentially says something about it
//
function status_or_die() {

    console.log('sailing on the sneeze of cheeze... when I hear something... from... ' + browser_ip)

    console.log(JSON.stringify(d3ck_status))

    if (typeof d3ck_status.browser_events == "undefined" || typeof d3ck_status.browser_events[browser_ip] == "undefined") {
        console.log('stuffing browser events...')
        d3ck_status.browser_events = {}
        d3ck_status.browser_events[browser_ip] = { "notify_add":false, "notify_ring":false, "notify_file":false}
    }

    // if someone has added you, create a modest sized bit of text that tells you
    // and hopefully won't fuck up anything you're doing

    if (d3ck_status.events.new_d3ck_ip.length && ! d3ck_status.browser_events[browser_ip].notify_add) {
        remote_ip   = d3ck_status.events.new_d3ck_ip
        remote_name = d3ck_status.events.new_d3ck_name
        console.log(remote_ip + ' added as friend')

        // a bit down from the top, and stay until wiped away or refreshed

        if (typeof remote_name == "undefined" || remote_name != "")
            // do not repeat file upload or adding friend news
            if (first_news) {
                console.log('...first time, tho....')
                first_news = false
            }
            else {
                $.bootstrapGrowl('"' + remote_name + '" added your D3CK as a friend (you may have to refresh page to see details)', {offset: {from: 'top', amount: 70}, delay: -1})
            }

        d3ck_status.browser_events[browser_ip].notify_add = true
    }
    // did santa come?

    // XXX - odd corner case... if both systems have the same IP ... say... testing behind a nat...
    // this probably won't work as expected.....
    else if (d3ck_status.file_events.file_name.length && ! d3ck_status.browser_events[browser_ip].notify_file) {

        console.log('ho ho ho, santa is here with new filez 4 the kidd3z!')

        // do not repeat file upload or adding friend news
        if (first_news) {
            console.log('...first time, tho....')
            first_news = false
        }
        else {
            // if we're connected, the file is being shipped to the other machine, not local
            // show inbound note if you sent file, else say when it succeeds
            if (d3ck_status.file_events.file_from != browser_ip) {
                console.log('new local file(z)!')

                // put in or lookup PiD, then owner/d3ck's name!
                $.bootstrapGrowl("New file: <strong>" + d3ck_status.file_events.file_name + "</strong>  ("  + d3ck_status.file_events.file_size + " bytes); from " + d3ck_status.file_events.file_from, {offset: {from: 'top', amount: 70}, delay: -1})

                $('#d3ck_cloud_file_listing tr:last').after('<tr><td><a target="_blank" href="/uploads/' + d3ck_status.file_events.file_name + '">' + d3ck_status.file_events.file_name + '</a></td></tr>')
                // d3ck_status.browser_events[browser_ip].notify_file = true
                }
            else {
                console.log('file(z) from remote')
                $.bootstrapGrowl("File transferred: <strong>" + d3ck_status.file_events.file_name + "</strong>  ("  + d3ck_status.file_events.file_size + " bytes)", {offset: {from: 'top', amount: 70}, delay: -1})
                $('#d3ck_cloud_file_listing tr:last').after('<tr><td><a target="_blank" href="/uploads/' + d3ck_status.file_events.file_name + '">' + d3ck_status.file_events.file_name + '</a></td></tr>')

            }
        }
    }
    // server... incoming ring
    else if (d3ck_status.openvpn_server.vpn_status == "up") {
        console.log('incoming...!')
        d3ck_current.busy     = false
        d3ck_current.incoming = true
        state_vpn('incoming', browser_ip)
    }

    // client... outgoing ring
    else if (d3ck_status.openvpn_client.vpn_status == "up") {
        console.log('outgoing...!')
        d3ck_current.busy     = false
        d3ck_current.outgoing = true
        state_vpn('outgoing', browser_ip)
        // cat facts!
        state_cam(true, 'local')
    }

    else {
        console.log("\n\nI'm not sure why you called me here...?\n")
    }

    // if nothing up now, kill any signs of a call, just to be sure
    if (d3ck_status.openvpn_client.vpn_status != "up" && d3ck_status.openvpn_server.vpn_status != "up") {

        kill_RTC()

        console.log("it's dead, jim")
        d3ck_current.incoming = false
        d3ck_current.outgoing = false
        d3ck_current.busy     = false

        if ($('button:contains("connected"),button:contains("hanging up")').length) {
            $('body').append("<span class='dead_center animated fadeOut'><h1>Disconnecting!</h1></span>")
            // xxx - one for out, one for in?
            d3ck_status.browser_events[browser_ip].notify_ring = false
            remove_signs_of_call()
            console.log('clearing all flags of any calls to false')
        }

    }

    first_news = false
    // fire_d3ck_status(d3ck_status)

}

//
// ... nuke the vids and other evidence...
//
function kill_RTC() {

    console.log('die, rtc, die!')

    // kill rtc stuff
    try {
        webrtc.hangUp()
        console.log('et tu, zen?')
    }
    catch (e) {
        console.log('... either not up or failzor in the slaying of webRTC...')
    }

    // kill the HTML for remote & local vids
    $('#localVideo').remove()
    $('#h4_local').append('\n<video id="localVideo"></video>\n')
    $('#remoteVideos video').remove()

    // kill the silly thing
    $('#video_effect_div').attr("class",'hidden')

}

//
// when disconnected, kill all the UI signs we put up
//
function remove_signs_of_call() {

    if (! d3ck_current.busy) {
        console.log('killing call signatures...')
        $('.hang_up').text("Call").removeClass("btn-warning").removeClass("hang_up")
        $('.d3ck_vpn').text("Call").removeClass("btn-danger").removeClass('btn-success')
        $('#d3ck_video').addClass('disabled')
        $('#d3ck_video').removeClass('green').removeClass('pulse')
        $('body').removeClass('avgrund-active')
        state_ring(false)
        // fire_d3ck_status(d3ck_status)

        kill_RTC()

    }

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

        $('#d3ck_cloud_file_listing').append(table_rowz)

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
// fire status to d3ck
//
// sinc == async or sync
//
function fire_d3ck_status(jstatus) {

    // console.log('firing status off')
    jstatus = JSON.stringify(jstatus)

    var status_xhr = $.ajax({
        type: "POST",
        url: "/status",
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: jstatus,
        success: function(res) {
            // console.log('status off!')
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
function drag_and_d3ck(safe_id, d3ckid, ip) { 

    if (safe_id != "local") {

        console.log('draggin n d3ckin... to....', safe_id, d3ckid, ip)

        // out with the old, in with the new
        // $('.dragDropBox').remove()           XXXX?
        // $('#uppity').filer({

        var safe_ip = ip.replace(/\./g, '_')

        // $('#vpn_form_' + d3ckid).prepend('\n<div id="div_' + safe_id + '>uploadz...<form action="/up" method="post" enctype="multipart/form-data"><input class="uppity" id="' + safe_id + '" type="file" name="uppity" multiple="multiple" /></form></div>')
        $('#vpn_form_' + d3ckid).prepend('\n<div id="div_' + safe_id + '>uploadz...<form action="/up" method="post" enctype="multipart/form-data"><input class="uppity" id="' + safe_id + '" type="file" name="uppity" multiple="multiple" /></form></div>')
    }
    else {
        safe_id = "uppity"
        ip      = "local"
        safe_ip = "local"
    }

    var ele = '#dragDropBox_' + safe_ip

    $('#' + safe_id).filer({
        changeInput: '<div class="dragDropBox" id="dragDropBox_' + safe_ip + '"><span class="message">CLICK -or- DROP files to upload</span></div>',
        appendTo   : ele,
        // appendTo   : '#dragDropBox_' + safe_id,
        template   : '<img src="%image-url%" title="%original-name%" /><em>%title%</em>',
        maxSize    : 1024 * 1024,
        uploadFile: {
            url:         '/up/' + ip,
            data:        {},
            beforeSend:  function(parent){parent.append('<div class="progress-bar" />');},
            success:     function(data, parent, progress){ },
            error:       function(e, parent, progress){ },
            progressEnd: function(progress){progress.addClass('done-erase');},
            onUploaded:  function(parent){ }
        },
        dragDrop: {
            dropBox:  ele,
            dragOver: function(e, parent){ $(ele).addClass('hover'); },
            dragOut:  function(e, parent){ $(ele).removeClass('hover'); },
            drop:     function(e, formData, parent){ $(ele).removeClass('hover'); },
        },
        onEmpty    : function(parent, appendBox){ $(appendBox).removeClass('done'); },
        onSelect   : function(e,parent,appendBox){ $(appendBox).addClass('done'); }
    })

}


//
// enter the socket loop!
//
local_socket = null

function socket_looping() {
    // deprecated
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

// owalk("d3ck", x)

//
// basic d3ck stuff... 3 things, basics, vpn server, and vpn client stuff
//
function print_d3ck(id3ck, d3ckinfo, elements) {

    console.log('printing d3ck')
    console.log(id3ck)
    console.log(d3ckinfo)
    console.log(elements)

    var vpn = {
        port       : d3ckinfo.vpn.port,
        protocol   : d3ckinfo.vpn.protocol,
        ca         : d3ckinfo.vpn.ca.join('\n'),
        key        : d3ckinfo.vpn.key.join('\n'),
        cert       : d3ckinfo.vpn.cert.join('\n'),
        tlsauth    : d3ckinfo.vpn.tlsauth.join('\n'),
        dh         : d3ckinfo.vpn.dh.join('\n')
    }

    var vpn_client = {
        port       : d3ckinfo.vpn_client.port,
        protocol   : d3ckinfo.vpn_client.protocol,
        ca         : d3ckinfo.vpn_client.ca.join('\n'),
        key        : d3ckinfo.vpn_client.key.join('\n'),
        cert       : d3ckinfo.vpn_client.cert.join('\n')
    }

    var d3ck = {
        d3ckid     : id3ck,
        name       : name,
        owner      : d3ckinfo.owner.name,
        email      : d3ckinfo.owner.email,
        image      : d3ckinfo.image,
        ip         : d3ckinfo.ip_addr,
        vpn_ip     : d3ckinfo.vpn_ip,
        all_ips    : d3ckinfo.all_ips.join(', ')
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

    var template = '<div><h4>ID: <span id="d3ckid">{{d3ckid}}</span></h4> <br />' +
                   '<strong>D3CK\'s name</strong>: {{user}} <br />' +
                   '<strong>Owner</strong>: {{user}} <br />' +
                   '<strong>Email</strong>: {{email}} <br />' +
                   '<strong>ip address</strong>: {{ip}} <br />' +
                   '<strong>vpn ip address</strong>: {{vpn_ip}} <br />' +
                   '<strong>all ips known</strong>: {{all_ips}} <br />' +
                   '<div style="width: 200px"><img style="max-width:100%" src="{{image}}"></div>'

    var v_html   = Mustache.to_html(vpn_template, vpn)
    var v_c_html = Mustache.to_html(vpn_client_template, vpn_client)
    var p_html   = Mustache.to_html(template, d3ck)

    $(elements[0]).html(p_html)
    $(elements[1]).html(v_html)
    $(elements[2]).html(v_c_html)

}

//
// mostly from https://www.webrtc-experiment.com/DetectRTC/
//
// can you walk and talk the ... walking talk
//
function detect_webRTC(element) {

    // some browsers really don't like this
    $.getScript( "/js/DetectRTC.js" )
    .done(function( script, textStatus ) {
        console.log( textStatus );
        // ~ two per row
        $('#' + element).append('' +
                '<tr><td>Microphone    </td><td>'     + DetectRTC.hasMicrophone               + '</td>' +
                    '<td>Webcam        </td><td>'     + DetectRTC.hasWebcam                   + '</td></tr>' +
                '<tr><td>Screen Capture</td><td>'     + DetectRTC.isScreenCapturingSupported  + '</td>' +
                    '<td>WebRTC</td><td>'             + DetectRTC.isWebRTCSupported           + '</td></tr>' +
                '<tr><td>WebAudio API</td><td>'       + DetectRTC.isAudioContextSupported     + '</td>' +
                '    <td>SCTP Data Channels</td><td>' + DetectRTC.isSctpDataChannelsSupported + '</td></tr>' +
                '<tr><td>RTP Data Channels</td><td>'  + DetectRTC.isRtpDataChannelsSupported  + '</td></tr>')

    })
    .fail(function( jqxhr, settings, exception ) {
        $(element).text( "This browser doesn't seem to allow the detection of WebRTC features" );
        return
    });

}


//
// much adapted from http://SimpleWebRTC.com/, plus errors introduced by me
//

//
// fire up the rtc magic
//
function set_up_RTC(remote) {

    console.log('setting up that ol rtc magic')

    var remote_d3ck = ""        // did of other d3ck

    var ip          = window.location.hostname

    // someone connected to us
    if (d3ck_status.openvpn_server.vpn_status == "up") {
        console.log("PEEEEER js: server up")
        remote_d3ck = d3ck_status.openvpn_server.client_did
    }

    // we're connected to them
    else if (d3ck_status.openvpn_client.vpn_status == "up") {
        console.log("PEEEEER js: client up")
        remote_d3ck = d3ck_status.openvpn_client.server_did
    }

    // ... wtf, as they say...?
    else {
        alert('hmmm... are you connected...?')
        return
    }

    console.log('setting up RTC: ' + SIGNALING_SERVER)

    $('#remoteVideos video').remove()

    webrtc = new SimpleWebRTC({
        localVideoEl: 'localVideo',
        remoteVideosEl: 'remoteVideos',
        autoRequestMedia: true
    });

    // we have to wait until it's ready
    webrtc.on('readyToCall', function () {
        webrtc.joinRoom('d3ck')
    });

    toggle_special_FX()

    cat_chat()

}


//
// pop up a little thing with a message to the users... used to be used for
// something else... time has moved on....
//

function rtc_haxx0r_trick() {

    console.log('trying to decide whether to pop up a window, rtc haxx0r style')

    var session_cookie = false

    var jqXHR_AAA = $.ajax({
        url: '/aaa',
        dataType: 'json'
    })

    jqXHR_AAA.done(function (data, textStatus, jqXHR) {
        console.log('jxq AAA')
        console.log(data)
        session_cookie = data.session_cookie

        if (session_cookie) {
            console.log('been there, done that')
        }
        else {

            console.log("it's a messi biz, but someone has to do it")

            var messi_url          = 'https://' + window.location.hostname + ':' + D3CK_SIG_PORT + '/popup.html'
            var messi_url_fallback = '/popup_fallback.html'  // no cors detected

            var request = createCORSRequest( "get", messi_url)

            var final_url = messi_url

            // firefox... you seem to suck... and lie... and suck some more....
            if (!request || navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
                console.log('falling back... and its not even spring...')

                if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) console.log('sure, sure, you say you support it... but I dont trust you...')

                // when it shows up do something about it; give them a pointer to the alternate URL
                console.log('... waiting to switch urls on em... ')

                $('body').on('update', '#d3ck_hackasaurus', function() {
                    console.log('a new kid in town, eh? Let me help you out')
                    this.attr("href", messi_url)
                })

                final_url = messi_url_fallback

            }

            Messi.load(final_url, {modal: true, width: 500, buttons: [{id: 0, label: 'close', val: 'X'}]})

        }

    }).fail(function(err) {
        console.log('AAA errz: ' + err)

    })

}

// from http://jquery-howto.blogspot.com/2013/09/jquery-cross-domain-ajax-request.html

function createCORSRequest(method, url){

    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr){
        console.log('yez, time to pop open a cors and relax')
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined"){ // if IE use XDR
        console.log('ummm... ok... xdr, anyone?')
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        console.log('alas, poor server, I never knew her')
        xhr = null;
    }
    return xhr;

}


//
// Cat chat (TM) - for moar cat fax.
//
function cat_chat() {
    
    console.log('catting as : ' + my_d3ck.D3CK_ID)

    // listener, whenever the server emits 'chat_receive', this updates the chat body
    kittens_mittens.on('cat_chat', function (data) {
        // seem to get some odd things

        //console.log(stamp)
        //console.log(username)
        console.log(data)

        // username = my_d3ck.name

        console.log('got data! ' + JSON.stringify(data))

        // $('#cat_chat').prepend('<div>' + stamp + '<b>'+username + ':</b> ' + data + '<br></div>')
        $('#cat_chat').prepend('<div><b>'+ data.user + ':</b> ' + data.data + '<br></div>')

    });

    // when the client clicks SEND
    $('#datasend').click( function() {
        var message = {}

        message.user = my_d3ck.owner.name
        message.data = $('#meow').val();
        // var message = $('#meow').val();

        console.log('sending...' + JSON.stringify(message))

        $('#meow').val('');

        $('#meow').focus();

        // pack it off to the server
        kittens_mittens.emit('cat_chat', message);

    });

    // when hit enter
    $('#meow').keypress(function(e) {
        if(e.which == 13) {
            $(this).blur();
            console.log('enter...')
            $('#datasend').focus().click();
        }
    })
}

