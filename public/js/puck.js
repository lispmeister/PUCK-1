//
// helper functions for initial PUCK prototype
//
// draw pucks, delete pucks, start vpns... various things
//

// track all puck IDs...
all_puck_ids   = []

// overall connection state
var puck_current            = {}
    puck_current.incoming   = false;
    puck_current.outgoing   = false;

var puck_status     = "{}",
    old_puck_status = "{}"

var incoming_ip = "?"

var ring = ""

var poll = 500  // 2x a second
var poll = 1000  // once a second
var poll = 5000  // every 5 secs

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

        // bootstrap tables
//      var size_of_table = n
//      var size_of_pages = 10
//      var total_pages   = Math.floor(size_of_table/size_of_pages) + 1

//      console.log(size_of_table, total_pages)

        // bootstrap tables
//      var bs_options = {
//          currentPage: 1,
//          bootstrapMajorVersion: 3,
//          totalPages: total_pages
//      }

//      $('body').on('change', '#' + cat + '_pager', function() {
//          console.log('presto change-o')
//          if (total_pages > 1) 
//              $(this).bootstrapPaginator(bs_options);
//              // $('#' + cat + '_pager').bootstrapPaginator(bs_options);
//      })

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
// hang up the phone, return to home
//
function hang_up() {

    console.log('hanging up!')

    // the bells... the bells... make them stop!
    try {
        ring.pause();
        ring.currentTime = 0;
    }
    catch(e) {
        console.log("haven't played anything yet - " + e)
    }

    var url = "/vpn/stop"

    var jqXHR_stopVPN = $.ajax({
        url: url,
        dataType: 'json',
    }) 

    jqXHR_stopVPN.done(function (data, textStatus, jqXHR) {
        console.log('jxq hangup wootz')
        console.log(data)
    }).fail(function(err) {
        console.log('errz on hangup' + err)
        alert('error on hangup!')
    })

    // kill the UI signs
    remove_signs_of_call()

    // XXX - need to see if initiated call or not and set appropriately
    puck_current.incoming = false
    puck_current.outgoing = false

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
        var ip = data.ip
        $('#ip_diddy').prepend("Your IP address is: " + ip + " ... ");
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
        console.log("posto facto: " + msg );
    })
    pvpn.fail(function(xhr, textStatus, errorThrown) {
        console.log('failzor -> ' + xhr.responseText)
    })

//  var callback = function(result, form){
//      if(!result)
//          form.submit();
//  }

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
            console.log('success with ' + element_id) 

            // make the button clickable and green
            if (data.status == "OK") {
                console.log('ok...')
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
   
console.log('post-pingy ' + puckid + '... putting into ' + element_id)

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

//
// ... snag /status all the time
//
function get_status(){

    // console.log('gs')

    var url = "/status"

    var jqXHR_get_status = $.ajax({ url: url, })

    jqXHR_get_status.done(function (data, textStatus, jqXHR) {
        // console.log('status wootz');
        puck_status = data

        // if something is new, do something!
        if (old_puck_status != puck_status) {
            console.log('something new in the state of denmark!')
            old_puck_status = puck_status
            status_or_die()
        }
            
    }).fail(ajaxError);

}

function infinite() {
    get_status()
    setTimeout(infinite, poll)
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


//
// get status... or... well....
//
function status_or_die() {

    console.log('sailing on the sneeze of cheeze')

    // real json or the fake stuff?
    try {
        jdata = JSON.parse(puck_status)
    }
    // catch and move on
    catch(e){
        console.log('not json data...' + e)
        return
    }
 
    console.log(jdata)

    // default to down
    if (typeof jdata.openvpn_server == "undefined" || isEmpty(jdata.openvpn_server)) {
        jdata.openvpn_server = {}
        jdata.openvpn_server.vpn_status = "down"
        puck_current.incoming = false
    }
    if (typeof jdata.openvpn_client == "undefined" || isEmpty(jdata.openvpn_client)) {
        jdata.openvpn_client = {}
        jdata.openvpn_client.vpn_status = "down"
        puck_current.outgoing = false
    }

    // new kid on the block?  Happens when a remote adds you
    if (typeof jdata.events == "undefined" || isEmpty(jdata.events)) {
        console.log('jdata.events who?')
        console.log(jdata.events)
        jdata.events = {}
        jdata.events.new_puck = ""
    }
    else {
        console.log('jdata.events:')
        console.log(jdata.events)
    }

    console.log('I hear something...')
    console.log(puck_current)
    console.log('big data')
    console.log(jdata)

    // if someone has added you, create a modest sized bit of text that tells you 
    // and hopefully won't fuck up anything you're doing
    if (jdata.events.new_puck.length) {
        var remote_ip = jdata.events.new_puck
        console.log(remote_ip + ' added!')
        // a bit down from the top, and stay until wiped away or refreshed
        $.bootstrapGrowl(remote_ip + " added your PUCK as a friend (refresh page to see more)", {offset: {from: 'top', amount: 70}, delay: -1})
        jdata.events.new_puck = ""

// <input type="button" value="Reload Page" onClick="history.go(0)">
    }

    // server
    if (jdata.openvpn_server.vpn_status == "up") {
        // ensure video button is enabled if a call is in progress
        $('#puck_video').removeClass('disabled')
    
        if (typeof puck_current.incoming != "undefined" && ! puck_current.incoming) {
            console.log('incoming ring from ' +  jdata.openvpn_server.client)
            incoming_ip = jdata.openvpn_server.client
            // ring them gongs
            $('#incoming')[0].click()
        }

        puck_current.incoming = true
    }

    // client
    if (jdata.openvpn_client.vpn_status == "up") {

        $('#puck_video').removeClass('disabled')
        
                
        if (typeof puck_current.outgoing != "undefined" && ! puck_current.outgoing) {
            console.log('outgoing ring!')
            window.location.href = "/vpn.html"
        }

        puck_current.outgoing = true
    }

    if (jdata.openvpn_server.vpn_status == "down" && jdata.openvpn_client.vpn_status == "down") {
        console.log('everything dead, shut it down...!')
        $('body').removeClass('avgrund-active');
        hang_up()
    }

}


//
// when disconnected, kill all the UI signs we put up
// 
function remove_signs_of_call() {

    console.log('killing call signatures...')

    $('.puck_vpn').text("Call").removeClass("btn-danger")
    $('#puck_video').addClass('disabled')
    $('.avgrund-popin').remove();

}

