// Olympus Highway yarış oyunu (Three.js)
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🏎️ OLYMPUS HIGHWAY (SAFARİ & PERFORMANS MOTORU)
// ==========================================

// Safari Uyumlu Ses Tanımlamaları (HTML'den çekilir)
const bgMusic = document.getElementById('racer-bg-audio');
if (bgMusic) bgMusic.volume = 0.15; 

const engineSound = document.getElementById('racer-engine-audio');
if (engineSound) engineSound.volume = 0; 

let isMusicOn = localStorage.getItem('racer_music') !== 'false';
let isEngineOn = localStorage.getItem('racer_engine') !== 'false';

let racerScene, racerCamera, racerRenderer;
let playerCar = null;
let roadTexture, barrierTexture;
let racerAnimationId;
let gameSpeed = 0.0; 
let carSpeed = 0; 
let racerScore = 0;
let isRacerPlaying = false;

const racerInput = { left: false, right: false, gas: false, brake: false };
let controlMode = 'touch'; 
let gyroTilt = 0;

window.activeGameCarType = '';
window.baseCarRotationY = 0;
window.currentSteer = 0; 
window.trafficCars = [];
window.trafficSpawnTimer = 0;

const carPhysics = {
    megane: { maxSpeed: 3.5, accel: 0.005, brake: 0.015, friction: 0.003, handling: 0.08 },
    bmw: { maxSpeed: 4.3, accel: 0.009, brake: 0.025, friction: 0.004, handling: 0.12 }
};

window.toggleRacerMusic = function() {
    isMusicOn = !isMusicOn;
    localStorage.setItem('racer_music', isMusicOn);
    document.getElementById('btn-toggle-music').innerText = isMusicOn ? "Müzik: AÇIK" : "Müzik: KAPALI";
    if(isMusicOn && isRacerPlaying && bgMusic) bgMusic.play().catch(e=>{});
    else if(bgMusic) bgMusic.pause();
};

window.toggleRacerEngineSound = function() {
    isEngineOn = !isEngineOn;
    localStorage.setItem('racer_engine', isEngineOn);
    document.getElementById('btn-toggle-engine').innerText = isEngineOn ? "Motor: AÇIK" : "Motor: KAPALI";
    if(!isEngineOn && engineSound) { engineSound.volume = 0; engineSound.pause(); }
};

async function lockLandscape() {
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (e) { }
}

async function unlockLandscape() {
    try {
        if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen();
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch (e) {}
}

window.openOlympusRacer = function() {
    const racerScreen = document.getElementById('racer-screen');
    racerScreen.classList.remove('hidden');
    racerScreen.style.display = 'flex';
    
    document.getElementById('racer-splash').style.display = 'flex';
    document.getElementById('racer-splash').style.opacity = '1';
    document.getElementById('racer-select-screen').style.display = 'none';
    document.getElementById('racer-game-screen').style.display = 'none';
    
    lockLandscape();
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

    setTimeout(() => {
        document.getElementById('racer-splash').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('racer-splash').style.display = 'none';
            document.getElementById('racer-select-screen').style.display = 'flex';
        }, 500);
    }, 2000);
};

window.quitRacerGame = function() {
    isRacerPlaying = false;
    cancelAnimationFrame(racerAnimationId);
    
    if(bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    if(engineSound) { engineSound.pause(); engineSound.volume = 0; }
    
    document.getElementById('racer-3d-container').innerHTML = '';
    const racerScreen = document.getElementById('racer-screen');
    racerScreen.classList.add('hidden');
    racerScreen.style.display = 'none';
    document.getElementById('racer-settings-modal').style.display = 'none';
    document.getElementById('racer-crash-modal').style.display = 'none';
    
    if(controlMode === 'gyro') window.removeEventListener('deviceorientation', handleGyro);
    unlockLandscape();
};

window.startRacerEngine = function(carType) {
    // Three.js + yükleyiciler sadece yarış başlarken indirilir (açılışı hızlandırır)
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
        loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
            .then(() => Promise.all([
                loadExternalScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'),
                loadExternalScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js')
            ]))
            .then(() => startRacerEngine(carType))
            .catch(() => alert('3D motor yüklenemedi. İnternet bağlantını kontrol et.'));
        return;
    }
    if (navigator.vibrate) navigator.vibrate(50);
    document.getElementById('racer-select-screen').style.display = 'none';
    document.getElementById('racer-game-screen').style.display = 'block';
    document.getElementById('racer-settings-modal').style.display = 'none';

    document.getElementById('btn-toggle-music').innerText = isMusicOn ? "Müzik: AÇIK" : "Müzik: KAPALI";
    document.getElementById('btn-toggle-engine').innerText = isEngineOn ? "Motor: AÇIK" : "Motor: KAPALI";

    // Safari ses politikasını aşmak için kullanıcı butona bastığı an sesi sessizce başlatıyoruz
    if(isMusicOn && bgMusic) bgMusic.play().catch(e=>{});
    if(isEngineOn && engineSound) { engineSound.volume = 0; engineSound.play().catch(e=>{}); }

    let glbFile = carType === 'megane' ? 'megane.glb' : 'bmw_g20.glb';
    initThreeJSGame(glbFile, carType);
};

