!function(a) {
    if ("function" == typeof bootstrap) bootstrap("simplewebrtc", a); else if ("object" == typeof exports) module.exports = a(); else if ("function" == typeof define && define.amd) define(a); else if ("undefined" != typeof ses) {
        if (!ses.ok()) return;
        ses.makeSimpleWebRTC = a;
    } else "undefined" != typeof window ? window.SimpleWebRTC = a() : global.SimpleWebRTC = a();
}(function() {
    var define, ses, bootstrap, module, exports;
    return function(a, b, c) {
        function d(c, f) {
            if (!b[c]) {
                if (!a[c]) {
                    var g = "function" == typeof require && require;
                    if (!f && g) return g(c, !0);
                    if (e) return e(c, !0);
                    throw new Error("Cannot find module '" + c + "'");
                }
                var h = b[c] = {
                    exports: {}
                };
                a[c][0].call(h.exports, function(b) {
                    var e = a[c][1][b];
                    return d(e ? e : b);
                }, h, h.exports);
            }
            return b[c].exports;
        }
        for (var e = "function" == typeof require && require, f = 0; f < c.length; f++) d(c[f]);
        return d;
    }({
        1: [ function(a, b) {
            var c, d = !1, e = !1, f = window.navigator.userAgent.toLowerCase();
            -1 !== f.indexOf("firefox") ? (c = "moz", e = !0) : -1 !== f.indexOf("chrome") && (c = "webkit", 
            d = !0);
            var g = window.mozRTCPeerConnection || window.webkitRTCPeerConnection, h = window.mozRTCIceCandidate || window.RTCIceCandidate, i = window.mozRTCSessionDescription || window.RTCSessionDescription, j = window.webkitMediaStream || window.MediaStream, k = "https:" === window.location.protocol && (window.navigator.userAgent.match("Chrome") && parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10) >= 26 || window.navigator.userAgent.match("Firefox") && parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10) >= 33), l = window.webkitAudioContext || window.AudioContext;
            b.exports = {
                support: !!g,
                dataChannel: d || e || g && g.prototype && g.prototype.createDataChannel,
                prefix: c,
                webAudio: !(!l || !l.prototype.createMediaStreamSource),
                mediaStream: !(!j || !j.prototype.removeTrack),
                screenSharing: !!k,
                AudioContext: l,
                PeerConnection: g,
                SessionDescription: i,
                IceCandidate: h
            };
        }, {} ],
        2: [ function(a, b) {
            b.exports = function(a, b, c) {
                var d, e = window.URL, f = {
                    autoplay: !0,
                    mirror: !1,
                    muted: !1
                }, g = b || document.createElement("video");
                if (c) for (d in c) f[d] = c[d];
                if (f.autoplay && (g.autoplay = "autoplay"), f.muted && (g.muted = !0), f.mirror && [ "", "moz", "webkit", "o", "ms" ].forEach(function(a) {
                    var b = a ? a + "Transform" : "transform";
                    g.style[b] = "scaleX(-1)";
                }), e && e.createObjectURL) g.src = e.createObjectURL(a); else if (g.srcObject) g.srcObject = a; else {
                    if (!g.mozSrcObject) return !1;
                    g.mozSrcObject = a;
                }
                return g;
            };
        }, {} ],
        3: [ function(a, b) {
            function c(a) {
                var b, c, j = this, k = a || {}, l = this.config = {
                    url: SIGNALING_SERVER,
                    resource: 'siggy',
                    // socketio: { 'force new connection':true },
                    socketio: {},
                    debug: !1,
                    localVideoEl: "",
                    remoteVideosEl: "",
                    enableDataChannels: !0,
                    autoRequestMedia: !1,
                    autoRemoveVideos: !0,
                    adjustPeerVolume: !0,
                    peerVolumeWhenSpeaking: .25,
                    media: {
                        video: !0,
                        audio: !0
                    },
                    localVideo: {
                        autoplay: !0,
                        mirror: !0,
                        muted: !0
                    }
                };
                this.logger = function() {
                    return a.debug ? a.logger || console : a.logger || h;
                }();
                for (b in k) this.config[b] = k[b];
                this.capabilities = f, e.call(this), c = this.connection = i.connect(this.config.url, this.config.socketio), 
                c.on("connect", function() {
                    j.emit("connectionReady", c.socket.sessionid), j.sessionReady = !0, j.testReadiness();
                }), c.on("message", function(a) {
                    var b, c = j.webrtc.getPeers(a.from, a.roomType);
                    "offer" === a.type ? (b = c.length ? c[0] : j.webrtc.createPeer({
                        id: a.from,
                        type: a.roomType,
                        enableDataChannels: j.config.enableDataChannels && "screen" !== a.roomType,
                        sharemyscreen: "screen" === a.roomType && !a.broadcaster,
                        broadcaster: "screen" !== a.roomType || a.broadcaster ? null : j.connection.socket.sessionid
                    }), b.handleMessage(a)) : c.length && c.forEach(function(b) {
                        b.handleMessage(a);
                    });
                }), c.on("remove", function(a) {
                    a.id !== j.connection.socket.sessionid && j.webrtc.removePeers(a.id, a.type);
                }), a.logger = this.logger, a.debug = !1, this.webrtc = new d(a), [ "mute", "unmute", "pauseVideo", "resumeVideo", "pause", "resume", "sendToAll", "sendDirectlyToAll" ].forEach(function(a) {
                    j[a] = j.webrtc[a].bind(j.webrtc);
                }), this.webrtc.on("*", function() {
                    j.emit.apply(j, arguments);
                }), l.debug && this.on("*", this.logger.log.bind(this.logger, "SimpleWebRTC event:")), 
                this.webrtc.on("localStream", function() {
                    j.testReadiness();
                }), this.webrtc.on("message", function(a) {
                    j.connection.emit("message", a);
                }), this.webrtc.on("peerStreamAdded", this.handlePeerStreamAdded.bind(this)), this.webrtc.on("peerStreamRemoved", this.handlePeerStreamRemoved.bind(this)), 
                this.config.adjustPeerVolume && (this.webrtc.on("speaking", this.setVolumeForAll.bind(this, this.config.peerVolumeWhenSpeaking)), 
                this.webrtc.on("stoppedSpeaking", this.setVolumeForAll.bind(this, 1))), c.on("stunservers", function(a) {
                    j.webrtc.config.peerConnectionConfig.iceServers = a, j.emit("stunservers", a);
                }), c.on("turnservers", function(a) {
                    j.webrtc.config.peerConnectionConfig.iceServers = j.webrtc.config.peerConnectionConfig.iceServers.concat(a), 
                    j.emit("turnservers", a);
                }), this.webrtc.on("iceFailed", function() {}), this.webrtc.on("connectivityError", function() {}), 
                this.webrtc.on("audioOn", function() {
                    j.webrtc.sendToAll("unmute", {
                        name: "audio"
                    });
                }), this.webrtc.on("audioOff", function() {
                    j.webrtc.sendToAll("mute", {
                        name: "audio"
                    });
                }), this.webrtc.on("videoOn", function() {
                    j.webrtc.sendToAll("unmute", {
                        name: "video"
                    });
                }), this.webrtc.on("videoOff", function() {
                    j.webrtc.sendToAll("mute", {
                        name: "video"
                    });
                }), this.webrtc.on("localScreen", function(a) {
                    var b = document.createElement("video"), c = j.getRemoteVideoContainer();
                    b.oncontextmenu = function() {
                        return !1;
                    }, b.id = "localScreen", g(a, b), c && c.appendChild(b), j.emit("localScreenAdded", b), 
                    j.connection.emit("shareScreen"), j.webrtc.peers.forEach(function(a) {
                        var b;
                        "video" === a.type && (b = j.webrtc.createPeer({
                            id: a.id,
                            type: "screen",
                            sharemyscreen: !0,
                            enableDataChannels: !1,
                            receiveMedia: {
                                mandatory: {
                                    OfferToReceiveAudio: !1,
                                    OfferToReceiveVideo: !1
                                }
                            },
                            broadcaster: j.connection.socket.sessionid
                        }), b.start());
                    });
                }), this.webrtc.on("localScreenStopped", function() {
                    console.log("local screen stopped"), j.stopScreenShare();
                }), this.config.autoRequestMedia && this.startLocalVideo();
            }
            var d = a("webrtc"), e = a("wildemitter"), f = a("webrtcsupport"), g = a("attachmediastream"), h = a("mockconsole"), i = a("socket.io-client");
            c.prototype = Object.create(e.prototype, {
                constructor: {
                    value: c
                }
            }), c.prototype.leaveRoom = function() {
                this.roomName && (this.connection.emit("leave"), this.webrtc.peers.forEach(function(a) {
                    a.end();
                }), this.getLocalScreen() && this.stopScreenShare(), this.emit("leftRoom", this.roomName), 
                this.roomName = void 0);
            }, c.prototype.disconnect = function() {
                this.connection.disconnect(), delete this.connection;
            }, c.prototype.handlePeerStreamAdded = function(a) {
                var b = this, c = this.getRemoteVideoContainer(), d = g(a.stream);
                a.videoEl = d, d.id = this.getDomId(a), c && c.appendChild(d), this.emit("videoAdded", d, a), 
                window.setTimeout(function() {
                    b.webrtc.isAudioEnabled() || a.send("mute", {
                        name: "audio"
                    }), b.webrtc.isVideoEnabled() || a.send("mute", {
                        name: "video"
                    });
                }, 250);
            }, c.prototype.handlePeerStreamRemoved = function(a) {
                var b = this.getRemoteVideoContainer(), c = a.videoEl;
                this.config.autoRemoveVideos && b && c && b.removeChild(c), c && this.emit("videoRemoved", c, a);
            }, c.prototype.getDomId = function(a) {
                return [ a.id, a.type, a.broadcaster ? "broadcasting" : "incoming" ].join("_");
            }, c.prototype.setVolumeForAll = function(a) {
                this.webrtc.peers.forEach(function(b) {
                    b.videoEl && (b.videoEl.volume = a);
                });
            }, c.prototype.joinRoom = function(a, b) {
                var c = this;
                this.roomName = a, this.connection.emit("join", a, function(d, e) {
                    if (d) c.emit("error", d); else {
                        var f, g, h, i;
                        for (f in e.clients) {
                            g = e.clients[f];
                            for (h in g) g[h] && (i = c.webrtc.createPeer({
                                id: f,
                                type: h,
                                enableDataChannels: c.config.enableDataChannels && "screen" !== h,
                                receiveMedia: {
                                    mandatory: {
                                        OfferToReceiveAudio: "screen" !== h,
                                        OfferToReceiveVideo: !0
                                    }
                                }
                            }), i.start());
                        }
                    }
                    b && b(d, e), c.emit("joinedRoom", a);
                });
            }, c.prototype.getEl = function(a) {
                return "string" == typeof a ? document.getElementById(a) : a;
            }, c.prototype.startLocalVideo = function() {
                var a = this;
                this.webrtc.startLocalMedia(this.config.media, function(b, c) {
                    b ? a.emit("localMediaError", b) : g(c, a.getLocalVideoContainer(), a.config.localVideo);
                });
            }, c.prototype.stopLocalVideo = function() {
                this.webrtc.stopLocalMedia();
            }, c.prototype.getLocalVideoContainer = function() {
                var a = this.getEl(this.config.localVideoEl);
                if (a && "VIDEO" === a.tagName) return a.oncontextmenu = function() {
                    return !1;
                }, a;
                if (a) {
                    var b = document.createElement("video");
                    return b.oncontextmenu = function() {
                        return !1;
                    }, a.appendChild(b), b;
                }
            }, c.prototype.getRemoteVideoContainer = function() {
                return this.getEl(this.config.remoteVideosEl);
            }, c.prototype.shareScreen = function(a) {
                this.webrtc.startScreenShare(a);
            }, c.prototype.getLocalScreen = function() {
                return this.webrtc.localScreen;
            }, c.prototype.stopScreenShare = function() {
                this.connection.emit("unshareScreen");
                var a = document.getElementById("localScreen"), b = this.getRemoteVideoContainer(), c = this.getLocalScreen();
                this.config.autoRemoveVideos && b && a && b.removeChild(a), a && this.emit("videoRemoved", a), 
                c && c.stop(), this.webrtc.peers.forEach(function(a) {
                    a.broadcaster && a.end();
                });
            }, c.prototype.testReadiness = function() {
                var a = this;
                this.webrtc.localStream && this.sessionReady && a.emit("readyToCall", a.connection.socket.sessionid);
            }, c.prototype.createRoom = function(a, b) {
                2 === arguments.length ? this.connection.emit("create", a, b) : this.connection.emit("create", a);
            }, c.prototype.sendFile = function() {
                return f.dataChannel ? void 0 : this.emit("error", new Error("DataChannelNotSupported"));
            }, b.exports = c;
        }, {
            attachmediastream: 2,
            mockconsole: 5,
            "socket.io-client": 7,
            webrtc: 4,
            webrtcsupport: 1,
            wildemitter: 6
        } ],
        5: [ function(a, b) {
            for (var c = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","), d = c.length, e = function() {}, f = {}; d--; ) f[c[d]] = e;
            b.exports = f;
        }, {} ],
        6: [ function(a, b) {
            function c() {
                this.callbacks = {};
            }
            b.exports = c, c.prototype.on = function(a) {
                var b = 3 === arguments.length, c = b ? arguments[1] : void 0, d = b ? arguments[2] : arguments[1];
                return d._groupName = c, (this.callbacks[a] = this.callbacks[a] || []).push(d), 
                this;
            }, c.prototype.once = function(a) {
                function b() {
                    c.off(a, b), f.apply(this, arguments);
                }
                var c = this, d = 3 === arguments.length, e = d ? arguments[1] : void 0, f = d ? arguments[2] : arguments[1];
                return this.on(a, e, b), this;
            }, c.prototype.releaseGroup = function(a) {
                var b, c, d, e;
                for (b in this.callbacks) for (e = this.callbacks[b], c = 0, d = e.length; d > c; c++) e[c]._groupName === a && (e.splice(c, 1), 
                c--, d--);
                return this;
            }, c.prototype.off = function(a, b) {
                var c, d = this.callbacks[a];
                return d ? 1 === arguments.length ? (delete this.callbacks[a], this) : (c = d.indexOf(b), 
                d.splice(c, 1), this) : this;
            }, c.prototype.emit = function(a) {
                var b, c, d, e = [].slice.call(arguments, 1), f = this.callbacks[a], g = this.getWildcardCallbacks(a);
                if (f) for (d = f.slice(), b = 0, c = d.length; c > b && d[b]; ++b) d[b].apply(this, e);
                if (g) for (c = g.length, d = g.slice(), b = 0, c = d.length; c > b && d[b]; ++b) d[b].apply(this, [ a ].concat(e));
                return this;
            }, c.prototype.getWildcardCallbacks = function(a) {
                var b, c, d = [];
                for (b in this.callbacks) c = b.split("*"), ("*" === b || 2 === c.length && a.slice(0, c[0].length) === c[0]) && (d = d.concat(this.callbacks[b]));
                return d;
            };
        }, {} ],
        7: [ function(require, module, exports) {
            var io = "undefined" == typeof module ? {} : module.exports;
            !function() {
                if (function(a, b) {
                    var c = a;
                    c.version = "0.9.16", c.protocol = 1, c.transports = [], c.j = [], c.sockets = {}, 
                    c.connect = function(a, d) {
                        var e, f, g = c.util.parseUri(a);
                        b && b.location && (g.protocol = g.protocol || b.location.protocol.slice(0, -1), 
                        g.host = g.host || (b.document ? b.document.domain : b.location.hostname), g.port = g.port || b.location.port), 
                        e = c.util.uniqueUri(g);
                        var h = {
                            host: g.host,
                            secure: "https" == g.protocol,
                            port: g.port || ("https" == g.protocol ? 443 : 80),
                            query: g.query || ""
                        };
                        return c.util.merge(h, d), (h["force new connection"] || !c.sockets[e]) && (f = new c.Socket(h)), 
                        !h["force new connection"] && f && (c.sockets[e] = f), f = f || c.sockets[e], f.of(g.path.length > 1 ? g.path : "");
                    };
                }("object" == typeof module ? module.exports : this.io = {}, this), function(a, b) {
                    var c = a.util = {}, d = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/, e = [ "source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor" ];
                    c.parseUri = function(a) {
                        for (var b = d.exec(a || ""), c = {}, f = 14; f--; ) c[e[f]] = b[f] || "";
                        return c;
                    }, c.uniqueUri = function(a) {
                        var c = a.protocol, d = a.host, e = a.port;
                        return "document" in b ? (d = d || document.domain, e = e || ("https" == c && "https:" !== document.location.protocol ? 443 : document.location.port)) : (d = d || "localhost", 
                        e || "https" != c || (e = 443)), (c || "http") + "://" + d + ":" + (e || 80);
                    }, c.query = function(a, b) {
                        var d = c.chunkQuery(a || ""), e = [];
                        c.merge(d, c.chunkQuery(b || ""));
                        for (var f in d) d.hasOwnProperty(f) && e.push(f + "=" + d[f]);
                        return e.length ? "?" + e.join("&") : "";
                    }, c.chunkQuery = function(a) {
                        for (var b, c = {}, d = a.split("&"), e = 0, f = d.length; f > e; ++e) b = d[e].split("="), 
                        b[0] && (c[b[0]] = b[1]);
                        return c;
                    };
                    var f = !1;
                    c.load = function(a) {
                        return "document" in b && "complete" === document.readyState || f ? a() : [object Object]0;
                    }, c.on = function(a, b, c, d) {
                        a.attachEvent ? a.attachEvent("on" + b, c) : a.addEventListener && a.addEventListener(b, c, d);
                    }, c.request = function(a) {
                        if (a && "undefined" != typeof XDomainRequest && !c.ua.hasCORS) return new XDomainRequest();
                        if ("undefined" != typeof XMLHttpRequest && (!a || c.ua.hasCORS)) return new XMLHttpRequest();
                        if (!a) try {
                            return new (window[[ "Active" ].concat("Object").join("X")])("Microsoft.XMLHTTP");
                        } catch (b) {}
                        return null;
                    }, "undefined" != typeof window && c.load(function() {
                        f = !0;
                    }), c.defer = function(a) {
                        return c.ua.webkit && "undefined" == typeof importScripts ? [object Object]0 : a();
                    }, c.merge = function(a, b, d, e) {
                        var f, g = e || [], h = "undefined" == typeof d ? 2 : d;
                        for (f in b) b.hasOwnProperty(f) && c.indexOf(g, f) < 0 && ("object" == typeof a[f] && h ? c.merge(a[f], b[f], h - 1, g) : (a[f] = b[f], 
                        g.push(b[f])));
                        return a;
                    }, c.mixin = function(a, b) {
                        c.merge(a.prototype, b.prototype);
                    }, c.inherit = function(a, b) {
                        function c() {}
                        c.prototype = b.prototype, a.prototype = new c();
                    }, c.isArray = Array.isArray || function(a) {
                        return "[object Array]" === Object.prototype.toString.call(a);
                    }, c.intersect = function(a, b) {
                        for (var d = [], e = a.length > b.length ? a : b, f = a.length > b.length ? b : a, g = 0, h = f.length; h > g; g++) ~c.indexOf(e, f[g]) && d.push(f[g]);
                        return d;
                    }, c.indexOf = function(a, b, c) {
                        for (var d = a.length, c = 0 > c ? 0 > c + d ? 0 : c + d : c || 0; d > c && a[c] !== b; c++) ;
                        return c >= d ? -1 : c;
                    }, c.toArray = function(a) {
                        for (var b = [], c = 0, d = a.length; d > c; c++) b.push(a[c]);
                        return b;
                    }, c.ua = {}, c.ua.hasCORS = "undefined" != typeof XMLHttpRequest && function() {
                        try {
                            var a = new XMLHttpRequest();
                        } catch (b) {
                            return !1;
                        }
                        return void 0 != a.withCredentials;
                    }(), c.ua.webkit = "undefined" != typeof navigator && /webkit/i.test(navigator.userAgent), 
                    c.ua.iDevice = "undefined" != typeof navigator && /iPad|iPhone|iPod/i.test(navigator.userAgent);
                }("undefined" != typeof io ? io : module.exports, this), function(a, b) {
                    function c() {}
                    a.EventEmitter = c, c.prototype.on = function(a, c) {
                        return this.$events || (this.$events = {}), this.$events[a] ? b.util.isArray(this.$events[a]) ? this.$events[a].push(c) : this.$events[a] = [ this.$events[a], c ] : this.$events[a] = c, 
                        this;
                    }, c.prototype.addListener = c.prototype.on, c.prototype.once = function(a, b) {
                        function c() {
                            d.removeListener(a, c), b.apply(this, arguments);
                        }
                        var d = this;
                        return c.listener = b, this.on(a, c), this;
                    }, c.prototype.removeListener = function(a, c) {
                        if (this.$events && this.$events[a]) {
                            var d = this.$events[a];
                            if (b.util.isArray(d)) {
                                for (var e = -1, f = 0, g = d.length; g > f; f++) if (d[f] === c || d[f].listener && d[f].listener === c) {
                                    e = f;
                                    break;
                                }
                                if (0 > e) return this;
                                d.splice(e, 1), d.length || delete this.$events[a];
                            } else (d === c || d.listener && d.listener === c) && delete this.$events[a];
                        }
                        return this;
                    }, c.prototype.removeAllListeners = function(a) {
                        return void 0 === a ? (this.$events = {}, this) : (this.$events && this.$events[a] && (this.$events[a] = null), 
                        this);
                    }, c.prototype.listeners = function(a) {
                        return this.$events || (this.$events = {}), this.$events[a] || (this.$events[a] = []), 
                        b.util.isArray(this.$events[a]) || (this.$events[a] = [ this.$events[a] ]), this.$events[a];
                    }, c.prototype.emit = function(a) {
                        if (!this.$events) return !1;
                        var c = this.$events[a];
                        if (!c) return !1;
                        var d = Array.prototype.slice.call(arguments, 1);
                        if ("function" == typeof c) c.apply(this, d); else {
                            if (!b.util.isArray(c)) return !1;
                            for (var e = c.slice(), f = 0, g = e.length; g > f; f++) e[f].apply(this, d);
                        }
                        return !0;
                    };
                }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
                function(exports, nativeJSON) {
                    "use strict";
                    function f(a) {
                        return 10 > a ? "0" + a : a;
                    }
                    function date(a) {
                        return isFinite(a.valueOf()) ? a.getUTCFullYear() + "-" + f(a.getUTCMonth() + 1) + "-" + f(a.getUTCDate()) + "T" + f(a.getUTCHours()) + ":" + f(a.getUTCMinutes()) + ":" + f(a.getUTCSeconds()) + "Z" : null;
                    }
                    function quote(a) {
                        return escapable.lastIndex = 0, escapable.test(a) ? '"' + a.replace(escapable, function(a) {
                            var b = meta[a];
                            return "string" == typeof b ? b : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                        }) + '"' : '"' + a + '"';
                    }
                    function str(a, b) {
                        var c, d, e, f, g, h = gap, i = b[a];
                        switch (i instanceof Date && (i = date(a)), "function" == typeof rep && (i = rep.call(b, a, i)), 
                        typeof i) {
                          case "string":
                            return quote(i);

                          case "number":
                            return isFinite(i) ? String(i) : "null";

                          case "boolean":
                          case "null":
                            return String(i);

                          case "object":
                            if (!i) return "null";
                            if (gap += indent, g = [], "[object Array]" === Object.prototype.toString.apply(i)) {
                                for (f = i.length, c = 0; f > c; c += 1) g[c] = str(c, i) || "null";
                                return e = 0 === g.length ? "[]" : gap ? "[\n" + gap + g.join(",\n" + gap) + "\n" + h + "]" : "[" + g.join(",") + "]", 
                                gap = h, e;
                            }
                            if (rep && "object" == typeof rep) for (f = rep.length, c = 0; f > c; c += 1) "string" == typeof rep[c] && (d = rep[c], 
                            e = str(d, i), e && g.push(quote(d) + (gap ? ": " : ":") + e)); else for (d in i) Object.prototype.hasOwnProperty.call(i, d) && (e = str(d, i), 
                            e && g.push(quote(d) + (gap ? ": " : ":") + e));
                            return e = 0 === g.length ? "{}" : gap ? "{\n" + gap + g.join(",\n" + gap) + "\n" + h + "}" : "{" + g.join(",") + "}", 
                            gap = h, e;
                        }
                    }
                    if (nativeJSON && nativeJSON.parse) return exports.JSON = {
                        parse: nativeJSON.parse,
                        stringify: nativeJSON.stringify
                    };
                    var JSON = exports.JSON = {}, cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {
                        "\b": "\\b",
                        "   ": "\\t",
                        "\n": "\\n",
                        "\f": "\\f",
                        "\r": "\\r",
                        '"': '\\"',
                        "\\": "\\\\"
                    }, rep;
                    JSON.stringify = function(a, b, c) {
                        var d;
                        if (gap = "", indent = "", "number" == typeof c) for (d = 0; c > d; d += 1) indent += " "; else "string" == typeof c && (indent = c);
                        if (rep = b, b && "function" != typeof b && ("object" != typeof b || "number" != typeof b.length)) throw new Error("JSON.stringify");
                        return str("", {
                            "": a
                        });
                    }, JSON.parse = function(text, reviver) {
                        function walk(a, b) {
                            var c, d, e = a[b];
                            if (e && "object" == typeof e) for (c in e) Object.prototype.hasOwnProperty.call(e, c) && (d = walk(e, c), 
                            void 0 !== d ? e[c] = d : delete e[c]);
                            return reviver.call(a, b, e);
                        }
                        var j;
                        if (text = String(text), cx.lastIndex = 0, cx.test(text) && (text = text.replace(cx, function(a) {
                            return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                        })), /^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) return j = eval("(" + text + ")"), 
                        "function" == typeof reviver ? walk({
                            "": j
                        }, "") : j;
                        throw new SyntaxError("JSON.parse");
                    };
                }("undefined" != typeof io ? io : module.exports, "undefined" != typeof JSON ? JSON : void 0), 
                function(a, b) {
                    var c = a.parser = {}, d = c.packets = [ "disconnect", "connect", "heartbeat", "message", "json", "event", "ack", "error", "noop" ], e = c.reasons = [ "transport not supported", "client not handshaken", "unauthorized" ], f = c.advice = [ "reconnect" ], g = b.JSON, h = b.util.indexOf;
                    c.encodePacket = function(a) {
                        var b = h(d, a.type), c = a.id || "", i = a.endpoint || "", j = a.ack, k = null;
                        switch (a.type) {
                          case "error":
                            var l = a.reason ? h(e, a.reason) : "", m = a.advice ? h(f, a.advice) : "";
                            ("" !== l || "" !== m) && (k = l + ("" !== m ? "+" + m : ""));
                            break;

                          case "message":
                            "" !== a.data && (k = a.data);
                            break;

                          case "event":
                            var n = {
                                name: a.name
                            };
                            a.args && a.args.length && (n.args = a.args), k = g.stringify(n);
                            break;

                          case "json":
                            k = g.stringify(a.data);
                            break;

                          case "connect":
                            a.qs && (k = a.qs);
                            break;

                          case "ack":
                            k = a.ackId + (a.args && a.args.length ? "+" + g.stringify(a.args) : "");
                        }
                        var o = [ b, c + ("data" == j ? "+" : ""), i ];
                        return null !== k && void 0 !== k && o.push(k), o.join(":");
                    }, c.encodePayload = function(a) {
                        var b = "";
                        if (1 == a.length) return a[0];
                        for (var c = 0, d = a.length; d > c; c++) {
                            var e = a[c];
                            b += "�" + e.length + "�" + a[c];
                        }
                        return b;
                    };
                    var i = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;
                    c.decodePacket = function(a) {
                        var b = a.match(i);
                        if (!b) return {};
                        var c = b[2] || "", a = b[5] || "", h = {
                            type: d[b[1]],
                            endpoint: b[4] || ""
                        };
                        switch (c && (h.id = c, h.ack = b[3] ? "data" : !0), h.type) {
                          case "error":
                            var b = a.split("+");
                            h.reason = e[b[0]] || "", h.advice = f[b[1]] || "";
                            break;

                          case "message":
                            h.data = a || "";
                            break;

                          case "event":
                            try {
                                var j = g.parse(a);
                                h.name = j.name, h.args = j.args;
                            } catch (k) {}
                            h.args = h.args || [];
                            break;

                          case "json":
                            try {
                                h.data = g.parse(a);
                            } catch (k) {}
                            break;

                          case "connect":
                            h.qs = a || "";
                            break;

                          case "ack":
                            var b = a.match(/^([0-9]+)(\+)?(.*)/);
                            if (b && (h.ackId = b[1], h.args = [], b[3])) try {
                                h.args = b[3] ? g.parse(b[3]) : [];
                            } catch (k) {}
                            break;

                          case "disconnect":
                          case "heartbeat":                        }
                        return h;
                    }, c.decodePayload = function(a) {
                        if ("�" == a.charAt(0)) {
                            for (var b = [], d = 1, e = ""; d < a.length; d++) "�" == a.charAt(d) ? (b.push(c.decodePacket(a.substr(d + 1).substr(0, e))), 
                            d += Number(e) + 1, e = "") : e += a.charAt(d);
                            return b;
                        }
                        return [ c.decodePacket(a) ];
                    };
                }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
                function(a, b) {
                    function c(a, b) {
                        this.socket = a, this.sessid = b;
                    }
                    a.Transport = c, b.util.mixin(c, b.EventEmitter), c.prototype.heartbeats = function() {
                        return !0;
                    }, c.prototype.onData = function(a) {
                        if (this.clearCloseTimeout(), (this.socket.connected || this.socket.connecting || this.socket.reconnecting) && this.setCloseTimeout(), 
                        "" !== a) {
                            var c = b.parser.decodePayload(a);
                            if (c && c.length) for (var d = 0, e = c.length; e > d; d++) this.onPacket(c[d]);
                        }
                        return this;
                    }, c.prototype.onPacket = function(a) {
                        return this.socket.setHeartbeatTimeout(), "heartbeat" == a.type ? this.onHeartbeat() : ("connect" == a.type && "" == a.endpoint && this.onConnect(), 
                        "error" == a.type && "reconnect" == a.advice && (this.isOpen = !1), this.socket.onPacket(a), 
                        this);
                    }, c.prototype.setCloseTimeout = function() {
                        if (!this.closeTimeout) {
                            var a = this;
                            this.closeTimeout = setTimeout(function() {
                                a.onDisconnect();
                            }, this.socket.closeTimeout);
                        }
                    }, c.prototype.onDisconnect = function() {
                        return this.isOpen && this.close(), this.clearTimeouts(), this.socket.onDisconnect(), 
                        this;
                    }, c.prototype.onConnect = function() {
                        return this.socket.onConnect(), this;
                    }, c.prototype.clearCloseTimeout = function() {
                        this.closeTimeout && (clearTimeout(this.closeTimeout), this.closeTimeout = null);
                    }, c.prototype.clearTimeouts = function() {
                        this.clearCloseTimeout(), this.reopenTimeout && clearTimeout(this.reopenTimeout);
                    }, c.prototype.packet = function(a) {
                        this.send(b.parser.encodePacket(a));
                    }, c.prototype.onHeartbeat = function() {
                        this.packet({
                            type: "heartbeat"
                        });
                    }, c.prototype.onOpen = function() {
                        this.isOpen = !0, this.clearCloseTimeout(), this.socket.onOpen();
                    }, c.prototype.onClose = function() {
                        this.isOpen = !1, this.socket.onClose(), this.onDisconnect();
                    }, c.prototype.prepareUrl = function() {
                        var a = this.socket.options;
                        return this.scheme() + "://" + a.host + ":" + a.port + "/" + a.resource + "/" + b.protocol + "/" + this.name + "/" + this.sessid;
                    }, c.prototype.ready = function(a, b) {
                        b.call(this);
                    };
                }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
                function(a, b, c) {
                    function d(a) {
                        if (this.options = {
                            port: 80,
                            secure: !1,
                            document: "document" in c ? document : !1,
                            resource: "socket.io",
                            transports: b.transports,
                            "connect timeout": 1e4,
                            "try multiple transports": !0,
                            reconnect: !0,
                            "reconnection delay": 500,
                            "reconnection limit": 1 / 0,
                            "reopen delay": 3e3,
                            "max reconnection attempts": 10,
                            "sync disconnect on unload": !1,
                            "auto connect": !0,
                            "flash policy port": 10843,
                            manualFlush: !1
                        }, b.util.merge(this.options, a), this.connected = !1, this.open = !1, this.connecting = !1, 
                        this.reconnecting = !1, this.namespaces = {}, this.buffer = [], this.doBuffer = !1, 
                        this.options["sync disconnect on unload"] && (!this.isXDomain() || b.util.ua.hasCORS)) {
                            var d = this;
                            b.util.on(c, "beforeunload", function() {
                                d.disconnectSync();
                            }, !1);
                        }
                        this.options["auto connect"] && this.connect();
                    }
                    function e() {}
                    a.Socket = d, b.util.mixin(d, b.EventEmitter), d.prototype.of = function(a) {
                        return this.namespaces[a] || (this.namespaces[a] = new b.SocketNamespace(this, a), 
                        "" !== a && this.namespaces[a].packet({
                            type: "connect"
                        })), this.namespaces[a];
                    }, d.prototype.publish = function() {
                        this.emit.apply(this, arguments);
                        var a;
                        for (var b in this.namespaces) this.namespaces.hasOwnProperty(b) && (a = this.of(b), 
                        a.$emit.apply(a, arguments));
                    }, d.prototype.handshake = function(a) {
                        function c(b) {
                            b instanceof Error ? (d.connecting = !1, d.onError(b.message)) : a.apply(null, b.split(":"));
                        }
                        var d = this, f = this.options, g = [ "http" + (f.secure ? "s" : "") + ":/", f.host + ":" + f.port, f.resource, b.protocol, b.util.query(this.options.query, "t=" + +new Date()) ].join("/");
                        if (this.isXDomain() && !b.util.ua.hasCORS) {
                            var h = document.getElementsByTagName("script")[0], i = document.createElement("script");
                            i.src = g + "&jsonp=" + b.j.length, h.parentNode.insertBefore(i, h), b.j.push(function(a) {
                                c(a), i.parentNode.removeChild(i);
                            });
                        } else {
                            var j = b.util.request();
                            j.open("GET", g, !0), this.isXDomain() && (j.withCredentials = !0), j.onreadystatechange = function() {
                                4 == j.readyState && (j.onreadystatechange = e, 200 == j.status ? c(j.responseText) : 403 == j.status ? d.onError(j.responseText) : (d.connecting = !1, 
                                !d.reconnecting && d.onError(j.responseText)));
                            }, j.send(null);
                        }
                    }, d.prototype.getTransport = function(a) {
                        for (var c, d = a || this.transports, e = 0; c = d[e]; e++) if (b.Transport[c] && b.Transport[c].check(this) && (!this.isXDomain() || b.Transport[c].xdomainCheck(this))) return new b.Transport[c](this, this.sessionid);
                        return null;
                    }, d.prototype.connect = function(a) {
                        if (this.connecting) return this;
                        var c = this;
                        return c.connecting = !0, this.handshake(function(d, e, f, g) {
                            function h(a) {
                                return c.transport && c.transport.clearTimeouts(), c.transport = c.getTransport(a), 
                                c.transport ? [object Object]0 : c.publish("connect_failed");
                            }
                            c.sessionid = d, c.closeTimeout = 1e3 * f, c.heartbeatTimeout = 1e3 * e, c.transports || (c.transports = c.origTransports = g ? b.util.intersect(g.split(","), c.options.transports) : c.options.transports), 
                            c.setHeartbeatTimeout(), h(c.transports), c.once("connect", function() {
                                clearTimeout(c.connectTimeoutTimer), a && "function" == typeof a && a();
                            });
                        }), this;
                    }, d.prototype.setHeartbeatTimeout = function() {
                        if (clearTimeout(this.heartbeatTimeoutTimer), !this.transport || this.transport.heartbeats()) {
                            var a = this;
                            this.heartbeatTimeoutTimer = setTimeout(function() {
                                a.transport.onClose();
                            }, this.heartbeatTimeout);
                        }
                    }, d.prototype.packet = function(a) {
                        return this.connected && !this.doBuffer ? this.transport.packet(a) : this.buffer.push(a), 
                        this;
                    }, d.prototype.setBuffer = function(a) {
                        this.doBuffer = a, !a && this.connected && this.buffer.length && (this.options.manualFlush || this.flushBuffer());
                    }, d.prototype.flushBuffer = function() {
                        this.transport.payload(this.buffer), this.buffer = [];
                    }, d.prototype.disconnect = function() {
                        return (this.connected || this.connecting) && (this.open && this.of("").packet({
                            type: "disconnect"
                        }), this.onDisconnect("booted")), this;
                    }, d.prototype.disconnectSync = function() {
                        var a = b.util.request(), c = [ "http" + (this.options.secure ? "s" : "") + ":/", this.options.host + ":" + this.options.port, this.options.resource, b.protocol, "", this.sessionid ].join("/") + "/?disconnect=1";
                        a.open("GET", c, !1), a.send(null), this.onDisconnect("booted");
                    }, d.prototype.isXDomain = function() {
                        var a = c.location.port || ("https:" == c.location.protocol ? 443 : 80);
                        return this.options.host !== c.location.hostname || this.options.port != a;
                    }, d.prototype.onConnect = function() {
                        this.connected || (this.connected = !0, this.connecting = !1, this.doBuffer || this.setBuffer(!1), 
                        this.emit("connect"));
                    }, d.prototype.onOpen = function() {
                        this.open = !0;
                    }, d.prototype.onClose = function() {
                        this.open = !1, clearTimeout(this.heartbeatTimeoutTimer);
                    }, d.prototype.onPacket = function(a) {
                        this.of(a.endpoint).onPacket(a);
                    }, d.prototype.onError = function(a) {
                        a && a.advice && "reconnect" === a.advice && (this.connected || this.connecting) && (this.disconnect(), 
                        this.options.reconnect && this.reconnect()), this.publish("error", a && a.reason ? a.reason : a);
                    }, d.prototype.onDisconnect = function(a) {
                        var b = this.connected, c = this.connecting;
                        this.connected = !1, this.connecting = !1, this.open = !1, (b || c) && (this.transport.close(), 
                        this.transport.clearTimeouts(), b && (this.publish("disconnect", a), "booted" != a && this.options.reconnect && !this.reconnecting && this.reconnect()));
                    }, d.prototype.reconnect = function() {
                        function a() {
                            if (c.connected) {
                                for (var a in c.namespaces) c.namespaces.hasOwnProperty(a) && "" !== a && c.namespaces[a].packet({
                                    type: "connect"
                                });
                                c.publish("reconnect", c.transport.name, c.reconnectionAttempts);
                            }
                            clearTimeout(c.reconnectionTimer), c.removeListener("connect_failed", b), c.removeListener("connect", b), 
                            c.reconnecting = !1, delete c.reconnectionAttempts, delete c.reconnectionDelay, 
                            delete c.reconnectionTimer, delete c.redoTransports, c.options["try multiple transports"] = e;
                        }
                        function b() {
                            return c.reconnecting ? c.connected ? a() : c.connecting && c.reconnecting ? c.reconnectionTimer = setTimeout(b, 1e3) : [object Object]0 : void 0;
                        }
                        this.reconnecting = !0, this.reconnectionAttempts = 0, this.reconnectionDelay = this.options["reconnection delay"];
                        var c = this, d = this.options["max reconnection attempts"], e = this.options["try multiple transports"], f = this.options["reconnection limit"];
                        this.options["try multiple transports"] = !1, this.reconnectionTimer = setTimeout(b, this.reconnectionDelay), 
                        this.on("connect", b);
                    };
                }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
                function(a, b) {
                    function c(a, b) {
                        this.socket = a, this.name = b || "", this.flags = {}, this.json = new d(this, "json"), 
                        this.ackPackets = 0, this.acks = {};
                    }
                    function d(a, b) {
                        this.namespace = a, this.name = b;
                    }
                    a.SocketNamespace = c, b.util.mixin(c, b.EventEmitter), c.prototype.$emit = b.EventEmitter.prototype.emit, 
                    c.prototype.of = function() {
                        return this.socket.of.apply(this.socket, arguments);
                    }, c.prototype.packet = function(a) {
                        return a.endpoint = this.name, this.socket.packet(a), this.flags = {}, this;
                    }, c.prototype.send = function(a, b) {
                        var c = {
                            type: this.flags.json ? "json" : "message",
                            data: a
                        };
                        return "function" == typeof b && (c.id = ++this.ackPackets, c.ack = !0, this.acks[c.id] = b), 
                        this.packet(c);
                    }, c.prototype.emit = function(a) {
                        var b = Array.prototype.slice.call(arguments, 1), c = b[b.length - 1], d = {
                            type: "event",
                            name: a
                        };
                        return "function" == typeof c && (d.id = ++this.ackPackets, d.ack = "data", this.acks[d.id] = c, 
                        b = b.slice(0, b.length - 1)), d.args = b, this.packet(d);
                    }, c.prototype.disconnect = function() {
                        return "" === this.name ? this.socket.disconnect() : (this.packet({
                            type: "disconnect"
                        }), this.$emit("disconnect")), this;
                    }, c.prototype.onPacket = function(a) {
                        function c() {
                            d.packet({
                                type: "ack",
                                args: b.util.toArray(arguments),
                                ackId: a.id
                            });
                        }
                        var d = this;
                        switch (a.type) {
                          case "connect":
                            this.$emit("connect");
                            break;

                          case "disconnect":
                            "" === this.name ? this.socket.onDisconnect(a.reason || "booted") : this.$emit("disconnect", a.reason);
                            break;

                          case "message":
                          case "json":
                            var e = [ "message", a.data ];
                            "data" == a.ack ? e.push(c) : a.ack && this.packet({
                                type: "ack",
                                ackId: a.id
                            }), this.$emit.apply(this, e);
                            break;

                          case "event":
                            var e = [ a.name ].concat(a.args);
                            "data" == a.ack && e.push(c), this.$emit.apply(this, e);
                            break;

                          case "ack":
                            this.acks[a.ackId] && (this.acks[a.ackId].apply(this, a.args), delete this.acks[a.ackId]);
                            break;

                          case "error":
                            a.advice ? this.socket.onError(a) : "unauthorized" == a.reason ? this.$emit("connect_failed", a.reason) : this.$emit("error", a.reason);
                        }
                    }, d.prototype.send = function() {
                        this.namespace.flags[this.name] = !0, this.namespace.send.apply(this.namespace, arguments);
                    }, d.prototype.emit = function() {
                        this.namespace.flags[this.name] = !0, this.namespace.emit.apply(this.namespace, arguments);
                    };
                }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
                function(a, b, c) {
                    function d() {
                        b.Transport.apply(this, arguments);
                    }
                    a.websocket = d, b.util.inherit(d, b.Transport), d.prototype.name = "websocket", 
                    d.prototype.open = function() {
                        var a, d = b.util.query(this.socket.options.query), e = this;
                        return a || (a = c.MozWebSocket || c.WebSocket), this.websocket = new a(this.prepareUrl() + d), 
                        this.websocket.onopen = function() {
                            e.onOpen(), e.socket.setBuffer(!1);
                        }, this.websocket.onmessage = function(a) {
                            e.onData(a.data);
                        }, this.websocket.onclose = function() {
                            e.onClose(), e.socket.setBuffer(!0);
                        }, this.websocket.onerror = function(a) {
                            e.onError(a);
                        }, this;
                    }, d.prototype.send = b.util.ua.iDevice ? function(a) {
                        var b = this;
                        return setTimeout(function() {
                            b.websocket.send(a);
                        }, 0), this;
                    } : function(a) {
                        return this.websocket.send(a), this;
                    }, d.prototype.payload = function(a) {
                        for (var b = 0, c = a.length; c > b; b++) this.packet(a[b]);
                        return this;
                    }, d.prototype.close = function() {
                        return this.websocket.close(), this;
                    }, d.prototype.onError = function(a) {
                        this.socket.onError(a);
                    }, d.prototype.scheme = function() {
                        return this.socket.options.secure ? "wss" : "ws";
                    }, d.check = function() {
                        return "WebSocket" in c && !("__addTask" in WebSocket) || "MozWebSocket" in c;
                    }, d.xdomainCheck = function() {
                        return !0;
                    }, b.transports.push("websocket");
                }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
                function(a, b) {
                    function c() {
                        b.Transport.websocket.apply(this, arguments);
                    }
                    a.flashsocket = c, b.util.inherit(c, b.Transport.websocket), c.prototype.name = "flashsocket", 
                    c.prototype.open = function() {
                        var a = this, c = arguments;
                        return WebSocket.__addTask(function() {
                            b.Transport.websocket.prototype.open.apply(a, c);
                        }), this;
                    }, c.prototype.send = function() {
                        var a = this, c = arguments;
                        return WebSocket.__addTask(function() {
                            b.Transport.websocket.prototype.send.apply(a, c);
                        }), this;
                    }, c.prototype.close = function() {
                        return WebSocket.__tasks.length = 0, b.Transport.websocket.prototype.close.call(this), 
                        this;
                    }, c.prototype.ready = function(a, d) {
                        function e() {
                            var b = a.options, e = b["flash policy port"], g = [ "http" + (b.secure ? "s" : "") + ":/", b.host + ":" + b.port, b.resource, "static/flashsocket", "WebSocketMain" + (a.isXDomain() ? "Insecure" : "") + ".swf" ];
                            c.loaded || ("undefined" == typeof WEB_SOCKET_SWF_LOCATION && (WEB_SOCKET_SWF_LOCATION = g.join("/")), 
                            843 !== e && WebSocket.loadFlashPolicyFile("xmlsocket://" + b.host + ":" + e), WebSocket.__initialize(), 
                            c.loaded = !0), d.call(f);
                        }
                        var f = this;
                        return document.body ? e() : [object Object]0;
                    }, c.check = function() {
                        return "undefined" != typeof WebSocket && "__initialize" in WebSocket && swfobject ? swfobject.getFlashPlayerVersion().major >= 10 : !1;
                    }, c.xdomainCheck = function() {
                        return !0;
                    }, "undefined" != typeof window && (WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = !0), 
                    b.transports.push("flashsocket");
                }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
                "undefined" != typeof window) var swfobject = function() {
                    function a() {
                        if (!R) {
                            try {
                                var a = K.getElementsByTagName("body")[0].appendChild(q("span"));
                                a.parentNode.removeChild(a);
                            } catch (b) {
                                return;
                            }
                            R = !0;
                            for (var c = N.length, d = 0; c > d; d++) N[d]();
                        }
                    }
                    function b(a) {
                        R ? a() : N[N.length] = a;
                    }
                    function c(a) {
                        if (typeof J.addEventListener != C) J.addEventListener("load", a, !1); else if (typeof K.addEventListener != C) K.addEventListener("load", a, !1); else if (typeof J.attachEvent != C) r(J, "onload", a); else if ("function" == typeof J.onload) {
                            var b = J.onload;
                            J.onload = function() {
                                b(), a();
                            };
                        } else J.onload = a;
                    }
                    function d() {
                        M ? e() : f();
                    }
                    function e() {
                        var a = K.getElementsByTagName("body")[0], b = q(D);
                        b.setAttribute("type", G);
                        var c = a.appendChild(b);
                        if (c) {
                            var d = 0;
                            !function() {
                                if (typeof c.GetVariable != C) {
                                    var e = c.GetVariable("$version");
                                    e && (e = e.split(" ")[1].split(","), U.pv = [ parseInt(e[0], 10), parseInt(e[1], 10), parseInt(e[2], 10) ]);
                                } else if (10 > d) return d++, [object Object]0;
                                a.removeChild(b), c = null, f();
                            }();
                        } else f();
                    }
                    function f() {
                        var a = O.length;
                        if (a > 0) for (var b = 0; a > b; b++) {
                            var c = O[b].id, d = O[b].callbackFn, e = {
                                success: !1,
                                id: c
                            };
                            if (U.pv[0] > 0) {
                                var f = p(c);
                                if (f) if (!s(O[b].swfVersion) || U.wk && U.wk < 312) if (O[b].expressInstall && h()) {
                                    var k = {};
                                    k.data = O[b].expressInstall, k.width = f.getAttribute("width") || "0", k.height = f.getAttribute("height") || "0", 
                                    f.getAttribute("class") && (k.styleclass = f.getAttribute("class")), f.getAttribute("align") && (k.align = f.getAttribute("align"));
                                    for (var l = {}, m = f.getElementsByTagName("param"), n = m.length, o = 0; n > o; o++) "movie" != m[o].getAttribute("name").toLowerCase() && (l[m[o].getAttribute("name")] = m[o].getAttribute("value"));
                                    i(k, l, c, d);
                                } else j(f), d && d(e); else u(c, !0), d && (e.success = !0, e.ref = g(c), d(e));
                            } else if (u(c, !0), d) {
                                var q = g(c);
                                q && typeof q.SetVariable != C && (e.success = !0, e.ref = q), d(e);
                            }
                        }
                    }
                    function g(a) {
                        var b = null, c = p(a);
                        if (c && "OBJECT" == c.nodeName) if (typeof c.SetVariable != C) b = c; else {
                            var d = c.getElementsByTagName(D)[0];
                            d && (b = d);
                        }
                        return b;
                    }
                    function h() {
                        return !S && s("6.0.65") && (U.win || U.mac) && !(U.wk && U.wk < 312);
                    }
                    function i(a, b, c, d) {
                        S = !0, y = d || null, z = {
                            success: !1,
                            id: c
                        };
                        var e = p(c);
                        if (e) {
                            "OBJECT" == e.nodeName ? (w = k(e), x = null) : (w = e, x = c), a.id = H, (typeof a.width == C || !/%$/.test(a.width) && parseInt(a.width, 10) < 310) && (a.width = "310"), 
                            (typeof a.height == C || !/%$/.test(a.height) && parseInt(a.height, 10) < 137) && (a.height = "137"), 
                            K.title = K.title.slice(0, 47) + " - Flash Player Installation";
                            var f = U.ie && U.win ? [ "Active" ].concat("").join("X") : "PlugIn", g = "MMredirectURL=" + J.location.toString().replace(/&/g, "%26") + "&MMplayerType=" + f + "&MMdoctitle=" + K.title;
                            if (typeof b.flashvars != C ? b.flashvars += "&" + g : b.flashvars = g, U.ie && U.win && 4 != e.readyState) {
                                var h = q("div");
                                c += "SWFObjectNew", h.setAttribute("id", c), e.parentNode.insertBefore(h, e), e.style.display = "none", 
                                function() {
                                    4 == e.readyState ? e.parentNode.removeChild(e) : setTimeout(arguments.callee, 10);
                                }();
                            }
                            l(a, b, c);
                        }
                    }
                    function j(a) {
                        if (U.ie && U.win && 4 != a.readyState) {
                            var b = q("div");
                            a.parentNode.insertBefore(b, a), b.parentNode.replaceChild(k(a), b), a.style.display = "none", 
                            function() {
                                4 == a.readyState ? a.parentNode.removeChild(a) : setTimeout(arguments.callee, 10);
                            }();
                        } else a.parentNode.replaceChild(k(a), a);
                    }
                    function k(a) {
                        var b = q("div");
                        if (U.win && U.ie) b.innerHTML = a.innerHTML; else {
                            var c = a.getElementsByTagName(D)[0];
                            if (c) {
                                var d = c.childNodes;
                                if (d) for (var e = d.length, f = 0; e > f; f++) 1 == d[f].nodeType && "PARAM" == d[f].nodeName || 8 == d[f].nodeType || b.appendChild(d[f].cloneNode(!0));
                            }
                        }
                        return b;
                    }
                    function l(a, b, c) {
                        var d, e = p(c);
                        if (U.wk && U.wk < 312) return d;
                        if (e) if (typeof a.id == C && (a.id = c), U.ie && U.win) {
                            var f = "";
                            for (var g in a) a[g] != Object.prototype[g] && ("data" == g.toLowerCase() ? b.movie = a[g] : "styleclass" == g.toLowerCase() ? f += ' class="' + a[g] + '"' : "classid" != g.toLowerCase() && (f += " " + g + '="' + a[g] + '"'));
                            var h = "";
                            for (var i in b) b[i] != Object.prototype[i] && (h += '<param name="' + i + '" value="' + b[i] + '" />');
                            e.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' + f + ">" + h + "</object>", 
                            P[P.length] = a.id, d = p(a.id);
                        } else {
                            var j = q(D);
                            j.setAttribute("type", G);
                            for (var k in a) a[k] != Object.prototype[k] && ("styleclass" == k.toLowerCase() ? j.setAttribute("class", a[k]) : "classid" != k.toLowerCase() && j.setAttribute(k, a[k]));
                            for (var l in b) b[l] != Object.prototype[l] && "movie" != l.toLowerCase() && m(j, l, b[l]);
                            e.parentNode.replaceChild(j, e), d = j;
                        }
                        return d;
                    }
                    function m(a, b, c) {
                        var d = q("param");
                        d.setAttribute("name", b), d.setAttribute("value", c), a.appendChild(d);
                    }
                    function n(a) {
                        var b = p(a);
                        b && "OBJECT" == b.nodeName && (U.ie && U.win ? (b.style.display = "none", function() {
                            4 == b.readyState ? o(a) : setTimeout(arguments.callee, 10);
                        }()) : b.parentNode.removeChild(b));
                    }
                    function o(a) {
                        var b = p(a);
                        if (b) {
                            for (var c in b) "function" == typeof b[c] && (b[c] = null);
                            b.parentNode.removeChild(b);
                        }
                    }
                    function p(a) {
                        var b = null;
                        try {
                            b = K.getElementById(a);
                        } catch (c) {}
                        return b;
                    }
                    function q(a) {
                        return K.createElement(a);
                    }
                    function r(a, b, c) {
                        a.attachEvent(b, c), Q[Q.length] = [ a, b, c ];
                    }
                    function s(a) {
                        var b = U.pv, c = a.split(".");
                        return c[0] = parseInt(c[0], 10), c[1] = parseInt(c[1], 10) || 0, c[2] = parseInt(c[2], 10) || 0, 
                        b[0] > c[0] || b[0] == c[0] && b[1] > c[1] || b[0] == c[0] && b[1] == c[1] && b[2] >= c[2] ? !0 : !1;
                    }
                    function t(a, b, c, d) {
                        if (!U.ie || !U.mac) {
                            var e = K.getElementsByTagName("head")[0];
                            if (e) {
                                var f = c && "string" == typeof c ? c : "screen";
                                if (d && (A = null, B = null), !A || B != f) {
                                    var g = q("style");
                                    g.setAttribute("type", "text/css"), g.setAttribute("media", f), A = e.appendChild(g), 
                                    U.ie && U.win && typeof K.styleSheets != C && K.styleSheets.length > 0 && (A = K.styleSheets[K.styleSheets.length - 1]), 
                                    B = f;
                                }
                                U.ie && U.win ? A && typeof A.addRule == D && A.addRule(a, b) : A && typeof K.createTextNode != C && A.appendChild(K.createTextNode(a + " {" + b + "}"));
                            }
                        }
                    }
                    function u(a, b) {
                        if (T) {
                            var c = b ? "visible" : "hidden";
                            R && p(a) ? p(a).style.visibility = c : t("#" + a, "visibility:" + c);
                        }
                    }
                    function v(a) {
                        var b = /[\\\"<>\.;]/, c = null != b.exec(a);
                        return c && typeof encodeURIComponent != C ? encodeURIComponent(a) : a;
                    }
                    var w, x, y, z, A, B, C = "undefined", D = "object", E = "Shockwave Flash", F = "ShockwaveFlash.ShockwaveFlash", G = "application/x-shockwave-flash", H = "SWFObjectExprInst", I = "onreadystatechange", J = window, K = document, L = navigator, M = !1, N = [ d ], O = [], P = [], Q = [], R = !1, S = !1, T = !0, U = function() {
                        var a = typeof K.getElementById != C && typeof K.getElementsByTagName != C && typeof K.createElement != C, b = L.userAgent.toLowerCase(), c = L.platform.toLowerCase(), d = c ? /win/.test(c) : /win/.test(b), e = c ? /mac/.test(c) : /mac/.test(b), f = /webkit/.test(b) ? parseFloat(b.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : !1, g = !1, h = [ 0, 0, 0 ], i = null;
                        if (typeof L.plugins != C && typeof L.plugins[E] == D) i = L.plugins[E].description, 
                        !i || typeof L.mimeTypes != C && L.mimeTypes[G] && !L.mimeTypes[G].enabledPlugin || (M = !0, 
                        g = !1, i = i.replace(/^.*\s+(\S+\s+\S+$)/, "$1"), h[0] = parseInt(i.replace(/^(.*)\..*$/, "$1"), 10), 
                        h[1] = parseInt(i.replace(/^.*\.(.*)\s.*$/, "$1"), 10), h[2] = /[a-zA-Z]/.test(i) ? parseInt(i.replace(/^.*[a-zA-Z]+(.*)$/, "$1"), 10) : 0); else if (typeof J[[ "Active" ].concat("Object").join("X")] != C) try {
                            var j = new (window[[ "Active" ].concat("Object").join("X")])(F);
                            j && (i = j.GetVariable("$version"), i && (g = !0, i = i.split(" ")[1].split(","), 
                            h = [ parseInt(i[0], 10), parseInt(i[1], 10), parseInt(i[2], 10) ]));
                        } catch (k) {}
                        return {
                            w3: a,
                            pv: h,
                            wk: f,
                            ie: g,
                            win: d,
                            mac: e
                        };
                    }();
                    return function() {
                        U.w3 && ((typeof K.readyState != C && "complete" == K.readyState || typeof K.readyState == C && (K.getElementsByTagName("body")[0] || K.body)) && a(), 
                        R || (typeof K.addEventListener != C && K.addEventListener("DOMContentLoaded", a, !1), 
                        U.ie && U.win && (K.attachEvent(I, function() {
                            "complete" == K.readyState && (K.detachEvent(I, arguments.callee), a());
                        }), J == top && function() {
                            if (!R) {
                                try {
                                    K.documentElement.doScroll("left");
                                } catch (b) {
                                    return [object Object]0;
                                }
                                a();
                            }
                        }()), U.wk && function() {
                            return R ? void 0 : /loaded|complete/.test(K.readyState) ? [object Object]0 : [object Object]0;
                        }(), c(a)));
                    }(), function() {
                        U.ie && U.win && window.attachEvent("onunload", function() {
                            for (var a = Q.length, b = 0; a > b; b++) Q[b][0].detachEvent(Q[b][1], Q[b][2]);
                            for (var c = P.length, d = 0; c > d; d++) n(P[d]);
                            for (var e in U) U[e] = null;
                            U = null;
                            for (var f in swfobject) swfobject[f] = null;
                            swfobject = null;
                        });
                    }(), {
                        registerObject: function(a, b, c, d) {
                            if (U.w3 && a && b) {
                                var e = {};
                                e.id = a, e.swfVersion = b, e.expressInstall = c, e.callbackFn = d, O[O.length] = e, 
                                u(a, !1);
                            } else d && d({
                                success: !1,
                                id: a
                            });
                        },
                        getObjectById: function(a) {
                            return U.w3 ? g(a) : void 0;
                        },
                        embedSWF: function(a, c, d, e, f, g, j, k, m, n) {
                            var o = {
                                success: !1,
                                id: c
                            };
                            U.w3 && !(U.wk && U.wk < 312) && a && c && d && e && f ? (u(c, !1), b(function() {
                                d += "", e += "";
                                var b = {};
                                if (m && typeof m === D) for (var p in m) b[p] = m[p];
                                b.data = a, b.width = d, b.height = e;
                                var q = {};
                                if (k && typeof k === D) for (var r in k) q[r] = k[r];
                                if (j && typeof j === D) for (var t in j) typeof q.flashvars != C ? q.flashvars += "&" + t + "=" + j[t] : q.flashvars = t + "=" + j[t];
                                if (s(f)) {
                                    var v = l(b, q, c);
                                    b.id == c && u(c, !0), o.success = !0, o.ref = v;
                                } else {
                                    if (g && h()) return b.data = g, [object Object]0;
                                    u(c, !0);
                                }
                                n && n(o);
                            })) : n && n(o);
                        },
                        switchOffAutoHideShow: function() {
                            T = !1;
                        },
                        ua: U,
                        getFlashPlayerVersion: function() {
                            return {
                                major: U.pv[0],
                                minor: U.pv[1],
                                release: U.pv[2]
                            };
                        },
                        hasFlashPlayerVersion: s,
                        createSWF: function(a, b, c) {
                            return U.w3 ? l(a, b, c) : void 0;
                        },
                        showExpressInstall: function(a, b, c, d) {
                            U.w3 && h() && i(a, b, c, d);
                        },
                        removeSWF: function(a) {
                            U.w3 && n(a);
                        },
                        createCSS: function(a, b, c, d) {
                            U.w3 && t(a, b, c, d);
                        },
                        addDomLoadEvent: b,
                        addLoadEvent: c,
                        getQueryParamValue: function(a) {
                            var b = K.location.search || K.location.hash;
                            if (b) {
                                if (/\?/.test(b) && (b = b.split("?")[1]), null == a) return v(b);
                                for (var c = b.split("&"), d = 0; d < c.length; d++) if (c[d].substring(0, c[d].indexOf("=")) == a) return v(c[d].substring(c[d].indexOf("=") + 1));
                            }
                            return "";
                        },
                        expressInstallCallback: function() {
                            if (S) {
                                var a = p(H);
                                a && w && (a.parentNode.replaceChild(w, a), x && (u(x, !0), U.ie && U.win && (w.style.display = "block")), 
                                y && y(z)), S = !1;
                            }
                        }
                    };
                }();
                !function() {
                    if ("undefined" != typeof window && !window.WebSocket) {
                        var a = window.console;
                        if (a && a.log && a.error || (a = {
                            log: function() {},
                            error: function() {}
                        }), !swfobject.hasFlashPlayerVersion("10.0.0")) return [object Object]0;
                        "file:" == location.protocol && a.error("WARNING: web-socket-js doesn't work in file:///... URL unless you set Flash Security Settings properly. Open the page via Web server i.e. http://..."), 
                        WebSocket = function(a, b, c, d, e) {
                            var f = this;
                            f.__id = WebSocket.__nextId++, WebSocket.__instances[f.__id] = f, f.readyState = WebSocket.CONNECTING, 
                            f.bufferedAmount = 0, f.__events = {}, b ? "string" == typeof b && (b = [ b ]) : b = [], 
                            setTimeout(function() {
                                WebSocket.__addTask(function() {
                                    WebSocket.__flash.create(f.__id, a, b, c || null, d || 0, e || null);
                                });
                            }, 0);
                        }, WebSocket.prototype.send = function(a) {
                            if (this.readyState == WebSocket.CONNECTING) throw "INVALID_STATE_ERR: Web Socket connection has not been established";
                            var b = WebSocket.__flash.send(this.__id, encodeURIComponent(a));
                            return 0 > b ? !0 : (this.bufferedAmount += b, !1);
                        }, WebSocket.prototype.close = function() {
                            this.readyState != WebSocket.CLOSED && this.readyState != WebSocket.CLOSING && (this.readyState = WebSocket.CLOSING, 
                            WebSocket.__flash.close(this.__id));
                        }, WebSocket.prototype.addEventListener = function(a, b) {
                            a in this.__events || (this.__events[a] = []), this.__events[a].push(b);
                        }, WebSocket.prototype.removeEventListener = function(a, b) {
                            if (a in this.__events) for (var c = this.__events[a], d = c.length - 1; d >= 0; --d) if (c[d] === b) {
                                c.splice(d, 1);
                                break;
                            }
                        }, WebSocket.prototype.dispatchEvent = function(a) {
                            for (var b = this.__events[a.type] || [], c = 0; c < b.length; ++c) b[c](a);
                            var d = this["on" + a.type];
                            d && d(a);
                        }, WebSocket.prototype.__handleEvent = function(a) {
                            "readyState" in a && (this.readyState = a.readyState), "protocol" in a && (this.protocol = a.protocol);
                            var b;
                            if ("open" == a.type || "error" == a.type) b = this.__createSimpleEvent(a.type); else if ("close" == a.type) b = this.__createSimpleEvent("close"); else {
                                if ("message" != a.type) throw "unknown event type: " + a.type;
                                var c = decodeURIComponent(a.message);
                                b = this.__createMessageEvent("message", c);
                            }
                            this.dispatchEvent(b);
                        }, WebSocket.prototype.__createSimpleEvent = function(a) {
                            if (document.createEvent && window.Event) {
                                var b = document.createEvent("Event");
                                return b.initEvent(a, !1, !1), b;
                            }
                            return {
                                type: a,
                                bubbles: !1,
                                cancelable: !1
                            };
                        }, WebSocket.prototype.__createMessageEvent = function(a, b) {
                            if (document.createEvent && window.MessageEvent && !window.opera) {
                                var c = document.createEvent("MessageEvent");
                                return c.initMessageEvent("message", !1, !1, b, null, null, window, null), c;
                            }
                            return {
                                type: a,
                                data: b,
                                bubbles: !1,
                                cancelable: !1
                            };
                        }, WebSocket.CONNECTING = 0, WebSocket.OPEN = 1, WebSocket.CLOSING = 2, WebSocket.CLOSED = 3, 
                        WebSocket.__flash = null, WebSocket.__instances = {}, WebSocket.__tasks = [], WebSocket.__nextId = 0, 
                        WebSocket.loadFlashPolicyFile = function(a) {
                            WebSocket.__addTask(function() {
                                WebSocket.__flash.loadManualPolicyFile(a);
                            });
                        }, WebSocket.__initialize = function() {
                            if (!WebSocket.__flash) {
                                if (WebSocket.__swfLocation && (window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation), 
                                !window.WEB_SOCKET_SWF_LOCATION) return [object Object]0;
                                var b = document.createElement("div");
                                b.id = "webSocketContainer", b.style.position = "absolute", WebSocket.__isFlashLite() ? (b.style.left = "0px", 
                                b.style.top = "0px") : (b.style.left = "-100px", b.style.top = "-100px");
                                var c = document.createElement("div");
                                c.id = "webSocketFlash", b.appendChild(c), document.body.appendChild(b), swfobject.embedSWF(WEB_SOCKET_SWF_LOCATION, "webSocketFlash", "1", "1", "10.0.0", null, null, {
                                    hasPriority: !0,
                                    swliveconnect: !0,
                                    allowScriptAccess: "always"
                                }, null, function(b) {
                                    b.success || a.error("[WebSocket] swfobject.embedSWF failed");
                                });
                            }
                        }, WebSocket.__onFlashInitialized = function() {
                            setTimeout(function() {
                                WebSocket.__flash = document.getElementById("webSocketFlash"), WebSocket.__flash.setCallerUrl(location.href), 
                                WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
                                for (var a = 0; a < WebSocket.__tasks.length; ++a) WebSocket.__tasks[a]();
                                WebSocket.__tasks = [];
                            }, 0);
                        }, WebSocket.__onFlashEvent = function() {
                            return setTimeout(function() {
                                try {
                                    for (var b = WebSocket.__flash.receiveEvents(), c = 0; c < b.length; ++c) WebSocket.__instances[b[c].webSocketId].__handleEvent(b[c]);
                                } catch (d) {
                                    a.error(d);
                                }
                            }, 0), !0;
                        }, WebSocket.__log = function(b) {
                            a.log(decodeURIComponent(b));
                        }, WebSocket.__error = function(b) {
                            a.error(decodeURIComponent(b));
                        }, WebSocket.__addTask = function(a) {
                            WebSocket.__flash ? a() : WebSocket.__tasks.push(a);
                        }, WebSocket.__isFlashLite = function() {
                            if (!window.navigator || !window.navigator.mimeTypes) return !1;
                            var a = window.navigator.mimeTypes["application/x-shockwave-flash"];
                            return a && a.enabledPlugin && a.enabledPlugin.filename ? a.enabledPlugin.filename.match(/flashlite/i) ? !0 : !1 : !1;
                        }, window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION || (window.addEventListener ? window.addEventListener("load", function() {
                            WebSocket.__initialize();
                        }, !1) : window.attachEvent("onload", function() {
                            WebSocket.__initialize();
                        }));
                    }
                }(), function(a, b, c) {
                    function d(a) {
                        a && (b.Transport.apply(this, arguments), this.sendBuffer = []);
                    }
                    function e() {}
                    a.XHR = d, b.util.inherit(d, b.Transport), d.prototype.open = function() {
                        return this.socket.setBuffer(!1), this.onOpen(), this.get(), this.setCloseTimeout(), 
                        this;
                    }, d.prototype.payload = function(a) {
                        for (var c = [], d = 0, e = a.length; e > d; d++) c.push(b.parser.encodePacket(a[d]));
                        this.send(b.parser.encodePayload(c));
                    }, d.prototype.send = function(a) {
                        return this.post(a), this;
                    }, d.prototype.post = function(a) {
                        function b() {
                            4 == this.readyState && (this.onreadystatechange = e, f.posting = !1, 200 == this.status ? f.socket.setBuffer(!1) : f.onClose());
                        }
                        function d() {
                            this.onload = e, f.socket.setBuffer(!1);
                        }
                        var f = this;
                        this.socket.setBuffer(!0), this.sendXHR = this.request("POST"), c.XDomainRequest && this.sendXHR instanceof XDomainRequest ? this.sendXHR.onload = this.sendXHR.onerror = d : this.sendXHR.onreadystatechange = b, 
                        this.sendXHR.send(a);
                    }, d.prototype.close = function() {
                        return this.onClose(), this;
                    }, d.prototype.request = function(a) {
                        var c = b.util.request(this.socket.isXDomain()), d = b.util.query(this.socket.options.query, "t=" + +new Date());
                        if (c.open(a || "GET", this.prepareUrl() + d, !0), "POST" == a) try {
                            c.setRequestHeader ? c.setRequestHeader("Content-type", "text/plain;charset=UTF-8") : c.contentType = "text/plain";
                        } catch (e) {}
                        return c;
                    }, d.prototype.scheme = function() {
                        return this.socket.options.secure ? "https" : "http";
                    }, d.check = function(a, d) {
                        try {
                            var e = b.util.request(d), f = c.XDomainRequest && e instanceof XDomainRequest, g = a && a.options && a.options.secure ? "https:" : "http:", h = c.location && g != c.location.protocol;
                            if (e && (!f || !h)) return !0;
                        } catch (i) {}
                        return !1;
                    }, d.xdomainCheck = function(a) {
                        return d.check(a, !0);
                    };
                }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
                function(a, b) {
                    function c() {
                        b.Transport.XHR.apply(this, arguments);
                    }
                    a.htmlfile = c, b.util.inherit(c, b.Transport.XHR), c.prototype.name = "htmlfile", 
                    c.prototype.get = function() {
                        this.doc = new (window[[ "Active" ].concat("Object").join("X")])("htmlfile"), this.doc.open(), 
                        this.doc.write("<html></html>"), this.doc.close(), this.doc.parentWindow.s = this;
                        var a = this.doc.createElement("div");
                        a.className = "socketio", this.doc.body.appendChild(a), this.iframe = this.doc.createElement("iframe"), 
                        a.appendChild(this.iframe);
                        var c = this, d = b.util.query(this.socket.options.query, "t=" + +new Date());
                        this.iframe.src = this.prepareUrl() + d, b.util.on(window, "unload", function() {
                            c.destroy();
                        });
                    }, c.prototype._ = function(a, b) {
                        a = a.replace(/\\\//g, "/"), this.onData(a);
                        try {
                            var c = b.getElementsByTagName("script")[0];
                            c.parentNode.removeChild(c);
                        } catch (d) {}
                    }, c.prototype.destroy = function() {
                        if (this.iframe) {
                            try {
                                this.iframe.src = "about:blank";
                            } catch (a) {}
                            this.doc = null, this.iframe.parentNode.removeChild(this.iframe), this.iframe = null, 
                            CollectGarbage();
                        }
                    }, c.prototype.close = function() {
                        return this.destroy(), b.Transport.XHR.prototype.close.call(this);
                    }, c.check = function(a) {
                        if ("undefined" != typeof window && [ "Active" ].concat("Object").join("X") in window) try {
                            var c = new (window[[ "Active" ].concat("Object").join("X")])("htmlfile");
                            return c && b.Transport.XHR.check(a);
                        } catch (d) {}
                        return !1;
                    }, c.xdomainCheck = function() {
                        return !1;
                    }, b.transports.push("htmlfile");
                }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
                function(a, b, c) {
                    function d() {
                        b.Transport.XHR.apply(this, arguments);
                    }
                    function e() {}
                    a["xhr-polling"] = d, b.util.inherit(d, b.Transport.XHR), b.util.merge(d, b.Transport.XHR), 
                    d.prototype.name = "xhr-polling", d.prototype.heartbeats = function() {
                        return !1;
                    }, d.prototype.open = function() {
                        var a = this;
                        return b.Transport.XHR.prototype.open.call(a), !1;
                    }, d.prototype.get = function() {
                        function a() {
                            4 == this.readyState && (this.onreadystatechange = e, 200 == this.status ? (f.onData(this.responseText), 
                            f.get()) : f.onClose());
                        }
                        function b() {
                            this.onload = e, this.onerror = e, f.retryCounter = 1, f.onData(this.responseText), 
                            f.get();
                        }
                        function d() {
                            f.retryCounter++, !f.retryCounter || f.retryCounter > 3 ? f.onClose() : f.get();
                        }
                        if (this.isOpen) {
                            var f = this;
                            this.xhr = this.request(), c.XDomainRequest && this.xhr instanceof XDomainRequest ? (this.xhr.onload = b, 
                            this.xhr.onerror = d) : this.xhr.onreadystatechange = a, this.xhr.send(null);
                        }
                    }, d.prototype.onClose = function() {
                        if (b.Transport.XHR.prototype.onClose.call(this), this.xhr) {
                            this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = e;
                            try {
                                this.xhr.abort();
                            } catch (a) {}
                            this.xhr = null;
                        }
                    }, d.prototype.ready = function(a, c) {
                        var d = this;
                        b.util.defer(function() {
                            c.call(d);
                        });
                    }, b.transports.push("xhr-polling");
                }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
                function(a, b, c) {
                    function d() {
                        b.Transport["xhr-polling"].apply(this, arguments), this.index = b.j.length;
                        var a = this;
                        b.j.push(function(b) {
                            a._(b);
                        });
                    }
                    var e = c.document && "MozAppearance" in c.document.documentElement.style;
                    a["jsonp-polling"] = d, b.util.inherit(d, b.Transport["xhr-polling"]), d.prototype.name = "jsonp-polling", 
                    d.prototype.post = function(a) {
                        function c() {
                            d(), e.socket.setBuffer(!1);
                        }
                        function d() {
                            e.iframe && e.form.removeChild(e.iframe);
                            try {
                                g = document.createElement('<iframe name="' + e.iframeId + '">');
                            } catch (a) {
                                g = document.createElement("iframe"), g.name = e.iframeId;
                            }
                            g.id = e.iframeId, e.form.appendChild(g), e.iframe = g;
                        }
                        var e = this, f = b.util.query(this.socket.options.query, "t=" + +new Date() + "&i=" + this.index);
                        if (!this.form) {
                            var g, h = document.createElement("form"), i = document.createElement("textarea"), j = this.iframeId = "socketio_iframe_" + this.index;
                            h.className = "socketio", h.style.position = "absolute", h.style.top = "0px", h.style.left = "0px", 
                            h.style.display = "none", h.target = j, h.method = "POST", h.setAttribute("accept-charset", "utf-8"), 
                            i.name = "d", h.appendChild(i), document.body.appendChild(h), this.form = h, this.area = i;
                        }
                        this.form.action = this.prepareUrl() + f, d(), this.area.value = b.JSON.stringify(a);
                        try {
                            this.form.submit();
                        } catch (k) {}
                        this.iframe.attachEvent ? g.onreadystatechange = function() {
                            "complete" == e.iframe.readyState && c();
                        } : this.iframe.onload = c, this.socket.setBuffer(!0);
                    }, d.prototype.get = function() {
                        var a = this, c = document.createElement("script"), d = b.util.query(this.socket.options.query, "t=" + +new Date() + "&i=" + this.index);
                        this.script && (this.script.parentNode.removeChild(this.script), this.script = null), 
                        c.async = !0, c.src = this.prepareUrl() + d, c.onerror = function() {
                            a.onClose();
                        };
                        var f = document.getElementsByTagName("script")[0];
                        f.parentNode.insertBefore(c, f), this.script = c, e && setTimeout(function() {
                            var a = document.createElement("iframe");
                            document.body.appendChild(a), document.body.removeChild(a);
                        }, 100);
                    }, d.prototype._ = function(a) {
                        return this.onData(a), this.isOpen && this.get(), this;
                    }, d.prototype.ready = function(a, c) {
                        var d = this;
                        return e ? [object Object]0 : c.call(this);
                    }, d.check = function() {
                        return "document" in c;
                    }, d.xdomainCheck = function() {
                        return !0;
                    }, b.transports.push("jsonp-polling");
                }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
                "function" == typeof define && define.amd && define([], function() {
                    return io;
                });
            }();
        }, {} ],
        8: [ function(a, b, c) {
            function d(a) {
                return Array.isArray(a) || "object" == typeof a && "[object Array]" === Object.prototype.toString.call(a);
            }
            function e(a) {
                "object" == typeof a && "[object RegExp]" === Object.prototype.toString.call(a);
            }
            function f(a) {
                return "object" == typeof a && "[object Date]" === Object.prototype.toString.call(a);
            }
            a("events"), c.isArray = d, c.isDate = function(a) {
                return "[object Date]" === Object.prototype.toString.call(a);
            }, c.isRegExp = function(a) {
                return "[object RegExp]" === Object.prototype.toString.call(a);
            }, c.print = function() {}, c.puts = function() {}, c.debug = function() {}, c.inspect = function(a, b, i, j) {
                function k(a, i) {
                    if (a && "function" == typeof a.inspect && a !== c && (!a.constructor || a.constructor.prototype !== a)) return a.inspect(i);
                    switch (typeof a) {
                      case "undefined":
                        return m("undefined", "undefined");

                      case "string":
                        var j = "'" + JSON.stringify(a).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
                        return m(j, "string");

                      case "number":
                        return m("" + a, "number");

                      case "boolean":
                        return m("" + a, "boolean");
                    }
                    if (null === a) return m("null", "null");
                    var n = g(a), o = b ? h(a) : n;
                    if ("function" == typeof a && 0 === o.length) {
                        if (e(a)) return m("" + a, "regexp");
                        var p = a.name ? ": " + a.name : "";
                        return m("[Function" + p + "]", "special");
                    }
                    if (f(a) && 0 === o.length) return m(a.toUTCString(), "date");
                    var q, r, s;
                    if (d(a) ? (r = "Array", s = [ "[", "]" ]) : (r = "Object", s = [ "{", "}" ]), "function" == typeof a) {
                        var t = a.name ? ": " + a.name : "";
                        q = e(a) ? " " + a : " [Function" + t + "]";
                    } else q = "";
                    if (f(a) && (q = " " + a.toUTCString()), 0 === o.length) return s[0] + q + s[1];
                    if (0 > i) return e(a) ? m("" + a, "regexp") : m("[Object]", "special");
                    l.push(a);
                    var u = o.map(function(b) {
                        var c, e;
                        if (a.__lookupGetter__ && (a.__lookupGetter__(b) ? e = a.__lookupSetter__(b) ? m("[Getter/Setter]", "special") : m("[Getter]", "special") : a.__lookupSetter__(b) && (e = m("[Setter]", "special"))), 
                        n.indexOf(b) < 0 && (c = "[" + b + "]"), e || (l.indexOf(a[b]) < 0 ? (e = null === i ? k(a[b]) : k(a[b], i - 1), 
                        e.indexOf("\n") > -1 && (e = d(a) ? e.split("\n").map(function(a) {
                            return "  " + a;
                        }).join("\n").substr(2) : "\n" + e.split("\n").map(function(a) {
                            return "   " + a;
                        }).join("\n"))) : e = m("[Circular]", "special")), "undefined" == typeof c) {
                            if ("Array" === r && b.match(/^\d+$/)) return e;
                            c = JSON.stringify("" + b), c.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/) ? (c = c.substr(1, c.length - 2), 
                            c = m(c, "name")) : (c = c.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'"), 
                            c = m(c, "string"));
                        }
                        return c + ": " + e;
                    });
                    l.pop();
                    var v = 0, w = u.reduce(function(a, b) {
                        return v++, b.indexOf("\n") >= 0 && v++, a + b.length + 1;
                    }, 0);
                    return u = w > 50 ? s[0] + ("" === q ? "" : q + "\n ") + " " + u.join(",\n  ") + " " + s[1] : s[0] + q + " " + u.join(", ") + " " + s[1];
                }
                var l = [], m = function(a, b) {
                    var c = {
                        bold: [ 1, 22 ],
                        italic: [ 3, 23 ],
                        underline: [ 4, 24 ],
                        inverse: [ 7, 27 ],
                        white: [ 37, 39 ],
                        grey: [ 90, 39 ],
                        black: [ 30, 39 ],
                        blue: [ 34, 39 ],
                        cyan: [ 36, 39 ],
                        green: [ 32, 39 ],
                        magenta: [ 35, 39 ],
                        red: [ 31, 39 ],
                        yellow: [ 33, 39 ]
                    }, d = {
                        special: "cyan",
                        number: "blue",
                        "boolean": "yellow",
                        undefined: "grey",
                        "null": "bold",
                        string: "green",
                        date: "magenta",
                        regexp: "red"
                    }[b];
                    return d ? "[d][0] + "m" + a + "[d][1] + "m" : a;
                };
                return j || (m = function(a) {
                    return a;
                }), k(a, "undefined" == typeof i ? 2 : i);
            }, c.log = function() {}, c.pump = null;
            var g = Object.keys || function(a) {
                var b = [];
                for (var c in a) b.push(c);
                return b;
            }, h = Object.getOwnPropertyNames || function(a) {
                var b = [];
                for (var c in a) Object.hasOwnProperty.call(a, c) && b.push(c);
                return b;
            }, i = Object.create || function(a, b) {
                var c;
                if (null === a) c = {
                    __proto__: null
                }; else {
                    if ("object" != typeof a) throw new TypeError("typeof prototype[" + typeof a + "] != 'object'");
                    var d = function() {};
                    d.prototype = a, c = new d(), c.__proto__ = a;
                }
                return "undefined" != typeof b && Object.defineProperties && Object.defineProperties(c, b), 
                c;
            };
            c.inherits = function(a, b) {
                a.super_ = b, a.prototype = i(b.prototype, {
                    constructor: {
                        value: a,
                        enumerable: !1,
                        writable: !0,
                        configurable: !0
                    }
                });
            };
            var j = /%[sdj%]/g;
            c.format = function(a) {
                if ("string" != typeof a) {
                    for (var b = [], d = 0; d < arguments.length; d++) b.push(c.inspect(arguments[d]));
                    return b.join(" ");
                }
                for (var d = 1, e = arguments, f = e.length, g = String(a).replace(j, function(a) {
                    if ("%%" === a) return "%";
                    if (d >= f) return a;
                    switch (a) {
                      case "%s":
                        return String(e[d++]);

                      case "%d":
                        return Number(e[d++]);

                      case "%j":
                        return JSON.stringify(e[d++]);

                      default:
                        return a;
                    }
                }), h = e[d]; f > d; h = e[++d]) g += null === h || "object" != typeof h ? " " + h : " " + c.inspect(h);
                return g;
            };
        }, {
            events: 9
        } ],
        4: [ function(a, b) {
            function c(a) {
                var b = this, c = a || {};
                this.config = {
                    debug: !1,
                    peerConnectionConfig: {
                        iceServers: [ {
                            url: "stun:stun.l.google.com:19302"
                        } ]
                    },
                    peerConnectionConstraints: {
                        optional: [ {
                            DtlsSrtpKeyAgreement: !0
                        } ]
                    },
                    receiveMedia: {
                        mandatory: {
                            OfferToReceiveAudio: !0,
                            OfferToReceiveVideo: !0
                        }
                    },
                    enableDataChannels: !0
                };
                var d;
                this.screenSharingSupport = e.screenSharing, this.logger = function() {
                    return a.debug ? a.logger || console : a.logger || f;
                }();
                for (d in c) this.config[d] = c[d];
                e.support || this.logger.error("Your browser doesn't seem to support WebRTC"), this.peers = [], 
                g.call(this, this.config), this.on("speaking", function() {
                    b.hardMuted || b.peers.forEach(function(a) {
                        if (a.enableDataChannels) {
                            var b = a.getDataChannel("hark");
                            if ("open" != b.readyState) return;
                            b.send(JSON.stringify({
                                type: "speaking"
                            }));
                        }
                    });
                }), this.on("stoppedSpeaking", function() {
                    b.hardMuted || b.peers.forEach(function(a) {
                        if (a.enableDataChannels) {
                            var b = a.getDataChannel("hark");
                            if ("open" != b.readyState) return;
                            b.send(JSON.stringify({
                                type: "stoppedSpeaking"
                            }));
                        }
                    });
                }), this.on("volumeChange", function(a) {
                    b.hardMuted || b.peers.forEach(function(b) {
                        if (b.enableDataChannels) {
                            var c = b.getDataChannel("hark");
                            if ("open" != c.readyState) return;
                            c.send(JSON.stringify({
                                type: "volume",
                                volume: a
                            }));
                        }
                    });
                }), this.config.debug && this.on("*", function(a, c, d) {
                    var e;
                    e = b.config.logger === f ? console : b.logger, e.log("event:", a, c, d);
                });
            }
            var d = a("util"), e = a("webrtcsupport");
            a("wildemitter");
            var f = a("mockconsole"), g = a("localmedia"), h = a("./peer");
            d.inherits(c, g), c.prototype.createPeer = function(a) {
                var b;
                return a.parent = this, b = new h(a), this.peers.push(b), b;
            }, c.prototype.removePeers = function(a, b) {
                this.getPeers(a, b).forEach(function(a) {
                    a.end();
                });
            }, c.prototype.getPeers = function(a, b) {
                return this.peers.filter(function(c) {
                    return !(a && c.id !== a || b && c.type !== b);
                });
            }, c.prototype.sendToAll = function(a, b) {
                this.peers.forEach(function(c) {
                    c.send(a, b);
                });
            }, c.prototype.sendDirectlyToAll = function(a, b, c) {
                this.peers.forEach(function(d) {
                    d.enableDataChannels && d.sendDirectly(a, b, c);
                });
            }, b.exports = c;
        }, {
            "./peer": 10,
            localmedia: 12,
            mockconsole: 5,
            util: 8,
            webrtcsupport: 11,
            wildemitter: 6
        } ],
        11: [ function(a, b) {
            var c, d = !1, e = !1, f = navigator.userAgent.toLowerCase();
            -1 !== f.indexOf("firefox") ? (c = "moz", e = !0) : -1 !== f.indexOf("chrome") && (c = "webkit", 
            d = !0);
            var g = window.mozRTCPeerConnection || window.webkitRTCPeerConnection, h = window.mozRTCIceCandidate || window.RTCIceCandidate, i = window.mozRTCSessionDescription || window.RTCSessionDescription, j = window.webkitMediaStream || window.MediaStream, k = navigator.userAgent.match("Chrome") && parseInt(navigator.userAgent.match(/Chrome\/(.*) /)[1], 10) >= 26, l = window.webkitAudioContext || window.AudioContext;
            b.exports = {
                support: !!g,
                dataChannel: d || e || g && g.prototype && g.prototype.createDataChannel,
                prefix: c,
                webAudio: !(!l || !l.prototype.createMediaStreamSource),
                mediaStream: !(!j || !j.prototype.removeTrack),
                screenSharing: !!k,
                AudioContext: l,
                PeerConnection: g,
                SessionDescription: i,
                IceCandidate: h
            };
        }, {} ],
        13: [ function(a, b) {
            var c = b.exports = {};
            c.nextTick = function() {
                var a = "undefined" != typeof window && window.setImmediate, b = "undefined" != typeof window && window.postMessage && window.addEventListener;
                if (a) return function(a) {
                    return window.setImmediate(a);
                };
                if (b) {
                    var c = [];
                    return window.addEventListener("message", function(a) {
                        var b = a.source;
                        if ((b === window || null === b) && "process-tick" === a.data && (a.stopPropagation(), 
                        c.length > 0)) {
                            var d = c.shift();
                            d();
                        }
                    }, !0), function(a) {
                        c.push(a), window.postMessage("process-tick", "*");
                    };
                }
                return function(a) {
                    setTimeout(a, 0);
                };
            }(), c.title = "browser", c.browser = !0, c.env = {}, c.argv = [], c.binding = function() {
                throw new Error("process.binding is not supported");
            }, c.cwd = function() {
                return "/";
            }, c.chdir = function() {
                throw new Error("process.chdir is not supported");
            };
        }, {} ],
        9: [ function(a, b, c) {
            function d(a, b) {
                if (a.indexOf) return a.indexOf(b);
                for (var c = 0; c < a.length; c++) if (b === a[c]) return c;
                return -1;
            }
            var e = a("__browserify_process");
            e.EventEmitter || (e.EventEmitter = function() {});
            var f = c.EventEmitter = e.EventEmitter, g = "function" == typeof Array.isArray ? Array.isArray : function(a) {
                return "[object Array]" === Object.prototype.toString.call(a);
            }, h = 10;
            f.prototype.setMaxListeners = function(a) {
                this._events || (this._events = {}), this._events.maxListeners = a;
            }, f.prototype.emit = function(a) {
                if ("error" === a && (!this._events || !this._events.error || g(this._events.error) && !this._events.error.length)) throw arguments[1] instanceof Error ? arguments[1] : new Error("Uncaught, unspecified 'error' event.");
                if (!this._events) return !1;
                var b = this._events[a];
                if (!b) return !1;
                if ("function" == typeof b) {
                    switch (arguments.length) {
                      case 1:
                        b.call(this);
                        break;

                      case 2:
                        b.call(this, arguments[1]);
                        break;

                      case 3:
                        b.call(this, arguments[1], arguments[2]);
                        break;

                      default:
                        var c = Array.prototype.slice.call(arguments, 1);
                        b.apply(this, c);
                    }
                    return !0;
                }
                if (g(b)) {
                    for (var c = Array.prototype.slice.call(arguments, 1), d = b.slice(), e = 0, f = d.length; f > e; e++) d[e].apply(this, c);
                    return !0;
                }
                return !1;
            }, f.prototype.addListener = function(a, b) {
                if ("function" != typeof b) throw new Error("addListener only takes instances of Function");
                if (this._events || (this._events = {}), this.emit("newListener", a, b), this._events[a]) if (g(this._events[a])) {
                    if (!this._events[a].warned) {
                        var c;
                        c = void 0 !== this._events.maxListeners ? this._events.maxListeners : h, c && c > 0 && this._events[a].length > c && (this._events[a].warned = !0, 
                        console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[a].length), 
                        console.trace());
                    }
                    this._events[a].push(b);
                } else this._events[a] = [ this._events[a], b ]; else this._events[a] = b;
                return this;
            }, f.prototype.on = f.prototype.addListener, f.prototype.once = function(a, b) {
                var c = this;
                return c.on(a, function d() {
                    c.removeListener(a, d), b.apply(this, arguments);
                }), this;
            }, f.prototype.removeListener = function(a, b) {
                if ("function" != typeof b) throw new Error("removeListener only takes instances of Function");
                if (!this._events || !this._events[a]) return this;
                var c = this._events[a];
                if (g(c)) {
                    var e = d(c, b);
                    if (0 > e) return this;
                    c.splice(e, 1), 0 == c.length && delete this._events[a];
                } else this._events[a] === b && delete this._events[a];
                return this;
            }, f.prototype.removeAllListeners = function(a) {
                return 0 === arguments.length ? (this._events = {}, this) : (a && this._events && this._events[a] && (this._events[a] = null), 
                this);
            }, f.prototype.listeners = function(a) {
                return this._events || (this._events = {}), this._events[a] || (this._events[a] = []), 
                g(this._events[a]) || (this._events[a] = [ this._events[a] ]), this._events[a];
            }, f.listenerCount = function(a, b) {
                var c;
                return c = a._events && a._events[b] ? "function" == typeof a._events[b] ? 1 : a._events[b].length : 0;
            };
        }, {
            __browserify_process: 13
        } ],
        10: [ function(a, b) {
            function c(a) {
                var b = this;
                this.id = a.id, this.parent = a.parent, this.type = a.type || "video", this.oneway = a.oneway || !1, 
                this.sharemyscreen = a.sharemyscreen || !1, this.browserPrefix = a.prefix, this.stream = a.stream, 
                this.enableDataChannels = void 0 === a.enableDataChannels ? this.parent.config.enableDataChannels : a.enableDataChannels, 
                this.receiveMedia = a.receiveMedia || this.parent.config.receiveMedia, this.channels = {}, 
                this.pc = new f(this.parent.config.peerConnectionConfig, this.parent.config.peerConnectionConstraints), 
                this.pc.on("ice", this.onIceCandidate.bind(this)), this.pc.on("addStream", this.handleRemoteStreamAdded.bind(this)), 
                this.pc.on("addChannel", this.handleDataChannelAdded.bind(this)), this.pc.on("removeStream", this.handleStreamRemoved.bind(this)), 
                this.pc.on("negotiationNeeded", this.emit.bind(this, "negotiationNeeded")), this.pc.on("iceConnectionStateChange", this.emit.bind(this, "iceConnectionStateChange")), 
                this.pc.on("iceConnectionStateChange", function() {
                    switch (b.pc.iceConnectionState) {
                      case "failed":
                        "offer" === b.pc.pc.peerconnection.localDescription.type && (b.parent.emit("iceFailed", b), 
                        b.send("connectivityError"));
                    }
                }), this.pc.on("signalingStateChange", this.emit.bind(this, "signalingStateChange")), 
                this.logger = this.parent.logger, "screen" === a.type ? this.parent.localScreen && this.sharemyscreen && (this.logger.log("adding local screen stream to peer connection"), 
                this.pc.addStream(this.parent.localScreen), this.broadcaster = a.broadcaster) : this.parent.localStreams.forEach(function(a) {
                    b.pc.addStream(a);
                }), g.call(this), this.on("*", function() {
                    b.parent.emit.apply(b.parent, arguments);
                });
            }
            var d = a("util"), e = a("webrtcsupport"), f = a("rtcpeerconnection"), g = a("wildemitter");
            d.inherits(c, g), c.prototype.handleMessage = function(a) {
                var b = this;
                this.logger.log("getting", a.type, a), a.prefix && (this.browserPrefix = a.prefix), 
                "offer" === a.type ? this.pc.handleOffer(a.payload, function(a) {
                    a || b.pc.answer(b.receiveMedia, function(a, c) {
                        b.send("answer", c);
                    });
                }) : "answer" === a.type ? this.pc.handleAnswer(a.payload) : "candidate" === a.type ? this.pc.processIce(a.payload) : "connectivityError" === a.type ? this.parent.emit("connectivityError", b) : "mute" === a.type ? this.parent.emit("mute", {
                    id: a.from,
                    name: a.payload.name
                }) : "unmute" === a.type && this.parent.emit("unmute", {
                    id: a.from,
                    name: a.payload.name
                });
            }, c.prototype.send = function(a, b) {
                var c = {
                    to: this.id,
                    broadcaster: this.broadcaster,
                    roomType: this.type,
                    type: a,
                    payload: b,
                    prefix: e.prefix
                };
                this.logger.log("sending", a, c), this.parent.emit("message", c);
            }, c.prototype.sendDirectly = function(a, b, c) {
                var d = {
                    type: b,
                    payload: c
                };
                this.logger.log("sending via datachannel", a, b, d);
                var e = this.getDataChannel(a);
                return "open" != e.readyState ? !1 : (e.send(JSON.stringify(d)), !0);
            }, c.prototype._observeDataChannel = function(a) {
                var b = this;
                a.onclose = this.emit.bind(this, "channelClose", a), a.onerror = this.emit.bind(this, "channelError", a), 
                a.onmessage = function(c) {
                    b.emit("channelMessage", b, a.label, JSON.parse(c.data), a, c);
                }, a.onopen = this.emit.bind(this, "channelOpen", a);
            }, c.prototype.getDataChannel = function(a, b) {
                if (!e.dataChannel) return this.emit("error", new Error("createDataChannel not supported"));
                var c = this.channels[a];
                return b || (b = {}), c ? c : (c = this.channels[a] = this.pc.createDataChannel(a, b), 
                this._observeDataChannel(c), c);
            }, c.prototype.onIceCandidate = function(a) {
                this.closed || (a ? this.send("candidate", a) : this.logger.log("End of candidates."));
            }, c.prototype.start = function() {
                var a = this;
                this.enableDataChannels && this.getDataChannel("simplewebrtc"), this.pc.offer(this.receiveMedia, function(b, c) {
                    a.send("offer", c);
                });
            }, c.prototype.end = function() {
                this.closed || (this.pc.close(), this.handleStreamRemoved());
            }, c.prototype.handleRemoteStreamAdded = function(a) {
                var b = this;
                this.stream ? this.logger.warn("Already have a remote stream") : (this.stream = a.stream, 
                this.stream.onended = function() {
                    b.end();
                }, this.parent.emit("peerStreamAdded", this));
            }, c.prototype.handleStreamRemoved = function() {
                this.parent.peers.splice(this.parent.peers.indexOf(this), 1), this.closed = !0, 
                this.parent.emit("peerStreamRemoved", this);
            }, c.prototype.handleDataChannelAdded = function(a) {
                this.channels[a.label] = a, this._observeDataChannel(a);
            }, b.exports = c;
        }, {
            rtcpeerconnection: 14,
            util: 8,
            webrtcsupport: 11,
            wildemitter: 6
        } ],
        15: [ function(a, b) {
            var c = window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia;
            b.exports = function(a, b) {
                var d, e = 2 === arguments.length, f = {
                    video: !0,
                    audio: !0
                }, g = "PERMISSION_DENIED", h = "CONSTRAINT_NOT_SATISFIED";
                return e || (b = a, a = f), c ? [object Object]0 : (d = new Error("NavigatorUserMediaError"), 
                d.name = "NOT_SUPPORTED_ERROR", b(d));
            };
        }, {} ],
        12: [ function(a, b) {
            function c(a) {
                i.call(this);
                var b, c = this.config = {
                    autoAdjustMic: !1,
                    detectSpeakingEvents: !0,
                    media: {
                        audio: !0,
                        video: !0
                    },
                    logger: k
                };
                for (b in a) this.config[b] = a[b];
                this.logger = c.logger, this._log = this.logger.log.bind(this.logger, "LocalMedia:"), 
                this._logerror = this.logger.error.bind(this.logger, "LocalMedia:"), this.screenSharingSupport = f.screenSharing, 
                this.localStreams = [], this.localScreens = [], f.support || this._logerror("Your browser does not support local media capture.");
            }
            var d = a("util"), e = a("hark"), f = a("webrtcsupport"), g = a("getusermedia"), h = a("getscreenmedia"), i = a("wildemitter"), j = a("mediastream-gain"), k = a("mockconsole");
            d.inherits(c, i), c.prototype.start = function(a, b) {
                var c = this, d = a || this.config.media;
                g(d, function(a, e) {
                    return a || (d.audio && c.config.detectSpeakingEvents && c.setupAudioMonitor(e, c.config.harkOptions), 
                    c.localStreams.push(e), c.config.autoAdjustMic && (c.gainController = new j(e), 
                    c.setMicIfEnabled(.5)), e.onended = function() {}, c.emit("localStream", e)), b ? b(a, e) : void 0;
                });
            }, c.prototype.stop = function(a) {
                var b = this;
                if (a) {
                    a.stop(), b.emit("localStreamStopped", a);
                    var c = b.localStreams.indexOf(a);
                    c > -1 && (b.localStreams = b.localStreams.splice(c, 1));
                } else this.audioMonitor && (this.audioMonitor.stop(), delete this.audioMonitor), 
                this.localStreams.forEach(function(a) {
                    a.stop(), b.emit("localStreamStopped", a);
                }), this.localStreams = [];
            }, c.prototype.startScreenShare = function(a) {
                var b = this;
                h(function(c, d) {
                    return c || (b.localScreens.push(d), d.onended = function() {
                        var a = b.localScreens.indexOf(d);
                        a > -1 && b.localScreens.splice(a, 1), b.emit("localScreenStopped", d);
                    }, b.emit("localScreen", d)), a ? a(c, d) : void 0;
                });
            }, c.prototype.stopScreenShare = function(a) {
                a ? a.stop() : (this.localScreens.forEach(function(a) {
                    a.stop();
                }), this.localScreens = []);
            }, c.prototype.mute = function() {
                this._audioEnabled(!1), this.hardMuted = !0, this.emit("audioOff");
            }, c.prototype.unmute = function() {
                this._audioEnabled(!0), this.hardMuted = !1, this.emit("audioOn");
            }, c.prototype.setupAudioMonitor = function(a, b) {
                this._log("Setup audio");
                var c, d = this.audioMonitor = e(a, b), f = this;
                d.on("speaking", function() {
                    f.emit("speaking"), f.hardMuted || f.setMicIfEnabled(1);
                }), d.on("stopped_speaking", function() {
                    c && clearTimeout(c), c = setTimeout(function() {
                        f.emit("stoppedSpeaking"), f.hardMuted || f.setMicIfEnabled(.5);
                    }, 1e3);
                }), d.on("volume_change", function(a, b) {
                    f.emit("volumeChange", a, b);
                });
            }, c.prototype.setMicIfEnabled = function(a) {
                this.config.autoAdjustMic && this.gainController.setGain(a);
            }, c.prototype.pauseVideo = function() {
                this._videoEnabled(!1), this.emit("videoOff");
            }, c.prototype.resumeVideo = function() {
                this._videoEnabled(!0), this.emit("videoOn");
            }, c.prototype.pause = function() {
                this._audioEnabled(!1), this.pauseVideo();
            }, c.prototype.resume = function() {
                this._audioEnabled(!0), this.resumeVideo();
            }, c.prototype._audioEnabled = function(a) {
                this.setMicIfEnabled(a ? 1 : 0), this.localStreams.forEach(function(b) {
                    b.getAudioTracks().forEach(function(b) {
                        b.enabled = !!a;
                    });
                });
            }, c.prototype._videoEnabled = function(a) {
                this.localStreams.forEach(function(b) {
                    b.getVideoTracks().forEach(function(b) {
                        b.enabled = !!a;
                    });
                });
            }, c.prototype.isAudioEnabled = function() {
                var a = !0;
                return this.localStreams.forEach(function(b) {
                    b.getAudioTracks().forEach(function(b) {
                        a = a && b.enabled;
                    });
                }), a;
            }, c.prototype.isVideoEnabled = function() {
                var a = !0;
                return this.localStreams.forEach(function(b) {
                    b.getVideoTracks().forEach(function(b) {
                        a = a && b.enabled;
                    });
                }), a;
            }, c.prototype.startLocalMedia = c.prototype.start, c.prototype.stopLocalMedia = c.prototype.stop, 
            Object.defineProperty(c.prototype, "localStream", {
                get: function() {
                    return this.localStreams.length > 0 ? this.localStreams[0] : null;
                }
            }), Object.defineProperty(c.prototype, "localScreen", {
                get: function() {
                    return this.localScreens.length > 0 ? this.localScreens[0] : null;
                }
            }), b.exports = c;
        }, {
            getscreenmedia: 16,
            getusermedia: 15,
            hark: 17,
            "mediastream-gain": 18,
            mockconsole: 5,
            util: 8,
            webrtcsupport: 11,
            wildemitter: 6
        } ],
        19: [ function(a, b, c) {
            !function() {
                var a = this, d = a._, e = {}, f = Array.prototype, g = Object.prototype, h = Function.prototype, i = f.push, j = f.slice, k = f.concat, l = g.toString, m = g.hasOwnProperty, n = f.forEach, o = f.map, p = f.reduce, q = f.reduceRight, r = f.filter, s = f.every, t = f.some, u = f.indexOf, v = f.lastIndexOf, w = Array.isArray, x = Object.keys, y = h.bind, z = function(a) {
                    return a instanceof z ? a : this instanceof z ? [object Object]0 : new z(a);
                };
                "undefined" != typeof c ? ("undefined" != typeof b && b.exports && (c = b.exports = z), 
                c._ = z) : a._ = z, z.VERSION = "1.6.0";
                var A = z.each = z.forEach = function(a, b, c) {
                    if (null == a) return a;
                    if (n && a.forEach === n) a.forEach(b, c); else if (a.length === +a.length) {
                        for (var d = 0, f = a.length; f > d; d++) if (b.call(c, a[d], d, a) === e) return;
                    } else for (var g = z.keys(a), d = 0, f = g.length; f > d; d++) if (b.call(c, a[g[d]], g[d], a) === e) return;
                    return a;
                };
                z.map = z.collect = function(a, b, c) {
                    var d = [];
                    return null == a ? d : o && a.map === o ? a.map(b, c) : (A(a, function(a, e, f) {
                        d.push(b.call(c, a, e, f));
                    }), d);
                };
                var B = "Reduce of empty array with no initial value";
                z.reduce = z.foldl = z.inject = function(a, b, c, d) {
                    var e = arguments.length > 2;
                    if (null == a && (a = []), p && a.reduce === p) return d && (b = z.bind(b, d)), 
                    e ? a.reduce(b, c) : a.reduce(b);
                    if (A(a, function(a, f, g) {
                        e ? c = b.call(d, c, a, f, g) : (c = a, e = !0);
                    }), !e) throw new TypeError(B);
                    return c;
                }, z.reduceRight = z.foldr = function(a, b, c, d) {
                    var e = arguments.length > 2;
                    if (null == a && (a = []), q && a.reduceRight === q) return d && (b = z.bind(b, d)), 
                    e ? a.reduceRight(b, c) : a.reduceRight(b);
                    var f = a.length;
                    if (f !== +f) {
                        var g = z.keys(a);
                        f = g.length;
                    }
                    if (A(a, function(h, i, j) {
                        i = g ? g[--f] : --f, e ? c = b.call(d, c, a[i], i, j) : (c = a[i], e = !0);
                    }), !e) throw new TypeError(B);
                    return c;
                }, z.find = z.detect = function(a, b, c) {
                    var d;
                    return C(a, function(a, e, f) {
                        return b.call(c, a, e, f) ? (d = a, !0) : void 0;
                    }), d;
                }, z.filter = z.select = function(a, b, c) {
                    var d = [];
                    return null == a ? d : r && a.filter === r ? a.filter(b, c) : (A(a, function(a, e, f) {
                        b.call(c, a, e, f) && d.push(a);
                    }), d);
                }, z.reject = function(a, b, c) {
                    return z.filter(a, function(a, d, e) {
                        return !b.call(c, a, d, e);
                    }, c);
                }, z.every = z.all = function(a, b, c) {
                    b || (b = z.identity);
                    var d = !0;
                    return null == a ? d : s && a.every === s ? a.every(b, c) : (A(a, function(a, f, g) {
                        return (d = d && b.call(c, a, f, g)) ? void 0 : e;
                    }), !!d);
                };
                var C = z.some = z.any = function(a, b, c) {
                    b || (b = z.identity);
                    var d = !1;
                    return null == a ? d : t && a.some === t ? a.some(b, c) : (A(a, function(a, f, g) {
                        return d || (d = b.call(c, a, f, g)) ? e : void 0;
                    }), !!d);
                };
                z.contains = z.include = function(a, b) {
                    return null == a ? !1 : u && a.indexOf === u ? -1 != a.indexOf(b) : C(a, function(a) {
                        return a === b;
                    });
                }, z.invoke = function(a, b) {
                    var c = j.call(arguments, 2), d = z.isFunction(b);
                    return z.map(a, function(a) {
                        return (d ? b : a[b]).apply(a, c);
                    });
                }, z.pluck = function(a, b) {
                    return z.map(a, z.property(b));
                }, z.where = function(a, b) {
                    return z.filter(a, z.matches(b));
                }, z.findWhere = function(a, b) {
                    return z.find(a, z.matches(b));
                }, z.max = function(a, b, c) {
                    if (!b && z.isArray(a) && a[0] === +a[0] && a.length < 65535) return Math.max.apply(Math, a);
                    var d = -1 / 0, e = -1 / 0;
                    return A(a, function(a, f, g) {
                        var h = b ? b.call(c, a, f, g) : a;
                        h > e && (d = a, e = h);
                    }), d;
                }, z.min = function(a, b, c) {
                    if (!b && z.isArray(a) && a[0] === +a[0] && a.length < 65535) return Math.min.apply(Math, a);
                    var d = 1 / 0, e = 1 / 0;
                    return A(a, function(a, f, g) {
                        var h = b ? b.call(c, a, f, g) : a;
                        e > h && (d = a, e = h);
                    }), d;
                }, z.shuffle = function(a) {
                    var b, c = 0, d = [];
                    return A(a, function(a) {
                        b = z.random(c++), d[c - 1] = d[b], d[b] = a;
                    }), d;
                }, z.sample = function(a, b, c) {
                    return null == b || c ? (a.length !== +a.length && (a = z.values(a)), a[z.random(a.length - 1)]) : z.shuffle(a).slice(0, Math.max(0, b));
                };
                var D = function(a) {
                    return null == a ? z.identity : z.isFunction(a) ? a : z.property(a);
                };
                z.sortBy = function(a, b, c) {
                    return b = D(b), z.pluck(z.map(a, function(a, d, e) {
                        return {
                            value: a,
                            index: d,
                            criteria: b.call(c, a, d, e)
                        };
                    }).sort(function(a, b) {
                        var c = a.criteria, d = b.criteria;
                        if (c !== d) {
                            if (c > d || void 0 === c) return 1;
                            if (d > c || void 0 === d) return -1;
                        }
                        return a.index - b.index;
                    }), "value");
                };
                var E = function(a) {
                    return function(b, c, d) {
                        var e = {};
                        return c = D(c), A(b, function(f, g) {
                            var h = c.call(d, f, g, b);
                            a(e, h, f);
                        }), e;
                    };
                };
                z.groupBy = E(function(a, b, c) {
                    z.has(a, b) ? a[b].push(c) : a[b] = [ c ];
                }), z.indexBy = E(function(a, b, c) {
                    a[b] = c;
                }), z.countBy = E(function(a, b) {
                    z.has(a, b) ? a[b]++ : a[b] = 1;
                }), z.sortedIndex = function(a, b, c, d) {
                    c = D(c);
                    for (var e = c.call(d, b), f = 0, g = a.length; g > f; ) {
                        var h = f + g >>> 1;
                        c.call(d, a[h]) < e ? f = h + 1 : g = h;
                    }
                    return f;
                }, z.toArray = function(a) {
                    return a ? z.isArray(a) ? j.call(a) : a.length === +a.length ? z.map(a, z.identity) : z.values(a) : [];
                }, z.size = function(a) {
                    return null == a ? 0 : a.length === +a.length ? a.length : z.keys(a).length;
                }, z.first = z.head = z.take = function(a, b, c) {
                    return null == a ? void 0 : null == b || c ? a[0] : 0 > b ? [] : j.call(a, 0, b);
                }, z.initial = function(a, b, c) {
                    return j.call(a, 0, a.length - (null == b || c ? 1 : b));
                }, z.last = function(a, b, c) {
                    return null == a ? void 0 : null == b || c ? a[a.length - 1] : j.call(a, Math.max(a.length - b, 0));
                }, z.rest = z.tail = z.drop = function(a, b, c) {
                    return j.call(a, null == b || c ? 1 : b);
                }, z.compact = function(a) {
                    return z.filter(a, z.identity);
                };
                var F = function(a, b, c) {
                    return b && z.every(a, z.isArray) ? k.apply(c, a) : (A(a, function(a) {
                        z.isArray(a) || z.isArguments(a) ? b ? i.apply(c, a) : F(a, b, c) : c.push(a);
                    }), c);
                };
                z.flatten = function(a, b) {
                    return F(a, b, []);
                }, z.without = function(a) {
                    return z.difference(a, j.call(arguments, 1));
                }, z.partition = function(a, b) {
                    var c = [], d = [];
                    return A(a, function(a) {
                        (b(a) ? c : d).push(a);
                    }), [ c, d ];
                }, z.uniq = z.unique = function(a, b, c, d) {
                    z.isFunction(b) && (d = c, c = b, b = !1);
                    var e = c ? z.map(a, c, d) : a, f = [], g = [];
                    return A(e, function(c, d) {
                        (b ? d && g[g.length - 1] === c : z.contains(g, c)) || (g.push(c), f.push(a[d]));
                    }), f;
                }, z.union = function() {
                    return z.uniq(z.flatten(arguments, !0));
                }, z.intersection = function(a) {
                    var b = j.call(arguments, 1);
                    return z.filter(z.uniq(a), function(a) {
                        return z.every(b, function(b) {
                            return z.contains(b, a);
                        });
                    });
                }, z.difference = function(a) {
                    var b = k.apply(f, j.call(arguments, 1));
                    return z.filter(a, function(a) {
                        return !z.contains(b, a);
                    });
                }, z.zip = function() {
                    for (var a = z.max(z.pluck(arguments, "length").concat(0)), b = new Array(a), c = 0; a > c; c++) b[c] = z.pluck(arguments, "" + c);
                    return b;
                }, z.object = function(a, b) {
                    if (null == a) return {};
                    for (var c = {}, d = 0, e = a.length; e > d; d++) b ? c[a[d]] = b[d] : c[a[d][0]] = a[d][1];
                    return c;
                }, z.indexOf = function(a, b, c) {
                    if (null == a) return -1;
                    var d = 0, e = a.length;
                    if (c) {
                        if ("number" != typeof c) return d = z.sortedIndex(a, b), a[d] === b ? d : -1;
                        d = 0 > c ? Math.max(0, e + c) : c;
                    }
                    if (u && a.indexOf === u) return a.indexOf(b, c);
                    for (;e > d; d++) if (a[d] === b) return d;
                    return -1;
                }, z.lastIndexOf = function(a, b, c) {
                    if (null == a) return -1;
                    var d = null != c;
                    if (v && a.lastIndexOf === v) return d ? a.lastIndexOf(b, c) : a.lastIndexOf(b);
                    for (var e = d ? c : a.length; e--; ) if (a[e] === b) return e;
                    return -1;
                }, z.range = function(a, b, c) {
                    arguments.length <= 1 && (b = a || 0, a = 0), c = arguments[2] || 1;
                    for (var d = Math.max(Math.ceil((b - a) / c), 0), e = 0, f = new Array(d); d > e; ) f[e++] = a, 
                    a += c;
                    return f;
                };
                var G = function() {};
                z.bind = function(a, b) {
                    var c, d;
                    if (y && a.bind === y) return y.apply(a, j.call(arguments, 1));
                    if (!z.isFunction(a)) throw new TypeError();
                    return c = j.call(arguments, 2), d = function() {
                        if (!(this instanceof d)) return a.apply(b, c.concat(j.call(arguments)));
                        G.prototype = a.prototype;
                        var e = new G();
                        G.prototype = null;
                        var f = a.apply(e, c.concat(j.call(arguments)));
                        return Object(f) === f ? f : e;
                    };
                }, z.partial = function(a) {
                    var b = j.call(arguments, 1);
                    return function() {
                        for (var c = 0, d = b.slice(), e = 0, f = d.length; f > e; e++) d[e] === z && (d[e] = arguments[c++]);
                        for (;c < arguments.length; ) d.push(arguments[c++]);
                        return a.apply(this, d);
                    };
                }, z.bindAll = function(a) {
                    var b = j.call(arguments, 1);
                    if (0 === b.length) throw new Error("bindAll must be passed function names");
                    return A(b, function(b) {
                        a[b] = z.bind(a[b], a);
                    }), a;
                }, z.memoize = function(a, b) {
                    var c = {};
                    return b || (b = z.identity), function() {
                        var d = b.apply(this, arguments);
                        return z.has(c, d) ? c[d] : c[d] = a.apply(this, arguments);
                    };
                }, z.delay = function(a, b) {
                    var c = j.call(arguments, 2);
                    return setTimeout(function() {
                        return a.apply(null, c);
                    }, b);
                }, z.defer = function(a) {
                    return z.delay.apply(z, [ a, 1 ].concat(j.call(arguments, 1)));
                }, z.throttle = function(a, b, c) {
                    var d, e, f, g = null, h = 0;
                    c || (c = {});
                    var i = function() {
                        h = c.leading === !1 ? 0 : z.now(), g = null, f = a.apply(d, e), d = e = null;
                    };
                    return function() {
                        var j = z.now();
                        h || c.leading !== !1 || (h = j);
                        var k = b - (j - h);
                        return d = this, e = arguments, 0 >= k ? (clearTimeout(g), g = null, h = j, f = a.apply(d, e), 
                        d = e = null) : g || c.trailing === !1 || (g = setTimeout(i, k)), f;
                    };
                }, z.debounce = function(a, b, c) {
                    var d, e, f, g, h, i = function() {
                        var j = z.now() - g;
                        b > j ? d = setTimeout(i, b - j) : (d = null, c || (h = a.apply(f, e), f = e = null));
                    };
                    return function() {
                        f = this, e = arguments, g = z.now();
                        var j = c && !d;
                        return d || (d = setTimeout(i, b)), j && (h = a.apply(f, e), f = e = null), h;
                    };
                }, z.once = function(a) {
                    var b, c = !1;
                    return function() {
                        return c ? b : (c = !0, b = a.apply(this, arguments), a = null, b);
                    };
                }, z.wrap = function(a, b) {
                    return z.partial(b, a);
                }, z.compose = function() {
                    var a = arguments;
                    return function() {
                        for (var b = arguments, c = a.length - 1; c >= 0; c--) b = [ a[c].apply(this, b) ];
                        return b[0];
                    };
                }, z.after = function(a, b) {
                    return function() {
                        return --a < 1 ? b.apply(this, arguments) : void 0;
                    };
                }, z.keys = function(a) {
                    if (!z.isObject(a)) return [];
                    if (x) return x(a);
                    var b = [];
                    for (var c in a) z.has(a, c) && b.push(c);
                    return b;
                }, z.values = function(a) {
                    for (var b = z.keys(a), c = b.length, d = new Array(c), e = 0; c > e; e++) d[e] = a[b[e]];
                    return d;
                }, z.pairs = function(a) {
                    for (var b = z.keys(a), c = b.length, d = new Array(c), e = 0; c > e; e++) d[e] = [ b[e], a[b[e]] ];
                    return d;
                }, z.invert = function(a) {
                    for (var b = {}, c = z.keys(a), d = 0, e = c.length; e > d; d++) b[a[c[d]]] = c[d];
                    return b;
                }, z.functions = z.methods = function(a) {
                    var b = [];
                    for (var c in a) z.isFunction(a[c]) && b.push(c);
                    return b.sort();
                }, z.extend = function(a) {
                    return A(j.call(arguments, 1), function(b) {
                        if (b) for (var c in b) a[c] = b[c];
                    }), a;
                }, z.pick = function(a) {
                    var b = {}, c = k.apply(f, j.call(arguments, 1));
                    return A(c, function(c) {
                        c in a && (b[c] = a[c]);
                    }), b;
                }, z.omit = function(a) {
                    var b = {}, c = k.apply(f, j.call(arguments, 1));
                    for (var d in a) z.contains(c, d) || (b[d] = a[d]);
                    return b;
                }, z.defaults = function(a) {
                    return A(j.call(arguments, 1), function(b) {
                        if (b) for (var c in b) void 0 === a[c] && (a[c] = b[c]);
                    }), a;
                }, z.clone = function(a) {
                    return z.isObject(a) ? z.isArray(a) ? a.slice() : z.extend({}, a) : a;
                }, z.tap = function(a, b) {
                    return b(a), a;
                };
                var H = function(a, b, c, d) {
                    if (a === b) return 0 !== a || 1 / a == 1 / b;
                    if (null == a || null == b) return a === b;
                    a instanceof z && (a = a._wrapped), b instanceof z && (b = b._wrapped);
                    var e = l.call(a);
                    if (e != l.call(b)) return !1;
                    switch (e) {
                      case "[object String]":
                        return a == String(b);

                      case "[object Number]":
                        return a != +a ? b != +b : 0 == a ? 1 / a == 1 / b : a == +b;

                      case "[object Date]":
                      case "[object Boolean]":
                        return +a == +b;

                      case "[object RegExp]":
                        return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase;
                    }
                    if ("object" != typeof a || "object" != typeof b) return !1;
                    for (var f = c.length; f--; ) if (c[f] == a) return d[f] == b;
                    var g = a.constructor, h = b.constructor;
                    if (g !== h && !(z.isFunction(g) && g instanceof g && z.isFunction(h) && h instanceof h) && "constructor" in a && "constructor" in b) return !1;
                    c.push(a), d.push(b);
                    var i = 0, j = !0;
                    if ("[object Array]" == e) {
                        if (i = a.length, j = i == b.length) for (;i-- && (j = H(a[i], b[i], c, d)); ) ;
                    } else {
                        for (var k in a) if (z.has(a, k) && (i++, !(j = z.has(b, k) && H(a[k], b[k], c, d)))) break;
                        if (j) {
                            for (k in b) if (z.has(b, k) && !i--) break;
                            j = !i;
                        }
                    }
                    return c.pop(), d.pop(), j;
                };
                z.isEqual = function(a, b) {
                    return H(a, b, [], []);
                }, z.isEmpty = function(a) {
                    if (null == a) return !0;
                    if (z.isArray(a) || z.isString(a)) return 0 === a.length;
                    for (var b in a) if (z.has(a, b)) return !1;
                    return !0;
                }, z.isElement = function(a) {
                    return !(!a || 1 !== a.nodeType);
                }, z.isArray = w || function(a) {
                    return "[object Array]" == l.call(a);
                }, z.isObject = function(a) {
                    return a === Object(a);
                }, A([ "Arguments", "Function", "String", "Number", "Date", "RegExp" ], function(a) {
                    z["is" + a] = function(b) {
                        return l.call(b) == "[object " + a + "]";
                    };
                }), z.isArguments(arguments) || (z.isArguments = function(a) {
                    return !(!a || !z.has(a, "callee"));
                }), "function" != typeof /./ && (z.isFunction = function(a) {
                    return "function" == typeof a;
                }), z.isFinite = function(a) {
                    return isFinite(a) && !isNaN(parseFloat(a));
                }, z.isNaN = function(a) {
                    return z.isNumber(a) && a != +a;
                }, z.isBoolean = function(a) {
                    return a === !0 || a === !1 || "[object Boolean]" == l.call(a);
                }, z.isNull = function(a) {
                    return null === a;
                }, z.isUndefined = function(a) {
                    return void 0 === a;
                }, z.has = function(a, b) {
                    return m.call(a, b);
                }, z.noConflict = function() {
                    return a._ = d, this;
                }, z.identity = function(a) {
                    return a;
                }, z.constant = function(a) {
                    return function() {
                        return a;
                    };
                }, z.property = function(a) {
                    return function(b) {
                        return b[a];
                    };
                }, z.matches = function(a) {
                    return function(b) {
                        if (b === a) return !0;
                        for (var c in a) if (a[c] !== b[c]) return !1;
                        return !0;
                    };
                }, z.times = function(a, b, c) {
                    for (var d = Array(Math.max(0, a)), e = 0; a > e; e++) d[e] = b.call(c, e);
                    return d;
                }, z.random = function(a, b) {
                    return null == b && (b = a, a = 0), a + Math.floor(Math.random() * (b - a + 1));
                }, z.now = Date.now || function() {
                    return new Date().getTime();
                };
                var I = {
                    escape: {
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#x27;"
                    }
                };
                I.unescape = z.invert(I.escape);
                var J = {
                    escape: new RegExp("[" + z.keys(I.escape).join("") + "]", "g"),
                    unescape: new RegExp("(" + z.keys(I.unescape).join("|") + ")", "g")
                };
                z.each([ "escape", "unescape" ], function(a) {
                    z[a] = function(b) {
                        return null == b ? "" : ("" + b).replace(J[a], function(b) {
                            return I[a][b];
                        });
                    };
                }), z.result = function(a, b) {
                    if (null == a) return void 0;
                    var c = a[b];
                    return z.isFunction(c) ? c.call(a) : c;
                }, z.mixin = function(a) {
                    A(z.functions(a), function(b) {
                        var c = z[b] = a[b];
                        z.prototype[b] = function() {
                            var a = [ this._wrapped ];
                            return i.apply(a, arguments), O.call(this, c.apply(z, a));
                        };
                    });
                };
                var K = 0;
                z.uniqueId = function(a) {
                    var b = ++K + "";
                    return a ? a + b : b;
                }, z.templateSettings = {
                    evaluate: /<%([\s\S]+?)%>/g,
                    interpolate: /<%=([\s\S]+?)%>/g,
                    escape: /<%-([\s\S]+?)%>/g
                };
                var L = /(.)^/, M = {
                    "'": "'",
                    "\\": "\\",
                    "\r": "r",
                    "\n": "n",
                    "   ": "t",
                    "\u2028": "u2028",
                    "\u2029": "u2029"
                }, N = /\\|'|\r|\n|\t|\u2028|\u2029/g;
                z.template = function(a, b, c) {
                    var d;
                    c = z.defaults({}, c, z.templateSettings);
                    var e = new RegExp([ (c.escape || L).source, (c.interpolate || L).source, (c.evaluate || L).source ].join("|") + "|$", "g"), f = 0, g = "__p+='";
                    a.replace(e, function(b, c, d, e, h) {
                        return g += a.slice(f, h).replace(N, function(a) {
                            return "\\" + M[a];
                        }), c && (g += "'+\n((__t=(" + c + "))==null?'':_.escape(__t))+\n'"), d && (g += "'+\n((__t=(" + d + "))==null?'':__t)+\n'"), 
                        e && (g += "';\n" + e + "\n__p+='"), f = h + b.length, b;
                    }), g += "';\n", c.variable || (g = "with(obj||{}){\n" + g + "}\n"), g = "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" + g + "return __p;\n";
                    try {
                        d = new Function(c.variable || "obj", "_", g);
                    } catch (h) {
                        throw h.source = g, h;
                    }
                    if (b) return d(b, z);
                    var i = function(a) {
                        return d.call(this, a, z);
                    };
                    return i.source = "function(" + (c.variable || "obj") + "){\n" + g + "}", i;
                }, z.chain = function(a) {
                    return z(a).chain();
                };
                var O = function(a) {
                    return this._chain ? z(a).chain() : a;
                };
                z.mixin(z), A([ "pop", "push", "reverse", "shift", "sort", "splice", "unshift" ], function(a) {
                    var b = f[a];
                    z.prototype[a] = function() {
                        var c = this._wrapped;
                        return b.apply(c, arguments), "shift" != a && "splice" != a || 0 !== c.length || delete c[0], 
                        O.call(this, c);
                    };
                }), A([ "concat", "join", "slice" ], function(a) {
                    var b = f[a];
                    z.prototype[a] = function() {
                        return O.call(this, b.apply(this._wrapped, arguments));
                    };
                }), z.extend(z.prototype, {
                    chain: function() {
                        return this._chain = !0, this;
                    },
                    value: function() {
                        return this._wrapped;
                    }
                }), "function" == typeof define && define.amd && define("underscore", [], function() {
                    return z;
                });
            }.call(this);
        }, {} ],
        14: [ function(a, b) {
            function c(a, b) {
                var c, d = this;
                h.call(this), a = a || {}, a.iceServers = a.iceServers || [], this.pc = new i(a, b), 
                this.getLocalStreams = this.pc.getLocalStreams.bind(this.pc), this.getRemoteStreams = this.pc.getRemoteStreams.bind(this.pc), 
                this.pc.on("*", function() {
                    d.emit.apply(d, arguments);
                }), this.pc.onremovestream = this.emit.bind(this, "removeStream"), this.pc.onnegotiationneeded = this.emit.bind(this, "negotiationNeeded"), 
                this.pc.oniceconnectionstatechange = this.emit.bind(this, "iceConnectionStateChange"), 
                this.pc.onsignalingstatechange = this.emit.bind(this, "signalingStateChange"), this.pc.onaddstream = this._onAddStream.bind(this), 
                this.pc.onicecandidate = this._onIce.bind(this), this.pc.ondatachannel = this._onDataChannel.bind(this), 
                this.localDescription = {
                    contents: []
                }, this.remoteDescription = {
                    contents: []
                }, this.localStream = null, this.remoteStreams = [], this.config = {
                    debug: !1,
                    ice: {},
                    sid: "",
                    isInitiator: !0,
                    sdpSessionID: Date.now(),
                    useJingle: !1
                };
                for (c in a) this.config[c] = a[c];
                this.config.debug && this.on("*", function() {
                    var b = a.logger || console;
                    b.log("PeerConnection event:", arguments);
                }), this.hadLocalStunCandidate = !1, this.hadRemoteStunCandidate = !1, this.hadLocalRelayCandidate = !1, 
                this.hadRemoteRelayCandidate = !1;
            }
            var d = a("underscore"), e = a("util"), f = a("webrtcsupport"), g = a("sdp-jingle-json"), h = a("wildemitter"), i = a("traceablepeerconnection");
            e.inherits(c, h), Object.defineProperty(c.prototype, "signalingState", {
                get: function() {
                    return this.pc.signalingState;
                }
            }), Object.defineProperty(c.prototype, "iceConnectionState", {
                get: function() {
                    return this.pc.iceConnectionState;
                }
            }), c.prototype.addStream = function(a) {
                this.localStream = a, this.pc.addStream(a);
            }, c.prototype.processIce = function(a, b) {
                b = b || function() {};
                var c = this;
                if (a.contents) {
                    var e = d.pluck(this.remoteDescription.contents, "name"), h = a.contents;
                    h.forEach(function(a) {
                        var b = a.transport || {}, d = b.candidates || [], h = e.indexOf(a.name), i = a.name;
                        d.forEach(function(a) {
                            var b = g.toCandidateSDP(a) + "\r\n";
                            c.pc.addIceCandidate(new f.IceCandidate({
                                candidate: b,
                                sdpMLineIndex: h,
                                sdpMid: i
                            })), "srflx" === a.type ? c.hadRemoteStunCandidate = !0 : "relay" === a.type && (c.hadRemoteRelayCandidate = !0);
                        });
                    });
                } else c.pc.addIceCandidate(new f.IceCandidate(a.candidate)), -1 !== a.candidate.candidate.indexOf("typ srflx") ? c.hadRemoteStunCandidate = !0 : -1 !== a.candidate.candidate.indexOf("typ relay") && (c.hadRemoteRelayCandidate = !0);
                b();
            }, c.prototype.offer = function(a, b) {
                var c = this, e = 2 === arguments.length, f = e ? a : {
                    mandatory: {
                        OfferToReceiveAudio: !0,
                        OfferToReceiveVideo: !0
                    }
                };
                b = e ? b : a, b = b || function() {}, this.pc.createOffer(function(a) {
                    c.pc.setLocalDescription(a, function() {
                        var e, f = {
                            type: "offer",
                            sdp: a.sdp
                        };
                        c.config.useJingle && (e = g.toSessionJSON(a.sdp, c.config.isInitiator ? "initiator" : "responder"), 
                        e.sid = c.config.sid, c.localDescription = e, d.each(e.contents, function(a) {
                            var b = a.transport || {};
                            b.ufrag && (c.config.ice[a.name] = {
                                ufrag: b.ufrag,
                                pwd: b.pwd
                            });
                        }), f.jingle = e), c.emit("offer", f), b(null, f);
                    }, function(a) {
                        c.emit("error", a), b(a);
                    });
                }, function(a) {
                    c.emit("error", a), b(a);
                }, f);
            }, c.prototype.handleOffer = function(a, b) {
                b = b || function() {};
                var c = this;
                a.type = "offer", a.jingle && (a.sdp = g.toSessionSDP(a.jingle, c.config.sdpSessionID), 
                c.remoteDescription = a.jingle), c.pc.setRemoteDescription(new f.SessionDescription(a), function() {
                    b();
                }, b);
            }, c.prototype.answerAudioOnly = function(a) {
                var b = {
                    mandatory: {
                        OfferToReceiveAudio: !0,
                        OfferToReceiveVideo: !1
                    }
                };
                this._answer(b, a);
            }, c.prototype.answerBroadcastOnly = function(a) {
                var b = {
                    mandatory: {
                        OfferToReceiveAudio: !1,
                        OfferToReceiveVideo: !1
                    }
                };
                this._answer(b, a);
            }, c.prototype.answer = function(a, b) {
                var c = 2 === arguments.length, d = c ? b : a, e = c ? a : {
                    mandatory: {
                        OfferToReceiveAudio: !0,
                        OfferToReceiveVideo: !0
                    }
                };
                this._answer(e, d);
            }, c.prototype.handleAnswer = function(a, b) {
                b = b || function() {};
                var c = this;
                a.jingle && (a.sdp = g.toSessionSDP(a.jingle, c.config.sdpSessionID), c.remoteDescription = a.jingle), 
                c.pc.setRemoteDescription(new f.SessionDescription(a), function() {
                    b(null);
                }, b);
            }, c.prototype.close = function() {
                this.pc.close(), this.emit("close");
            }, c.prototype._answer = function(a, b) {
                b = b || function() {};
                var c = this;
                if (!this.pc.remoteDescription) throw new Error("remoteDescription not set");
                c.pc.createAnswer(function(a) {
                    c.pc.setLocalDescription(a, function() {
                        var d = {
                            type: "answer",
                            sdp: a.sdp
                        };
                        if (c.config.useJingle) {
                            var e = g.toSessionJSON(a.sdp);
                            e.sid = c.config.sid, c.localDescription = e, d.jingle = e;
                        }
                        c.emit("answer", d), b(null, d);
                    }, function(a) {
                        c.emit("error", a), b(a);
                    });
                }, function(a) {
                    c.emit("error", a), b(a);
                }, a);
            }, c.prototype._onIce = function(a) {
                var b = this;
                if (a.candidate) {
                    var c = a.candidate, e = {
                        candidate: a.candidate
                    };
                    if (b.config.useJingle) {
                        if (!b.config.ice[c.sdpMid]) {
                            var f = g.toSessionJSON(b.pc.localDescription.sdp, b.config.isInitiator ? "initiator" : "responder");
                            d.each(f.contents, function(a) {
                                var c = a.transport || {};
                                c.ufrag && (b.config.ice[a.name] = {
                                    ufrag: c.ufrag,
                                    pwd: c.pwd
                                });
                            });
                        }
                        e.jingle = {
                            contents: [ {
                                name: c.sdpMid,
                                creator: b.config.isInitiator ? "initiator" : "responder",
                                transport: {
                                    transType: "iceUdp",
                                    ufrag: b.config.ice[c.sdpMid].ufrag,
                                    pwd: b.config.ice[c.sdpMid].pwd,
                                    candidates: [ g.toCandidateJSON(c.candidate) ]
                                }
                            } ]
                        };
                    }
                    -1 !== c.candidate.indexOf("typ srflx") ? this.hadLocalStunCandidate = !0 : -1 !== c.candidate.indexOf("typ relay") && (this.hadLocalRelayCandidate = !0), 
                    this.emit("ice", e);
                } else this.emit("endOfCandidates");
            }, c.prototype._onDataChannel = function(a) {
                this.emit("addChannel", a.channel);
            }, c.prototype._onAddStream = function(a) {
                this.remoteStreams.push(a.stream), this.emit("addStream", a);
            }, c.prototype.createDataChannel = function(a, b) {
                var c = this.pc.createDataChannel(a, b);
                return c;
            }, c.prototype.getStats = function(a) {
                "moz" === f.prefix ? this.pc.getStats(function(b) {
                    var c = [];
                    b.forEach(function(a) {
                        c.push(a);
                    }), a(null, c);
                }, a) : this.pc.getStats(function(b) {
                    var c = [];
                    b.result().forEach(function(a) {
                        var b = {};
                        a.names().forEach(function(c) {
                            b[c] = a.stat(c);
                        }), b.id = a.id, b.type = a.type, b.timestamp = a.timestamp, c.push(b);
                    }), a(null, c);
                });
            }, b.exports = c;
        }, {
            "sdp-jingle-json": 21,
            traceablepeerconnection: 20,
            underscore: 19,
            util: 8,
            webrtcsupport: 11,
            wildemitter: 6
        } ],
        16: [ function(a, b) {
            var c = a("getusermedia"), d = {};
            b.exports = function(a, b) {
                var e, f = 2 === arguments.length, g = f ? b : a;
                if ("undefined" == typeof window || "http:" === window.location.protocol) return e = new Error("NavigatorUserMediaError"), 
                e.name = "HTTPS_REQUIRED", g(e);
                if (window.navigator.userAgent.match("Chrome")) {
                    var h = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10), i = 33;
                    if (window.navigator.userAgent.match("Linux") && (i = 35), h >= 26 && i >= h) a = f && a || {
                        video: {
                            mandatory: {
                                googLeakyBucket: !0,
                                maxWidth: window.screen.width,
                                maxHeight: window.screen.height,
                                maxFrameRate: 3,
                                chromeMediaSource: "screen"
                            }
                        }
                    }, c(a, g); else {
                        var j = window.setTimeout(function() {
                            return e = new Error("NavigatorUserMediaError"), e.name = "EXTENSION_UNAVAILABLE", 
                            g(e);
                        }, 1e3);
                        d[j] = [ g, f ? constraint : null ], window.postMessage({
                            type: "getScreen",
                            id: j
                        }, "*");
                    }
                }
            }, window.addEventListener("message", function(a) {
                if (a.origin == window.location.origin) if ("gotScreen" == a.data.type && d[a.data.id]) {
                    var b = d[a.data.id], e = b[1], f = b[0];
                    if (delete d[a.data.id], "" === a.data.sourceId) {
                        var g = g = new Error("NavigatorUserMediaError");
                        g.name = "PERMISSION_DENIED", f(g);
                    } else e = e || {
                        audio: !1,
                        video: {
                            mandatory: {
                                chromeMediaSource: "desktop",
                                chromeMediaSourceId: a.data.sourceId,
                                googLeakyBucket: !0,
                                maxWidth: window.screen.width,
                                maxHeight: window.screen.height,
                                maxFrameRate: 3
                            }
                        }
                    }, c(e, f);
                } else "getScreenPending" == a.data.type && window.clearTimeout(a.data.id);
            });
        }, {
            getusermedia: 15
        } ],
        21: [ function(a, b, c) {
            var d = a("./lib/tosdp"), e = a("./lib/tojson");
            c.toSessionSDP = d.toSessionSDP, c.toMediaSDP = d.toMediaSDP, c.toCandidateSDP = d.toCandidateSDP, 
            c.toSessionJSON = e.toSessionJSON, c.toMediaJSON = e.toMediaJSON, c.toCandidateJSON = e.toCandidateJSON;
        }, {
            "./lib/tojson": 23,
            "./lib/tosdp": 22
        } ],
        22: [ function(a, b, c) {
            var d = {
                initiator: "sendonly",
                responder: "recvonly",
                both: "sendrecv",
                none: "inactive",
                sendonly: "initator",
                recvonly: "responder",
                sendrecv: "both",
                inactive: "none"
            };
            c.toSessionSDP = function(a, b, d) {
                var e = [ "v=0", "o=- " + (b || a.sid || Date.now()) + " " + (d || Date.now()) + " IN IP4 0.0.0.0", "s=-", "t=0 0" ], f = a.groups || [];
                f.forEach(function(a) {
                    e.push("a=group:" + a.semantics + " " + a.contents.join(" "));
                });
                var g = a.contents || [];
                return g.forEach(function(a) {
                    e.push(c.toMediaSDP(a));
                }), e.join("\r\n") + "\r\n";
            }, c.toMediaSDP = function(a) {
                var b = [], e = a.description, f = a.transport, g = e.payloads || [], h = f && f.fingerprints || [], i = [];
                "datachannel" == e.descType ? (i.push("application"), i.push("1"), i.push("DTLS/SCTP"), 
                f.sctp && f.sctp.forEach(function(a) {
                    i.push(a.number);
                })) : (i.push(e.media), i.push("1"), e.encryption && e.encryption.length > 0 || h.length > 0 ? i.push("RTP/SAVPF") : i.push("RTP/AVPF"), 
                g.forEach(function(a) {
                    i.push(a.id);
                })), b.push("m=" + i.join(" ")), b.push("c=IN IP4 0.0.0.0"), "rtp" == e.descType && b.push("a=rtcp:1 IN IP4 0.0.0.0"), 
                f && (f.ufrag && b.push("a=ice-ufrag:" + f.ufrag), f.pwd && b.push("a=ice-pwd:" + f.pwd), 
                f.setup && b.push("a=setup:" + f.setup), h.forEach(function(a) {
                    b.push("a=fingerprint:" + a.hash + " " + a.value);
                }), f.sctp && f.sctp.forEach(function(a) {
                    b.push("a=sctpmap:" + a.number + " " + a.protocol + " " + a.streams);
                })), "rtp" == e.descType && b.push("a=" + (d[a.senders] || "sendrecv")), b.push("a=mid:" + a.name), 
                e.mux && b.push("a=rtcp-mux");
                var j = e.encryption || [];
                j.forEach(function(a) {
                    b.push("a=crypto:" + a.tag + " " + a.cipherSuite + " " + a.keyParams + (a.sessionParams ? " " + a.sessionParams : ""));
                }), g.forEach(function(a) {
                    var c = "a=rtpmap:" + a.id + " " + a.name + "/" + a.clockrate;
                    if (a.channels && "1" != a.channels && (c += "/" + a.channels), b.push(c), a.parameters && a.parameters.length) {
                        var d = [ "a=fmtp:" + a.id ];
                        a.parameters.forEach(function(a) {
                            d.push((a.key ? a.key + "=" : "") + a.value);
                        }), b.push(d.join(" "));
                    }
                    a.feedback && a.feedback.forEach(function(c) {
                        "trr-int" === c.type ? b.push("a=rtcp-fb:" + a.id + " trr-int " + c.value ? c.value : "0") : b.push("a=rtcp-fb:" + a.id + " " + c.type + (c.subtype ? " " + c.subtype : ""));
                    });
                }), e.feedback && e.feedback.forEach(function(a) {
                    "trr-int" === a.type ? b.push(a.value) : b.push("a=rtcp-fb:* " + a.type + (a.subtype ? " " + a.subtype : ""));
                });
                var k = e.headerExtensions || [];
                k.forEach(function(a) {
                    b.push("a=extmap:" + a.id + (a.senders ? "/" + d[a.senders] : "") + " " + a.uri);
                });
                var l = e.sourceGroups || [];
                l.forEach(function(a) {
                    b.push("a=ssrc-group:" + a.semantics + " " + a.sources.join(" "));
                });
                var m = e.sources || [];
                m.forEach(function(a) {
                    for (var c = 0; c < a.parameters.length; c++) {
                        var d = a.parameters[c];
                        b.push("a=ssrc:" + (a.ssrc || e.ssrc) + " " + d.key + (d.value ? ":" + d.value : ""));
                    }
                });
                var n = f.candidates || [];
                return n.forEach(function(a) {
                    b.push(c.toCandidateSDP(a));
                }), b.join("\r\n");
            }, c.toCandidateSDP = function(a) {
                var b = [];
                b.push(a.foundation), b.push(a.component), b.push(a.protocol.toUpperCase()), b.push(a.priority), 
                b.push(a.ip), b.push(a.port);
                var c = a.type;
                return b.push("typ"), b.push(c), ("srflx" === c || "prflx" === c || "relay" === c) && a.relAddr && a.relPort && (b.push("raddr"), 
                b.push(a.relAddr), b.push("rport"), b.push(a.relPort)), b.push("generation"), b.push(a.generation || "0"), 
                "a=candidate:" + b.join(" ");
            };
        }, {} ],
        18: [ function(a, b) {
            function c(a) {
                if (this.support = d.webAudio && d.mediaStream, this.gain = 1, this.support) {
                    var b = this.context = new d.AudioContext();
                    this.microphone = b.createMediaStreamSource(a), this.gainFilter = b.createGain(), 
                    this.destination = b.createMediaStreamDestination(), this.outputStream = this.destination.stream, 
                    this.microphone.connect(this.gainFilter), this.gainFilter.connect(this.destination), 
                    a.addTrack(this.outputStream.getAudioTracks()[0]), a.removeTrack(a.getAudioTracks()[0]);
                }
                this.stream = a;
            }
            var d = a("webrtcsupport");
            c.prototype.setGain = function(a) {
                this.support && (this.gainFilter.gain.value = a, this.gain = a);
            }, c.prototype.getGain = function() {
                return this.gain;
            }, c.prototype.off = function() {
                return this.setGain(0);
            }, c.prototype.on = function() {
                this.setGain(1);
            }, b.exports = c;
        }, {
            webrtcsupport: 11
        } ],
        17: [ function(a, b) {
            function c(a, b) {
                var c = -1 / 0;
                a.getFloatFrequencyData(b);
                for (var d = 4, e = b.length; e > d; d++) b[d] > c && b[d] < 0 && (c = b[d]);
                return c;
            }
            var d = a("wildemitter"), e = window.webkitAudioContext || window.AudioContext, f = null;
            b.exports = function(a, b) {
                var g = new d();
                if (!e) return g;
                var b = b || {}, h = b.smoothing || .1, i = b.interval || 50, j = b.threshold, k = b.play, l = b.history || 10, m = !0;
                f || (f = new e());
                var n, o, p;
                p = f.createAnalyser(), p.fftSize = 512, p.smoothingTimeConstant = h, o = new Float32Array(p.fftSize), 
                a.jquery && (a = a[0]), a instanceof HTMLAudioElement || a instanceof HTMLVideoElement ? (n = f.createMediaElementSource(a), 
                "undefined" == typeof k && (k = !0), j = j || -50) : (n = f.createMediaStreamSource(a), 
                j = j || -50), n.connect(p), k && p.connect(f.destination), g.speaking = !1, g.setThreshold = function(a) {
                    j = a;
                }, g.setInterval = function(a) {
                    i = a;
                }, g.stop = function() {
                    m = !1, g.emit("volume_change", -100, j), g.speaking && (g.speaking = !1, g.emit("stopped_speaking"));
                }, g.speakingHistory = [];
                for (var q = 0; l > q; q++) g.speakingHistory.push(0);
                var r = function() {
                    setTimeout(function() {
                        if (m) {
                            var a = c(p, o);
                            g.emit("volume_change", a, j);
                            var b = 0;
                            if (a > j && !g.speaking) {
                                for (var d = g.speakingHistory.length - 3; d < g.speakingHistory.length; d++) b += g.speakingHistory[d];
                                b >= 2 && (g.speaking = !0, g.emit("speaking"));
                            } else if (j > a && g.speaking) {
                                for (var d = 0; d < g.speakingHistory.length; d++) b += g.speakingHistory[d];
                                0 == b && (g.speaking = !1, g.emit("stopped_speaking"));
                            }
                            g.speakingHistory.shift(), g.speakingHistory.push(0 + (a > j)), r();
                        }
                    }, i);
                };
                return r(), g;
            };
        }, {
            wildemitter: 6
        } ],
        23: [ function(a, b, c) {
            var d = a("./parsers"), e = Math.random();
            c._setIdCounter = function(a) {
                e = a;
            }, c.toSessionJSON = function(a, b) {
                for (var e = a.split("\r\nm="), f = 1; f < e.length; f++) e[f] = "m=" + e[f], f !== e.length - 1 && (e[f] += "\r\n");
                var g = e.shift() + "\r\n", h = d.lines(g), i = {}, j = [];
                e.forEach(function(a) {
                    j.push(c.toMediaJSON(a, g, b));
                }), i.contents = j;
                var k = d.findLines("a=group:", h);
                return k.length && (i.groups = d.groups(k)), i;
            }, c.toMediaJSON = function(a, b, e) {
                var f = d.lines(a), g = d.lines(b), h = d.mline(f[0]), i = {
                    creator: e,
                    name: h.media,
                    description: {
                        descType: "rtp",
                        media: h.media,
                        payloads: [],
                        encryption: [],
                        feedback: [],
                        headerExtensions: []
                    },
                    transport: {
                        transType: "iceUdp",
                        candidates: [],
                        fingerprints: []
                    }
                };
                "application" == h.media && (i.description = {
                    descType: "datachannel"
                }, i.transport.sctp = []);
                var j = i.description, k = i.transport, l = d.findLine("a=mid:", f);
                if (l && (i.name = l.substr(6)), d.findLine("a=sendrecv", f, g) ? i.senders = "both" : d.findLine("a=sendonly", f, g) ? i.senders = "initiator" : d.findLine("a=recvonly", f, g) ? i.senders = "responder" : d.findLine("a=inactive", f, g) && (i.senders = "none"), 
                "rtp" == j.descType) {
                    var m = d.findLine("a=ssrc:", f);
                    m && (j.ssrc = m.substr(7).split(" ")[0]);
                    var n = d.findLines("a=rtpmap:", f);
                    n.forEach(function(a) {
                        var b = d.rtpmap(a);
                        b.feedback = [];
                        var c = d.findLines("a=fmtp:" + b.id, f);
                        c.forEach(function(a) {
                            b.parameters = d.fmtp(a);
                        });
                        var e = d.findLines("a=rtcp-fb:" + b.id, f);
                        e.forEach(function(a) {
                            b.feedback.push(d.rtcpfb(a));
                        }), j.payloads.push(b);
                    });
                    var o = d.findLines("a=crypto:", f, g);
                    o.forEach(function(a) {
                        j.encryption.push(d.crypto(a));
                    }), d.findLine("a=rtcp-mux", f) && (j.mux = !0);
                    var p = d.findLines("a=rtcp-fb:*", f);
                    p.forEach(function(a) {
                        j.feedback.push(d.rtcpfb(a));
                    });
                    var q = d.findLines("a=extmap:", f);
                    q.forEach(function(a) {
                        var b = d.extmap(a), c = {
                            sendonly: "responder",
                            recvonly: "initiator",
                            sendrecv: "both",
                            inactive: "none"
                        };
                        b.senders = c[b.senders], j.headerExtensions.push(b);
                    });
                    var r = d.findLines("a=ssrc-group:", f);
                    j.sourceGroups = d.sourceGroups(r || []);
                    var s = d.findLines("a=ssrc:", f);
                    j.sources = d.sources(s || []);
                }
                var t = d.findLines("a=fingerprint:", f, g);
                t.forEach(function(a) {
                    var b = d.fingerprint(a), c = d.findLine("a=setup:", f, g);
                    c && (b.setup = c.substr(8)), k.fingerprints.push(b);
                });
                var u = d.findLine("a=ice-ufrag:", f, g), v = d.findLine("a=ice-pwd:", f, g);
                if (u && v) {
                    k.ufrag = u.substr(12), k.pwd = v.substr(10), k.candidates = [];
                    var w = d.findLines("a=candidate:", f, g);
                    w.forEach(function(a) {
                        k.candidates.push(c.toCandidateJSON(a));
                    });
                }
                if ("datachannel" == j.descType) {
                    var x = d.findLines("a=sctpmap:", f);
                    x.forEach(function(a) {
                        var b = d.sctpmap(a);
                        k.sctp.push(b);
                    });
                }
                return i;
            }, c.toCandidateJSON = function(a) {
                var b = d.candidate(a.split("\r\n")[0]);
                return b.id = (e++).toString(36).substr(0, 12), b;
            };
        }, {
            "./parsers": 24
        } ],
        20: [ function(a, b) {
            function c(a) {
                return "type: " + a.type + "\r\n" + a.sdp;
            }
            function d(a, b) {
                var c = this;
                g.call(this), this.peerconnection = new f.PeerConnection(a, b), this.trace = function(a, b) {
                    c.emit("PeerConnectionTrace", {
                        time: new Date(),
                        type: a,
                        value: b || ""
                    });
                }, this.onicecandidate = null, this.peerconnection.onicecandidate = function(a) {
                    c.trace("onicecandidate", JSON.stringify(a.candidate, null, " ")), null !== c.onicecandidate && c.onicecandidate(a);
                }, this.onaddstream = null, this.peerconnection.onaddstream = function(a) {
                    c.trace("onaddstream", a.stream.id), null !== c.onaddstream && c.onaddstream(a);
                }, this.onremovestream = null, this.peerconnection.onremovestream = function(a) {
                    c.trace("onremovestream", a.stream.id), null !== c.onremovestream && c.onremovestream(a);
                }, this.onsignalingstatechange = null, this.peerconnection.onsignalingstatechange = function(a) {
                    c.trace("onsignalingstatechange", c.signalingState), null !== c.onsignalingstatechange && c.onsignalingstatechange(a);
                }, this.oniceconnectionstatechange = null, this.peerconnection.oniceconnectionstatechange = function(a) {
                    c.trace("oniceconnectionstatechange", c.iceConnectionState), null !== c.oniceconnectionstatechange && c.oniceconnectionstatechange(a);
                }, this.onnegotiationneeded = null, this.peerconnection.onnegotiationneeded = function(a) {
                    c.trace("onnegotiationneeded"), null !== c.onnegotiationneeded && c.onnegotiationneeded(a);
                }, c.ondatachannel = null, this.peerconnection.ondatachannel = function(a) {
                    c.trace("ondatachannel", a), null !== c.ondatachannel && c.ondatachannel(a);
                }, this.getLocalStreams = this.peerconnection.getLocalStreams.bind(this.peerconnection), 
                this.getRemoteStreams = this.peerconnection.getRemoteStreams.bind(this.peerconnection);
            }
            var e = a("util"), f = a("webrtcsupport"), g = a("wildemitter");
            e.inherits(d, g), Object.defineProperty(d.prototype, "signalingState", {
                get: function() {
                    return this.peerconnection.signalingState;
                }
            }), Object.defineProperty(d.prototype, "iceConnectionState", {
                get: function() {
                    return this.peerconnection.iceConnectionState;
                }
            }), Object.defineProperty(d.prototype, "localDescription", {
                get: function() {
                    return this.peerconnection.localDescription;
                }
            }), Object.defineProperty(d.prototype, "remoteDescription", {
                get: function() {
                    return this.peerconnection.remoteDescription;
                }
            }), d.prototype.addStream = function(a) {
                this.trace("addStream", a.id), this.peerconnection.addStream(a);
            }, d.prototype.removeStream = function(a) {
                this.trace("removeStream", a.id), this.peerconnection.removeStream(a);
            }, d.prototype.createDataChannel = function(a, b) {
                return this.trace("createDataChannel", a, b), this.peerconnection.createDataChannel(a, b);
            }, d.prototype.setLocalDescription = function(a, b, d) {
                var e = this;
                this.trace("setLocalDescription", c(a)), this.peerconnection.setLocalDescription(a, function() {
                    e.trace("setLocalDescriptionOnSuccess"), b();
                }, function(a) {
                    e.trace("setLocalDescriptionOnFailure", a), d(a);
                });
            }, d.prototype.setRemoteDescription = function(a, b, d) {
                var e = this;
                this.trace("setRemoteDescription", c(a)), this.peerconnection.setRemoteDescription(a, function() {
                    e.trace("setRemoteDescriptionOnSuccess"), b();
                }, function(a) {
                    e.trace("setRemoteDescriptionOnFailure", a), d(a);
                });
            }, d.prototype.close = function() {
                this.trace("stop"), null !== this.statsinterval && (window.clearInterval(this.statsinterval), 
                this.statsinterval = null), "closed" != this.peerconnection.signalingState && this.peerconnection.close();
            }, d.prototype.createOffer = function(a, b, d) {
                var e = this;
                this.trace("createOffer", JSON.stringify(d, null, " ")), this.peerconnection.createOffer(function(b) {
                    e.trace("createOfferOnSuccess", c(b)), a(b);
                }, function(a) {
                    e.trace("createOfferOnFailure", a), b(a);
                }, d);
            }, d.prototype.createAnswer = function(a, b, d) {
                var e = this;
                this.trace("createAnswer", JSON.stringify(d, null, " ")), this.peerconnection.createAnswer(function(b) {
                    e.trace("createAnswerOnSuccess", c(b)), a(b);
                }, function(a) {
                    e.trace("createAnswerOnFailure", a), b(a);
                }, d);
            }, d.prototype.addIceCandidate = function(a) {
                this.trace("addIceCandidate", JSON.stringify(a, null, " ")), this.peerconnection.addIceCandidate(a);
            }, d.prototype.getStats = function(a, b) {
                navigator.mozGetUserMedia ? this.peerconnection.getStats(null, a, b) : this.peerconnection.getStats(a);
            }, b.exports = d;
        }, {
            util: 8,
            webrtcsupport: 11,
            wildemitter: 6
        } ],
        24: [ function(a, b, c) {
            c.lines = function(a) {
                return a.split("\r\n").filter(function(a) {
                    return a.length > 0;
                });
            }, c.findLine = function(a, b, c) {
                for (var d = a.length, e = 0; e < b.length; e++) if (b[e].substr(0, d) === a) return b[e];
                if (!c) return !1;
                for (var f = 0; f < c.length; f++) if (c[f].substr(0, d) === a) return c[f];
                return !1;
            }, c.findLines = function(a, b, c) {
                for (var d = [], e = a.length, f = 0; f < b.length; f++) b[f].substr(0, e) === a && d.push(b[f]);
                if (d.length || !c) return d;
                for (var g = 0; g < c.length; g++) c[g].substr(0, e) === a && d.push(c[g]);
                return d;
            }, c.mline = function(a) {
                for (var b = a.substr(2).split(" "), c = {
                    media: b[0],
                    port: b[1],
                    proto: b[2],
                    formats: []
                }, d = 3; d < b.length; d++) b[d] && c.formats.push(b[d]);
                return c;
            }, c.rtpmap = function(a) {
                var b = a.substr(9).split(" "), c = {
                    id: b.shift()
                };
                return b = b[0].split("/"), c.name = b[0], c.clockrate = b[1], c.channels = 3 == b.length ? b[2] : "1", 
                c;
            }, c.sctpmap = function(a) {
                var b = a.substr(10).split(" "), c = {
                    number: b.shift(),
                    protocol: b.shift(),
                    streams: b.shift()
                };
                return c;
            }, c.fmtp = function(a) {
                for (var b, c, d, e = a.substr(a.indexOf(" ") + 1).split(";"), f = [], g = 0; g < e.length; g++) b = e[g].split("="), 
                c = b[0].trim(), d = b[1], c && d ? f.push({
                    key: c,
                    value: d
                }) : c && f.push({
                    key: "",
                    value: c
                });
                return f;
            }, c.crypto = function(a) {
                var b = a.substr(9).split(" "), c = {
                    tag: b[0],
                    cipherSuite: b[1],
                    keyParams: b[2],
                    sessionParams: b.slice(3).join(" ")
                };
                return c;
            }, c.fingerprint = function(a) {
                var b = a.substr(14).split(" ");
                return {
                    hash: b[0],
                    value: b[1]
                };
            }, c.extmap = function(a) {
                var b = a.substr(9).split(" "), c = {}, d = b.shift(), e = d.indexOf("/");
                return e >= 0 ? (c.id = d.substr(0, e), c.senders = d.substr(e + 1)) : (c.id = d, 
                c.senders = "sendrecv"), c.uri = b.shift() || "", c;
            }, c.rtcpfb = function(a) {
                var b = a.substr(10).split(" "), c = {};
                return c.id = b.shift(), c.type = b.shift(), "trr-int" === c.type ? c.value = b.shift() : c.subtype = b.shift() || "", 
                c.parameters = b, c;
            }, c.candidate = function(a) {
                var b;
                b = 0 === a.indexOf("a=candidate:") ? a.substring(12).split(" ") : a.substring(10).split(" ");
                for (var c = {
                    foundation: b[0],
                    component: b[1],
                    protocol: b[2].toLowerCase(),
                    priority: b[3],
                    ip: b[4],
                    port: b[5],
                    type: b[7],
                    generation: "0"
                }, d = 8; d < b.length; d += 2) "raddr" === b[d] ? c.relAddr = b[d + 1] : "rport" === b[d] ? c.relPort = b[d + 1] : "generation" === b[d] && (c.generation = b[d + 1]);
                return c.network = "1", c;
            }, c.sourceGroups = function(a) {
                for (var b = [], c = 0; c < a.length; c++) {
                    var d = a[c].substr(13).split(" ");
                    b.push({
                        semantics: d.shift(),
                        sources: d
                    });
                }
                return b;
            }, c.sources = function(a) {
                for (var b = [], c = {}, d = 0; d < a.length; d++) {
                    var e = a[d].substr(7).split(" "), f = e.shift();
                    if (!c[f]) {
                        var g = {
                            ssrc: f,
                            parameters: []
                        };
                        b.push(g), c[f] = g;
                    }
                    e = e.join(" ").split(":");
                    var h = e.shift(), i = e.join(":") || null;
                    c[f].parameters.push({
                        key: h,
                        value: i
                    });
                }
                return b;
            }, c.groups = function(a) {
                for (var b, c = [], d = 0; d < a.length; d++) b = a[d].substr(8).split(" "), c.push({
                    semantics: b.shift(),
                    contents: b
                });
                return c;
            };
        }, {} ]
    }, {}, [ 3 ])(3);
});

