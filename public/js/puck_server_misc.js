//
// helper functions for initial PUCK prototype
//
// draw pucks, delete pucks, start vpns... various things
//

// track all puck IDs...
all_puck_ids  = []

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

function puck_create() {

   var ip_addr  = document.getElementById('ip_addr').value

   $('#puck_button_create').text("... checking")

// var result = puck_ping('', 'https://' + ip_addr + '8080')

// console.log('ping result...\n\n')

// console.log(result)

}

//
// if they hit create puck... post data to server,
// which calls a program to do the work
// 
function _old_puck_create() {

   $('#puck_button_create').text("... creating ...")

   var puckname = document.getElementById('puckname').value
   var ip_addr  = document.getElementById('ip_addr').value
   var owner    = document.getElementById('owner').value
   var email    = document.getElementById('email').value
   var image    = document.getElementById('image').value

   // some actual input validation will prevent puck's getting here w/o a valid name
   var blank_puck                = {}
   blank_puck['value']           = ' ... '
   blank_puck['key']             = puckname
   blank_puck['image']           = image
   blank_puck['ip_addr']         = ip_addr
   blank_puck['owner']           = owner
   blank_puck['email']           = email
   blank_puck['puck_action']     = 'CREATE'

   var json_puck = JSON.stringify(blank_puck);

   post ("/puck", json_puck)

}

//
// well...  sort of... pingish... send ping request to PUCK server
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


function poll_status(status_file, frequency){
    window.setInterval(function () {
        $.ajax({ 
            url: status_file, 
            dataType: "json",
            success: function(data){
                console.log('got status file... ' + status_file)
                console.log(data)

                if (typeof data.vpn_status != "undefined") {
                    if (data.vpn_status == "up") {
                        $('#puck_video').removeClass('disabled')
                        
                        var page = window.location.pathname.split('/')[1]

                        console.log("we're on... " + page)

                        // if we're not on the vpn page, ring
                        if (page != "vpn.html") {
                            console.log('trying .... to... ring!')
                            $('#incoming')[0].click()
                        }
                        // else {
                        //     console.log('no ring, on vpn page')
                        // }
                    }

                    else {
                        $('#puck_video').addClass('disabled')
                    }

                }
                else {
                    $('#puck_video').addClass('disabled')
                }
            }})
    }, frequency); // repeat every X seconds
}

//
// after all the HTML... let the JS fur fly
//
$(document).ready(function () {
  var image = ""

    // disable a/href pushing if disabled
    $('body').on('click', 'a.disabled', function(event) {
        event.preventDefault();
    });


  // get the pucks we know about from local REST
  $.getJSON('/puck', function(pucks) {
     // loop over all valid pucks
     $.each(pucks, function(key, val) {
        // for each puck get more detailed data
        $.getJSON('/puck/' + val, function(puckinfo) {

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
                       '<button type="submit" id="puck_vpn" style="margin: 10px" class="btn disabled">VPN</button>' +
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
            $('#' + puckid).adipoli({
              'startEffect' : 'grayscale',
              'hoverEffect' : 'normal'
            })

        })
     })
  })
})

