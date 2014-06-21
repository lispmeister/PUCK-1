
var fs = require('fs')

var file = "public/img/8E31A825D615EC227A1F5FCCE1E1CA36237B5CF2.jpg"

fs.readFileSync(file, 'binary', function(err, data){
    var b64 = new Buffer(data, 'binary').toString('base64');
    var img = new Buffer(b64, 'base64').toString('binary');
    fs.writeFileSync('x.jpg', img, 'binary', function(err) {});
});

