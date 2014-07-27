// Last time updated at July 04, 2014, 08:32:23

// Latest file can be found here: www.rtcmulticonnection.org/conversation.js

// Muaz Khan         - www.MuazKhan.com
// MIT License       - www.WebRTC-Experiment.com/licence
// ____________________
// Conversation-v1.0.js


// SIGNALING_SERVER = 'wss://wsnodejs.nodejitsu.com:443/websocket';
SIGNALING_SERVER = 'wss://' + window.location.hostname + ':8080/rtc/websocket';

function psuedo_r_string() {
    var val = (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '')
    console.log("YOU R: " + val)
    return val
}

function User(config) {
    var user = this;

    currentUserUUID = psuedo_r_string()

    config.SIGNALING_SERVER = SIGNALING_SERVER

    user.staticdata = {};
    user.username = currentUserUUID
    user.status = 'online';
    
    if (typeof config.SIGNALING_SERVER != "undefined") {
        user.signalingurl = config.SIGNALING_SERVER
    }
    else {
        console.log('NEVER FUCKING NEVER')
        throw 'bad'
        // user.signalingurl = 'wss://wsnodejs.nodejitsu.com:443/';
    }

    console.log('setting signalz server to be ' + user.signalingurl)

    user.openconversationwith = function (targetuser) {

        console.log('opening... conv... with...')

        var conversation = new Conversation(user, targetuser);

        // check who is online
        user.websocket.send({
            whoisonline: true,
            responsefor: targetuser
        });
    };

    function startsignaler() {

        console.log('firing up siggy')

        var websocket = new WebSocket(user.signalingurl);

        websocket.onmessagecallbacks = {};

        websocket.onmessage = function (e) {

            console.log('on-message...')

            console.log(e)
            console.log(typeof e)

            data = e.data

            if (data.sender == user.username) return;

            if (data.isrtcmulticonnectioninnermessage && websocket.onmessagecallbacks[data.channel]) {
                websocket.onmessagecallbacks[data.channel](data.message);
            };

            if (!data.isrtcmulticonnectioninnermessage) {
                customSignalingMessages(data);
            }
        };

        websocket.onopen = function () {
            console.log('--signaler-connected');

            user.emit('--signaler-connected');
            websocket.send({
                open: true
            });
        };

        websocket.push = websocket.send;
        websocket.send = function (data) {
            console.log('... trying... to... send...');
            console.log(data)

            if (websocket.readyState != 1) {
                    console.warn('websocket connection is not opened yet.');
                    return setTimeout(function() {
                        websocket.send(data);
                    }, 1000);
                }
                
            if (!data.data && !data.open) {
                data.sender = user.username;
                data.staticdata = user.staticdata;
                data = {
                    data: data,
                    sender: user.username,
                    staticdata: user.staticdata
                };
            }

            data.sender = user.username;
            data.staticdata = user.staticdata;
            // data.channel = data.channel || user.channel || location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
            data.channel = 'd3ck'

            websocket.push(JSON.stringify(data));
            console.log('push it... push it good... ' + JSON.stringify(data))

        };

        user.websocket = websocket;
    }

    function customSignalingMessages(message) {

        console.log('custom, baby!')
        console.log(message)

        if (message.whoisonline && message.responsefor == user.username && user.status == 'online') {
            console.log('--friend-request')
            console.log(JSON.stringify(message))
            console.log(user.peers)
            console.log(JSON.stringify(user))

            user.emit('--friend-request', {
                accept: function() {
                    if (!user.peers[message.sender]) {
                        // var randomchannel = user.randomstring();
                        var randomchannel = 'd3ck'
                        user.websocket.send({
                            iamonline: true,
                            responsefor: message.sender,
                            randomchannel: randomchannel
                        });

                        var conversation = new Conversation(user, message.sender);

                        conversation.addnewrtcmulticonnectionpeer({
                            targetuser: message.sender,
                            staticdata: message.staticdata,
                            channel: randomchannel
                        });
                    }
                    
                    user.websocket.send({
                        requestaccepted: true,
                        sender: user.userid,
                        responsefor: message.sender
                    });
                },
                reject: function() {
                    user.websocket.send({
                        requestrejected: true,
                        sender: user.userid,
                        responsefor: message.sender
                    });
                },
                sender: message.sender,
                staticdata: message.staticdata
            });
        }
        
        if(message.requestaccepted && message.responsefor == user.username) {
            user.emit('--request-status', {
                status: 'accepted',
                sender: message.sender,
                staticdata: message.staticdata
            });
        }
        
        if(message.requestrejected && message.responsefor == user.username) {
            user.emit('--request-status', {
                status: 'accepted',
                sender: message.sender,
                staticdata: message.staticdata
            });
        }

        if (message.iamonline && message.responsefor == user.username) {
            if (!user.peers[message.sender]) {
                user.conversations[message.sender].addnewrtcmulticonnectionpeer({
                    targetuser: message.sender,
                    staticdata: message.staticdata,
                    channel: message.randomchannel,
                    isInitiator: true
                });
            }
        }

        if (message.sessionDescription && message.responsefor == user.username) {
            user.peers[message.sender].join(message.sessionDescription);
        }
    }

    // reference to all RTCMultiConnection peers
    user.peers = {
        emit: function(eventName, value) {
            for(var conversation in user.conversations) {
                user.conversations[conversation].emit(eventName, value);
            }
        },
        length: 0
    };
    
    // reference to all Conversation objects
    user.conversations = {};
    
    // reference to all local media streams
    user.localstreams = {};

    user.events = {};
    user.on = function (event, callback) {
        user.events[event] = callback;
    };

    user.emit = function () {
        if(!arguments[0]) throw 'At lesat one argument is mandatory.';
        
        var internalevent = arguments[0].indexOf('--') == 0;
        if(!internalevent) {
            if(arguments[0] == 'search-user') {
                // search user
            }
            
            if(arguments[0] == 'signaler') {
                if(arguments[1] == 'start') {
                    startsignaler();
                }
            }
            
            return;
        }
        
        if(internalevent) {
            arguments[0] = arguments[0].replace('--', '');
        }
        
        if (!user.events[arguments[0]]) {
            var warning = 'Event name "' + arguments[0] + '" doesn\'t exists.';
            if(arguments[1]) warning += ' Values: ' + JSON.stringify(arguments[1], null, '\t');
            console.warn(warning);
            
        } else user.events[arguments[0]](arguments[1], arguments[2], arguments[3], arguments[4]);
    };
    
    // defaults
    user.on('request-status', function(request) {
        console.log(request.sender + ' ' + request.status + ' your request.');
    });
    
    user.on('friend-request', function(request) {
        console.log('... will... you marry me?')
        request.accept();
    });
    
    user.on('signaler-connected', function() {
        console.log('Signaling medium is ready for pub/sub.');
    });
    
    for(var conf in config || {}) { 
        user[conf] = config[conf];
    }
        
    if(config) {
        user.emit('signaler', 'start');
    }
}

