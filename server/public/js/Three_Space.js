import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export class ThreeSpace {
    constructor(){
        this._init();
    }
    _init(){
        this._models = {};

        this._threejs = new THREE.WebGLRenderer({
            antialias:true,
            alpha:true,
        });

        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        this._terrain = new THREE.Group();
        this._terrain.name = "TERRAIN";

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 0.1;
        const far = 2000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 20, 0);
        this._camera.name = "CAMERA";

        this._scene = new THREE.Scene();

        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(20, 100, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._terrain.add(light);

        light = new THREE.AmbientLight(0x101010);
        this._terrain.add(light);

        this._controls = new PointerLockControls(this._camera, document.body);
        document.addEventListener( 'click', () => this._controls.lock());
        this._scene.add(this._controls.getObject());

        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            'posx.jpg',
            'negx.jpg',
            'posy.jpg',
            'negy.jpg',
            'posz.jpg',
            'negz.jpg',
        ]);
        this._scene.background = texture; //change

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(500, 500, 100, 100),
            new THREE.MeshStandardMaterial({
            color: 0x818589,
            metalness:1.0,
            side: THREE.DoubleSide,
        }));
        plane.name = "TERRAIN_PLANE";
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._terrain.add(plane);

        //movement controls
        this.pjump = true;
        this._pdirection = new THREE.Vector3();
        this._pvelocity = new THREE.Vector3(0,0,0);
        this._prevTime = performance.now();
        this._keys = {}
        const onKeyDown = (event) => {

            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                   this._keys['w'] = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                   this._keys['a'] = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                   this._keys['s'] = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                   this._keys['d'] = true;
                    break;
                case 'Space':
                case ' ':
                    this._keys[' '] = true;
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch ( event.code ) {
                case 'ArrowUp':
                case 'KeyW':
                   this._keys['w'] = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                   this._keys['a'] = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                   this._keys['s'] = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                   this._keys['d'] = false;
                    break;
                case 'Space':
                case ' ':
                    this._keys[' '] = false;
                    break;
            }
        };
        document.addEventListener( 'keydown', onKeyDown );
        document.addEventListener( 'keyup', onKeyUp );

        //adding models

        this.addModel("BOX", (data) => {
            let options = data.options;
            let boxGeo = new THREE.BoxGeometry(data.size, data.size, data.size);
            let boxMat = new THREE.MeshStandardMaterial({ color:options.color, wireframe: options.wireframe});
            boxMat.side = THREE.DoubleSide;
            let boxMesh = new THREE.Mesh(boxGeo, boxMat);
            boxMesh.position.set(data.pos.x, data.pos.y, data.pos.z);
            boxMesh.rotation.set(data.quat._x, data.quat._y, data.quat._z, data.quat._order);
            boxMesh.uuid = data.uuid;
            boxMesh.name = `User at ${data.address}`;
            if(boxMesh.uuid == this._WS_Space.uuid)boxMesh.visible = false;
            return boxMesh;
        });

        this.addModel("SPHERE", (data) => {
            let options = data.options;
            let modelGeo = new THREE.SphereGeometry(data.size, 100, 100);
            let modelMat = new THREE.MeshStandardMaterial({ color:options.color, wireframe: options.wireframe});
            modelMat.side = THREE.DoubleSide;
            let matMesh = new THREE.Mesh(modelGeo, modelMat);
            matMesh.position.set(data.pos.x, data.pos.y, data.pos.z);
            matMesh.rotation.set(data.quat._x, data.quat._y, data.quat._z, data.quat._order);
            matMesh.uuid = data.uuid;
            matMesh.name = `User at ${data.address}`;
            if(matMesh.uuid == this._WS_Space.uuid)matMesh.visible = false;
            return matMesh;
        });

        this._terrain.visible = true;

        this._scene.add(this._terrain);

        //RAF
        this._RAF();
    }

    _OnWindowResize(){
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF(){
        requestAnimationFrame(() => {
            const time = performance.now();
            if(this._controls.isLocked === true){
                const delta = (time - this._prevTime) / 1000;
                this._pvelocity.x -= this._pvelocity.x * 10.0 * delta;
				this._pvelocity.z -= this._pvelocity.z * 10.0 * delta;
                this._pdirection.z = (this._keys['w']==true ? 1 : 0) - (this._keys['s']==true ? 1 : 0);
				this._pdirection.x = (this._keys['d']==true ? 1 : 0) - (this._keys['a']==true ? 1 : 0);
				this._pdirection.normalize();
                this.groundplane = this._terrain.getObjectByName("TERRAIN_PLANE");
                if(this._camera.position.y >= this.groundplane.position.y){
                    if(this._keys[' '] && this.pjump){
                        this._pvelocity.y += 30;
                        this.pjump = false;
                    }else if(this._camera.position.y <= this.groundplane.position.y+3){
                        this._pvelocity.y = 0;
                        this.pjump = true;
                    }else if(this._camera.position.y > this.groundplane.position.y+3){
                        this._pvelocity.y -= 3;
                    }
                }
                if(this._keys['w'] || this._keys['s']) this._pvelocity.z -= this._pdirection.z * 10.0 * delta;
				if(this._keys['a'] || this._keys['d']) this._pvelocity.x -= this._pdirection.x * 10.0 * delta;
                this._controls.moveForward(this._pvelocity.z * -0.1);
                this._camera.position.y += this._pvelocity.y * 0.1;
                this._controls.moveRight(this._pvelocity.x * -0.1);
            }
            this._prevTime = time;

            this.updateSpace(this._WS_Space._players);

            this._threejs.render(this._scene, this._camera);

            this._RAF();
        });
    }
    addModel(type, func){
        this._models[type] = func; //returns a mesh
    }
    updateSpace(objects){
        let sceneChildrenIds = this._scene.children.map(obj => obj.uuid);
        objects.forEach(object => {
            if(sceneChildrenIds.includes(object.uuid)){
                //update position only
                let objectMain = this._scene.children.filter(obj => {
                    return obj.uuid == object.uuid;
                })[0];
                objectMain.position.set(object.pos.x, object.pos.y, object.pos.z);
                objectMain.rotation.set(object.quat._x, object.quat._y, object.quat._z, object.quat._order);
                //potentially add more physics stuff
            }else{
                //create new object
                let mesh = this._models[object.model](object);
                mesh.castShadow = true;
                this._scene.add(mesh);
            }
        });
    }
    addWS_Space(WS_Space){
        this._WS_Space = WS_Space;
    }
}