window.pauseRacerGame = function() {
    isRacerPlaying = false; 
    if(bgMusic) bgMusic.pause();
    if(engineSound) engineSound.pause();
    document.getElementById('racer-settings-modal').style.display = 'flex';
};

window.resumeRacerGame = function() {
    isRacerPlaying = true; 
    if(isMusicOn && bgMusic) bgMusic.play();
    document.getElementById('racer-settings-modal').style.display = 'none';
    gameLoop(); 
};

window.backToRacerSelection = function() {
    isRacerPlaying = false;
    cancelAnimationFrame(racerAnimationId);
    if(bgMusic) bgMusic.pause();
    if(engineSound) engineSound.pause();
    document.getElementById('racer-3d-container').innerHTML = ''; 
    document.getElementById('racer-settings-modal').style.display = 'none';
    document.getElementById('racer-game-screen').style.display = 'none';
    document.getElementById('racer-select-screen').style.display = 'flex';
};

window.toggleRacerControls = function() {
    controlMode = controlMode === 'touch' ? 'gyro' : 'touch';
    document.getElementById('btn-control-toggle').innerText = controlMode === 'touch' ? "🎮 Kontrol: Tuşlar" : "📱 Kontrol: Jiroskop";
    
    const steerCtrl = document.getElementById('racer-steer-controls');
    const brakeBtn = document.getElementById('racer-btn-brake');

    if (controlMode === 'gyro') {
        steerCtrl.style.display = 'none'; 
        brakeBtn.style.right = 'auto';    
        brakeBtn.style.left = '30px';     
        
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(response => {
                if (response === 'granted') window.addEventListener('deviceorientation', handleGyro);
            }).catch(e=>{});
        } else {
            window.addEventListener('deviceorientation', handleGyro);
        }
    } else {
        steerCtrl.style.display = 'flex'; 
        brakeBtn.style.left = 'auto';     
        brakeBtn.style.right = '130px';   
        
        window.removeEventListener('deviceorientation', handleGyro);
        gyroTilt = 0;
    }
};

function handleGyro(event) {
    let tilt = event.beta; 
    if (Math.abs(tilt) < 5) {
        gyroTilt = 0;
    } else {
        if(tilt > 45) tilt = 45;
        if(tilt < -45) tilt = -45;
        gyroTilt = (tilt > 0 ? tilt - 5 : tilt + 5) / 40; 
    }
}

window.updateCarCalibration = function() {
    if(!playerCar) return;
    let rotDeg = parseFloat(document.getElementById('slider-rot').value);
    let scale = parseFloat(document.getElementById('slider-scale').value);
    let posY = parseFloat(document.getElementById('slider-posy').value);

    document.getElementById('val-rot').innerText = rotDeg + "°";
    document.getElementById('val-scale').innerText = scale;
    document.getElementById('val-posy').innerText = posY;

    let rad = rotDeg * (Math.PI / 180);
    window.baseCarRotationY = rad; 
    playerCar.rotation.y = rad;
    playerCar.scale.set(scale, scale, scale);
    playerCar.position.y = posY;

    localStorage.setItem(`calib_rot_${window.activeGameCarType}`, rotDeg);
    localStorage.setItem(`calib_scale_${window.activeGameCarType}`, scale);
    localStorage.setItem(`calib_posy_${window.activeGameCarType}`, posY);

    if (!isRacerPlaying && racerRenderer && racerScene && racerCamera) {
        racerRenderer.render(racerScene, racerCamera);
    }
};

