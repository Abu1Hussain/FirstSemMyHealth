/*
 * WebRTC Telemedicine Module (WebSocket Implementation)
 * Handles browser-to-browser encrypted video routing via Node.js Signaling Server
 */
class TelemedicineSession {
  constructor(localVideoElement, remoteVideoElement, appointmentId, role) {
    this.localVideo = localVideoElement;
    this.remoteVideo = remoteVideoElement;
    this.appointmentId = appointmentId;
    this.role = role;
    
    this.peerConnection = null;
    this.localStream = null;
    this.ws = null;
    
    // Public STUN servers for NAT Traversal
    this.configuration = {
      'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]
    };
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localVideo.srcObject = this.localStream;
      console.log("Telemedicine: Local camera initiated.");
    } catch (error) {
      console.error("Telemedicine Error accessing media devices:", error);
      alert("Could not access camera/microphone. Please check browser permissions.");
    }
  }

  connectSignaling() {
    this.ws = new WebSocket('ws://localhost:8080');
    
    this.ws.onopen = () => {
      console.log("Connected to signaling server.");
      document.getElementById('call-status-text').innerText = "Waiting for peer...";
      this.ws.send(JSON.stringify({
        type: 'join',
        appointment_id: this.appointmentId,
        user_id: this.role
      }));
      this.startLocalStream();
    };

    this.ws.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      
      if (data.type === 'ready') {
        document.getElementById('call-status-text').innerText = "Peer joined. Connecting...";
        // The 'doctor' initiates the offer to avoid collision
        if (this.role === 'doctor') {
          this.startCall();
        }
      } else if (data.type === 'offer') {
        this.answerCall(data.offer);
      } else if (data.type === 'answer') {
        this.handleAnswer(data.answer);
      } else if (data.type === 'ice-candidate') {
        this.handleIceCandidate(data.candidate);
      } else if (data.type === 'peer-disconnected') {
        document.getElementById('call-status-text').innerText = "Peer disconnected.";
        this.remoteVideo.srcObject = null;
      } else if (data.type === 'end-call') {
        alert("The other party has ended the call.");
        document.getElementById('btn-end-call').click();
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      document.getElementById('call-status-text').innerText = "Signaling server offline. Did you run `node ws_server/server.js`?";
    };
  }

  setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);
    
    // Handle ICE Candidates
    this.peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
        this.ws.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    });

    // Handle incoming remote media streams
    this.peerConnection.addEventListener('track', async (event) => {
      const [remoteStream] = event.streams;
      this.remoteVideo.srcObject = remoteStream;
      document.getElementById('call-status-text').innerText = "Connected";
      console.log("Telemedicine: Remote video feed connected.");
    });

    // Add local tracks to outgoing connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  async startCall() {
    if (!this.localStream) await this.startLocalStream();
    this.setupPeerConnection();
    
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log("Telemedicine: Outgoing call initialized. Offer created.");
    
    this.ws.send(JSON.stringify({
      type: 'offer',
      offer: offer
    }));
  }

  async answerCall(offer) {
    if (!this.peerConnection) {
      if (!this.localStream) await this.startLocalStream();
      this.setupPeerConnection();
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log("Telemedicine: Call answered.");
    
    this.ws.send(JSON.stringify({
      type: 'answer',
      answer: answer
    }));
  }

  async handleAnswer(answer) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(candidate) {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Returns true if muted
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Returns true if video is off
      }
    }
    return false;
  }

  endCall() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end-call' }));
      this.ws.close();
    }
    if (this.peerConnection) this.peerConnection.close();
    if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());
    
    this.localVideo.srcObject = null;
    this.remoteVideo.srcObject = null;
    console.log("Telemedicine: Call ended.");
  }
}
