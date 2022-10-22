const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');


const app = express();

app.use(express.static(path.join(__dirname, './public')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')) });

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

    ws.on('message', message => {
        // msg = JSON.parse(message);
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