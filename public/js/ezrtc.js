
// from http://www.easyrtc.com/docs/guides/easyrtc_client_tutorial.html

function ezrtc_init() {
    console.log('EZ initializing...')

    easyrtc.setRoomOccupantListener(roomListener);

    var connectSuccess = function(myId) {
        console.log("My easyrtcid is " + myId);
    }

    var connectFailure = function(errmesg) {
        console.log('failzor')
        console.log(errmesg);
    }
    easyrtc.initMediaSource(
          function(){       // success callback
              console.log("YEEHAH!")
              var selfVideo = document.getElementById("d3ck_vid");
              easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
              easyrtc.connect("default", connectSuccess, connectFailure);

              ez_join()

          },
          function(err) {
            console.log('failzor on ez-connect')
            console.log(err)
          }
    );

}

easyrtc.setStreamAcceptor( function(callerEasyrtcid, stream) {
    var video = document.getElementById('remote_vid');
    easyrtc.setVideoObjectSrc(video, stream);
});

easyrtc.setOnStreamClosed( function (callerEasyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('remote_vid'), "");
});




function roomListener(roomName, otherPeers) {
        console.log('logging in...')

        var otherClientDiv = document.getElementById('otherClients');
        while (otherClientDiv.hasChildNodes()) {
            otherClientDiv.removeChild(otherClientDiv.lastChild);
        }
        for(var i in otherPeers) {
            var button = document.createElement('button');
            button.onclick = function(easyrtcid) {
                return function() {
                    performCall(easyrtcid);
                }
            }(i);

            label = document.createTextNode(i);
            button.appendChild(label);
            otherClientDiv.appendChild(button);
        }
}

function performCall(easyrtcid) {
        easyrtc.call(
           easyrtcid,
           function(easyrtcid) { console.log("completed call to " + easyrtcid);},
           function(errorCode, errorText) { console.log("err:" + errorText);},
           function(accepted, bywho) {
              console.log((accepted?"accepted":"rejected")+ " by " + bywho);
           }
       );
}


function ez_join () {

    console.log('joining.... default room....')

    easyrtc.joinRoom("ballroom", null,
        function(roomName) {
            console.log("in room " + roomName);
        },
        function(errorCode, errorText, roomName) {
            console.log("sigh... problems joining " + roomName);
        }
    );

}

