const express = require('express');
const WsServer = require('./models/WsServer');
const path = require("path");
const favicon = require("serve-favicon");

const app = express();

let wss = new WsServer(app);

app.use(express.static(`server/public`));

app.use(favicon(`${__dirname}/public/assets/images/xperion.ico`));

app.get('/negx.jpg', (req,res) => res.sendFile(`public/assets/images/skybox/negx.jpg`, {root:__dirname}));
app.get('/negy.jpg', (req,res) => res.sendFile(`public/assets/images/skybox/negy.jpg`, {root:__dirname}));
app.get('/negz.jpg', (req,res) => res.sendFile(`public/assets/images/skybox/negz.jpg`, {root:__dirname}));
app.get('/posx.jpg', (req,res) => res.sendFile(`public/assets/images/skybox/posx.jpg`, {root:__dirname}));
app.get('/posy.jpg', (req,res) => res.sendFile(`public/assets/images/skybox/posy.jpg`, {root:__dirname}));
app.get('/posz.jpg', (req,res) => res.sendFile(`public/assets/images/skybox/posz.jpg`, {root:__dirname}));

app.get('/main', (req, res) => {
    res.sendFile(`${__dirname}/public/html/main.html`);
});

wss.init();

wss.addResponse("Test", (data) => {
    console.log(data);
});
