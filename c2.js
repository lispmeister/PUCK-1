
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"


var fs      = require('fs')
var request = require('request')

var ip_addr = '54.203.255.17'
var upload_target = '54.203.255.17'
var d3ck_port_ext = 8080
var d3ckid = 'C73D67BF1BBED09067882B37CD5D6CC424A9F396'
var d3ck_keystore = "/etc/d3ck/d3cks"

        var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/knock'

        console.log(url)

    var options = {
        key     : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.key").toString(),
        cert    : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.crt").toString(),
    };

        options.url  = url
        options.form = { 'ip_addr' : ip_addr, 'd3ckid'  : d3ckid  }

        console.log(options)

                request.post( {
                    headers : {'content-type' : 'application/x-www-form-urlencoded'},
                    url     : url,
                    key     : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.key").toString(),
                    cert    : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.crt").toString(),
                    body    : fs.readFileSync('i.jpg').toString(),
                    }, function cb (err, resp) {
                        if (err) {
                            console.error('upload failed:', err);
                            }
                        else {
                            console.log('Upload successful...!  ' + JSON.stringify(resp))

                            var browser_magic          = { "notify_add":false, "notify_ring":false, "notify_file":true}
                            d3ck_status.browser_events = browser_magic
                            d3ck_status.file_events    = file_magic
                            createEvent(client_ip, {event_type: "remotely_uploaded", "file_name": target_file, "file_size": target_size, "d3ck_id": d3ckid, "target ip": upload_target }, d3ck_status)
                            res.send(204, {"status" : file_name})
                        }
                    }
                )




//          if (err) {
//              console.error('post to remote failed:')
//              console.log( {"err" : err});
//              }
//          else {
//              console.log('knock success...!')
//              console.log(resp.body)
//          }
//      })


