//
// after all is said and done... let the JS fur fly
//

var vpn_server = "local"

// poll until we get something, then stop polling
var vault_poll     = 1000
var already_polled = false
var vpn_started    = false

$(document).ready(function () {
    
    var image     = ""
    // var puck_id   = ""
    puck_data     = ""
    

    var tt = ['puck_top_left', 'puck_top_cog', 'puck_top_home', 'puck_top_skull',
              'puck_top_ewe', 'puck_top_love', 'puck_top_cloud', 'puck_top_messages']

    for (var i = 0 ; i < tt.length; i++) {
        $('#' + tt[i]).popover( {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    }

    //  $('#puck_top_left').tooltip(    {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_cog').tooltip(     {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_home').tooltip(    {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_skull').tooltip(   {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_ewe').tooltip(     {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_love').tooltip(    {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_cloud').tooltip(   {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    //  $('#puck_top_messages').tooltip({delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})

    // status loop
    infinite()
    
    // disable a/href pushing if disabled
    $('body').on('click', 'a.disabled', function(event) {
        event.preventDefault();
    });
    
    // enable tabs
    $('.ul nav-tabs a').click(function (e) { e.preventDefault(); $(this).tab('show') })

    // enable tabs
    $('#puck_trust_generate a').click(function  (e) { e.preventDefault(); $(this).tab('show') })
    $('#puck_trust_you a').click(function       (e) { e.preventDefault(); $(this).tab('show') })
    $('#puck_trust_explore a').click(function   (e) { e.preventDefault(); $(this).tab('show') })

    // enable some special buttons
    $('#puck_panic').click(function     (e) { panic_button() })
    $('#restart_server').click(function (e) { restart_server() })
    $('#stop_server').click(function    (e) { stop_server() })

    //
    // setup user drag/click files to browser
    //
    setInterval(drag_and_puck, vault_poll)

    // load up filenames already in vault
    load_vault()
    
    //
    // user clicks vpn, and....
    //
    $('body').on('click', '.puck_vpn', function() {
        $(this).unbind('click')
    })

    // ring them gongs
    $('body').on('click', '.puck_vpn', function() {
        $('#outgoing').click()
    })

    // after avg is up, add target
    $(document).on('change', '#vpn_target', function() {
        console.log('about to append...')
        $('#vpn_target').append(' ' + target)
        console.log('append target!')
    })

    $('body').on('submit', '.puck_vpn', function() { 
        e.preventDefault()
        var vpuckid = $("#puckid").val()
        var ipaddr  = $("#ipaddr").val()
        var target  = $("#name").val()
        // put in vpn target when calling someone
    // setInterval(puck_ping, slight_hesitation)
        puck_vpn(this, vpuckid, ipaddr)
    
    })
    
    //
    // user clicks create, and....
    //
    // build suspense....
    $('body').on('click', '#puck_button_create', function(event) { 
        console.log('hijax create')
        event.preventDefault();
    
        var ip_addr = $("#ip_addr").val()
    
        puck_create(this, ip_addr)
    
    })
    
    
    // xxx - from http://soundbible.com/1411-Telephone-Ring.html
    ring = new Audio("media/ringring.mp3") // load it up
    
    // toss your ip in the footer
    get_ip('#ip_diddy')

    // ... bye bye
    $('body').on('click', '#puck_disconnect', function() { 
        $('body').removeClass('avgrund-active');
        hang_up() 
    })

    //
    // energize modals
    //
    // "Avgrund is Swedish for abyss"
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
        setEvent: 'click',
        template: '<div class="row">' +
                  '<div class="col-md-4"><img src="img/ringring.gif"></div>' +
                  '<a style="text-decoration: none" href="/vpn.html"><div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="puck_answer" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span id="vpn_target" style="color: #fff !important;">Calling</span></button></div></a>'  +
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
        setEvent: 'click',
        template: '<div class="row">' +
                  '<div class="col-md-4"><img src="img/ringring.gif"></div>' +
                  '<div class="col-md-4 top-spacer50"><button class="btn btn-primary nounderline" id="puck_answer" type="button"><a style="text-decoration: none" href="/vpn.html"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Call from ' + incoming_ip + '</span></a></button></div>'  +
                  '<div class="col-md-4 top-spacer50"><button data-loading-text="hanging up..." class="btn btn-warning nounderline" id="puck_disconnect" type="button"><span style="color: #fff !important;" class="glyphicon glyphicon-facetime-video"></span> <span style="color: #fff !important;">Disconnect</span></a></button></div>' +
                  '</div>'
        })
    
    // if click above, disconnect
    
    var my_puck = {}
    
    // get the pucks we know about from local REST
    $.get('/ping', function(puck) {
        my_puck = puck
    
        console.log('my name/id/status are: ', my_puck.name, my_puck.pid, my_puck.status)
    
        my_puck_status = 'Name: ' + my_puck.name + '<br />Status: ' + my_puck.status + '<br />ID: ' + my_puck.pid
    
        if (my_puck.status == "OK")
            // $('#puck_status').addClass('btn-success').removeClass('disabled')
            $('#puck_status').addClass('green').removeClass('red')
        else
            $('#puck_status').removeClass('green').addClass('red')
            // $('#puck_status').removeClass('btn-success').addClass('disabled')
    
        $('#puck_status').attr("data-toggle", "popover").attr("data-placement", "bottom").attr("data-html", "true").attr("title", "PUCK Status").attr("data-content", my_puck_status).popover({delay: { hide: 200 }, trigger: "hover"})
    
    })
    
    
    // get the pucks we know about from local REST
    $.getJSON('/puck', function(pucks) {
    
        if (pucks.length == 1) {
            $('#puck_friends').append("<div class='row'><div class='col-md-4 top-spacer-50'>It appears you have no friends... but don't worry, we won't tell everyone you're a loser.  Click on the green/white plus button above to add another PUCK, assuming their owner would be willing to talk to you (and you know their IP address or hostname).  Maybe I can link in some <a target='_blank' href='https://www.youtube.com/watch?v=oHg5SJYRHA0'>youtube videos</a> and break out <a target='_blank' href='http://www.amazon.com/Orville-Redenbacher-Butter-Popcorn-10-Count/dp/B0049M7LA2'>the popcorn</a> if that doesn't work for you.'</div></div>")
        }
    
        // loop over all valid pucks
        $.each(pucks, function(key, val) {
    
            $('#puck_loading').hide()
    
            // for each puck get more detailed data
            $.getJSON('/puck/' + val, function(puckinfo) {
                console.log('v/p')
                console.log(val)
        
                // bit of a race condition... figure out how to get the puckID of
                // this PUCK (see above) prior to these so I can not put it up
                // on the screen... lots of ways to do this....
                if (my_puck.pid == val) {
                    my_puck = puckinfo
                }
                else {
    
                    var name        = truncate(puckinfo.name)
                    var owner       = truncate(puckinfo.owner.name)
                    var email       = truncate(puckinfo.owner.email)
                    var puckid      = puckinfo.PUCK_ID
                    var ipaddr      = puckinfo.ip_addr
                    var all_ips     = puckinfo.all_ips
                    var port        = puckinfo.port
                    var ipaddr_ext  = puckinfo.ip_addr_ext
                    var port_ext    = puckinfo.port_ext
                    var proto       = puckinfo.proto
                    var image       = puckinfo.image
                    var ca          = puckinfo.vpn.ca
                    var key         = puckinfo.vpn.key
                    var cert        = puckinfo.vpn.cert
                    var dh          = puckinfo.vpn.dh
                    
                    var vpn_form    = 'vpn_form_' + puckid
             
                    console.log('puckasaurus:')
                    console.log(puckinfo)
                    console.log('puck particulars:')
                    console.log(puckinfo)
             
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
                       all_ips        : all_ips,
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
                          '<div class="thumbnail" style="background-color: #eaf1f1" id="{{puckid}}">'                                                +               
                             '<a href="/puck_details.html?puckid={{puckid}}">'                                     +
                             '<img id="{{puckid}}" width=128 style="padding: 4;" src="{{image}}"></a> <br />'      +
                             '<div class="caption">'                                                               +
                                '<span id="{{name}}"><h5>PUCK: {{name}} </h5> </span> <br />'                      +
                                '<span id="{{owner}}"> Owner: <strong>{{owner}}</strong>   </span> <br />'         +
                                '<span id="{{ipaddr}}">Server: <strong>{{ipaddr}}</strong> </span> <br />'         +
                                '<span id="{{ipaddr}}">URL: <strong>{{url}}</strong> </span> <br />'               +
                                '<span id="{{email}}"> Email: <strong>{{email}}</strong>   </span> <br />'         +
                                '<form id="{{vpn_form}}" action="/vpn/start" method="POST">'                             +
                                '<input style="display:none" id="puckid" name="puckid"  value={{puckid}}>'    +
                                '<input style="display:none" id="ipaddr" name="ipaddr"  value={{ipaddr}}>'           +
                                '<input style="display:none" name="vpn_action" value="VPN" />'     +
                                '<button type="submit" id="puck_vpn" style="margin: 10px" class="puck_vpn meter cherry btn disabled">Call</button>' +
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
         
                     // check interval
                     ping_poll = 10000
         
                     // pingy - check if system is up... do it once, then at regular intervals
                     puck_ping(all_ips, puckid, puck_url)
                     // args are function, timeout, function (ips, pid, and url)
                     setInterval(puck_ping, ping_poll, all_ips, puckid, puck_url)
             
                     // start images in gray, color (if avail) on mouseover
                     console.log('adipoli: ' + puckid)
                     $('#' + puckid).adipoli({
                       'startEffect' : 'grayscale',
                       'hoverEffect' : 'normal'
                     })
         
                     } // else ... pucks other than this one
    
                })
            })
        })
    
    
    // message data
    list_events()
    
})
