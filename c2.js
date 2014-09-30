
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"


var fs      = require('fs')
var request = require('request')

var ip_addr = '54.203.255.17'
var upload_target = '54.203.255.17'
var d3ck_port_ext = 8080
var d3ckid = 'AF1FEBBF94201C7644E80A16A70F293040526AFA'
var d3ck_keystore = "/etc/d3ck/d3cks"

var my_did = 'C73D67BF1BBED09067882B37CD5D6CC424A9F396'

        var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/up/local'

        console.log(url)

//  var options = {
//      key     : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.key").toString(),
//      cert    : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.crt").toString(),
//  };

//      options.url  = url
//      options.form = { 'ip_addr' : ip_addr, 'd3ckid'  : d3ckid  }

//      console.log(options)

// { event_type: 'remotely_uploaded',
//   file_name: 'why-must-life-be-hard.gif',
//   file_size: 508578,
//   d3ck_id: 'C73D67BF1BBED09067882B37CD5D6CC424A9F396',
//   'target ip': 'fish2.com' }
// adding ds: {"d3ck_id":"AF1FEBBF94201C7644E80A16A70F293040526AFA","events":{"new_d3ck_ip":""},"openvpn_server":{"vpn_status":"down","start":"n/a","start_s":"n/a","duration":"unknown","stop":"unknown","stop_s":"unknown","client":"unknown","client_did":"unknown"},"openvpn_client":{"vpn_status":"down","start":"n/a","start_s":"n/a","duration":"unknown","stop":"unknown","stop_s":"unknown","server":"unknown","server_did":"unknown"},"file_events":{"file_name":"why-must-life-be-hard.gif","file_size":508578,"file_from":"63.225.191.45","did":"AF1FEBBF94201C7644E80A16A70F293040526AFA","direction":"fish2.com"},"browser_events":{"notify_add":false,"notify_ring":false,"notify_file":true},"d3ck_requests":{"knock":false,"ip_addr":"","did":""}}

        var formData = {
            ca           : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ckroot.crt").toString(),
            key          : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.key").toString(),
            cert         : fs.readFileSync(d3ck_keystore +'/'+ d3ckid + "/d3ck.crt").toString(),
            // 'x-filename' : target_file,
            // 'x-filesize' : target_size,
            headers      : {
                // 'x-filename'     : 'i.jpg',
                'x-filename'     : 'c2.js',
                // 'x-filesize'     : 11813,
                'x-filesize'     : 3200,
                'x-d3ckid'       : my_did,
                // 'content-length' : 11813
                'content-length' : 3200,
                // 'content-type' : 'application/octet-stream',
                // 'Transfer-Encoding': 'chunked'
            },
            // my_file      : fs.createReadStream('i.jpg')
            my_file      : fs.createReadStream('c2.js')
        };


        console.log('readin n postin to: ' + url)

                // fs.createReadStream(tmpfile).pipe(request.post(url, options, function optionalCallback (err, resp)

        request.post(url, formData, function cb (err, res) {
            var str = ''
            console.error('hmmm....')

            if (err) {
                console.error('upload failed:', err);
            }

            res.on('data', function (chunk) {
                str += chunk;
            });

            res.on('end', function () {
                console.log('Da End!')
                console.log(str);
            });

        })


//          if (err) {
//              console.error('upload failed:', err);
//          }
//          else {
//              console.log('Upload successful...!  ' + JSON.stringify(resp))
//          }

//          if (err) {
//              console.error('post to remote failed:')
//              console.log( {"err" : err});
//              }
//          else {
//              console.log('knock success...!')
//              console.log(resp.body)
//          }
//      })


