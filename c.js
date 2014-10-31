
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"


var fs      = require('fs')
var request = require('request')

var ip_addr = '54.203.255.17'
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

        request.post(options, function cb (err, resp) {
            if (err) {
                console.error('post to remote failed:')
                console.log( {"err" : err});
                }
            else {
                console.log('knock success...!')
                console.log(resp.body)
            }
        })


