
var fs = require('fs')

var tmp = "ud"

var req = fs.createReadStream(tmp)


var buff = ""
// go with the flow, or stream, or w/e....
req.on('data', function (chunk) {
    console.log('one chunk at a time...')
    // console.log(chunk)
    buff += chunk;
});
req.on('end', function () {
    // console.log('end-o-stream: ' + buff);
    console.log('end-o-stream')
    bodice_ripper(buff)
});


function bodice_ripper(bodice) {

    console.log('ripping away')

    var data  = ""
    var name  = ""
    var bytes = 0

    // ----------------------------320756311425686976538052
    // Content-Disposition: form-data; name="scrabble.jpg"; filename="31115-t9y74u.jpg"
    // Content-Type: image/jpeg
    // [... data ...]
    //
    var offset = 0;
    var line   = ""

    var n = 0;

    console.log(bodice.length)

    for (; offset < bodice.length; offset++) {

        n++;

        // if (bodice[offset] === 0x0a) {      // newline
        if (bodice[offset] === '\n') {      // newline

            // console.log(bodice[offset])
            console.log('woo')

            line = bodice.slice(0, offset).toString()

            bodice = bodice.slice(offset + 1);

            offset = 0;

            if (line.indexOf("-----") == 0) {
                console.log('found separator')
                console.log(line)
                // console.log(typeof(line))
                bytes += line.length + 1
            }
            else if (line.indexOf("Content-Disposition") == 0) {
            // Content-Disposition: form-data; name="dona-scrabble.jpg"; filename="32024-m3ps38.jpg"

                console.log('good disposition, good girl!')
                console.log(line)

                var semis = line.split('; ')
                console.log(semis[2])

                name = line.replace(new RegExp('^.*=name"'),'')
                name = name.match(/"([^"]+)"/)[1];

                console.log(semis[2])
                console.log(name) + 1

                bytes += line.length + 1

            }
            else if (line.indexOf("Content-Type") == 0) {
                console.log('whats your type?')
                console.log(line)

                bytes += line.length + 1
            }
            else {
                console.log('found data ' + bytes + ' bytes in')

                // data = bodice.slice(offset).toString()
                data = bodice.toString()

                break
                // data += line
            }
        }
        // else {
        //     console.log(bodice[offset])
        // }
    }


    // read in from the raw bits
    // data = bodice.toString().substr(bytes)

    if (name == "") name = "anon"

    console.log('bodice ripped, ready to save ' + data.length + ' bytes to ' + name)

    fs.writeFile('/tmp/fooz', data, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log('jesus saves files and souls!')
        }
    }); 

}

