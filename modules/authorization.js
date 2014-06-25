
var __ = require('underscore');   // note; not one, two _'s, just for node

var user_archtypes = ['paranoid', 'moderate', 'trusting']

//
// authorization stuff
//
// Pretty simple in theory; there are capabilities that a d3ck has,
// like video, file transfer, etc.
//
// Each other d3ck (lookup by d3ck-ID) you know about has a yes/no/??? for 
// each potential capability, They try to do something, you look it up, 
// it will pass/fail/need-confirm/etc.
//

// the capabilities structure is in puck.json; it looks something like this:
//
//  "capabilities" : {
//      "friend request":       { "paranoid": "off", "moderate": "ask", "trusting": "on"  },
//      "VPN":                  { "paranoid": "ask", "moderate": "ask", "trusting": "on"  },
//
//      [...]
//
//  Each line is a capability; there are currently 3 types of user types,
// paranoid, moderate, and trusting, and they all have different defaults
// for various capabilities (the paranoid being the most... cautious.)
//
// These may all be overwritten on a d3ck-by-d3ck basis
//
// If you are a client d3ck initiating communications with another d3ck then 
// the 2nd d3ck's capability matrix will be used.
//

//
// save an update of capabilities... usually it'll be called with something like -
//
//      capabilities['paranoid']
//
// but could be manual changes, etc.
//
function assign_capabilities(_d3ck, new_capabilities) {

    console.log('assigning capabilities given from ' + security_level + ' to d3ck ' + _d3ck.PUCK_ID)
    _d3ck.capabilities = new_capabilities

    update_d3ck(_d3ck)

}

//
// just reading out some basic #'s... not sure if
// this'll survive, but for now....
//
function init_capabilities(capabilities) {

    console.log('ennumerating capabilities...')

    console.log(__.keys(capabilities))

    var caps = __.keys(capabilities)

    for (var i = 0; i < caps.length; i++) {
        console.log(caps[i])
        console.log(capabilities[caps[i]])
    }

// sys.exit(1)

}

module.exports = {
    init_capabilities: init_capabilities
}

