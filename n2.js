
Q          = require('q')


// geo lookup
function resolve_geo(ip) {

    console.log('... resolving geo for... ' + ip)

    if (ip == undefined || ip == '') {
        console.log('no ip to resolve')
        return({})
    }

    // geo return looks like...
    // { range: [ 3479299040, 3479299071 ],
    //   country: 'US',
    //   region: 'CA',
    //   city: 'San Francisco',
    //   ll: [37.7484, -122.4156] 
    // }

    var geoip = require('geoip-lite');

    var ip_metadata = {},
        geo         = {},
        fqdn        = {};

    // bare defaults
    var ll = ["?","?"]

    geo = geoip.lookup(ip)

    console.log(geo)

    return(geo)

}

console.log(resolve_geo('63.225.191.45'))