var io = "undefined" == typeof module ? {} : module.exports;

!function() {
    !function(a, b) {
        var c = a;
        c.version = "0.9.16", c.protocol = 1, c.transports = [], c.j = [], c.sockets = {}, 
        c.connect = function(a, d) {
            var e, f, g = c.util.parseUri(a);
            b && b.location && (g.protocol = g.protocol || b.location.protocol.slice(0, -1), 
            g.host = g.host || (b.document ? b.document.domain : b.location.hostname), g.port = g.port || b.location.port), 
            e = c.util.uniqueUri(g);
            var h = {
                host: g.host,
                secure: "https" == g.protocol,
                port: g.port || ("https" == g.protocol ? 443 : 80),
                query: g.query || ""
            };
            return c.util.merge(h, d), (h["force new connection"] || !c.sockets[e]) && (f = new c.Socket(h)), 
            !h["force new connection"] && f && (c.sockets[e] = f), f = f || c.sockets[e], f.of(g.path.length > 1 ? g.path : "");
        };
    }("object" == typeof module ? module.exports : this.io = {}, this), function(a, b) {
        var c = a.util = {}, d = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/, e = [ "source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor" ];
        c.parseUri = function(a) {
            for (var b = d.exec(a || ""), c = {}, f = 14; f--; ) c[e[f]] = b[f] || "";
            return c;
        }, c.uniqueUri = function(a) {
            var c = a.protocol, d = a.host, e = a.port;
            return "document" in b ? (d = d || document.domain, e = e || ("https" == c && "https:" !== document.location.protocol ? 443 : document.location.port)) : (d = d || "localhost", 
            e || "https" != c || (e = 443)), (c || "http") + "://" + d + ":" + (e || 80);
        }, c.query = function(a, b) {
            var d = c.chunkQuery(a || ""), e = [];
            c.merge(d, c.chunkQuery(b || ""));
            for (var f in d) d.hasOwnProperty(f) && e.push(f + "=" + d[f]);
            return e.length ? "?" + e.join("&") : "";
        }, c.chunkQuery = function(a) {
            for (var b, c = {}, d = a.split("&"), e = 0, f = d.length; f > e; ++e) b = d[e].split("="), 
            b[0] && (c[b[0]] = b[1]);
            return c;
        };
        var f = !1;
        c.load = function(a) {
            return "document" in b && "complete" === document.readyState || f ? a() : [object Object]0;
        }, c.on = function(a, b, c, d) {
            a.attachEvent ? a.attachEvent("on" + b, c) : a.addEventListener && a.addEventListener(b, c, d);
        }, c.request = function(a) {
            if (a && "undefined" != typeof XDomainRequest && !c.ua.hasCORS) return new XDomainRequest();
            if ("undefined" != typeof XMLHttpRequest && (!a || c.ua.hasCORS)) return new XMLHttpRequest();
            if (!a) try {
                return new (window[[ "Active" ].concat("Object").join("X")])("Microsoft.XMLHTTP");
            } catch (b) {}
            return null;
        }, "undefined" != typeof window && c.load(function() {
            f = !0;
        }), c.defer = function(a) {
            return c.ua.webkit && "undefined" == typeof importScripts ? [object Object]0 : a();
        }, c.merge = function(a, b, d, e) {
            var f, g = e || [], h = "undefined" == typeof d ? 2 : d;
            for (f in b) b.hasOwnProperty(f) && c.indexOf(g, f) < 0 && ("object" == typeof a[f] && h ? c.merge(a[f], b[f], h - 1, g) : (a[f] = b[f], 
            g.push(b[f])));
            return a;
        }, c.mixin = function(a, b) {
            c.merge(a.prototype, b.prototype);
        }, c.inherit = function(a, b) {
            function c() {}
            c.prototype = b.prototype, a.prototype = new c();
        }, c.isArray = Array.isArray || function(a) {
            return "[object Array]" === Object.prototype.toString.call(a);
        }, c.intersect = function(a, b) {
            for (var d = [], e = a.length > b.length ? a : b, f = a.length > b.length ? b : a, g = 0, h = f.length; h > g; g++) ~c.indexOf(e, f[g]) && d.push(f[g]);
            return d;
        }, c.indexOf = function(a, b, c) {
            for (var d = a.length, c = 0 > c ? 0 > c + d ? 0 : c + d : c || 0; d > c && a[c] !== b; c++) ;
            return c >= d ? -1 : c;
        }, c.toArray = function(a) {
            for (var b = [], c = 0, d = a.length; d > c; c++) b.push(a[c]);
            return b;
        }, c.ua = {}, c.ua.hasCORS = "undefined" != typeof XMLHttpRequest && function() {
            try {
                var a = new XMLHttpRequest();
            } catch (b) {
                return !1;
            }
            return void 0 != a.withCredentials;
        }(), c.ua.webkit = "undefined" != typeof navigator && /webkit/i.test(navigator.userAgent), 
        c.ua.iDevice = "undefined" != typeof navigator && /iPad|iPhone|iPod/i.test(navigator.userAgent);
    }("undefined" != typeof io ? io : module.exports, this), function(a, b) {
        function c() {}
        a.EventEmitter = c, c.prototype.on = function(a, c) {
            return this.$events || (this.$events = {}), this.$events[a] ? b.util.isArray(this.$events[a]) ? this.$events[a].push(c) : this.$events[a] = [ this.$events[a], c ] : this.$events[a] = c, 
            this;
        }, c.prototype.addListener = c.prototype.on, c.prototype.once = function(a, b) {
            function c() {
                d.removeListener(a, c), b.apply(this, arguments);
            }
            var d = this;
            return c.listener = b, this.on(a, c), this;
        }, c.prototype.removeListener = function(a, c) {
            if (this.$events && this.$events[a]) {
                var d = this.$events[a];
                if (b.util.isArray(d)) {
                    for (var e = -1, f = 0, g = d.length; g > f; f++) if (d[f] === c || d[f].listener && d[f].listener === c) {
                        e = f;
                        break;
                    }
                    if (0 > e) return this;
                    d.splice(e, 1), d.length || delete this.$events[a];
                } else (d === c || d.listener && d.listener === c) && delete this.$events[a];
            }
            return this;
        }, c.prototype.removeAllListeners = function(a) {
            return void 0 === a ? (this.$events = {}, this) : (this.$events && this.$events[a] && (this.$events[a] = null), 
            this);
        }, c.prototype.listeners = function(a) {
            return this.$events || (this.$events = {}), this.$events[a] || (this.$events[a] = []), 
            b.util.isArray(this.$events[a]) || (this.$events[a] = [ this.$events[a] ]), this.$events[a];
        }, c.prototype.emit = function(a) {
            if (!this.$events) return !1;
            var c = this.$events[a];
            if (!c) return !1;
            var d = Array.prototype.slice.call(arguments, 1);
            if ("function" == typeof c) c.apply(this, d); else {
                if (!b.util.isArray(c)) return !1;
                for (var e = c.slice(), f = 0, g = e.length; g > f; f++) e[f].apply(this, d);
            }
            return !0;
        };
    }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
    function(exports, nativeJSON) {
        "use strict";
        function f(a) {
            return 10 > a ? "0" + a : a;
        }
        function date(a) {
            return isFinite(a.valueOf()) ? a.getUTCFullYear() + "-" + f(a.getUTCMonth() + 1) + "-" + f(a.getUTCDate()) + "T" + f(a.getUTCHours()) + ":" + f(a.getUTCMinutes()) + ":" + f(a.getUTCSeconds()) + "Z" : null;
        }
        function quote(a) {
            return escapable.lastIndex = 0, escapable.test(a) ? '"' + a.replace(escapable, function(a) {
                var b = meta[a];
                return "string" == typeof b ? b : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' : '"' + a + '"';
        }
        function str(a, b) {
            var c, d, e, f, g, h = gap, i = b[a];
            switch (i instanceof Date && (i = date(a)), "function" == typeof rep && (i = rep.call(b, a, i)), 
            typeof i) {
              case "string":
                return quote(i);

              case "number":
                return isFinite(i) ? String(i) : "null";

              case "boolean":
              case "null":
                return String(i);

              case "object":
                if (!i) return "null";
                if (gap += indent, g = [], "[object Array]" === Object.prototype.toString.apply(i)) {
                    for (f = i.length, c = 0; f > c; c += 1) g[c] = str(c, i) || "null";
                    return e = 0 === g.length ? "[]" : gap ? "[\n" + gap + g.join(",\n" + gap) + "\n" + h + "]" : "[" + g.join(",") + "]", 
                    gap = h, e;
                }
                if (rep && "object" == typeof rep) for (f = rep.length, c = 0; f > c; c += 1) "string" == typeof rep[c] && (d = rep[c], 
                e = str(d, i), e && g.push(quote(d) + (gap ? ": " : ":") + e)); else for (d in i) Object.prototype.hasOwnProperty.call(i, d) && (e = str(d, i), 
                e && g.push(quote(d) + (gap ? ": " : ":") + e));
                return e = 0 === g.length ? "{}" : gap ? "{\n" + gap + g.join(",\n" + gap) + "\n" + h + "}" : "{" + g.join(",") + "}", 
                gap = h, e;
            }
        }
        if (nativeJSON && nativeJSON.parse) return exports.JSON = {
            parse: nativeJSON.parse,
            stringify: nativeJSON.stringify
        };
        var JSON = exports.JSON = {}, cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {
            "\b": "\\b",
            "   ": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            '"': '\\"',
            "\\": "\\\\"
        }, rep;
        JSON.stringify = function(a, b, c) {
            var d;
            if (gap = "", indent = "", "number" == typeof c) for (d = 0; c > d; d += 1) indent += " "; else "string" == typeof c && (indent = c);
            if (rep = b, b && "function" != typeof b && ("object" != typeof b || "number" != typeof b.length)) throw new Error("JSON.stringify");
            return str("", {
                "": a
            });
        }, JSON.parse = function(text, reviver) {
            function walk(a, b) {
                var c, d, e = a[b];
                if (e && "object" == typeof e) for (c in e) Object.prototype.hasOwnProperty.call(e, c) && (d = walk(e, c), 
                void 0 !== d ? e[c] = d : delete e[c]);
                return reviver.call(a, b, e);
            }
            var j;
            if (text = String(text), cx.lastIndex = 0, cx.test(text) && (text = text.replace(cx, function(a) {
                return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            })), /^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) return j = eval("(" + text + ")"), 
            "function" == typeof reviver ? walk({
                "": j
            }, "") : j;
            throw new SyntaxError("JSON.parse");
        };
    }("undefined" != typeof io ? io : module.exports, "undefined" != typeof JSON ? JSON : void 0), 
    function(a, b) {
        var c = a.parser = {}, d = c.packets = [ "disconnect", "connect", "heartbeat", "message", "json", "event", "ack", "error", "noop" ], e = c.reasons = [ "transport not supported", "client not handshaken", "unauthorized" ], f = c.advice = [ "reconnect" ], g = b.JSON, h = b.util.indexOf;
        c.encodePacket = function(a) {
            var b = h(d, a.type), c = a.id || "", i = a.endpoint || "", j = a.ack, k = null;
            switch (a.type) {
              case "error":
                var l = a.reason ? h(e, a.reason) : "", m = a.advice ? h(f, a.advice) : "";
                ("" !== l || "" !== m) && (k = l + ("" !== m ? "+" + m : ""));
                break;

              case "message":
                "" !== a.data && (k = a.data);
                break;

              case "event":
                var n = {
                    name: a.name
                };
                a.args && a.args.length && (n.args = a.args), k = g.stringify(n);
                break;

              case "json":
                k = g.stringify(a.data);
                break;

              case "connect":
                a.qs && (k = a.qs);
                break;

              case "ack":
                k = a.ackId + (a.args && a.args.length ? "+" + g.stringify(a.args) : "");
            }
            var o = [ b, c + ("data" == j ? "+" : ""), i ];
            return null !== k && void 0 !== k && o.push(k), o.join(":");
        }, c.encodePayload = function(a) {
            var b = "";
            if (1 == a.length) return a[0];
            for (var c = 0, d = a.length; d > c; c++) {
                var e = a[c];
                b += "�" + e.length + "�" + a[c];
            }
            return b;
        };
        var i = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;
        c.decodePacket = function(a) {
            var b = a.match(i);
            if (!b) return {};
            var c = b[2] || "", a = b[5] || "", h = {
                type: d[b[1]],
                endpoint: b[4] || ""
            };
            switch (c && (h.id = c, h.ack = b[3] ? "data" : !0), h.type) {
              case "error":
                var b = a.split("+");
                h.reason = e[b[0]] || "", h.advice = f[b[1]] || "";
                break;

              case "message":
                h.data = a || "";
                break;

              case "event":
                try {
                    var j = g.parse(a);
                    h.name = j.name, h.args = j.args;
                } catch (k) {}
                h.args = h.args || [];
                break;

              case "json":
                try {
                    h.data = g.parse(a);
                } catch (k) {}
                break;

              case "connect":
                h.qs = a || "";
                break;

              case "ack":
                var b = a.match(/^([0-9]+)(\+)?(.*)/);
                if (b && (h.ackId = b[1], h.args = [], b[3])) try {
                    h.args = b[3] ? g.parse(b[3]) : [];
                } catch (k) {}
                break;

              case "disconnect":
              case "heartbeat":            }
            return h;
        }, c.decodePayload = function(a) {
            if ("�" == a.charAt(0)) {
                for (var b = [], d = 1, e = ""; d < a.length; d++) "�" == a.charAt(d) ? (b.push(c.decodePacket(a.substr(d + 1).substr(0, e))), 
                d += Number(e) + 1, e = "") : e += a.charAt(d);
                return b;
            }
            return [ c.decodePacket(a) ];
        };
    }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
    function(a, b) {
        function c(a, b) {
            this.socket = a, this.sessid = b;
        }
        a.Transport = c, b.util.mixin(c, b.EventEmitter), c.prototype.heartbeats = function() {
            return !0;
        }, c.prototype.onData = function(a) {
            if (this.clearCloseTimeout(), (this.socket.connected || this.socket.connecting || this.socket.reconnecting) && this.setCloseTimeout(), 
            "" !== a) {
                var c = b.parser.decodePayload(a);
                if (c && c.length) for (var d = 0, e = c.length; e > d; d++) this.onPacket(c[d]);
            }
            return this;
        }, c.prototype.onPacket = function(a) {
            return this.socket.setHeartbeatTimeout(), "heartbeat" == a.type ? this.onHeartbeat() : ("connect" == a.type && "" == a.endpoint && this.onConnect(), 
            "error" == a.type && "reconnect" == a.advice && (this.isOpen = !1), this.socket.onPacket(a), 
            this);
        }, c.prototype.setCloseTimeout = function() {
            if (!this.closeTimeout) {
                var a = this;
                this.closeTimeout = setTimeout(function() {
                    a.onDisconnect();
                }, this.socket.closeTimeout);
            }
        }, c.prototype.onDisconnect = function() {
            return this.isOpen && this.close(), this.clearTimeouts(), this.socket.onDisconnect(), 
            this;
        }, c.prototype.onConnect = function() {
            return this.socket.onConnect(), this;
        }, c.prototype.clearCloseTimeout = function() {
            this.closeTimeout && (clearTimeout(this.closeTimeout), this.closeTimeout = null);
        }, c.prototype.clearTimeouts = function() {
            this.clearCloseTimeout(), this.reopenTimeout && clearTimeout(this.reopenTimeout);
        }, c.prototype.packet = function(a) {
            this.send(b.parser.encodePacket(a));
        }, c.prototype.onHeartbeat = function() {
            this.packet({
                type: "heartbeat"
            });
        }, c.prototype.onOpen = function() {
            this.isOpen = !0, this.clearCloseTimeout(), this.socket.onOpen();
        }, c.prototype.onClose = function() {
            this.isOpen = !1, this.socket.onClose(), this.onDisconnect();
        }, c.prototype.prepareUrl = function() {
            var a = this.socket.options;
            return this.scheme() + "://" + a.host + ":" + a.port + "/" + a.resource + "/" + b.protocol + "/" + this.name + "/" + this.sessid;
        }, c.prototype.ready = function(a, b) {
            b.call(this);
        };
    }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
    function(a, b, c) {
        function d(a) {
            if (this.options = {
                port: 80,
                secure: !1,
                document: "document" in c ? document : !1,
                resource: "socket.io",
                transports: b.transports,
                "connect timeout": 1e4,
                "try multiple transports": !0,
                reconnect: !0,
                "reconnection delay": 500,
                "reconnection limit": 1 / 0,
                "reopen delay": 3e3,
                "max reconnection attempts": 10,
                "sync disconnect on unload": !1,
                "auto connect": !0,
                "flash policy port": 10843,
                manualFlush: !1
            }, b.util.merge(this.options, a), this.connected = !1, this.open = !1, this.connecting = !1, 
            this.reconnecting = !1, this.namespaces = {}, this.buffer = [], this.doBuffer = !1, 
            this.options["sync disconnect on unload"] && (!this.isXDomain() || b.util.ua.hasCORS)) {
                var d = this;
                b.util.on(c, "beforeunload", function() {
                    d.disconnectSync();
                }, !1);
            }
            this.options["auto connect"] && this.connect();
        }
        function e() {}
        a.Socket = d, b.util.mixin(d, b.EventEmitter), d.prototype.of = function(a) {
            return this.namespaces[a] || (this.namespaces[a] = new b.SocketNamespace(this, a), 
            "" !== a && this.namespaces[a].packet({
                type: "connect"
            })), this.namespaces[a];
        }, d.prototype.publish = function() {
            this.emit.apply(this, arguments);
            var a;
            for (var b in this.namespaces) this.namespaces.hasOwnProperty(b) && (a = this.of(b), 
            a.$emit.apply(a, arguments));
        }, d.prototype.handshake = function(a) {
            function c(b) {
                b instanceof Error ? (d.connecting = !1, d.onError(b.message)) : a.apply(null, b.split(":"));
            }
            var d = this, f = this.options, g = [ "http" + (f.secure ? "s" : "") + ":/", f.host + ":" + f.port, f.resource, b.protocol, b.util.query(this.options.query, "t=" + +new Date()) ].join("/");
            if (this.isXDomain() && !b.util.ua.hasCORS) {
                var h = document.getElementsByTagName("script")[0], i = document.createElement("script");
                i.src = g + "&jsonp=" + b.j.length, h.parentNode.insertBefore(i, h), b.j.push(function(a) {
                    c(a), i.parentNode.removeChild(i);
                });
            } else {
                var j = b.util.request();
                j.open("GET", g, !0), this.isXDomain() && (j.withCredentials = !0), j.onreadystatechange = function() {
                    4 == j.readyState && (j.onreadystatechange = e, 200 == j.status ? c(j.responseText) : 403 == j.status ? d.onError(j.responseText) : (d.connecting = !1, 
                    !d.reconnecting && d.onError(j.responseText)));
                }, j.send(null);
            }
        }, d.prototype.getTransport = function(a) {
            for (var c, d = a || this.transports, e = 0; c = d[e]; e++) if (b.Transport[c] && b.Transport[c].check(this) && (!this.isXDomain() || b.Transport[c].xdomainCheck(this))) return new b.Transport[c](this, this.sessionid);
            return null;
        }, d.prototype.connect = function(a) {
            if (this.connecting) return this;
            var c = this;
            return c.connecting = !0, this.handshake(function(d, e, f, g) {
                function h(a) {
                    return c.transport && c.transport.clearTimeouts(), c.transport = c.getTransport(a), 
                    c.transport ? [object Object]0 : c.publish("connect_failed");
                }
                c.sessionid = d, c.closeTimeout = 1e3 * f, c.heartbeatTimeout = 1e3 * e, c.transports || (c.transports = c.origTransports = g ? b.util.intersect(g.split(","), c.options.transports) : c.options.transports), 
                c.setHeartbeatTimeout(), h(c.transports), c.once("connect", function() {
                    clearTimeout(c.connectTimeoutTimer), a && "function" == typeof a && a();
                });
            }), this;
        }, d.prototype.setHeartbeatTimeout = function() {
            if (clearTimeout(this.heartbeatTimeoutTimer), !this.transport || this.transport.heartbeats()) {
                var a = this;
                this.heartbeatTimeoutTimer = setTimeout(function() {
                    a.transport.onClose();
                }, this.heartbeatTimeout);
            }
        }, d.prototype.packet = function(a) {
            return this.connected && !this.doBuffer ? this.transport.packet(a) : this.buffer.push(a), 
            this;
        }, d.prototype.setBuffer = function(a) {
            this.doBuffer = a, !a && this.connected && this.buffer.length && (this.options.manualFlush || this.flushBuffer());
        }, d.prototype.flushBuffer = function() {
            this.transport.payload(this.buffer), this.buffer = [];
        }, d.prototype.disconnect = function() {
            return (this.connected || this.connecting) && (this.open && this.of("").packet({
                type: "disconnect"
            }), this.onDisconnect("booted")), this;
        }, d.prototype.disconnectSync = function() {
            var a = b.util.request(), c = [ "http" + (this.options.secure ? "s" : "") + ":/", this.options.host + ":" + this.options.port, this.options.resource, b.protocol, "", this.sessionid ].join("/") + "/?disconnect=1";
            a.open("GET", c, !1), a.send(null), this.onDisconnect("booted");
        }, d.prototype.isXDomain = function() {
            var a = c.location.port || ("https:" == c.location.protocol ? 443 : 80);
            return this.options.host !== c.location.hostname || this.options.port != a;
        }, d.prototype.onConnect = function() {
            this.connected || (this.connected = !0, this.connecting = !1, this.doBuffer || this.setBuffer(!1), 
            this.emit("connect"));
        }, d.prototype.onOpen = function() {
            this.open = !0;
        }, d.prototype.onClose = function() {
            this.open = !1, clearTimeout(this.heartbeatTimeoutTimer);
        }, d.prototype.onPacket = function(a) {
            this.of(a.endpoint).onPacket(a);
        }, d.prototype.onError = function(a) {
            a && a.advice && "reconnect" === a.advice && (this.connected || this.connecting) && (this.disconnect(), 
            this.options.reconnect && this.reconnect()), this.publish("error", a && a.reason ? a.reason : a);
        }, d.prototype.onDisconnect = function(a) {
            var b = this.connected, c = this.connecting;
            this.connected = !1, this.connecting = !1, this.open = !1, (b || c) && (this.transport.close(), 
            this.transport.clearTimeouts(), b && (this.publish("disconnect", a), "booted" != a && this.options.reconnect && !this.reconnecting && this.reconnect()));
        }, d.prototype.reconnect = function() {
            function a() {
                if (c.connected) {
                    for (var a in c.namespaces) c.namespaces.hasOwnProperty(a) && "" !== a && c.namespaces[a].packet({
                        type: "connect"
                    });
                    c.publish("reconnect", c.transport.name, c.reconnectionAttempts);
                }
                clearTimeout(c.reconnectionTimer), c.removeListener("connect_failed", b), c.removeListener("connect", b), 
                c.reconnecting = !1, delete c.reconnectionAttempts, delete c.reconnectionDelay, 
                delete c.reconnectionTimer, delete c.redoTransports, c.options["try multiple transports"] = e;
            }
            function b() {
                return c.reconnecting ? c.connected ? a() : c.connecting && c.reconnecting ? c.reconnectionTimer = setTimeout(b, 1e3) : [object Object]0 : void 0;
            }
            this.reconnecting = !0, this.reconnectionAttempts = 0, this.reconnectionDelay = this.options["reconnection delay"];
            var c = this, d = this.options["max reconnection attempts"], e = this.options["try multiple transports"], f = this.options["reconnection limit"];
            this.options["try multiple transports"] = !1, this.reconnectionTimer = setTimeout(b, this.reconnectionDelay), 
            this.on("connect", b);
        };
    }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
    function(a, b) {
        function c(a, b) {
            this.socket = a, this.name = b || "", this.flags = {}, this.json = new d(this, "json"), 
            this.ackPackets = 0, this.acks = {};
        }
        function d(a, b) {
            this.namespace = a, this.name = b;
        }
        a.SocketNamespace = c, b.util.mixin(c, b.EventEmitter), c.prototype.$emit = b.EventEmitter.prototype.emit, 
        c.prototype.of = function() {
            return this.socket.of.apply(this.socket, arguments);
        }, c.prototype.packet = function(a) {
            return a.endpoint = this.name, this.socket.packet(a), this.flags = {}, this;
        }, c.prototype.send = function(a, b) {
            var c = {
                type: this.flags.json ? "json" : "message",
                data: a
            };
            return "function" == typeof b && (c.id = ++this.ackPackets, c.ack = !0, this.acks[c.id] = b), 
            this.packet(c);
        }, c.prototype.emit = function(a) {
            var b = Array.prototype.slice.call(arguments, 1), c = b[b.length - 1], d = {
                type: "event",
                name: a
            };
            return "function" == typeof c && (d.id = ++this.ackPackets, d.ack = "data", this.acks[d.id] = c, 
            b = b.slice(0, b.length - 1)), d.args = b, this.packet(d);
        }, c.prototype.disconnect = function() {
            return "" === this.name ? this.socket.disconnect() : (this.packet({
                type: "disconnect"
            }), this.$emit("disconnect")), this;
        }, c.prototype.onPacket = function(a) {
            function c() {
                d.packet({
                    type: "ack",
                    args: b.util.toArray(arguments),
                    ackId: a.id
                });
            }
            var d = this;
            switch (a.type) {
              case "connect":
                this.$emit("connect");
                break;

              case "disconnect":
                "" === this.name ? this.socket.onDisconnect(a.reason || "booted") : this.$emit("disconnect", a.reason);
                break;

              case "message":
              case "json":
                var e = [ "message", a.data ];
                "data" == a.ack ? e.push(c) : a.ack && this.packet({
                    type: "ack",
                    ackId: a.id
                }), this.$emit.apply(this, e);
                break;

              case "event":
                var e = [ a.name ].concat(a.args);
                "data" == a.ack && e.push(c), this.$emit.apply(this, e);
                break;

              case "ack":
                this.acks[a.ackId] && (this.acks[a.ackId].apply(this, a.args), delete this.acks[a.ackId]);
                break;

              case "error":
                a.advice ? this.socket.onError(a) : "unauthorized" == a.reason ? this.$emit("connect_failed", a.reason) : this.$emit("error", a.reason);
            }
        }, d.prototype.send = function() {
            this.namespace.flags[this.name] = !0, this.namespace.send.apply(this.namespace, arguments);
        }, d.prototype.emit = function() {
            this.namespace.flags[this.name] = !0, this.namespace.emit.apply(this.namespace, arguments);
        };
    }("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
    function(a, b, c) {
        function d() {
            b.Transport.apply(this, arguments);
        }
        a.websocket = d, b.util.inherit(d, b.Transport), d.prototype.name = "websocket", 
        d.prototype.open = function() {
            var a, d = b.util.query(this.socket.options.query), e = this;
            return a || (a = c.MozWebSocket || c.WebSocket), this.websocket = new a(this.prepareUrl() + d), 
            this.websocket.onopen = function() {
                e.onOpen(), e.socket.setBuffer(!1);
            }, this.websocket.onmessage = function(a) {
                e.onData(a.data);
            }, this.websocket.onclose = function() {
                e.onClose(), e.socket.setBuffer(!0);
            }, this.websocket.onerror = function(a) {
                e.onError(a);
            }, this;
        }, d.prototype.send = b.util.ua.iDevice ? function(a) {
            var b = this;
            return setTimeout(function() {
                b.websocket.send(a);
            }, 0), this;
        } : function(a) {
            return this.websocket.send(a), this;
        }, d.prototype.payload = function(a) {
            for (var b = 0, c = a.length; c > b; b++) this.packet(a[b]);
            return this;
        }, d.prototype.close = function() {
            return this.websocket.close(), this;
        }, d.prototype.onError = function(a) {
            this.socket.onError(a);
        }, d.prototype.scheme = function() {
            return this.socket.options.secure ? "wss" : "ws";
        }, d.check = function() {
            return "WebSocket" in c && !("__addTask" in WebSocket) || "MozWebSocket" in c;
        }, d.xdomainCheck = function() {
            return !0;
        }, b.transports.push("websocket");
    }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
    function(a, b, c) {
        function d(a) {
            a && (b.Transport.apply(this, arguments), this.sendBuffer = []);
        }
        function e() {}
        a.XHR = d, b.util.inherit(d, b.Transport), d.prototype.open = function() {
            return this.socket.setBuffer(!1), this.onOpen(), this.get(), this.setCloseTimeout(), 
            this;
        }, d.prototype.payload = function(a) {
            for (var c = [], d = 0, e = a.length; e > d; d++) c.push(b.parser.encodePacket(a[d]));
            this.send(b.parser.encodePayload(c));
        }, d.prototype.send = function(a) {
            return this.post(a), this;
        }, d.prototype.post = function(a) {
            function b() {
                4 == this.readyState && (this.onreadystatechange = e, f.posting = !1, 200 == this.status ? f.socket.setBuffer(!1) : f.onClose());
            }
            function d() {
                this.onload = e, f.socket.setBuffer(!1);
            }
            var f = this;
            this.socket.setBuffer(!0), this.sendXHR = this.request("POST"), c.XDomainRequest && this.sendXHR instanceof XDomainRequest ? this.sendXHR.onload = this.sendXHR.onerror = d : this.sendXHR.onreadystatechange = b, 
            this.sendXHR.send(a);
        }, d.prototype.close = function() {
            return this.onClose(), this;
        }, d.prototype.request = function(a) {
            var c = b.util.request(this.socket.isXDomain()), d = b.util.query(this.socket.options.query, "t=" + +new Date());
            if (c.open(a || "GET", this.prepareUrl() + d, !0), "POST" == a) try {
                c.setRequestHeader ? c.setRequestHeader("Content-type", "text/plain;charset=UTF-8") : c.contentType = "text/plain";
            } catch (e) {}
            return c;
        }, d.prototype.scheme = function() {
            return this.socket.options.secure ? "https" : "http";
        }, d.check = function(a, d) {
            try {
                var e = b.util.request(d), f = c.XDomainRequest && e instanceof XDomainRequest, g = a && a.options && a.options.secure ? "https:" : "http:", h = c.location && g != c.location.protocol;
                if (e && (!f || !h)) return !0;
            } catch (i) {}
            return !1;
        }, d.xdomainCheck = function(a) {
            return d.check(a, !0);
        };
    }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
    function(a, b) {
        function c() {
            b.Transport.XHR.apply(this, arguments);
        }
        a.htmlfile = c, b.util.inherit(c, b.Transport.XHR), c.prototype.name = "htmlfile", 
        c.prototype.get = function() {
            this.doc = new (window[[ "Active" ].concat("Object").join("X")])("htmlfile"), this.doc.open(), 
            this.doc.write("<html></html>"), this.doc.close(), this.doc.parentWindow.s = this;
            var a = this.doc.createElement("div");
            a.className = "socketio", this.doc.body.appendChild(a), this.iframe = this.doc.createElement("iframe"), 
            a.appendChild(this.iframe);
            var c = this, d = b.util.query(this.socket.options.query, "t=" + +new Date());
            this.iframe.src = this.prepareUrl() + d, b.util.on(window, "unload", function() {
                c.destroy();
            });
        }, c.prototype._ = function(a, b) {
            a = a.replace(/\\\//g, "/"), this.onData(a);
            try {
                var c = b.getElementsByTagName("script")[0];
                c.parentNode.removeChild(c);
            } catch (d) {}
        }, c.prototype.destroy = function() {
            if (this.iframe) {
                try {
                    this.iframe.src = "about:blank";
                } catch (a) {}
                this.doc = null, this.iframe.parentNode.removeChild(this.iframe), this.iframe = null, 
                CollectGarbage();
            }
        }, c.prototype.close = function() {
            return this.destroy(), b.Transport.XHR.prototype.close.call(this);
        }, c.check = function(a) {
            if ("undefined" != typeof window && [ "Active" ].concat("Object").join("X") in window) try {
                var c = new (window[[ "Active" ].concat("Object").join("X")])("htmlfile");
                return c && b.Transport.XHR.check(a);
            } catch (d) {}
            return !1;
        }, c.xdomainCheck = function() {
            return !1;
        }, b.transports.push("htmlfile");
    }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports), 
    function(a, b, c) {
        function d() {
            b.Transport.XHR.apply(this, arguments);
        }
        function e() {}
        a["xhr-polling"] = d, b.util.inherit(d, b.Transport.XHR), b.util.merge(d, b.Transport.XHR), 
        d.prototype.name = "xhr-polling", d.prototype.heartbeats = function() {
            return !1;
        }, d.prototype.open = function() {
            var a = this;
            return b.Transport.XHR.prototype.open.call(a), !1;
        }, d.prototype.get = function() {
            function a() {
                4 == this.readyState && (this.onreadystatechange = e, 200 == this.status ? (f.onData(this.responseText), 
                f.get()) : f.onClose());
            }
            function b() {
                this.onload = e, this.onerror = e, f.retryCounter = 1, f.onData(this.responseText), 
                f.get();
            }
            function d() {
                f.retryCounter++, !f.retryCounter || f.retryCounter > 3 ? f.onClose() : f.get();
            }
            if (this.isOpen) {
                var f = this;
                this.xhr = this.request(), c.XDomainRequest && this.xhr instanceof XDomainRequest ? (this.xhr.onload = b, 
                this.xhr.onerror = d) : this.xhr.onreadystatechange = a, this.xhr.send(null);
            }
        }, d.prototype.onClose = function() {
            if (b.Transport.XHR.prototype.onClose.call(this), this.xhr) {
                this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = e;
                try {
                    this.xhr.abort();
                } catch (a) {}
                this.xhr = null;
            }
        }, d.prototype.ready = function(a, c) {
            var d = this;
            b.util.defer(function() {
                c.call(d);
            });
        }, b.transports.push("xhr-polling");
    }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
    function(a, b, c) {
        function d() {
            b.Transport["xhr-polling"].apply(this, arguments), this.index = b.j.length;
            var a = this;
            b.j.push(function(b) {
                a._(b);
            });
        }
        var e = c.document && "MozAppearance" in c.document.documentElement.style;
        a["jsonp-polling"] = d, b.util.inherit(d, b.Transport["xhr-polling"]), d.prototype.name = "jsonp-polling", 
        d.prototype.post = function(a) {
            function c() {
                d(), e.socket.setBuffer(!1);
            }
            function d() {
                e.iframe && e.form.removeChild(e.iframe);
                try {
                    g = document.createElement('<iframe name="' + e.iframeId + '">');
                } catch (a) {
                    g = document.createElement("iframe"), g.name = e.iframeId;
                }
                g.id = e.iframeId, e.form.appendChild(g), e.iframe = g;
            }
            var e = this, f = b.util.query(this.socket.options.query, "t=" + +new Date() + "&i=" + this.index);
            if (!this.form) {
                var g, h = document.createElement("form"), i = document.createElement("textarea"), j = this.iframeId = "socketio_iframe_" + this.index;
                h.className = "socketio", h.style.position = "absolute", h.style.top = "0px", h.style.left = "0px", 
                h.style.display = "none", h.target = j, h.method = "POST", h.setAttribute("accept-charset", "utf-8"), 
                i.name = "d", h.appendChild(i), document.body.appendChild(h), this.form = h, this.area = i;
            }
            this.form.action = this.prepareUrl() + f, d(), this.area.value = b.JSON.stringify(a);
            try {
                this.form.submit();
            } catch (k) {}
            this.iframe.attachEvent ? g.onreadystatechange = function() {
                "complete" == e.iframe.readyState && c();
            } : this.iframe.onload = c, this.socket.setBuffer(!0);
        }, d.prototype.get = function() {
            var a = this, c = document.createElement("script"), d = b.util.query(this.socket.options.query, "t=" + +new Date() + "&i=" + this.index);
            this.script && (this.script.parentNode.removeChild(this.script), this.script = null), 
            c.async = !0, c.src = this.prepareUrl() + d, c.onerror = function() {
                a.onClose();
            };
            var f = document.getElementsByTagName("script")[0];
            f.parentNode.insertBefore(c, f), this.script = c, e && setTimeout(function() {
                var a = document.createElement("iframe");
                document.body.appendChild(a), document.body.removeChild(a);
            }, 100);
        }, d.prototype._ = function(a) {
            return this.onData(a), this.isOpen && this.get(), this;
        }, d.prototype.ready = function(a, c) {
            var d = this;
            return e ? [object Object]0 : c.call(this);
        }, d.check = function() {
            return "document" in c;
        }, d.xdomainCheck = function() {
            return !0;
        }, b.transports.push("jsonp-polling");
    }("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), 
    "function" == typeof define && define.amd && define([], function() {
        return io;
    });
}();
