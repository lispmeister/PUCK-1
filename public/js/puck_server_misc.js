//
// helper functions for initial PUCK prototype
//
// draw pucks, delete pucks, start vpns... various things
//

// track all puck IDs...
all_puck_ids   = []

// overall connection state
puck_current = {}
puck_current.incoming   = false
puck_current.outgoing   = false

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

    var url = "/vpn/stop"

    var jqXHR_getIP = $.ajax({
        url: url,
        dataType: 'json',
    }) 

    jqXHR_getIP.done(function (data, textStatus, jqXHR) {
        console.log('jxq hangup wootz')
        console.log(data)
//      window.location = '/puck.html'

    }).fail(function(err) {
        console.log('errz on hangup' + err)
        alert('error on hangup!')
//      window.location = '/puck.html'
    })
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
function puck_vpn(pid, ip) {

   $('#puck_vpn' + pid).text("... connecting to " + ip + " : " + pid)

   console.log('firing up VPN ' + pid)

   // pack it all in
   var vpn_puck    = {}

   vpn_puck['pid']    = pid
   vpn_puck['ip']     = ip
   vpn_puck['action'] = '/vpn/start'

   var json_puck = JSON.stringify(vpn_puck);

   console.log('posting' + json_puck)

   post ("/vpn/start", vpn_puck)

   window.location = '/puck.html'

}

//
// if they hit create puck... post data to target server,
// 
// function puck_create(ip_addr) {
// 
//     console.log('js puck_create')
// 
//     var delay = 10000
// 
//     $('#puck_button_create').text("... creating ...")
// 
//     var json_puck = JSON.stringify(puck_data);
// 
//     $.ajax({
//         url : 'https://' + ip_addr + ':8080/puck/swap',
//         type: "post",
//         data : json_puck,
//         success: function(data, textStatus, jqXHR) {
//             console.log('successfully posted request')
//             console.log(data)
//         },
//         error: function (jqXHR, textStatus, errorThrown) {
//             console.log('down, down, down she goes... post failed')
//             console.log('"' + errorThrown + '"')
//         }
//     });
// 
// }


// for love notes to the server and back


//
// well...  sort of... pingish... send ping request to PUCK server
//
// farm out https requests to remote systems since js/jquery balk at that kinda shit
//
function puck_ping(ipaddr, id, url) {

   console.log('in puck_ping')

   console.log(ipaddr, id, url)

   // var ping_url = url + '/ping'

   var ping_url = '/sping/' + ipaddr

   var ping_id  = ''

   // if we're alive, this will get put in
   var vpn_form = 'vpn_form_' + id

   // element_id='puck_' + id + '_ip_addr'
   var element_id='puck_vpn_' + id

   console.log('pinging ' + id + ' ... URL ... ' + ping_url)

   $.getJSON(ping_url)
   .done(function(data) {
      console.log('success with ' + element_id) 

      if (id == '') { return(data) }

      // make the button clickable and green
      $('#'+element_id).addClass('btn-success')
      $('#'+element_id).removeClass('disabled')
   })
   .fail(function(data) { 
      console.log( "ping failure for " + ping_url)
      console.log(data)
      if (id == '') { return(data) }
   })
   
console.log('post-pingy ' + id + '... putting into ' + element_id)

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

//
// deal with the browser<->server messages... we get status notes this way,
// among potentially other things
//
function message_or_die() {

    // connect
    var primus = Primus.connect('/')

// xxxx... need to consider workflow... what if talking to
// someone and another tries to call?

    // primus deals with all the message stuff... if we see anything... go here:
    primus.on('data', function (data) {
        console.log('sailing on the sneeze of cheeze')
        console.log(data);

        // real json or the fake stuff?
        try {
            jdata = JSON.parse(data)
        }
        // catch and move on
        catch(e){
            console.log('not json data...' + e)
            return
        }
 
        // default to down
        if (typeof jdata.openvpn_server == "undefined") {
            jdata.openvpn_server = {}
            jdata.openvpn_server.vpn_status = "down"
            // puck_current.incoming = false
        }
        if (typeof jdata.openvpn_client == "undefined") {
            jdata.openvpn_client = {}
            jdata.openvpn_client.vpn_status = "down"
            // puck_current.outgoing = false
        }

        console.log('I hear something...')
        console.log(puck_current)

        // where are we?
        // var page = window.location.pathname.split('/')[1]

        // server
        if (jdata.openvpn_server.vpn_status == "up") {
            // ensure video button is enabled if a call is in progress
            $('#puck_video').removeClass('disabled')
        
            if (typeof puck_current.incoming != "undefined" && ! puck_current.incoming) {
                console.log('incoming ring!')
                // ring them gongs
                $('#incoming')[0].click()
            }

            puck_current.incoming = false
        }

        // client
        if (jdata.openvpn_client.vpn_status == "up") {

            $('#puck_video').removeClass('disabled')
        
                
            if (typeof puck_current.outgoing != "undefined" && ! puck_current.outgoing) {
            // xxx ... kill avg?
                console.log('incoming ring!')
                // ring them gongs
                $('#outgoing')[0].click()
            }

            puck_current.outgoing = false
        }


        if (jdata.openvpn_server.vpn_status == "down" && jdata.openvpn_client.vpn_status == "down") {
            console.log('everything dead, shut it down...!')
            $('#puck_video').removeClass('disabled')
            // xxx ... kill avg?
        }

    })
}

