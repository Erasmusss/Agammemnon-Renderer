const WebSocket = require('ws');
const http = require('http');
const uuid = require('uuid');

module.exports = class WsServer{
    constructor(app){
        this._httpServer = http.createServer(app);
        let server = this._httpServer;
        this._wss = new WebSocket.Server({ server });

        this._data = {
            players:[]
        };

        this._address = server.address();

        this._messageResponses = {};

        this._wss.on("connection", (ws) => {
            console.log(`Connected to ${ws._socket.remoteAddress}`);

            //hearbeat
            ws.heartbeat = setInterval(()=>{
                ws.send(JSON.stringify({
                    type:"heartbeat",
                    data:{
                        data:{
                            players:this._data.players,
                        },
                        timestamp: Date.now()
                    }
                }));
                if((Date.now()-ws.latestPing) >= 1000){
                    this._data.players = this._data.players.filter( player => {
                        return player.uuid !== ws.uuid;
                    });
                    console.log(`Disconnected from ${ws._socket.remoteAddress} with id ${ws.uuid}.`);
                    clearInterval(ws.heartbeat);
                    this._wss.clients.forEach(client => {
                        let disconnectRes = {
                            type:"playerDisconnect",
                            data:{
                                uuid: ws.uuid,
                                timestamp:Date.now(),
                            }
                        }
                        client.send(JSON.stringify(disconnectRes));
                    });
                }
            }, 100);

            let pUuid = uuid.v4();
            let time = Date.now();
            let connectionAssignment = {
                type:"Connection",
                data:{
                    address: ws._socket.remoteAddress,
                    uuid: pUuid,
                    worldData: this._data,
                    timestamp: time
                }
            }
            ws.send(JSON.stringify(connectionAssignment));

        //add responses
            this.addResponse("ConnectionResponse", (ws, data) => {
                this._data.players.push(data);
                ws.uuid = data.uuid;
                let playerCreationRes = {
                    type: "playerCreation",
                    data:{
                        worldData:{
                            players: this._data.players,
                        },
                        clientPlayer: data,
                    }
                };
                return playerCreationRes;
            });

            this.addResponse("heartbeat", (ws, data) => {
                ws.latestPing = Date.now();
                return null;
            });

            this.addResponse("worldDataRequest", (ws, data) => {
                let playerU;
                let playerUIndex;
                this._data.players.forEach(player => {
                    if(player.uuid==data.data.client.uuid){
                        playerU=player;
                        playerUIndex = this._data.players.indexOf(playerU);
                    };
                });
                playerU.pos = data.data.client.pos;
                playerU.quat = data.data.client.quat;
                this._data.players[playerUIndex] = playerU;
                let worldDataRes = {
                    type: "worldDataResponse",
                    data:{
                        worldData:{
                            players: this._data.players
                        },
                        timestamp: Date.now()
                    }
                }
                return worldDataRes;
            });

        //message handling
            ws.on("message", (wsData) => {
                let message = wsData.toString();
                message = JSON.parse(message);

                try{
                    if(message.type in this._messageResponses){
                        let res = this._messageResponses[message.type](ws, message.data);
                        if(res == null || res == undefined)return;
                        ws.send(JSON.stringify(res));
                    }else{
                        console.log(`Unknown Message Type: "${message.type}"`);
                    }
                }catch(err){
                    console.error(`${err.name}: message type was not parsable by JSON:`, JSON.stringify(message));
                    let time = Date.now();
                    ws.send(JSON.stringify({
                        type:"Error",
                        data:{
                            data:`Error: message type was not parsable by JSON: ${message}`,
                            timestamp: time,
                        }
                    }));
                }
            });
        });

    }
    addResponse(restype, func){
        this._messageResponses[restype] = func;
    }
    init(){
        this._httpServer.listen(process.env.PORT || 3000, () => {
            console.log(`Agammemnon serving on port ${this._httpServer.address().port}`);
        });
    }
}
