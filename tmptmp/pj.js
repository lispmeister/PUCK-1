// Muaz Khan     - https://github.com/muaz-khan
// MIT License   - https://www.webrtc-experiment.com/licence/
// Documentation - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socket.io

(function() {

    window.PeerConnection = function(socketURL, socketEvent, userid) {
        console.log('peer connection...')

        this.userid = userid || getToken();
        this.peers = { };

        if (!socketURL) throw 'Socket-URL is mandatory.';
        if (!socketEvent) socketEvent = 'message';

        new Signaler(this, socketURL, socketEvent);
        
        this.addStream = function(stream) { 
            console.log('click islands in the stream...')

            this.MediaStream = stream;
        };
    };

    function Signaler(root, socketURL, socketEvent) {
        var self = this;

        console.log('signaler..')

        root.startBroadcasting = function() {

            console.log('broadcasting..')

            if(!root.MediaStream) throw 'Offerer must have media stream.';
            
            (function transmit() {
                console.log('transmit..')
                socket.send( {
                    userid: root.userid,
                    broadcasting: true
                });
                !self.participantFound &&
                    !self.stopBroadcasting &&
                        setTimeout(transmit, 3000);
            })();
        };

        root.sendParticipationRequest = function(userid) {

            console.log('sending participant req')

            socket.send( {
                participationRequest: true,
                userid: root.userid,
                to: userid
            });
        };

        // if someone shared SDP
        this.onsdp = function(message) {

            console.log('on sdp..')

            var sdp = message.sdp;

            if (sdp.type == 'offer') {
                console.log('[offer]')

                root.peers[message.userid] = Answer.createAnswer(merge(options, {
                    MediaStream: root.MediaStream,
                    sdp: sdp
                }));
            }

            if (sdp.type == 'answer') {
                console.log('[answer]')
                root.peers[message.userid].setRemoteDescription(sdp);
            }
        };

        root.acceptRequest = function(userid) {
            console.log('accept request')
            root.peers[userid] = Offer.createOffer(merge(options, {
                MediaStream: root.MediaStream
            }));
        };

        var candidates = [];
        // if someone shared ICE
        this.onice = function(message) {
            var peer = root.peers[message.userid];
            if (peer) {
                peer.addIceCandidate(message.candidate);
                for (var i = 0; i < candidates.length; i++) {
                    peer.addIceCandidate(candidates[i]);
                }
                candidates = [];
            } else candidates.push(candidates);
        };

        // it is passed over Offer/Answer objects for reusability
        var options = {
            onsdp: function(sdp) {
                console.log('on spd...!')
                socket.send( {
                    userid: root.userid,
                    sdp: sdp,
                    to: root.participant
                });
            },
            onicecandidate: function(candidate) {
                console.log('ice, ice, baby')
                socket.send( {
                    userid: root.userid,
                    candidate: candidate,
                    to: root.participant
                });
            },
            onStreamAdded: function(stream) {
                console.debug('onStreamAdded', '>>>>>>', stream);

                stream.onended = function() {
                    if (root.onStreamEnded) root.onStreamEnded(streamObject);
                };

                var mediaElement = document.createElement('video');
                mediaElement.id = root.participant;
                mediaElement[isFirefox ? 'mozSrcObject' : 'src'] = isFirefox ? stream : window.webkitURL.createObjectURL(stream);
                mediaElement.autoplay = true;
                mediaElement.controls = true;
                mediaElement.play();

                var streamObject = {
                    mediaElement: mediaElement,
                    stream: stream,
                    participantid: root.participant
                };

                function afterRemoteStreamStartedFlowing() {
                    if (!root.onStreamAdded) return;
                    root.onStreamAdded(streamObject);
                }

                afterRemoteStreamStartedFlowing();
            }
        };

        function closePeerConnections() {
            self.stopBroadcasting = true;
            if (root.MediaStream) root.MediaStream.stop();

            for (var userid in root.peers) {
                root.peers[userid].peer.close();
            }
            root.peers = { };
        }

        root.close = function() {
            socket.send( {
                userLeft: true,
                userid: root.userid,
                to: root.participant
            });
            closePeerConnections();
        };

        window.onbeforeunload = function() {
            root.close();
        };

        window.onkeyup = function(e) {
            if (e.keyCode == 116)
                root.close();
        };

        function onmessage(message) {

            console.log('on msg')

            if (message.userid == root.userid) return;
            root.participant = message.userid;

            // for pretty logging
            console.debug(JSON.stringify(message, function(key, value) {
                if (value && value.sdp) {
                    console.log(value.sdp.type, '---', value.sdp.sdp);
                    return '';
                } else return value;
            }, '---'));

            // if someone shared SDP
            if (message.sdp && message.to == root.userid) {
                self.onsdp(message);
            }

            // if someone shared ICE
            if (message.candidate && message.to == root.userid) {
                self.onice(message);
            }

            // if someone sent participation request
            if (message.participationRequest && message.to == root.userid) {
                self.participantFound = true;

                if (root.onParticipationRequest) {
                    root.onParticipationRequest(message.userid);
                } else root.acceptRequest(message.userid);
            }

            // if someone is broadcasting himself!
            if (message.broadcasting && root.onUserFound) {
                root.onUserFound(message.userid);
            }

            if (message.userLeft && message.to == root.userid) {
                closePeerConnections();
            }
        }
        
        var socket = socketURL;
        if(typeof socketURL == 'string') {

            console.log('sockety sox')

            var socket = io.connect(socketURL);
            socket.send = function(data) {
                console.log('send! ' + JSON.stringify(data))
                socket.send(socketEvent, data);
            };
        }
        
        socket.on(socketEvent, onmessage);
    }

    var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

    navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
    window.URL = window.webkitURL || window.URL;

    var isFirefox = !!navigator.mozGetUserMedia;
    var isChrome = !!navigator.webkitGetUserMedia;

    var STUN = {
        url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
    };

    var TURN = {
        url: 'turn:homeo@turn.bistri.com:80',
        credential: 'homeo'
    };

    var iceServers = {
        iceServers: [STUN]
    };

    if (isChrome) {
        console.log('Chromey wheels')
        if (parseInt(navigator.userAgent.match( /Chrom(e|ium)\/([0-9]+)\./ )[2]) >= 28)
            TURN = {
                url: 'turn:turn.bistri.com:80',
                credential: 'homeo',
                username: 'homeo'
            };

        iceServers.iceServers = [STUN, TURN];
        // iceServers.iceServers = [{}, {}]
    }

    var optionalArgument = {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    };

    var offerAnswerConstraints = {
        optional: [],
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };

    function getToken() {
        return Math.round(Math.random() * 9999999999) + 9999999999;
    }
    
    function onSdpError() {}

    // var offer = Offer.createOffer(config);
    // offer.setRemoteDescription(sdp);
    // offer.addIceCandidate(candidate);
    var Offer = {

        createOffer: function(config) {
            console.log('hang on, creating offer')
            var peer = new RTCPeerConnection(iceServers, optionalArgument);

            if (config.MediaStream) peer.addStream(config.MediaStream);
            peer.onaddstream = function(event) {
                console.log('add stream')
                config.onStreamAdded(event.stream);
            };

            peer.onicecandidate = function(event) {
                console.log('on ice can')
                if (event.candidate)
                    config.onicecandidate(event.candidate);
            };

            peer.createOffer(function(sdp) {
                console.log('create off')
                peer.setLocalDescription(sdp);
                config.onsdp(sdp);
            }, onSdpError, offerAnswerConstraints);

            this.peer = peer;

            return this;
        },
        setRemoteDescription: function(sdp) {
            console.log('remote desc')
            this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        addIceCandidate: function(candidate) {
            console.log('add can')
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        }
    };

    // var answer = Answer.createAnswer(config);
    // answer.setRemoteDescription(sdp);
    // answer.addIceCandidate(candidate);
    var Answer = {
        createAnswer: function(config) {
            console.log('create answ')
            var peer = new RTCPeerConnection(iceServers, optionalArgument);

            if (config.MediaStream) peer.addStream(config.MediaStream);
            peer.onaddstream = function(event) {
                config.onStreamAdded(event.stream);
            };

            peer.onicecandidate = function(event) {
                if (event.candidate)
                    config.onicecandidate(event.candidate);
            };

            peer.setRemoteDescription(new RTCSessionDescription(config.sdp));
            peer.createAnswer(function(sdp) {
                peer.setLocalDescription(sdp);
                config.onsdp(sdp);
            }, onSdpError, offerAnswerConstraints);

            this.peer = peer;

            return this;
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        }
    };

    function merge(mergein, mergeto) {
        console.log('for you... a chicken! no, actually, merge')
        for (var t in mergeto) {
            mergein[t] = mergeto[t];
        }
        return mergein;
    }

    window.URL = window.webkitURL || window.URL;
    navigator.getMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    navigator.getUserMedia = function(hints, onsuccess, onfailure) {
        if(!hints) hints = {audio:true,video:true};
        if(!onsuccess) throw 'Second argument is mandatory. navigator.getUserMedia(hints,onsuccess,onfailure)';
        
        navigator.getMedia(hints, _onsuccess, _onfailure);
        
        function _onsuccess(stream) {
            onsuccess(stream);
        }
        
        function _onfailure(e) {
            if(onfailure) onfailure(e);
            else throw Error('getUserMedia failed: ' + JSON.stringify(e, null, '\t'));
        }
    };
})();

