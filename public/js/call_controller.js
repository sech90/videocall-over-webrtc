var CallManager = new function() {

    var isInitiator = false;
    var isStarted = false;
    var localStream;
    var pc;
    var remoteStream;

    var $remoteVideo;
    var self = this;

    var constraints = {
        audio: true,
        video: true
    };

    var pc_config = {
        'iceServers': [
	        {url:'stun:stun01.sipphone.com'},
			{url:'stun:stun.ekiga.net'},
			{url:'stun:stun.fwdnet.net'},
			{url:'stun:stun.ideasip.com'},
			{url:'stun:stun.iptel.org'},
			{url:'stun:stun.rixtelecom.se'},
			{url:'stun:stun.schlund.de'},
			{url:'stun:stun.l.google.com:19302'},
			{url:'stun:stun1.l.google.com:19302'},
			{url:'stun:stun2.l.google.com:19302'},
			{url:'stun:stun3.l.google.com:19302'},
			{url:'stun:stun4.l.google.com:19302'},
			{url:'stun:stunserver.org'},
			{url:'stun:stun.softjoys.com'},
			{url:'stun:stun.voiparound.com'},
			{url:'stun:stun.voipbuster.com'},
			{url:'stun:stun.voipstunt.com'},
			{url:'stun:stun.voxgratia.org'},
			{url:'stun:stun.xten.com'},
			{
				url: 'turn:numb.viagenie.ca',
				credential: 'muazkh',
				username: 'webrtc@live.com'
			},
			{
				url: 'turn:192.158.29.39:3478?transport=udp',
				credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
				username: '28224511:1379330808'
			},
			{
				url: 'turn:192.158.29.39:3478?transport=tcp',
				credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
				username: '28224511:1379330808'
			}
		]
    };

    // Set up audio and video regardless of what devices are present.
    var sdpConstraints = {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
    };


    this.SendMessage = function(message) {
        SocketManager.Send(message);
    }

    this.HandleMessage = function(message) {

       if (message.type === 'offer') {

            if (!isInitiator && !isStarted)
                startCommunication();

            pc.setRemoteDescription(new RTCSessionDescription(message));
            doAnswer();
        } 
        else if (message.type === 'answer' && isStarted) {
            pc.setRemoteDescription(new RTCSessionDescription(message));
        } 
        else if (message.type === 'candidate' && isStarted) {
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: message.label,
                candidate: message.candidate
            });
            pc.addIceCandidate(candidate);
        }
    }

    this.Initialize = function() {
	    $remoteVideo = $('#remoteVideo');
	    
        getUserMedia(constraints, handleUserMedia, handleUserMediaError);
    }

    this.StartCall = function(initiator){
    	isInitiator = initiator;
        if (isInitiator)
            startCommunication();
    }

    this.Hang = function() {
        if(isStarted){
            isStarted = false;
            $remoteVideo[0].pause();
            pc.close();
            pc = null;
        }
    }

    this.CloseStream = function(){
    	if(localStream)
    		localStream.stop();
    }

    function handleUserMedia(stream) {
    	
        localStream = stream;
        window.stream = localStream;
        
    }

    function handleUserMediaError(error) {
        log('getUserMedia error: '+ json(error));
    }

    function startCommunication() {
        if (!isStarted && typeof localStream != 'undefined') {
            createPeerConnection();
            pc.addStream(localStream);
            isStarted = true;

            if (isInitiator) {
                doCall();
            }
        }
    }

    function createPeerConnection() {
        try {
            pc = new RTCPeerConnection(pc_config);
            pc.onicecandidate = handleIceCandidate;
            pc.onaddstream = handleRemoteStreamAdded;
            pc.onremovestream = handleRemoteStreamRemoved;

        } catch (e) {
            log('Failed to create PeerConnection, exception: ' + e.message);
            alert('Cannot create RTCPeerConnection object.');
            return;
        }
    }

    function handleIceCandidate(event) {

        if (event.candidate) {
            self.SendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });
        } else {
            log('End of candidates.');
        }
    }

    function handleRemoteStreamAdded(event) {
        $remoteVideo.attr("src", window.URL.createObjectURL(event.stream));
        $remoteVideo[0].play();
        remoteStream = event.stream;
        log('Remote stream added.');
    }

    function handleCreateOfferError(event) {
        log('createOffer() error: '+json(e));
    }

    function doCall() {
        log('Sending offer to peer');
        pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    }

    function doAnswer() {
        log('Sending answer to peer.');
        pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
    }

    function setLocalAndSendMessage(sessionDescription) {
        // Set Opus as the preferred codec in SDP if Opus is present.
        sessionDescription.sdp = preferOpus(sessionDescription.sdp);
        pc.setLocalDescription(sessionDescription);
        self.SendMessage(sessionDescription);
    }

    function handleRemoteStreamRemoved(event) {
        console.log('Remote stream removed. Event: ' +json(event));
    }


    // Set Opus as the default audio codec if it's present.
    function preferOpus(sdp) {
        var sdpLines = sdp.split('\r\n');
        var mLineIndex;
        // Search for m line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('m=audio') !== -1) {
                mLineIndex = i;
                break;
            }
        }
        if (mLineIndex === null) {
            return sdp;
        }

        // If Opus is available, set it as the default in m line.
        for (i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('opus/48000') !== -1) {
                var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
                if (opusPayload) {
                    sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
                }
                break;
            }
        }

        // Remove CN in m line and sdp.
        //sdpLines = removeCN(sdpLines, mLineIndex);

        sdp = sdpLines.join('\r\n');
        return sdp;
    }

    function extractSdp(sdpLine, pattern) {
        var result = sdpLine.match(pattern);
        return result && result.length === 2 ? result[1] : null;
    }

    // Set the selected codec to the first in m line.
    function setDefaultCodec(mLine, payload) {
        var elements = mLine.split(' ');
        var newLine = [];
        var index = 0;
        for (var i = 0; i < elements.length; i++) {
            if (index === 3) { // Format of media starts from the fourth.
                newLine[index++] = payload; // Put target payload to the first.
            }
            if (elements[i] !== payload) {
                newLine[index++] = elements[i];
            }
        }
        return newLine.join(' ');
    }

    // Strip CN from sdp before CN constraints is ready.
    function removeCN(sdpLines, mLineIndex) {
        var mLineElements = sdpLines[mLineIndex].split(' ');
        // Scan from end for the convenience of removing an item.
        for (var i = sdpLines.length - 1; i >= 0; i--) {
            var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
            if (payload) {
                var cnPos = mLineElements.indexOf(payload);
                if (cnPos !== -1) {
                    // Remove CN payload from m line.
                    mLineElements.splice(cnPos, 1);
                }
                // Remove CN line in sdp
                sdpLines.splice(i, 1);
            }
        }

        sdpLines[mLineIndex] = mLineElements.join(' ');
        return sdpLines;
    }
}