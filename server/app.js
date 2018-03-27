const http = require('http');
const express = require('express');
const socketLib = require('socket.io');

const socketHandler = require('./socketHandler.js');
const router = require('./router.js');

const port = process.env.port || process.env.NODE_PORT || 3000;

const app = express();

router.attach(app);

const server = http.createServer(app);
const io = socketLib(server);

socketHandler.init(io);

server.listen(port);

