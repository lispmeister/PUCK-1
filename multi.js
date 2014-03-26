
var response1 = ""
var response2 = ""

var request = require('request')

request.get('http://fish2.com/', function(err, response, body) {
    if(err) return callback(err);
    response1 = response;
    next();
})

request.get('http://cnn.com', function(err, response, body) {
    if(err) return callback(err);
    response2 = response;
    next();
})

function next(){
    if(response1)
        console.log('r1')
    if (response2)
        console.log('r2')
}

