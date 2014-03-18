
//
// after all the HTML loads... let the JS fur fly
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

    // who are we?  Read from file
    var secret_identity = "puck.pid"
    $.ajax({
        url: secret_identity,
        success: function(pid){
            pid = pid.replace('\n', '')
            console.log('got PID... ' + pid)
            puck_id = pid
        },
        error: function(req, text, err) {
            alert('who am I?  ' + err);
        }
    })

    // toss your ip in the footer
    get_ip('#ip_diddy')

    // ... bye bye
    $('body').on('click', '#puck_disconnect', function() { 
        $('body').removeClass('avgrund-active');
        $('.avgrund-popin').remove();

        hang_up() 
    })

    // xxx - from http://soundbible.com/1411-Telephone-Ring.html
    var ring = new Audio("media/ringring.mp3") // load it up

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
            $('#' + puckid).adipoli({
              'startEffect' : 'grayscale',
              'hoverEffect' : 'normal'
            })

        })
     })
  })
})
