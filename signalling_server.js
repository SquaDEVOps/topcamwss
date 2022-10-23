const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const webrtc = require("wrtc");
const app = express();
let senderStream;
let RTCPeerConfiguration = {
    username: "3e1a4ec9ff39a03d5093c5fffe230c35a0c9eea8a2b4e5b092f38b6c2784ddf2",
    iceServers: [
        {
            urls: "stun:stun2.1.google.com:19302"
        },
        { 
          url: "stun:global.stun.twilio.com:3478?transport=udp", 
          urls: "stun:global.stun.twilio.com:3478?transport=udp" 
        },
        {
            username: "3e1a4ec9ff39a03d5093c5fffe230c35a0c9eea8a2b4e5b092f38b6c2784ddf2",
            credential: "fuhYUA7fRk1ctcwASvYTZW9cDwdxRo1bk3Bsvg5Lyh8=",
            url: "turn:global.turn.twilio.com:3478?transport=udp",
            urls: "turn:global.turn.twilio.com:3478?transport=udp"
        },
        {
            url: "turn:global.turn.twilio.com:3478?transport=tcp",
            username: "3e1a4ec9ff39a03d5093c5fffe230c35a0c9eea8a2b4e5b092f38b6c2784ddf2",
            urls: "turn:global.turn.twilio.com:3478?transport=tcp",
            credential: "fuhYUA7fRk1ctcwASvYTZW9cDwdxRo1bk3Bsvg5Lyh8="
        },
        {
            url: "turn:global.turn.twilio.com:443?transport=tcp",
            username: "3e1a4ec9ff39a03d5093c5fffe230c35a0c9eea8a2b4e5b092f38b6c2784ddf2",
            urls: "turn:global.turn.twilio.com:443?transport=tcp",
            credential: "fuhYUA7fRk1ctcwASvYTZW9cDwdxRo1bk3Bsvg5Lyh8="
        },
    ],
    accountSid: "AC9fc49f2daca960549355aaf9dcda8f1a",
    ttl: "86400",
    password: "fuhYUA7fRk1ctcwASvYTZW9cDwdxRo1bk3Bsvg5Lyh8="
}

//CONFIGURATIONS CORS
app.use(cors());

app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Credentials", true);
    res.set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS, UPDATE");
    res.set("Access-Control-Allow-Headers", "Origin, X-Request-With, Content-type, Accept");

    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, './public')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')) });

app.post('/consumer', async ({ body }, res) => {
    const peer = new webrtc.RTCPeerConnection({
        RTCPeerConfiguration
    });
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

app.post('/broadcast', async ({ body }, res) => {
    const peer = new webrtc.RTCPeerConnection({
        RTCPeerConfiguration
    });
    peer.ontrack = (e) => handleTrackEvent(e, peer);
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

function handleTrackEvent(e, peer) {
    senderStream = e.streams[0];
};

const httpServer = http.createServer(app);

const wss = new WebSocket.Server({ server: httpServer }, () => {
    console.log("Signalling server is now listening");
});


wss.broadcast = (ws, data) => {
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

wss.on('connection', ws => {
    console.log(`Client connected. Total connected clients: ${wss.clients.size}`);

    ws.on('message', (data, isBinary) => {
        // msg = JSON.parse(message);
        const message = isBinary ? data : data.toString();
        console.log(message + "\n\n");
        wss.broadcast(ws, message);
    });
    ws.on('close', ws=> {
        console.log(`Client disconnected. Total connected clients: ${wss.clients.size}`);
    })

    ws.on('error', error => {
        console.log(`Client error. Total connected clients: ${wss.clients.size}`);
    });
});

const port = process.env.PORT || 3000;

httpServer.listen(port, () => console.log(`server running: ${port}`))