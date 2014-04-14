//
// helper functions for initial PUCK prototype
//
// draw pucks, delete pucks, start vpns... various things
//

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

var my_puck = {}

// xxx - from http://soundbible.com/1411-Telephone-Ring.html
ring = new Audio("media/ringring.mp3") // load it up

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
            cat_herd[i] = cat
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
    var cat_e     = cat + "_table_events"

    var base_table = '<div class="row-fluid marketing">' +
                     '<div class="spacer20"> </div>'     +
                     '<div><h4 class="text-primary">'    + cat + '</h4></div>' +
                     '<table class="table table-condensed table-hover table-striped" id="' + cat_e + '"></table>'    +
                     '<ul id="' + cat + '_pager"></ul>'  +
                     '</div>'                            +
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


//
// when vpn status/state changes... set lights flashing, whatever
//
function state_vpn(state) {

    if (state == "incoming") {
        // ensure video button is enabled if a call is in progress
        $('#puck_video').removeClass('red').addClass('green')
        console.log('incoming ring from ' +  puck_status.openvpn_server.client)
        incoming_ip = puck_status.openvpn_server.client
        // ring them gongs
        $('#incoming')[0].click()

        puck_status.browser_events[browser_ip].notify_file = true

        other_puck = puck_status.openvpn_server.client
    }
    if (state == "outgoing") {
        $('#puck_video').removeClass('red').addClass('green')
        console.log('outgoing ring!')
        state_ring('true')
        puck_status.browser_events[browser_ip].notify_ring = true

        fire_puck_status(puck_status)

        other_puck = puck_status.openvpn_client.server

        // redirect to vpn page
        window.location.href = "/vpn.html"
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
function event_connect(direction, puck, element) {

    console.log('connexting')

    //
    // energize modals
    //
    // "Avgrund is Swedish for abyss"
    $(element).avgrund({
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
                  '<a style="text-decoration: none" href="/vpn.html"><div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="puck_answer" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span id="vpn_target" style="color: #fff !important;">Calling</span></button></div></a>'  +
                  '<div class="col-md-4 top-spacer50"><button data-loading-text="hanging up..." class="btn btn-warning nounderline" id="puck_disconnect" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Disconnect</span></a></button></div>' +
                  '</div>'
        })

    state_ring('true')

    // xxx - conf file, obv....
    var ring_img = '<img src="/img/ringring.gif">'
    // after popup, add target
    $('#vpn_target').on('change', '#vpn_target').append(' ' + puck)
    $('#puck_ring_img').on('change', '#puck_ring_img').html(ring_img)

}

//
// hang up the phone, return to home
//
function event_hang_up() {

    console.log('hanging up!')

    state_ring('false')

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
    
    $.ajax({
        type: "POST",
        url: "/form",
        headers: {
            'Content-Type': 'application/json',
        },
        data: post_data,
        success: function(data, status) {
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

    $.get(ping_url)
        .success(function(data) {
            // console.log('success with ' + element_id) 

            // make the button clickable and green
            if (data.status == "OK") {
                // console.log('ok...')
                $('#'+element_id).addClass('btn-success').removeClass('disabled')
            }
            else {
                console.log('not ok...')
                $('#'+element_id).removeClass('btn-success').addClass('disabled')
            }

        })
        .error(function(error){
            console.log( "ping error for " + ping_url)
            $('#'+element_id).removeClass('btn-success').addClass('disabled')
            console.log(error)
        })
        .fail(function(error) { 
            console.log( "ping failure for " + ping_url)
            console.log(error)
            $('#'+element_id).removeClass('btn-success').addClass('disabled')
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
};


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

// conf file fodder
var PUCK_TIMEOUT         = 5000 // 5 seconds should be enough for anyone!
var PUCK_RECONNECT_DELAY =  100

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
// ... snag /status all the time
//
function status_loop(){

    console.log('status loop')

    // sow the seed o' doubt
    get_status()

    // local = our PUCK
    socket = io.connect('/', {
        'connect timeout': PUCK_TIMEOUT,
        // 'try multiple transports': true,
        'reconnect': true,
        'reconnection delay': PUCK_RECONNECT_DELAY,
        'reconnection limit': PUCK_TIMEOUT,
        'max reconnection attempts': Infinity,
        // 'sync disconnect on unload': false,
        'auto connect': true,
        'force new connection': true
        })

    socket.on('connect', function(sock){
        console.log('[+++] - general connext note')

    // i has arrived
    socket.emit('new_puck', my_puck.PUCK_ID);

    // everyone loves cat facts!
    // listener, whenever the server emits 'chat_receive', this updates the chat body
    socket.on('chat_receive', function (stamp, username, data) {
        // seem to get some odd things
        console.log(stamp)
        console.log(username)
        console.log(data)

        console.log('[+++] - cat facts!')
        console.log(data)

        $('#ip_diddy').append('<br />' + data.fact)

    })
    //  console.log(data.fact)
    //  console.log(data.server)

    socket.on('puck_status', function (data) {
        console.log('[@] + cat facts... wait...no... status :(')
        console.log(JSON.stringify(data))
        console.log(typeof data)

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
        }
    })
   
    socket.on('error', function(err){
        console.log('remote errz ' + JSON.stringify(err))
    })

    socket.on('reconnect', function(d) { 
        console.log ('reconnect') 
        fire_puck_status(puck_status)
    })

    socket.on('error',            function(d) { console.log ('error') ; console.log(d) })
    socket.on('connecting',       function(d) { console.log ('connecting') })
    socket.on('reconnecting',     function(d) { console.log ('reconnecting') })
    socket.on('connect_failed',   function(d) { console.log ('connect failed') })
    socket.on('reconnect_failed', function(d) { console.log ('reconnect failed') })
    socket.on('close',            function(d) { console.log ('close') })
    socket.on('disconnect',       function(d) { console.log ('disconnect') })
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
    if (puck_status.openvpn_server.vpn_status == "up" && ! puck_status.browser_events[browser_ip].notify_file) {
        state_vpn('incoming')
    }

    console.log('outgoing...?')

    // client... outgoing ring
    if (puck_status.openvpn_client.vpn_status == "up" && puck_status.browser_events[browser_ip].notify_ring != true) {
        state_vpn('outgoing')
    }

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

    // console.log('killing call signatures...')
    $('.puck_vpn').text("Call").removeClass("btn-danger")
    $('#puck_video').addClass('disabled')
    $('#puck_video').removeClass('green').addClass('red')
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
