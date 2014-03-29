var async = require('async')
var request = require('request')
var __ = require('underscore')

var sites = ['http://192.168.0.250']
var sites = ['http://bbc.com', 'http://cnn.com', 'http://nytimes.com', 'http://sfgate.com',
            'http://cnn.com', 'http://nytimes.com', 'http://sfgate.com', 
            'http://google.com', 'http://fish2.com']

var done = false

for (var i = 0; i < sites.length; i++) {

    var count   = sites.length,
        results = {}

    request(sites[i], function (err, res, msg) {

        if (done) return

        if (err) {
            console.log('err...')
            console.log(err)
        }
        else {
            results[sites[i]] = msg
            console.log('woot')
            // console.log(body)
            // console.log(sites[i])
            console.log(res.request.host)
            done = true
        }

        count--

//      if (count <= 0) {
//          next(results);
//      }

    })
}
