const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const { initializeSocket } = require('./soketHandler');

const app = express();
const server = http.createServer(app); 

// Khoi tao socket.io
const io = initializeSocket(server);

app.use(cors());