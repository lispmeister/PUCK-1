//
// helper functions for initial D3CK prototype
//
// draw d3cks, delete d3cks, start vpns... various things
//

// track all d3ck IDs...
all_d3ck_ids   = []

all_pings = []

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

// seems to go from (N-1) to 0h
var DEFAULT_RING_TIME = 10
var DEFAULT_RING_TIME = 30

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

        // xxxx
        // console.log(d3ck_status.browser_events[browser_ip].notify_ring)

        // is anything else going on?  If so, for now dont do anything

        // xxxx
        // if (! d3ck_current.busy) {
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

        // }
//      else {
//          console.log('\t[-] not doing anything with incoming call, currently busy')
//      }

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

// xxxxxxxxxxx
// xxxxxxxxxxx
// xxxxxxxxxxx
if ('monkeys' == 'bunnies') {

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
}

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

    go_d3ck_or_go_home()

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
        data: {"d3ckid": d3ckid, "ip_addr": ipaddr}
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
        headers: { 'Content-Type': 'application/json' },
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

    // console.log('in d3ck_ping')
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

    // if (typeof all_pings[ping_url] == "undefined") {
    all_pings[ping_url] = false
    // }

    //
    // XXX -
    //
    // this won't bring back up the drag-n-drop if the connection is up,
    // then goes down, then comes back up... have to reload browser
    //
    jqXHR_get_ping.done(function (data, textStatus, jqXHR) {
        var ret = data
        // console.log("pingzor " + JSON.stringify(data))

        var safe_id = 'uppity_' + data.ip.replace(/\./g, '_')
        var safe_ip = data.ip.replace(/\./g, '_')

        // make the button clickable and green
        if (data.status == "OK") {

            all_pings[ping_url] = true

            // console.log('success with ' + ping_url)
            $('#'+element_id).addClass('btn-primary').removeClass('disabled')

            // change the ip addr in two places
            var ele = $('#'+element_id).parent().closest('div').find('.remote_ip strong')
            $('#'+element_id).prev().prev().attr('value', data.ip)

            // change IP address to the one who answered
            // $('#'+element_id).parent().closest('div').find('.remote_ip strong').html('<strong>' + data.ip + '</strong>')
            $(ele).html('<strong>' + data.ip + '</strong>')

            var current_time_in_seconds = new Date().getTime() / 1000;

            //
            // haven't seen this before... potential problems with ips in the future... sigh
            // 
            // if (typeof draggers[data.ip] == "undefined") {
                // make it actionable
                // remove old, add new form
                if (! $('#dragDropBox_' + safe_ip).exists()) {
                    console.log('drag -n- drop away!')
                    drag_and_d3ck(safe_id, d3ckid, data.ip)
                }

            // }
            // else {
            //     console.log('not your time yet, young jedi')
            // }

        }
        else {
            console.log('not ok...')
            $('#' + safe_id).remove() // remove old, add new form
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

// the first time you arrive you might want to get some status-updates
// that aren't in the queue, such as whether or not you're in a VPN 
// connected state or something
first_news = true

function get_status() {

    // console.log('get STATUS')

    var url = "/status"

    if (first_news) url = url + "?first_blood=stallone"

    var jqXHR_get_status = $.ajax({ url: url })

    jqXHR_get_status.done(function (queue, textStatus, jqXHR) {
        // console.log('status wootz\n' + queue)
        // console.log("got status?  " + JSON.stringify(queue))

        first_news = false

        var lenq = _.keys(queue).length

        // console.log('status wootz: ' + lenq)

        // if (lenq <= 0) { console.log('null queue, bummer') }
        for (var i=0; i < lenq; i++) {

            d3ck_status = queue[i]
            console.log('got status? ...' + JSON.stringify(d3ck_status.events) + '...')
            status_or_die()

        }
                // if something is new, do something!
                //if (! _.isEqual(old_d3ck_status, d3ck_status)) {
                //    console.log('something new in the state of denmark!')
                //    old_d3ck_status = JSON.parse(JSON.stringify(d3ck_status))
                //}

    }).fail(ajaxError);

}

//
// drain the queue if anything is there
//
function get_q() {

    d3ck_queue = []

    // console.log('get queue')

    var url = "/q"

    var jqXHR_get_queue = $.ajax({ url: url })

    jqXHR_get_queue.done(function (queue, textStatus, jqXHR) {
        // console.log('queue wootz\n' + queue)
        // console.log("got queue?  " + JSON.stringify(queue))

        var lenq = _.keys(queue).length

        // console.log('queue wootz: ' + lenq)

        // if (lenq <= 0) { console.log('null queue, bummer') }

        for (var i=0; i < lenq; i++) {

            d3ck_queue = queue[i]
            console.log('got queue? ...' + JSON.stringify(d3ck_queue.event) + '...')
            queue_or_die(d3ck_queue)

        }
    }).fail(ajaxError);

}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


//
// rip apart queue, figure out what to do
//
function queue_or_die(queue) {

    console.log('sailing on the sneeze of chedder... from... ' + browser_ip)

    console.log(queue)

    if (typeof queue.type == "undefined") {
        console.log('no queue here, false alarm')
        return
    }


    // results of actions (e.g. file transfers, vpn, etc.)
    if (queue.type == "info") {
        console.log('infomercial: ' + JSON.stringify(queue))

        console.log('event...? ' + queue.event)

        if      (queue.event == 'd3ck_create') {
            inform_user('added a D3CK as friend (you may have to refresh page to see details)')
        }

        else if (queue.event == 'd3ck_delete') {
            inform_user('d3ck deleted')
        }

        else if (queue.event == 'file_upload') {
            inform_user('file uploaded')
        }

        else if (queue.event == 'knock_request') {
            // inform_user('knock response sent')
        }

        else if (queue.event == 'knock_response') {
            inform_user('knock response received')

            console.log(queue)
            console.log(queue.d3ck_status)
            console.log(queue.d3ck_status.d3ck_requests)


            if (queue.d3ck_status.d3ck_requests.knock && queue.d3ck_status.d3ck_requests.answer == "yes") {

                var did = queue.d3ck_status.d3ck_requests.did

                // alertify.success("starting the VPN connection... to " + did);
                inform_user("starting the VPN connection... to " + did);

                var ip = $('#' + did + ' .remote_ip strong:eq(1)').text()
                console.log('to... ' + ip)

                event_connect('outgoing', $(this).parent().parent().find('.d3ckname').text())

                d3ck_vpn($('#d3ck_vpn_' + did), did, ip)

                state_vpn('incoming', browser_ip)

            }
            else {
                // alertify.reject("remote d3ck refused your request...");
                inform_user("remote d3ck refused your request...");
            }

        }

        else if (queue.event == 'remote_knock_fail') {
            inform_user('knock failure')
        }

        else if (queue.event == 'remote_knock_success') {
            inform_user('remote knock delivered')
        }

        else if (queue.event == 'remotely_uploaded') {
            inform_user('your file was uploaded to remote d3ck')
        }

        else if (queue.event == 'remote_upload') {
            inform_user('a file has been uploaded to your d3ck')
        }

        else if (queue.event == 'vpn_client_connected') {
            inform_user("your d3ck has established a VPN connection")
            state_vpn('outgoing', browser_ip)
        }

        else if (queue.event == 'vpn_client_disconnected') {
            inform_user('your d3ck disconnected the VPN connection')
        }

        else if (queue.event == 'vpn_server_connected') {
            inform_user('remote d3ck established a VPN connection to your d3ck')

            state_vpn('incoming', browser_ip)

        }

        else if (queue.event == 'vpn_server_disconnected') {
            inform_user('remote d3ck disconnected its VPN connection')
        }

        else if (queue.event == 'vpn_start') {
            inform_user('v-start')
        }

        else if (queue.event == 'vpn_stop') {
            inform_user('v-stop')
        }

        else {
            console.log("don't know this type of info event? " + queue.event)
        }

        return

    }

    // request user feedback
    else if (queue.type == "request") {
        console.log('event: ' + JSON.stringify(queue))
        ask_user_4_response(queue)
        return
    }

    // inbound calls, vpn connections, etc.
    else if (queue.type == "event") {
        console.log('event: ' + JSON.stringify(queue))
        return
    }

    else {
        console.log(':???: ' + JSON.stringify(queue))
        return
    }


}






//

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

    return

    console.log('sailing on the sneeze of cheeze... when I hear something... from... ' + browser_ip)

    console.log(JSON.stringify(d3ck_status))

    if (typeof d3ck_status.browser_events == "undefined" || typeof d3ck_status.browser_events[browser_ip] == "undefined") {
        console.log('stuffing browser events...')
        d3ck_status.browser_events = {}
        d3ck_status.browser_events[browser_ip] = { "notify_add":false, "notify_ring":false, "notify_file":false}
    }


    console.log('knocked up?')

    if (d3ck_status.d3ck_requests.knock) {

        // answer to our knock
        if (typeof d3ck_status.d3ck_requests.answer != "undefined") {
            // alert('KNOCK, KNOCK, MOFO! ' + d3ck_status.d3ck_requests.answer)
            if (d3ck_status.d3ck_requests.answer) {
                alertify.success("starting the VPN connection...");

                var ip = $('#' + d3ck_status.d3ck_requests.did + ' .remote_ip strong:eq(1)').text()
                console.log('to... ' + ip)

                event_connect('outgoing', $(this).parent().parent().find('.d3ckname').text())

                d3ck_vpn($('#d3ck_vpn_' + d3ck_status.d3ck_requests.did), d3ck_status.d3ck_requests.did, ip)

            }
            else {
                alertify.reject("remote d3ck refused your request...");
            }
        }
        // knocking
        else {
            console.log('knock knock!')
            // alert(d3ck_status.d3ck_requests.ip_addr + '/' + d3ck_status.d3ck_requests.did)
            var friend = d3ck_status.d3ck_requests.from
            ask_user_4_response({qtype: 'knock', 'from': friend, 'ip_addr': d3ck_status.d3ck_requests.ip_addr, 'did': d3ck_status.d3ck_requests.from_d3ck})
        }
    }

    // if someone has added you, create a modest sized bit of text that tells you
    // and hopefully won't fuck up anything you're doing

    if (d3ck_status.events.new_d3ck_ip.length && ! d3ck_status.browser_events[browser_ip].notify_add) {
        remote_ip   = d3ck_status.events.new_d3ck_ip
        remote_name = d3ck_status.events.new_d3ck_name
        console.log(remote_ip + ' added as friend')

        // a bit down from the top, and stay until wiped away or refreshed

        if (typeof remote_name == "undefined" || remote_name != "")
            $.bootstrapGrowl('"' + remote_name + '" added your D3CK as a friend (you may have to refresh page to see details)', {offset: {from: 'top', amount: 70}, delay: -1})

        d3ck_status.browser_events[browser_ip].notify_add = true
    }

    //
    // did santa, er, filez come?
    //
    else if (d3ck_status.file_events.file_name.length && ! d3ck_status.browser_events[browser_ip].notify_file) {

    // XXX - odd corner case... if both systems have the same IP ... say... testing behind a nat...
    // this probably won't work as expected.....

        console.log('ho ho ho, santa is here with new filez 4 the kidd3z!')

        var friend = all_d3ck_ids[d3ck_status.file_events.did].owner.name
        var dir    = ""

        // try to figure out if we sent it or the remote did

        // if (d3ck_status.file_events.file_from != browser_ip)

        //
        // it shows up in UI's filestore if we *didn't* try to give it to someone else
        //
        if (d3ck_status.file_events.did == my_d3ck.D3CK_ID) {
            console.log('new local file(z)!')

            // does it go into our vault?
            if (d3ck_status.file_events.direction != "local") {
                dir = ' to ' + friend + "/" + d3ck_status.file_events.direction
            }
            else {
                $('#d3ck_cloud_file_listing tr:last').after('<tr><td><a target="_blank" href="/uploads/' + d3ck_status.file_events.file_name + '">' + d3ck_status.file_events.file_name + '</a></td></tr>')
            }

            // put in or lookup PiD, then owner/d3ck's name!
            $.bootstrapGrowl("New file: <strong>" + d3ck_status.file_events.file_name + "</strong>  ("  + d3ck_status.file_events.file_size + " bytes); uploaded", {offset: {from: 'top', amount: 70}, delay: -1})

        }
        else {
            console.log('file(z) from remote')
            $.bootstrapGrowl("File <strong>" + d3ck_status.file_events.file_name + "</strong>  ("  + d3ck_status.file_events.file_size + " bytes) from " + friend + '/' + d3ck_status.file_events.file_from, {offset: {from: 'top', amount: 70}, delay: -1})
            $('#d3ck_cloud_file_listing tr:last').after('<tr><td><a target="_blank" href="/uploads/' + d3ck_status.file_events.file_name + '">' + d3ck_status.file_events.file_name + '</a></td></tr>')
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

    // fire_d3ck_status(d3ck_status)

}

//
// ... nuke the vids and other evidence...
//
function kill_RTC() {

    console.log('die, rtc, die!')

    // kill rtc stuff
    try {
        console.log('hanging up...')
        webrtc.emit('leave')

        console.log('leaving...')
        webrtc.leaveRoom()

        console.log('disconnect?')
        // this seems to be the thing that really works
        webrtc.connection.disconnect();      // die, die, die, really

        // console.log('really leaving..?')
        // webrtc.hangUp()

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

    $('#cat_chat').html('')

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

        go_d3ck_or_go_home()

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

    // deprecated
    return

    console.log('firing status off')
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


//
// draws the drag-n-drop box...
//
function drag_and_d3ck(safe_id, d3ckid, ip) { 

    console.log('DnD3', safe_id, d3ckid, ip)

    if (safe_id != "local") {

        console.log('draggin n d3ckin... to....', safe_id, d3ckid, ip)

        // out with the old, in with the new
        var safe_ip = ip.replace(/\./g, '_')

        $('#vpn_form_' + d3ckid).prepend('\n<div id="div_' + safe_id + '>uploadz...<form action="/up" method="post" enctype="multipart/form-data"><input class="uppity" id="' + safe_id + '" type="file" name="uppity" multiple="multiple" /></form></div>')
    }
    else {
        console.log('local...?  dnd... to....', safe_id, d3ckid, ip)

        safe_id = "uppity"
        ip      = "local"
        d3ckid  = "local"
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
            url:         '/up/' + d3ckid,
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

    var dh = ""

    // XXXXX 
    try {
        dh = d3ckinfo.vpn.dh.join('\n')
    }
    catch (e) {
        dh = ""
    }

    var vpn = {
        port       : d3ckinfo.vpn.port,
        protocol   : d3ckinfo.vpn.protocol,
        ca         : d3ckinfo.vpn.ca.join('\n'),
        key        : d3ckinfo.vpn.key.join('\n'),
        cert       : d3ckinfo.vpn.cert.join('\n'),
        tlsauth    : d3ckinfo.vpn.tlsauth.join('\n'),
        dh         : dh
    }

    var vpn_client = { }

//  var vpn_client = {
//      key        : d3ckinfo.vpn_client.key.join('\n'),
//      cert       : d3ckinfo.vpn_client.cert.join('\n')
//  }

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
//      alert('hmmm... are you connected...?')
//      return
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

    return



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
        if (data.data != "" && data.did != my_d3ck.D3CK_ID)
            $('#cat_chat').prepend('<div><b>'+ data.user + ':</b> ' + data.data + '<br></div>')
    });

    // when the client clicks SEND
    $('#datasend').click( function() {
        var message = {}

        message.did  = my_d3ck.D3CK_ID
        message.user = my_d3ck.owner.name
        message.data = $('#meow').val();
        // var message = $('#meow').val();

        if (message.data != "") {
            $('#cat_chat').prepend('<div><b>'+ my_d3ck.owner.name + ':</b> ' + message.data + '<br></div>')

            console.log('sending...' + JSON.stringify(message))
            $('#meow').val('');
            $('#meow').focus();
            // pack it off to the server
            kittens_mittens.emit('cat_chat', message);
        }

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


//
// read in data about our certs
//

function crypto_411() {

    var url = '/d3ck.crt.json'

    var jqXHR_crypto = $.ajax({
        url: url,
        dataType: 'json'
    })

    jqXHR_crypto.done(function (data, textStatus, jqXHR) {
        console.log('jxq crypto wootz')
        console.log(data)

        // something like.... 
        //
        //  {
        //  "signature algorithm": "sha256WithRSAEncryption",
        //  "issuer": " C=AQ, ST=White, L=D3cktown, O=D3ckasaurusRex, CN=be70d87d65f0cc5d2e6b458037eef436",
        //  "invalid before": "Not Before: Aug 28 01:13:27 2014 GMT",
        //  "invalid after": "Not After : Aug 28 01:13:27 2015 GMT",
        //  "subject": "Subject: C=AQ, ST=White, L=D3cktown, O=D3ckasaurusRex, CN=8205aa2b73ff95b4a5cb7bd70c1691c8",
        //  "public key algorithm" : "Algorithm: rsaEncryption",
        //  "key strength": "2048",
        //  "certificate type": "SSL Server"
        //  }

        var len_cry = _.keys(data).length

        for (var i = 0; i < len_cry; i++) {
            var k = _.keys(data)[i]
            var v = data[k]

            console.log('k:v ', k, v)
            $('#d3ck_crypto').append('<tr><td>' + k  + '</td><td>' + v  + '</td></tr>\n')

        }

    }).fail(function(err) {
        console.log('errz on getting crypto stuff ' + JSON.stringify(err))
    })

}


function inform_user(message) {

    console.log('squawking to user: ' + message)

    var offset_amount = 70
    var offset_from   = 'top'

    $.bootstrapGrowl(message, {offset: {from: offset_from, amount: offset_amount }, delay: -1})

}

//
// (it will eventually!) look up authorization for request, do various things based on this
//
function ask_user_4_response(data) {

    console.log('ask the user....')

    if (typeof data.type == "undefined" || data.type != 'request') {
        console.log("that ain't no question")
        return
    }

    var req = data.d3ck_status.d3ck_requests

// ask_user_4_response({qtype: 'knock', 'from': friend, 'ip_addr': d3ck_status.d3ck_requests.ip_addr, 'did': d3ck_status.d3ck_requests.from_d3ck})

    if (data.event == 'knock') {

        console.log('knock... time to pay the piper...')

        var friend = req.from

        var message = '<h2>' + req.from + '</h2> wants to connect from <span style="font-weight: 600">' + req.ip_addr + '</span><br /><span style="font-weight:100">' + req.from_d3ck + '</span><br />'

        $("#labels", function () {
            alertify.set({
                // delay           : DEFAULT_RING_TIME,
                buttonReverse   : true, 
                labels          : { ok: "Allow", cancel: "Deny" }
            });

            alertify.confirm(message, function (e) {
                console.log('confirm...?')
                console.log(e)

                var answer    = ''
                var post_data = { 'ip_addr' : my_d3ck.ip_addr, 'from_d3ck': req.from_d3ck, 'did': my_d3ck.D3CK_ID }
                post_data     = JSON.stringify(post_data)

                if (e) {
                    console.log('go for it')
                    answer = 'yes'
                    alertify.success("VPN connection will commence...");
                }
                else {
                    answer = 'no'
                    alertify.error('Declined connection from: <br />' + req.from + ' / ' + req.ip_addr)
                }

                $.ajax({
                    type: "POST",
                    url: '/knockReply/' + req.from_d3ck + '/' + answer,
                    headers: { 'Content-Type': 'application/json' },
                    req: post_data,

                    success: function(data, status) {
                        console.log('vampire suck... sess.... ')
                    },
                    fail: function(data, err) {
                        console.log('vampire fuck... me')
                    }
                })
                $('#timer_countdown').TimeCircles().destroy();
            });

            return false;
        });

        $('#alertify').append('<div style="height:150px;width:150px;float:left;" id="timer_countdown" data-timer="' + DEFAULT_RING_TIME + '"></div>')
        // $('body').append('<div style="height:150px;width:150px;" id="timer_countdown" data-timer="' + DEFAULT_RING_TIME + '"></div>')

    //  timer circle
          $('#timer_countdown').TimeCircles({
              total_duration  : DEFAULT_RING_TIME + 1,
              direction: "Counter-clockwise",
              count_past_zero : false,
              time            : {
                  Days            : { show: false },
                  Hours           : { show: false },
                  Minutes         : { show: false },
                  Seconds         : { show: true, color: "#2b94ea"}
              }
          }).addListener(function(unit, value, total) {
              // console.log(DEFAULT_RING_TIME, unit,value,total)
              if (value <= 0) {
                  // alert('wakka!')
                  console.log('clicking... cancel!')
                  $('#alertify-cancel').click()
              }
          });
        // $.bootstrapGrowl('<strong>' + data.from + '</strong> wants to connect\n' + data.ip_addr + '\n' + data.did, { 
        //     offset: { from: 'top', amount: 140}, delay: -1, align: 'center', allow_dismiss: true 
        // })

        // $('.thumbnail').css({"text-overflow": "ellipsis"})
        // $.bootstrapGrowl("My message");
    }

}

