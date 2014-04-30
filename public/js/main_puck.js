//
// after all is said and done... let the JS fur fly
//

var other_puck = "local"

// poll until we get something, then stop polling
var vault_poll     = 1000
var already_polled = false
var vpn_started    = false

var browser_ip  = ""
var remote_sock = ""
var socky_love  = false
var my_puck     = {}

var ovpn_slogs = 'openvpn_server_logs'
var ovpn_clogs = 'openvpn_client_logs'

// conf file fodder
var PUCK_TIMEOUT         = 5000 // 5 seconds should be enough for anyone!
var PREGNANT_PAUSE       = 3000 // 5 seconds should be enough for anyone!
var PUCK_RECONNECT_DELAY =  100

var SIGNALING_SERVER = 'wss://192.168.0.250:12034'

// for web rtc
var puck_meeting = {}

// xxx - from http://soundbible.com/1411-Telephone-Ring.html
ring = new Audio("media/ringring.mp3") // load it up

$(document).ready(function () {

    var image     = ""
    // var puck_id   = ""

    var tt = ['puck_top_left', 'puck_top_cog', 'puck_top_home', 'puck_top_skull', 'puck_top_ewe', 
              'puck_top_love', 'puck_top_cloud', 'puck_top_messages', 'puck_help', 'puck_video', 'puck_git']

    for (var i = 0 ; i < tt.length; i++) {
        $('#' + tt[i]).popover( {delay: { show: 200, hide: 200 }, trigger: "hover", placement: "bottom"})
    }

    // disable a/href pushing if disabled
    $('body').on('click', 'a.disabled', function(event) {
        event.preventDefault()
    })
    
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

    // log areas
    $("#ovpn_client_infinity").mCustomScrollbar({ scrollButtons:{ enable:true } })
    $("#ovpn_server_infinity").mCustomScrollbar({ scrollButtons:{ enable:true } })
    $("#cat_chat").mCustomScrollbar({ set_height: 200, set_width: 600, scrollButtons:{ enable:true } })

    //
    // setup user drag/click files to browser
    //
    drag_and_puck()

    // load up filenames already in vault
    load_vault()
    
    //
    // user clicks vpn, and....
    //
    // ring them gongs
    $('body').on('click', '.puck_vpn', function(e) {
        e.preventDefault()
        // id.substr(9) == puck id
        // possibly a better way to get name :)
        event_connect('outgoing', $(this).parent().parent().find('.puckname').text())

        var vpuckid = $("#puckid").val()
        var ipaddr  = $("#ipaddr").val()
        var target  = $("#name").val()
        puck_vpn(this, vpuckid, ipaddr)
        
    })

    //
    // user clicks create, and....
    //
    // build suspense....
    $('body').on('click', '#puck_button_create', function(event) { 
        console.log('hijax create')
        event.preventDefault()
    
        var ip_addr = $("#ip_addr").val()
    
        puck_create(this, ip_addr)
    
    })

    // toss your ip in the footer
    get_ip('#ip_diddy')

    // ... bye bye
    $('body').on('click', '#puck_disconnect', function() { 
        event_hang_up() 
    })
    $('body').on('click', '#halt_vpn_client', function() { 
        alert('bye-bye vpn')
        event_hang_up() 
    })

    // mwahaha
    $('body').on('click', '#puck_help', function() { 
        alert('yeah... right... you do it!')
    })

    // pleased to meet me, whomever I am
    $.get('/ping', function(puck) {
        my_puck = puck
    
        console.log('my name/id/status are: ', my_puck.name, my_puck.pid, my_puck.status)
    
        my_puck_status = 'Name: ' + my_puck.name + '<br />Status: ' + my_puck.status + '<br />ID: ' + my_puck.pid
    
        if (my_puck.status == "OK") {
            // $('#puck_status').addClass('btn-success').removeClass('disabled')
            $('#puck_status').addClass('green').removeClass('red')
        }
        else {
            $('#puck_status').removeClass('green').addClass('red')
            // $('#puck_status').removeClass('btn-success').addClass('disabled')
        }
    
        $('#puck_status').attr("data-toggle", "popover").attr("data-placement", "bottom").attr("data-html", "true").attr("title", "PUCK Status").attr("data-content", my_puck_status).popover({delay: { hide: 200 }, trigger: "hover"})
    
        console.log('my name/id/status are: ', my_puck.name, my_puck.pid, my_puck.status)
    
        my_puck_status = 'Name: ' + my_puck.name + '<br />Status: ' + my_puck.status + '<br />ID: ' + my_puck.pid
    
        if (my_puck.status == "OK")
            // $('#puck_status').addClass('btn-success').removeClass('disabled')
            $('#puck_status').addClass('green').removeClass('red')
        else
            $('#puck_status').removeClass('green').addClass('red')
            // $('#puck_status').removeClass('btn-success').addClass('disabled')
    
        $('#puck_status').attr("data-toggle", "popover").attr("data-placement", "bottom").attr("data-html", "true").attr("title", "PUCK Status").attr("data-content", my_puck_status).popover({delay: { hide: 200 }, trigger: "hover"})
    
        // get the other pucks we know about from local REST
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
                    if (my_puck.pid != val) {
        
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
                        var template = 
                             '<div class="col-md-3">'                                                                  + 
                              '<div class="thumbnail" style="background-color: #eaf1f1" id="{{puckid}}">'              +
                                 '<a href="/puck_details.html?puckid={{puckid}}">'                                     +
                                 '<img id="{{puckid}}" width=128 style="padding: 4;" src="{{image}}"></a> <br />'      +
                                 '<div class="caption">'                                                               +
                                    '<span>PUCK: </span><span class="puckname"><b>{{name}}</b></span> <br />'          +
                                    '<span id="{{owner}}"> Owner: <strong>{{owner}}</strong>   </span> <br />'         +
                                    '<span id="{{ipaddr}}">Server: <strong>{{ipaddr}}</strong> </span> <br />'         +
                                    '<span id="{{ipaddr}}">URL: <strong>{{url}}</strong> </span> <br />'               +
                                    '<span id="{{email}}"> Email: <strong>{{email}}</strong>   </span> <br />'         +
                                    '<form id="{{vpn_form}}" action="/vpn/start" method="POST">'                       +
                                    '<input style="display:none" id="puckid" name="puckid"  value={{puckid}}>'         +
                                    '<input style="display:none" id="ipaddr" name="ipaddr"  value={{ipaddr}}>'         +
                                    '<input style="display:none" name="vpn_action" value="VPN" />'                     +
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
                    else {
                        my_puck = puckinfo
                        print_puck(puckinfo.PUCK_ID, puckinfo, ['#puck_basics', '#puck_vpn_basics', '#puck_vpn_client_basics'])
                    }
                })
            })
        })
    })

    // detect_webRTC('puck_rtc_health_check')

    // message data
    list_events()
    
    socket_looping()

    // sow the seed o' doubt
    setInterval(get_status,PREGNANT_PAUSE)

})