function spawnTrafficCar() {
    const lanes = [-8, -3, 3, 8];
    const targetLane = lanes[Math.floor(Math.random() * lanes.length)];
    const colors = [0xffffff, 0xe74c3c, 0x3498db, 0x95a5a6, 0xf1c40f, 0x2c3e50];
    const carColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Performans İyileştirmesi: Çok fazla mesh yaratmak Safari'yi kasar. 
    // Traffic araçlarının detay seviyesini kıstık.
    const carGroup = new THREE.Group();
    const bodyMat = new THREE.MeshBasicMaterial({ color: carColor }); // BasicMaterial daha hafiftir
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.2, 5.5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6; 
    carGroup.add(body);
    
    const cabinMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const cabinGeo = new THREE.BoxGeometry(2.0, 0.8, 3.0);
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 1.6; cabin.position.z = -0.5; 
    carGroup.add(cabin);

    carGroup.position.set(targetLane, 0.1, -150);
    carGroup.userData.speed = 0.3 + (Math.random() * 0.4); 
    
    racerScene.add(carGroup);
    window.trafficCars.push(carGroup);
}

function triggerCrash() {
    isRacerPlaying = false; 
    gameSpeed = 0;
    if(engineSound) engineSound.pause();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]); 
    document.getElementById('crash-final-score').innerText = Math.floor(racerScore);
    document.getElementById('racer-crash-modal').style.display = 'flex';
}

window.restartRacerGame = function() {
    document.getElementById('racer-crash-modal').style.display = 'none';
    window.trafficCars.forEach(car => racerScene.remove(car));
    window.trafficCars = [];
    window.trafficSpawnTimer = 0;
    racerScore = 0;
    gameSpeed = 0;
    window.currentSteer = 0; 
    document.getElementById('racer-score').innerText = "0";
    
    if(playerCar) {
        playerCar.position.x = 0;
        playerCar.rotation.z = 0;
        playerCar.rotation.x = 0;
    }
    
    if(isEngineOn && engineSound) engineSound.play().catch(e=>{});
    isRacerPlaying = true;
    gameLoop();
};

