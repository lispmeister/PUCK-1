
var async = require('async')
var request = require('request')
var __ = require('underscore')

parallel = function(req, res) {
  async.parallel([

    var sites = ['cnn.com', 'nytimes.com', 'sfgate.com']

    for (var i = 0; i < sites.length; i++) {
        function(callback) {
            request("http://google.jp", function(err, response, body) {
            if(err) { console.log(err); callback(true); return; }
            callback(-1,"google.jp")
            })
        },
    /* Grab Google.com */
    function(callback) {
      request("http://google.com", function(err, response, body) {
        if(err) { console.log(err); callback(true); return; }
        callback(-1,"google.com")
      })
    }
    ],
    /* callback handler */
    function(err, results) {
      /* Actual error */
      if(err && err!=-1) {
        console.log(err)
        return
      }
      /* First data */
      if(err===-1) {
        /*
         * async#parallel returns a list, one element per parallel function.
         * Functions that haven't finished yet are in the list as undefined.
         * use underscore to easily filter the one result.
         */
        var one = __.filter(results, function(x) {
          return (x===undefined ? false : true)
        })[0]
        console.log(results)
        console.log(one)
        // res.send(one)

      }
    }
  )
}


parallel()
