
var fs = require('fs')

var file = "public/img/F8B9651ACF6C5B0655E28F406F7ED8439FB2B2C6.jpg"

var data = fs.readFileSync(file);

// var b64 = new Buffer(data).toString('base64');
var b64 = b64_encode(data)

// var img = new Buffer(b64, 'base64').toString('utf8');
var img = b64_decode(b64)

console.log('writing...')

fs.writeFileSync('x.jpeg', data)
fs.writeFileSync('x.jpg',   img)
fs.writeFileSync('x.b64',   b64)


function b64_encode(data) {
    return new Buffer(data).toString('base64');
}

function b64_decode(str) {
    return new Buffer(str, 'base64');
}