function initThreeJSGame(modelFile, carType) {
    const container = document.getElementById('racer-3d-container');
    container.innerHTML = ''; 
    window.activeGameCarType = carType;
    window.trafficCars = []; 
    window.currentSteer = 0; 
    
    racerInput.left = false; racerInput.right = false; racerInput.gas = false; racerInput.brake = false;

    let savedRot = parseFloat(localStorage.getItem(`calib_rot_${carType}`)) || 0;
    let savedScale = parseFloat(localStorage.getItem(`calib_scale_${carType}`)) || 0.6;
    let savedPosY = parseFloat(localStorage.getItem(`calib_posy_${carType}`)) || 0.1;

    document.getElementById('slider-rot').value = savedRot;
    document.getElementById('val-rot').innerText = savedRot + "°";
    document.getElementById('slider-scale').value = savedScale;
    document.getElementById('val-scale').innerText = savedScale;
    document.getElementById('slider-posy').value = savedPosY;
    document.getElementById('val-posy').innerText = savedPosY;

    window.baseCarRotationY = savedRot * (Math.PI / 180);

    racerScene = new THREE.Scene();
    racerScene.background = new THREE.Color(0x87CEEB); 
    racerScene.fog = new THREE.Fog(0x87CEEB, 20, 120); 

    racerCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    racerCamera.position.set(0, 7, 12); 
    racerCamera.lookAt(0, 0, -10); 

    // Safari Performans Artırıcı: Antialias'ı false yaptık, dpr'ı sabitledik
    racerRenderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    racerRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Aşırı piksel yoğunluğunu kısıtlar
    racerRenderer.setSize(window.innerWidth, window.innerHeight);
    racerRenderer.shadowMap.enabled = false; // Gölgeler Safari'yi çok kasar, kapattık
    container.appendChild(racerRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    racerScene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    racerScene.add(dirLight);

    const canvasTex = document.createElement('canvas');
    canvasTex.width = 512; canvasTex.height = 1024;
    const ctx = canvasTex.getContext('2d');
    ctx.fillStyle = '#2c2c2c'; ctx.fillRect(0, 0, 512, 1024);
    ctx.fillStyle = '#f39c12'; ctx.fillRect(250, 0, 4, 1024); ctx.fillRect(258, 0, 4, 1024);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(124, 0, 8, 400); ctx.fillRect(124, 600, 8, 400);
    ctx.fillRect(380, 0, 8, 400); ctx.fillRect(380, 600, 8, 400);
    
    roadTexture = new THREE.CanvasTexture(canvasTex);
    roadTexture.wrapS = THREE.RepeatWrapping; roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 15); 
    const roadMaterial = new THREE.MeshBasicMaterial({ map: roadTexture }); // StandardMaterial yerine BasicMaterial kullandık
    const roadGeometry = new THREE.PlaneGeometry(24, 300);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; road.position.z = -100;
    racerScene.add(road);

    const bTexCanvas = document.createElement('canvas');
    bTexCanvas.width = 256; bTexCanvas.height = 128;
    const bCtx = bTexCanvas.getContext('2d');
    bCtx.fillStyle = '#636e72'; bCtx.fillRect(0,0,256,128); 
    bCtx.fillStyle = '#2d3436'; bCtx.fillRect(0, 0, 4, 128); 
    bCtx.fillStyle = '#f1c40f'; bCtx.fillRect(0, 60, 256, 12); 
    
    barrierTexture = new THREE.CanvasTexture(bTexCanvas);
    barrierTexture.wrapS = THREE.RepeatWrapping; barrierTexture.wrapT = THREE.RepeatWrapping;
    barrierTexture.repeat.set(40, 1); 

    const barrierGeo = new THREE.BoxGeometry(0.6, 3.5, 300);
    const barrierMat = new THREE.MeshBasicMaterial({ map: barrierTexture });
    
    const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    leftBarrier.position.set(-12.3, 1.75, -100); racerScene.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    rightBarrier.position.set(12.3, 1.75, -100); racerScene.add(rightBarrier);

    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    document.getElementById('racer-score').innerText = "YÜKLENİYOR...";

    loader.load(modelFile, function(gltf) {
        playerCar = gltf.scene;
        playerCar.scale.set(savedScale, savedScale, savedScale); 
        playerCar.position.set(0, savedPosY, -1); 
        playerCar.rotation.y = window.baseCarRotationY; 
        
        racerScene.add(playerCar);
        
        racerScore = 0; gameSpeed = 0.0; isRacerPlaying = true;
        document.getElementById('racer-score').innerText = "0";
        document.getElementById('racer-speed').innerText = "0";
        gameLoop();
    }, undefined, function(error) {
        alert("3D Model yüklenemedi!"); quitRacerGame();
    });

    // MUCİZE KOD: Safari için 'pointer' (dokunma/tıklama) birleştirici kullanıldı.
    const bindBtn = (id, actionKey) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        const press = (e) => { 
            e.preventDefault(); 
            racerInput[actionKey] = true; 
            btn.style.transform = (id==='racer-btn-gas' || id==='racer-btn-brake') ? 'translateY(-10px) scale(0.95)' : 'scale(0.8)';
        };
        const release = (e) => { 
            e.preventDefault(); 
            racerInput[actionKey] = false; 
            btn.style.transform = (id==='racer-btn-gas' || id==='racer-btn-brake') ? 'translateY(-10px) scale(1)' : 'scale(1)';
        };
        
        btn.onpointerdown = press; 
        btn.onpointerup = release; 
        btn.onpointercancel = release;
        btn.onpointerleave = release;
        
        // Safari Hata Önleyici
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(e); }, {passive: false});
        btn.addEventListener('touchend', (e) => { e.preventDefault(); release(e); }, {passive: false});
    };

    bindBtn('racer-btn-left', 'left'); bindBtn('racer-btn-right', 'right');
    bindBtn('racer-btn-gas', 'gas'); bindBtn('racer-btn-brake', 'brake');
}

