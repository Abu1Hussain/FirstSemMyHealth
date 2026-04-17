/*
 * WebRTC Telemedicine Module
 * Handles browser-to-browser encrypted video routing
 */
class TelemedicineSession {
    constructor(localVideoElement, remoteVideoElement) {
        this.localVideo = localVideoElement;
        this.remoteVideo = remoteVideoElement;
        this.peerConnection = null;
        this.localStream = null;
        
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
            if (typeof Swal !== 'undefined') { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Camera/Mic access denied', text: 'Please check browser permissions.', showConfirmButton: false, timer: 4000 }); } else { alert("Could not access camera/microphone."); }
        }
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Handle ICE Candidates
        this.peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                this.mockSendSignalingMessage({'iceCandidate': event.candidate});
            }
        });

        // Handle incoming remote media streams
        this.peerConnection.addEventListener('track', async (event) => {
            const [remoteStream] = event.streams;
            this.remoteVideo.srcObject = remoteStream;
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
        
        this.mockSendSignalingMessage({'offer': offer});
        
        // Simulate connection established for UI demo purposes
        setTimeout(() => {
            document.getElementById('call-status-text').innerText = "Ringing...";
        }, 1000);
    }

    async answerCall(offer) {
        if (!this.localStream) await this.startLocalStream();
        this.setupPeerConnection();

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        console.log("Telemedicine: Call answered.");
        
        this.mockSendSignalingMessage({'answer': answer});
    }

    // Mock signaling system placeholder until WebSockets (Pusher) are attached
    mockSendSignalingMessage(message) {
        console.warn("Telemedicine Sandbox: Message dispatched to signaling server:", message);
    }

    endCall() {
        if (this.peerConnection) this.peerConnection.close();
        if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());
        this.localVideo.srcObject = null;
        this.remoteVideo.srcObject = null;
        console.log("Telemedicine: Call forcibly ended.");
    }
}

// Global hooks for HTML elements
window.initTelemedicine = function() {
    const modal = document.getElementById('telemed-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('call-status-text').innerText = "Ready to dial.";
        const localVid = document.getElementById('local-video');
        const remoteVid = document.getElementById('remote-video');
        window.telemedSession = new TelemedicineSession(localVid, remoteVid);
        window.telemedSession.startLocalStream();
    } else {
        if (typeof Swal !== 'undefined') { Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Telemedicine not available on this page', showConfirmButton: false, timer: 2500 }); } else { alert("Telemedicine UI is not present on this page."); }
    }
}

window.endTelemedicine = function() {
    if(window.telemedSession) window.telemedSession.endCall();
    const modal = document.getElementById('telemed-modal');
    if (modal) modal.classList.add('hidden');
}
