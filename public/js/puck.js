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

    var host = window.document.location.host.replace(/:.*/, '')
    var socket = io.connect()

    // deals with all the message stuff... if we see anything... go here:
    socket.on('connect', function () {
            socket.emit('weasels in your trou!');
    });
  
    socket.on('status', function (data) {

        console.log('sailing on the sneeze of cheeze')
        console.log(data)

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
            $('#puck_video').addClass('disabled')
            // xxx ... kill avg?
        }

    })
}


//
// after all is said and done... let the JS fur fly
//

$(document).ready(function () {


var image     = ""
var puck_id   = ""
puck_data     = ""

// all the message handlers and logic stuffed in here
message_or_die()

// disable a/href pushing if disabled
$('body').on('click', 'a.disabled', function(event) {
    event.preventDefault();
});

// toss your ip in the footer
get_ip('#ip_diddy')

// ... bye bye
$('body').on('click', '#puck_disconnect', function() { 
    $('body').removeClass('avgrund-active');
    $('.avgrund-popin').remove();

    hang_up() 
})

// xxx - from http://soundbible.com/1411-Telephone-Ring.html
// var ring = new Audio("media/ringring.mp3") // load it up

// var in_or_out = "Calling..."

$('#outgoing').avgrund({
    onLoad: function (element) {
        // console.log('This function will be called before dialog is initialized');
        // ring ring - play sound
        ring.play()
    },
    height: 120,
    width: 600,
    holderClass: 'custom',
    showClose: true,
    showCloseText: 'Close',
    enableStackAnimation: true,
    onBlurContainer: '.container',
    template: '<div class="row">' +
              '<div class="col-md-4"><img src="img/ringring.gif"></div>' +
              '<a style="text-decoration: none" href="/vpn.html"><div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="puck_answer" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Calling</span></button></div></a>'  +
              '<div class="col-md-4 top-spacer50"><button data-loading-text="hanging up..." class="btn btn-warning nounderline" id="puck_disconnect" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Disconnect</span></a></button></div>' +
              '</div>'
    })

$('#incoming').avgrund({
    onLoad: function (element) {
        // console.log('This function will be called before dialog is initialized');
        // ring ring - play sound
        ring.play()
    },
    height: 120,
    width: 600,
    holderClass: 'custom',
    showClose: true,
    showCloseText: 'Close',
    enableStackAnimation: true,
    onBlurContainer: '.container',
    template: '<div class="row">' +
              '<div class="col-md-4"><img src="img/ringring.gif"></div>' +
              '<div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="puck_answer" type="button"><a style="text-decoration: none" href="/vpn.html"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Call...</span></a></button></div>'  +
              '<div class="col-md-4 top-spacer50"><button data-loading-text="hanging up..." class="btn btn-warning nounderline" id="puck_disconnect" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Disconnect</span></a></button></div>' +
              '</div>'
    })

// if click above, disconnect

// get the pucks we know about from local REST
$.getJSON('/puck', function(pucks) {

    // loop over all valid pucks
    $.each(pucks, function(key, val) {

        $('#puck_loading').hide()

        // for each puck get more detailed data
        $.getJSON('/puck/' + val, function(puckinfo) {
            console.log('v/p')
            console.log(val)
            console.log(puck_id)
    
            if (puck_id == val) {
                puck_data = puckinfo
            }
    
           var name        = truncate(puckinfo.PUCK.name)
           var owner       = truncate(puckinfo.PUCK.owner.name)
           var email       = truncate(puckinfo.PUCK.owner.email)
           var puckid      = puckinfo.PUCK['PUCK-ID']
           var ipaddr      = puckinfo.PUCK.ip_addr
           var port        = puckinfo.PUCK.port
           var ipaddr_ext  = puckinfo.PUCK.ip_addr_ext
           var port_ext    = puckinfo.PUCK.port_ext
           var proto       = puckinfo.PUCK.proto
           var image       = puckinfo.PUCK.image
           var ca          = puckinfo.PUCK.vpn.ca
           var key         = puckinfo.PUCK.vpn.key
           var cert        = puckinfo.PUCK.vpn.cert
           var dh          = puckinfo.PUCK.vpn.dh
           
           var vpn_form    = 'vpn_form_' + puckid
    
           console.log('puckasaurus:')
           console.log(puckinfo)
           console.log('puck particulars:')
           console.log(puckinfo.PUCK)
    
           if (typeof port === 'undefined' || port == "") {
               // XXXX
               port     = 8080
               port_ext = port
           }
           if (typeof ipaddr_ext === 'undefined' || ipaddr_ext == "") {
               ipaddr_ext = ipaddr
           }
           if (typeof proto === 'undefined' || proto == "") {
               proto = 'https'
           }
    
           var puck_url         = proto + '://' + ipaddr_ext + ':' + port_ext
    
           // have to kill spaces... die, die, die!
           puckid = puckid.replace(/\s+/g, '');
    
           var trunc_puckid     = truncate(puckid)
    
           // keep track of everything
           all_puck_ids[puckid] = puckid
    
           var puck = {
              puckid         : puckid,
              name           : name,
              trunc_puckid   : trunc_puckid,
              owner          : owner,
              email          : email,
              image          : image,
              ipaddr         : ipaddr,
              url            : puck_url,
              vpn_form       : vpn_form,
              span_owner     : 'span_' + owner,
              span_email     : 'span_' + email
              }
    
           // basic single puck layout, 'stache style
               // '<li class="span3" id="{{puckid}}">'                                                        +
               // '<div class="thumbnail">'                                                                +
           var template = 
                '<div class="col-md-3">' + 
                 '<div class="thumbnail" id="{{puckid}}">'                                                +               
                    '<a href="/puck_details.html?puckid={{puckid}}">'                                     +
                    '<img id="{{puckid}}" width=128 style="padding: 4;" src="{{image}}"></a> <br />'      +
                    '<div class="caption">'                                                               +
                       '<span id="{{name}}"><h5>PUCK: {{name}} </h5> </span> <br />'                      +
                       '<span id="{{owner}}"> Owner: <strong>{{owner}}</strong>   </span> <br />'         +
                       '<span id="{{ipaddr}}">Server: <strong>{{ipaddr}}</strong> </span> <br />'         +
                       '<span id="{{ipaddr}}">URL: <strong>{{url}}</strong> </span> <br />'               +
                       '<span id="{{email}}"> Email: <strong>{{email}}</strong>   </span> <br />'         +
                       '<form id="{{vpn_form}}" action="/vpn/start" method="POST">'                             +
                       '<input style="display:none" name="puckid"  value={{puckid}}>'    +
                       '<input style="display:none" name="ipaddr"  value={{ipaddr}}>'           +
                       '<input style="display:none" name="vpn_action" value="VPN" />'     +
                       '<button type="submit" id="puck_vpn" style="margin: 10px" class="btn disabled">Call</button>' +
                       '</form>'                                                                          +
                    '</div>'                                                                              +
                 '</div>'                                                                                 +
               '</div>'                                                                                   
    
            //   '</div>'                                                                                 +
            //'</li>'
    
            // let the 'stache go to town!
            var puck_html = Mustache.to_html(template, puck);
    
            // $('#puck_details').html(html);
            $("#puck_friends").append(puck_html)
            // console.log('\nMUSTACHE!!!:\n' + puck_html + '\n\n')
    
            // add the real ID
            // CHANGE THE ID!   make the VPN button point to the right PUCK
            $('#puck_vpn').attr('id', 'puck_vpn_' + puckid)
    
            // pingy - check if system is up
            puck_ping(ipaddr, puckid, puck_url)
    
            // start images in gray, color (if avail) on mouseover
            // console.log('adipoli: ' + puckid)
//          $('#' + puckid).adipoli({
//            'startEffect' : 'grayscale',
//            'hoverEffect' : 'normal'
//          })

        })
    })
})

})