function gameLoop() {
    if (!isRacerPlaying) return; 
    
    const physics = carPhysics[window.activeGameCarType] || carPhysics['megane'];
    const creepSpeed = 0.4; 
    
    // SAFARİ İÇİN SES OYNATMA KONTROLÜ (DOM'da varsa çalıştırır)
    if (isEngineOn && engineSound) {
        if (racerInput.gas) {
            if (engineSound.paused) engineSound.play().catch(e=>{});
            engineSound.volume = Math.min(0.5 + (gameSpeed * 0.2), 1.0); 
            engineSound.playbackRate = 0.8 + (gameSpeed * 0.25); 
        } else {
            if (gameSpeed > 0.5) {
                engineSound.volume = Math.max(engineSound.volume - 0.05, 0.3);
                engineSound.playbackRate = Math.max(engineSound.playbackRate - 0.02, 0.7);
            } else {
                engineSound.volume = 0; engineSound.pause();
            }
        }
    }
    
    if(racerInput.gas) {
        gameSpeed += physics.accel; 
        if(gameSpeed > physics.maxSpeed) gameSpeed = physics.maxSpeed;
    } else if(racerInput.brake) {
        gameSpeed -= physics.brake; 
        if(gameSpeed < 0) gameSpeed = 0; 
    } else {
        if(gameSpeed > creepSpeed + 0.05) gameSpeed -= physics.friction; 
        else if (gameSpeed < creepSpeed - 0.05) gameSpeed += physics.friction; 
        else gameSpeed = creepSpeed; 
    }

    roadTexture.offset.y += 0.05 * gameSpeed;
    if(barrierTexture) barrierTexture.offset.x -= 0.05 * gameSpeed; 

    if (playerCar && gameSpeed > 0) {
        let targetSteer = 0;
        if (controlMode === 'touch') {
            if (racerInput.left) targetSteer = -1; 
            if (racerInput.right) targetSteer = 1; 
        } else {
            targetSteer = gyroTilt; 
        }

        window.currentSteer += (targetSteer - window.currentSteer) * 0.08;
        playerCar.position.x += window.currentSteer * (gameSpeed * physics.handling);

        if (playerCar.position.x < -11.5) playerCar.position.x = -11.5;
        if (playerCar.position.x > 11.5) playerCar.position.x = 11.5;

        playerCar.rotation.z = 0; 
        playerCar.rotation.x = window.currentSteer * 0.4; 
        playerCar.rotation.y = window.baseCarRotationY - (window.currentSteer * 0.15); 
    } else if (playerCar && gameSpeed === 0) {
        playerCar.rotation.z = 0; 
        playerCar.rotation.x += (0 - playerCar.rotation.x) * 0.1;
        playerCar.rotation.y += (window.baseCarRotationY - playerCar.rotation.y) * 0.2;
    }

    if (gameSpeed > 0.5) { 
        window.trafficSpawnTimer += gameSpeed;
        if (window.trafficSpawnTimer > 80) { 
            window.trafficSpawnTimer = 0;
            spawnTrafficCar();
        }
    }

    if (playerCar) {
        const playerBox = new THREE.Box3().setFromObject(playerCar);
        playerBox.expandByScalar(-0.4); 

        for (let i = window.trafficCars.length - 1; i >= 0; i--) {
            let tCar = window.trafficCars[i];
            tCar.position.z += (gameSpeed * 0.5) + tCar.userData.speed; 
            
            const tCarBox = new THREE.Box3().setFromObject(tCar);
            tCarBox.expandByScalar(-0.2); 

            if (playerBox.intersectsBox(tCarBox)) { triggerCrash(); return; }
            if (tCar.position.z > 20) { racerScene.remove(tCar); window.trafficCars.splice(i, 1); }
        }
    }

    racerScore += 0.1 * gameSpeed;
    document.getElementById('racer-score').innerText = Math.floor(racerScore);
    carSpeed = Math.floor(gameSpeed * 60); 
    document.getElementById('racer-speed').innerText = carSpeed;

    racerRenderer.render(racerScene, racerCamera);
    racerAnimationId = requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
    if (racerCamera && racerRenderer) {
        racerCamera.aspect = window.innerWidth / window.innerHeight;
        racerCamera.updateProjectionMatrix();
        racerRenderer.setSize(window.innerWidth, window.innerHeight);
    }
});
