var selfEasyrtcid = "";

function ezrtc_connect() {
    easyrtc.setRoomOccupantListener(convertListToButtons);

    console.log(my_d3ck)

    var ez_name = my_d3ck.owner.name

    if( !easyrtc.setUsername(ez_name)){
       console.log('bad user name: ' + ez_name);
    }

    easyrtc.easyApp("default", "self", ["caller"], loginSuccess, loginFailure);

 }


function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}


function convertListToButtons (roomName, data, isPrimary) {
    clearConnectList();
    var otherClientDiv = document.getElementById('otherClients');
    for(var easyrtcid in data) {
        var button = document.createElement('button');
        button.onclick = function(easyrtcid) {
            return function() {
                performCall(easyrtc.idToName(easyrtcid));
            };
        }(easyrtcid);

        var label = document.createTextNode(easyrtc.idToName(easyrtcid));
        button.appendChild(label);
        otherClientDiv.appendChild(button);
    }
}


function performCall(otherEasyrtcid) {
    easyrtc.hangupAll();

    var successCB = function() {};
    var failureCB = function() {};
    easyrtc.call(otherEasyrtcid, successCB, failureCB);
}


function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;
    // document.getElementById("iam").innerHTML = "I am " + easyrtc.cleanId(easyrtcid);
    document.getElementById("iam").innerHTML = "video-conf as " + easyrtc.cleanId(easyrtc.idToName(easyrtcid));
}


function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}