function Conversation(user, targetuser) {

    console.log('starring... gene hackman...')

    var conversation = this;
    var websocket = user.websocket;

    function sendmessage(data) {
        user.peers[targetuser].send(data);
    }
    
    function enablemicrophone() {

        console.log('mik ...?')

        if(user.localstreams.microphone) return;

        conversation.peer.captureUserMedia(function(stream) {

            console.log('m-up!')
            user.localstreams.microphone = stream;
            
            conversation.peer.peers[targetuser].peer.connection.addStream(stream);
                
            conversation.peer.send({
                signalingmessage: true,
                hasmicrophone: true,
                streamavailable: true,
                sender: user.username,
                staticdata: user.staticdata,
                type: 'audio'
            });
        }, { audio: true });
    }
    
    function enablecamera() {

        console.log('camera...')

        if(user.localstreams.camera) return;
        
        conversation.peer.captureUserMedia(function(stream) {
            console.log('c-up!')

            user.localstreams.camera = stream;
            
            conversation.peer.peers[targetuser].peer.connection.addStream(stream);
                
            conversation.peer.send({
                signalingmessage: true,
                hascamera: true,
                streamavailable: true,
                sender: user.username,
                staticdata: user.staticdata,
                type: 'video'
            });
        }, {audio: true, video: true});
    }
    
    function enablescreen() {
        if(user.localstreams.screen) return;
        
        conversation.peer.captureUserMedia(function(stream) {
            user.localstreams.screen = stream;
            
            conversation.peer.peers[targetuser].peer.connection.addStream(stream);
                
            conversation.peer.send({
                signalingmessage: true,
                hasscreen: true,
                streamavailable: true,
                sender: user.username,
                staticdata: user.staticdata,
                type: 'screen'
            });
        }, { screen: true });
    };
    
    conversation.attachie = {
        files: {},
        messages: {}
    };

    conversation.addnewrtcmulticonnectionpeer = function (args) {

        console.log('but... Im peerless... impossible!')

        var connection = new RTCMultiConnection(args.channel);

        connection.userid = user.username;
        connection.extra = user.staticdata;

        connection.session = {
            data: true
        };

        connection.onopen = function () {

            console.log('[+] open connection')

            conversation.target = {
                username: args.targetuser,
                staticdata: args.staticdata
            };
            user.emit('--conversation-opened', conversation);
        };

        connection.onmessage = function (event) {

            console.log('[>] inbound!')

            if(event.data.signalingmessage) {
                var data = event.data;

                console.log('data... ' + JSON.stringify(data))
                
                if(data.streamavailable) {

                    data.emit = function(first, second) {
                        if(first == 'join-with' && second == 'nothing') {
                            preview();
                        }
                        
                        if(first == 'join-with' && second == 'microphone') {
                            joinwithmicrophone();
                        }
                        
                        if(first == 'join-with' && second == 'camera') {
                            joinwithcamera();
                        }
                        
                        if(first == 'join-with' && second == 'screen') {
                            joinwithscreen();
                        }
                    };
                    
                    function preview() {
                        connection.send({
                            signalingmessage: true,
                            shareoneway: true,
                            hasmicrophone: !!data.hasmicrophone,
                            hascamera: !!data.hascamera,
                            hasscreen: !!data.hasscreen
                        });
                    }
                    
                    function joinwithmicrophone() {
                        conversation.peer.peers[targetuser].addStream({
                            audio: true,
                            oneway: true
                        });
                    }
                    
                    function joinwithcamera() {
                        conversation.peer.peers[targetuser].addStream({
                            audio: true,
                            video: true,
                            oneway: true
                        });
                    }
                    
                    function joinwithscreen() {
                        conversation.peer.peers[targetuser].addStream({
                            screen: true,
                            oneway: true
                        });
                    }
                    
                    conversation.emit('--media-enabled', event.data);
                }
                
                if(data.shareoneway) {
                    if(data.hasmicrophone) {
                        if(!user.localstreams.microphone) throw 'You has no microphone prompted.';
                        connection.renegotiate();
                    }
                    
                    if(data.hascamera) {
                        if(!user.localstreams.camera) throw 'You has no camera prompted.';
                        connection.renegotiate();
                    }
                    
                    if(data.hasscreen) {
                        if(!user.localstreams.screen) throw 'You has no screen prompted.';
                        connection.renegotiate();
                    }
                }
                
                if(data.addedfile) {
                    var filesinfo = data.filesinfo;
                    if(filesinfo.size && filesinfo.type) {
                        filesinfo = eventHanlders(filesinfo);
                        conversation.emit('--add-file', filesinfo);
                    }
                    else {
                        for(var file in filesinfo) {
                            filesinfo[file] = eventHanlders(filesinfo[file]);
                            conversation.emit('--add-file', filesinfo[file]);
                        }
                    }
                    
                    function eventHanlders(file) {
                        file.download = function() {
                            conversation.peer.send({
                                signalingmessage: true,
                                download: true,
                                sender: user.username,
                                staticdata: user.staticdata,
                                file: {
                                    size: file.size,
                                    type: file.type,
                                    name: file.name,
                                    lastModifiedDate: file.lastModifiedDate
                                }
                            });
                        };
                        
                        file.cancel = function() {
                            conversation.peer.send({
                                signalingmessage: true,
                                download: false,
                                sender: user.username,
                                staticdata: user.staticdata,
                                file: {
                                    size: file.size,
                                    type: file.type,
                                    name: file.name,
                                    lastModifiedDate: file.lastModifiedDate
                                }
                            });
                        };
                        
                        return file;
                    }
                }
                
                if(data.file) {
                    if(data.download) {
                        var file = conversation.attachie.files[data.file.name];
                        if((file.item && file.length && file[0] && file[0].lastModifiedDate) || file.forEach) {
                            Array.prototype.slice.call(file).forEach(function(f) {
                                conversation.peer.send(f);
                            });
                        }
                        else conversation.peer.send(file);
                    }
                    else {
                        conversation.emit('--file-cancelled', file);
                    }
                }
            }
            else {
                event.username = conversation.target.username;
                conversation.emit('--message', event);
            }
        };

        // overriding "openSignalingChannel" method
        connection.openSignalingChannel = function (config) {
            var channel = config.channel || this.channel;
            websocket.onmessagecallbacks[channel] = config.onmessage;

            if (config.onopen) setTimeout(config.onopen, 1000);

            // directly returning socket object using "return" statement
            return {
                send: function (message) {
                    websocket.send({
                        data: {
                            message: message,
                            isrtcmulticonnectioninnermessage: true,
                            channel: channel
                        }
                    });
                },
                channel: channel
            };
        };
        
        // todo: renegotiation doesn't work if trickleIce=false
        // need to fix it.
        // connection.trickleIce = false;
        
        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        };
        
        connection.autoSaveToDisk = false;
        
        connection.onFileEnd = function (file) {
            if(conversation.attachie.files[file.name]) {
                conversation.emit('--file-sent', file);
                return;
            }
            
            file.savetodisk = function(filename) {
                connection.saveToDisk(file, filename || file.name || file.type);
            };
            
            file.staticdata = file.extra;
            file.sender = file.userid;
            
            conversation.emit('--file-downloaded', file);
        };

        connection.onFileProgress = function (chunk, uuid) {
            var progress = {
                percentage: Math.round( (chunk.currentPosition / chunk.maxChunks) * 100) ,
                uuid: uuid,
                file: chunk,
                sender: chunk.userid,
                staticdata: chunk.extra
            };
            
            if(progress.percentage > 100) progress.percentage = 100;
            
            conversation.emit('--file-progress', progress);
        };

        connection.onFileStart = function () {};

        if (args.isInitiator) {
            connection.open({
                dontTransmit: true
            });
        }

        user.peers[args.targetuser] = connection;
        
        user.peers.length++;
        connection.onleave = function() {
            user.peers.length--;
        };
        
        websocket.send({
            joinRoom: true,
            responsefor: args.targetuser,
            sessionDescription: connection.sessionDescription
        });
        
        conversation.peer = connection;
    }
    
    function addfile(file) {
        var filesinfo = {};
        
        // seems array of files
        if((file.item && file.length && file[0] && file[0].lastModifiedDate) || file.forEach) {
            Array.prototype.slice.call(file).forEach(function(f) {
                filesinfo[file.name] = {
                        size: f.size,
                        type: f.type,
                        name: f.name,
                        lastModifiedDate: f.lastModifiedDate
                };
                conversation.attachie.files[f.name] = f;
            });
        }
        else {
            filesinfo[file.name] = {
                size: file.size,
                type: file.type,
                name: file.name,
                lastModifiedDate: file.lastModifiedDate
            };
            
            conversation.attachie.files[file.name] = file;
        }
        
        conversation.peer.send({
            addedfile: true,
            filesinfo: filesinfo,
            signalingmessage: true,
            sender: user.username,
            staticdata: user.staticdata
        });
    }
    
    // custom events

    conversation.events = {};
    conversation.on = function (event, callback) {
        conversation.events[event] = callback;
    };

    conversation.emit = function () {
        if(!arguments[0]) throw 'At lesat one argument is mandatory.';
        
        var internalevent = arguments[0].indexOf('--') == 0;
        if(!internalevent) {
            if(arguments[0] == 'message') {
                sendmessage( arguments[1] );
            }
            
            if(arguments[0] == 'add-file' && arguments[1]) {
                addfile(arguments[1]);
            }
            
            if(arguments[0] == 'enable') {
                if(arguments[1] == 'microphone') {
                    enablemicrophone();
                }
                
                if(arguments[1] == 'camera') {
                   enablecamera();
                }
                
                if(arguments[1] == 'screen') {
                    enablescreen();
                }
            }
            
            if(arguments[0] == 'end') {
                conversation.peer.close();
                user.emit('--ended');
            }
            
            return;
        }
        
        if(internalevent) {
            arguments[0] = arguments[0].replace('--', '');
        }
        
        if (!conversation.events[arguments[0]]) {
            var warning = 'Event name "' + arguments[0] + '" doesn\'t exists.';
            if(arguments[1]) warning += ' Values: ' + JSON.stringify(arguments[1], null, '\t');
            console.warn(warning);
            
        } else conversation.events[arguments[0]](arguments[1], arguments[2], arguments[3], arguments[4]);
    };
    
    conversation.on('add-file', function(file) {
        file.download();
    });
    
    conversation.on('file-downloaded', function(file) {
        file.savetodisk();
    });
    
    user.conversations[targetuser] = conversation;
}
