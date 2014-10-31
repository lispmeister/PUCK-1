
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"


var fs      = require('fs')
var request = require('request')

var ip_addr = '54.203.255.17'
var ip_addr = '127.0.0.1'
var d3ck_port_ext = 8080
var d3ckid = 'AF1FEBBF94201C7644E80A16A70F293040526AFA'
var d3ck_keystore = "/etc/d3ck/d3cks"

var my_did = 'C73D67BF1BBED09067882B37CD5D6CC424A9F396'

        var url = 'https://' + ip_addr + ':' + d3ck_port_ext + '/up/local'

        console.log(url)




        var formData = {
            ca           : fs.readFileSync(d3ck_keystore +'/'+ my_did + "/d3ckroot.crt").toString(),
            key          : fs.readFileSync(d3ck_keystore +'/'+ my_did + "/d3ck.key").toString(),
            cert         : fs.readFileSync(d3ck_keystore +'/'+ my_did + "/d3ck.crt").toString(),
            // 'x-filename' : target_file,
            // 'x-filesize' : target_size,
            headers      : {
                // 'x-filename'     : 'i.jpg',
                'x-filename'     : 'c2.js',
                // 'x-filesize'     : 11813,
                'x-filesize'     : 3200,
                'x-d3ckid'       : d3ckid,
                // 'content-length' : 11813
                'Content-Length' : 3200,
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

