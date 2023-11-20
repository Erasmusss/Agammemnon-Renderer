import * as THREE from "three";

export class WS_Space{
    constructor(Three_Space){
        this._threespace = Three_Space;
        this._players = [];
        this._responses = {};

        this._ws = new WebSocket(`wss://${window.location.hostname}:${window.location.port}/main`);

        this.addResponse("Connection", (data) => {
            this.uuid = data.uuid;
            this._players = data.worldData.players;
            this.address = data.address;
            let time = Date.now();
            //set model
            let modelArray = ["BOX", "SPHERE"];
            let modelShape = modelArray[Math.round(Math.random())*(modelArray.length-1)];
            let modeldata = {
                code:200,
                uuid:this.uuid,
                pos: this._threespace._camera.position,
                quat: this._threespace._camera.rotation,
                model:modelShape,
                size:10,
                options: {
                    color:0x0006b1,
                    wireframe:false,
                },
                address: this.address,
                timestamp: time,
            }
            let res = {
                type:"ConnectionResponse",
                data: modeldata,
            }
            this._players.push(modeldata);
            return res;
        });

        this.addResponse("playerCreation", (data) => {
            this._players = data.worldData.players;
            this.playerRegistered = true;
            setInterval(() => {
                this.requestWorldData();
            }, 50);
            return null;
        });

        this.addResponse("worldDataResponse", (data) => {
            this._players = data.worldData.players;
            return null;
        });

        this.addResponse("playerDisconnect", (data) => {
            let puuid = data.uuid;
            this._threespace._scene.remove(this._threespace._scene.getObjectById(puuid));
            console.log(this._threespace._scene.getObjectById(puuid))
        });

        this._ws.onmessage = (message) => {
            message = message.data.toString();
            try{
                message = JSON.parse(message);
            }catch(err){
                console.error(`Error: message type was not parsable by JSON:`,message);
                let time = Date.now();
                this._ws.send(JSON.stringify({
                    type:"Error",
                    data:{
                        data:`Error: message type was not parsable by JSON: ${message}`,
                        timestamp: time,
                    }
                }));
            }
            if(message.type in this._responses){
                let res = this._responses[message.type](message.data);
                if(res == null || res == undefined)return;
                this._ws.send(JSON.stringify(res));
            }
        }
        //heartbeat
        this.addResponse("heartbeat", (data) => {
            let heartbeatres = {
                type:"heartbeat",
                data:{
                    data:{
                        heartbeat: true,
                    },
                    timestamp:Date.now(),
                }
            };
            return heartbeatres;
        });
    }
    addResponse(resType, func){
        this._responses[resType] = func;
    }
    requestWorldData(){
        let worldReq = {
            type: "worldDataRequest",
            data:{
                data:{
                    client:{
                        pos: this._threespace._camera.position,
                        quat: this._threespace._camera.rotation,
                        uuid: this.uuid,
                    }
                },
                timestamp:Date.now(),
            }
        };
        this._ws.send(JSON.stringify(worldReq));
    }
}
