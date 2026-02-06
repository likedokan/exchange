const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const miniMapCanvas = document.getElementById('miniMap');
const mmCtx = miniMapCanvas.getContext('2d');

const joyBase = document.getElementById('joystick-base');
const joyStick = document.getElementById('joystick-stick');
const protectionText = document.getElementById('protectionText');
const lbContent = document.getElementById('lb-content');
const boostBtn = document.getElementById('boostBtn');
const controlsDiv = document.getElementById('controls');
const killFeed = document.getElementById('killFeed');
const activePowerUpsDiv = document.getElementById('activePowerUps');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) { controlsDiv.style.display = 'block'; }

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

// --- লেভেল সিস্টেম ভেরিয়েবল ---
let userLevel = parseInt(localStorage.getItem('snakeLevel')) || 1;
let currentXP = parseInt(localStorage.getItem('snakeXP')) || 0;
let xpNeedForNextLevel = userLevel * 500; // প্রতি লেভেলে ৫০০ করে বাড়বে
let animationId;
let gameRunning = false;
// জোন ভেরিয়েবল
let zoneRadius = 0;
const ZONE_SHRINK_RATE = 0.8; // জোন ছোট হওয়ার গতি
const SAFE_ZONE_COLOR = 'rgba(0, 255, 0, 0.1)'; // সেফ জোনের বর্ডার
const DANGER_BORDER_COLOR = 'rgba(255, 23, 68, 0.8)'; // ডেঞ্জার বর্ডার
let isPaused = false;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
document.getElementById('highScoreDisplay').innerText = highScore;

let gameStartTime = 0;
const GRACE_PERIOD = 3000;

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let isBoosting = false;

let isTouching = false;
let touchStartX = 0;
let touchStartY = 0;
let touchId = null;

let cameraX = 0;
let cameraY = 0;
// Shake Effect Variables
let shakeMagnitude = 0;
let shakeDecay = 0.9;
let currentScale = 1.0; 


let player;
let selectedSkin = '#00e676'; // ডিফল্ট স্কিন
let bots = [];
let foods = [];
let particles = [];
let powerUps = [];

let floatingMessages = []; 
let playerKillStreak = 0;  
let lastKillTime = 0;      

// --- কয়েন এবং শপ ভেরিয়েবল ---
let totalCoins = parseInt(localStorage.getItem('snakeCoins')) || 0;
let unlockedSkins = JSON.parse(localStorage.getItem('snakeUnlockedSkins')) || ['#00e676']; 
let skinPrice = 500;
let pendingSkin = null; 
let hasRevived = false; // গ্লোবাল ভেরিয়েবল হিসেবে যোগ করুন
let isSpectating = false;     // স্পেক্টেটর মোড অন আছে কিনা
let spectatingTarget = null;  // কাকে দেখব
let pendingKiller = null;     // রিভাইভ স্ক্রিনে থাকার সময় কিলারকে মনে রাখা


const skinData = [
    { color: '#00e676', locked: false }, // ডিফল্ট (Green)
    { color: '#ff1744', locked: true },  // Red
    { color: '#2979ff', locked: true },  // Blue
    { color: '#ffea00', locked: true },  // Yellow
    { color: '#d500f9', locked: true },  // Purple
    { color: '#00bcd4', locked: true },  // Cyan
    { color: '#ff9100', locked: true },  // Orange
    { color: '#651fff', locked: true },  // Deep Purple
    { color: '#00e5ff', locked: true },  // Neon Blue
    { color: '#76ff03', locked: true },  // Neon Lime
    { color: '#f50057', locked: true },  // Hot Pink
    { color: '#ff3d00', locked: true },  // Deep Orange
    { color: '#ffffff', locked: true },  // White (Ghost)
    { color: '#90a4ae', locked: true },  // Silver/Metal
    { color: '#3d5afe', locked: true },  // Indigo
    { color: '#18ffff', locked: true },  // Aqua
    { color: '#ff4081', locked: true }   // Rose
];

// --- ব্যাকগ্রাউন্ড মিউজিক ---
// Assets ফোল্ডার থেকে ফাইল লোড হবে
const bgMusic = new Audio('file:///android_asset/bgm.mp3'); 

bgMusic.loop = true; 
bgMusic.volume = 0.4; 
bgMusic.preload = 'auto';

// --- ভয়েস ফাংশন ---
function speakText(text) {
    if ('speechSynthesis' in window) {
        if(window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; 
        utterance.rate = 1.1; 
        utterance.pitch = 0.6; 
        utterance.volume = 1.0;

        let voices = window.speechSynthesis.getVoices();
        let maleVoice = voices.find(v => v.name.includes('Male') && v.lang.includes('en'));
        if (!maleVoice) maleVoice = voices.find(v => (v.name.includes('David') || v.name.includes('Mark')) && v.lang.includes('en'));
        if (!maleVoice) maleVoice = voices.find(v => v.name.includes('Google US English'));

        if (maleVoice) utterance.voice = maleVoice;

        try {
            window.speechSynthesis.speak(utterance);
        } catch(e) {
            console.log("Voice error:", e);
        }
    }
}

// --- ফ্লোটিং টেক্সট ক্লাস ---
class FloatingMessage {
    constructor(x, y, text, color, size) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1.0; 
        this.velocity = -2; 
    }
    update() {
        this.y += this.velocity;
        this.life -= 0.02; 
        return this.life > 0;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = `900 ${this.size}px 'Verdana'`; 
        ctx.textAlign = "center";
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

const BOT_COUNT = 25;
const FOOD_COUNT = 600;
const POWERUP_COUNT = 10;
const botNames = ["Venom", "Python", "Viper", "Cobra", "Slayer", "Hunter", "Ghost", "Shadow", "Titan", "Rex", "Nagini", "Kaa", "Hydra", "Fang", "Draco"];

// --- সাউন্ড সিস্টেম ---
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!sfxEnabled || !audioCtx) return;
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.log(e));
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
    } 
    else if (type === 'kill_normal') { 
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(); osc.stop(now + 0.2);
    }
    else if (type === 'double_kill') { 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.3);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
    }
    else if (type === 'rampage') { 
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.5);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(); osc.stop(now + 0.5);
    }
    else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
    } 
    else if (type === 'boost') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
    }
}



function togglePause() {
    isPaused = !isPaused;
    const pauseScreen = document.getElementById('pauseScreen');
    if (isPaused) {
        pauseScreen.classList.remove('hidden');
        bgMusic.pause(); 
    } else {
        pauseScreen.classList.add('hidden');
        if(musicEnabled) bgMusic.play().catch(e => console.log("Resume fail:", e)); 
    }
}

function addShake(magnitude) {
    shakeMagnitude = magnitude;
}

// --- ক্লাস ---
class Particle {
    constructor(x, y, color, isTrail = false) {
        this.x = x; this.y = y; this.color = color;
        this.radius = Math.random() * 3 + 1;
        this.speed = Math.random() * 2 + 1;
        this.angle = Math.random() * Math.PI * 2;
        this.life = 1.0;
        this.decay = isTrail ? 0.05 : 0.02;
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life -= this.decay;
        return this.life > 0;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class PowerUp {
    constructor(x, y) {
        this.x = x || Math.random() * (WORLD_WIDTH - 100) + 50;
        this.y = y || Math.random() * (WORLD_HEIGHT - 100) + 50;
        const types = ['magnet', 'speed', 'shield'];
        this.type = types[Math.floor(Math.random() * types.length)];
        this.radius = 20;
        this.pulse = 0;
    }

    draw() {
        this.pulse += 0.05;
        const scale = 1 + Math.sin(this.pulse) * 0.1;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        if (this.type === 'magnet') {
            ctx.fillStyle = '#9C27B0';
            ctx.shadowColor = '#E040FB'; ctx.shadowBlur = 15; ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧲', 0, 0);
        } else if (this.type === 'speed') {
            ctx.fillStyle = '#FFEB3B';
            ctx.shadowColor = '#FFF176'; ctx.shadowBlur = 15; ctx.fill();
            ctx.fillStyle = 'black'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚡', 0, 0);
        } else if (this.type === 'shield') {
            ctx.fillStyle = '#2196F3';
            ctx.shadowColor = '#64B5F6'; ctx.shadowBlur = 15; ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛡️', 0, 0);
        }
        ctx.restore();
    }
}

class Snake {
    constructor(x, y, isBot = false, color, name) {
this.maxHealth = 100;
this.currentHealth = 100;

        this.x = x; this.y = y; this.isBot = isBot;
        this.angle = Math.random() * Math.PI * 2;
        this.name = name || (isBot ? botNames[Math.floor(Math.random() * botNames.length)] : "You");
        
        this.baseSpeed = isBot ? 2.0 : 2.5;
        this.boostSpeed = this.baseSpeed * 2.2; 
        this.turnSpeed = 0.06; 
        this.radius = 12; 
        this.color = color;
        this.tailLength = 20; 
        this.path = [];
        this.turnTimer = 0;
        this.boosting = false;
        this.boostTimer = 0;
// script.js এর Snake ক্লাসের constructor এর ভেতর
this.activePowerUps = { magnet: 0, speed: 0, shield: false }; 
this.currentBaseGap = 3; // গ্যাপ স্মুথ করার জন্য ভেরিয়েবল
    // --- নতুন যোগ করা অংশ (Stamina) ---
    this.maxStamina = 100;
    this.currentStamina = 100;
    // ----------------------------------

    }

    // script.js এর Snake ক্লাসের getGap() ফাংশনটি এভাবে আপডেট করুন
    getGap() { 
        // অ্যানিমেটেড ভ্যালু ব্যবহার করা হচ্ছে
        return Math.max(3, this.currentBaseGap * (this.radius / 10)); 
    }


    grow(amount = 2) { 
        this.tailLength += amount; 
        const sizeIncrease = Math.max(0, (this.tailLength - 20) * 0.005);
        this.radius = Math.min(40, 12 + sizeIncrease);
    }

    getScore() { return Math.max(0, (this.tailLength - 20) * 10); }

    activatePowerUp(type) {
        if (type === 'magnet') this.activePowerUps.magnet = 1800; 
        else if (type === 'speed') this.activePowerUps.speed = 600; 
        else if (type === 'shield') this.activePowerUps.shield = true;
    }

    update() {
        // ১. গ্যাপ স্মুথিং লজিক
        const targetGap = (this.boosting || this.activePowerUps.speed > 0) ? 4.0 : 3.0;
        this.currentBaseGap += (targetGap - this.currentBaseGap) * 0.05;

        // ২. পাওয়ার আপ টাইমার কমানো
        if (this.activePowerUps.magnet > 0) this.activePowerUps.magnet--;
        if (this.activePowerUps.speed > 0) this.activePowerUps.speed--;

        // ৩. বট বা প্লেয়ার কন্ট্রোল আপডেট
        if (this.isBot) {
            this.botAI();
        } else {
            this.playerControl();
            this.updateUI();
        }

        // ৪. স্পিড এবং স্ট্যামিনা লজিক (সবার জন্য সমান নিয়ম)
        let currentSpeed = this.baseSpeed;
        
        // চেক করা হচ্ছে বুস্ট বাটন চাপা আছে কিনা এবং স্ট্যামিনা বাকি আছে কিনা
        const canBoost = (this.boosting && this.currentStamina > 0);

        // যদি স্পিড পাওয়ার আপ থাকে (কারো স্ট্যামিনা কমবে না)
        if (this.activePowerUps.speed > 0) {
            currentSpeed = this.baseSpeed * 1.8;
        } 
        // যদি বুস্ট করে এবং স্ট্যামিনা থাকে (বট এবং প্লেয়ার সবার জন্য)
        else if (canBoost && this.tailLength > 10) { 
            currentSpeed = this.boostSpeed;

            // --- পরিবর্তন: এখন সবার (বট + প্লেয়ার) স্ট্যামিনা কমবে ---
            this.currentStamina -= 0.8; // স্ট্যামিনা কমার গতি
            if (this.currentStamina < 0) this.currentStamina = 0;

            // বুস্ট এফেক্ট (বটদের জন্যও সাউন্ড বাদে পার্টিকল দেখাবে)
            if (this.boostTimer++ % 5 === 0) {
                if (!this.isBot) {
                    playSound('boost');
                    addShake(1); 
                }
                particles.push(new Particle(this.x, this.y, '#fff', true));
            }
            
            // বুস্ট করলে বডি ছোট হওয়ার লজিক (সবার জন্য)
            if (Math.random() < 0.1) { 
                this.tailLength -= 1;
                this.grow(0); 
                if (!this.isBot) {
                    score = Math.max(0, (this.tailLength - 20) * 10);
                    updateScore();
                }
                const tailEnd = this.path[this.path.length - 1] || {x: this.x, y: this.y};
                foods.push(new Food(tailEnd.x, tailEnd.y, 5, this.color));
            }
        } 
        // বুস্ট না করলে বা স্ট্যামিনা শেষ হলে (রিকভারি মোড)
        else {
            // --- পরিবর্তন: এখন সবার (বট + প্লেয়ার) স্ট্যামিনা রিকভার হবে ---
            if (this.currentStamina < this.maxStamina) {
                this.currentStamina += 0.3; // রিকভারি গতি
                if (this.currentStamina > this.maxStamina) this.currentStamina = this.maxStamina;
            }
        }

        // ৫. UI বার আপডেট (শুধুমাত্র প্লেয়ারের জন্য দেখাবে, বটেরটা লুকানো থাকবে)
        if (!this.isBot) {
            const bar = document.getElementById('staminaBar');
            const txt = document.getElementById('staminaText');
            if (bar && txt) {
                const percent = Math.floor((this.currentStamina / this.maxStamina) * 100);
                bar.style.width = `${percent}%`;
                txt.innerText = `${percent}%`;
                
                if (percent < 20) {
                    bar.style.background = '#ff1744';
                    bar.style.boxShadow = '0 0 10px #ff1744';
                } else {
                    bar.style.background = 'linear-gradient(90deg, #ff9100, #ffea00)';
                    bar.style.boxShadow = '0 0 10px #ffea00';
                }
            }
        }

        // ৬. পজিশন আপডেট (Movement)
        this.x += Math.cos(this.angle) * currentSpeed;
        this.y += Math.sin(this.angle) * currentSpeed;

        // ৭. বাউন্ডারি চেক
        if (this.x < 0 || this.x > WORLD_WIDTH || this.y < 0 || this.y > WORLD_HEIGHT) {
            return false; // মারা গেছে
        }

        // ৮. বডি পাথ আপডেট
        this.path.unshift({x: this.x, y: this.y});
        
        const currentGap = this.getGap();
        const pathLimit = this.tailLength * currentGap; 
        while (this.path.length > pathLimit) {
            this.path.pop();
        }
        return true; // বেঁচে আছে
    }



    updateUI() {
        // পাওয়ার আপ আইকন আপডেট
        let html = '';
        if (this.activePowerUps.magnet > 0) html += '<div class="powerup-icon">🧲</div>';
        if (this.activePowerUps.speed > 0) html += '<div class="powerup-icon">⚡</div>';
        if (this.activePowerUps.shield) html += '<div class="powerup-icon">🛡️</div>';
        activePowerUpsDiv.innerHTML = html;

        // --- হেল্থ বার আপডেট ---
        const hBar = document.getElementById('healthBar');
        const hText = document.getElementById('healthText');
        
        if (hBar && hText) {
            const hpPercent = Math.max(0, Math.floor((this.currentHealth / this.maxHealth) * 100));
            hBar.style.width = `${hpPercent}%`;
            hText.innerText = `${hpPercent}%`;

            // হেলথ কম হলে ব্লিঙ্ক করবে
            if (hpPercent < 30) {
                hBar.style.background = '#d50000'; // গাঢ় লাল
                hBar.style.boxShadow = `0 0 ${Math.random() * 20}px #d50000`; // ব্লিঙ্কিং এফেক্ট
            } else {
                hBar.style.background = 'linear-gradient(90deg, #ff1744, #d50000)';
                hBar.style.boxShadow = '0 0 10px #ff1744';
            }
        }
    }


    playerControl() {
        const targetX = mouseX + cameraX;
        const targetY = mouseY + cameraY;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const targetAngle = Math.atan2(dy, dx);
        this.smoothTurn(targetAngle);
        this.boosting = isBoosting; 
    }

    // script.js এর Snake ক্লাসের ভেতর botAI() ফাংশনটি রিপ্লেস করুন
    botAI() {
        this.turnTimer--;

        // ১. বাউন্ডারি বা দেওয়াল থেকে দূরে থাকার লজিক (সবচেয়ে বেশি প্রায়োরিটি)
        const buffer = 150;
        let targetAngle = this.angle;
        let urgentTurn = false;

        if (this.x < buffer) { targetAngle = 0; urgentTurn = true; }
        else if (this.x > WORLD_WIDTH - buffer) { targetAngle = Math.PI; urgentTurn = true; }
        else if (this.y < buffer) { targetAngle = Math.PI / 2; urgentTurn = true; }
        else if (this.y > WORLD_HEIGHT - buffer) { targetAngle = -Math.PI / 2; urgentTurn = true; }

        if (urgentTurn) {
            this.smoothTurn(targetAngle, 3.5); 
            this.turnTimer = 20;
            this.boosting = false; 
            return;
        }

        if (this.turnTimer > 0) {
            this.smoothTurn(this.angle);
            return; 
        }

        // ২. পরিবেশ স্ক্যান করা
        let nearestSnake = null;
        let minDist = 600; 

        if (player && !player.isBot && gameRunning) {
            const d = Math.hypot(this.x - player.x, this.y - player.y);
            if (d < minDist) {
                minDist = d;
                nearestSnake = player;
            }
        }

        for (let other of bots) {
            if (other === this) continue;
            const d = Math.hypot(this.x - other.x, this.y - other.y);
            if (d < minDist) {
                minDist = d;
                nearestSnake = other;
            }
        }

        // ৩. সিদ্ধান্ত গ্রহণ
        if (nearestSnake) {
            const dx = nearestSnake.x - this.x;
            const dy = nearestSnake.y - this.y;
            const angleToEnemy = Math.atan2(dy, dx);

            // --- পরিবর্তন এখানে (Flee Behavior) ---
            if (nearestSnake.radius > this.radius || nearestSnake.tailLength > this.tailLength + 10) {
                // সরাসরি এঙ্গেল সেট না করে, টার্গেট ঠিক করা হলো
                let fleeAngle = angleToEnemy + Math.PI; 
                
                // smoothTurn ব্যবহার করা হলো (2.5 স্পিডে ঘুরবে, যাতে খুব স্লো না হয় আবার খুব ফাস্টও না হয়)
                this.smoothTurn(fleeAngle, 2.5); 
                
                if (this.tailLength > 25) {
                    this.boosting = true;
                }
                this.turnTimer = 15; 
            } 
            // Attack Behavior
            else {
                const interceptAngle = angleToEnemy + 0.4; 
                this.smoothTurn(interceptAngle, 1.5);
                this.boosting = (Math.random() < 0.2 && this.tailLength > 20); 
                this.turnTimer = 10;
            }
        } 
        // Foraging Behavior
        else {
            this.boosting = false; 
            let nearestFood = null;
            let minFoodDist = 400; 

            for (let f of foods) {
                if (Math.abs(this.x - f.x) > 400 || Math.abs(this.y - f.y) > 400) continue;
                const d = Math.hypot(this.x - f.x, this.y - f.y);
                if (d < minFoodDist) {
                    minFoodDist = d;
                    nearestFood = f;
                }
            }

            if (nearestFood) {
                const dx = nearestFood.x - this.x;
                const dy = nearestFood.y - this.y;
                const foodAngle = Math.atan2(dy, dx);
                this.smoothTurn(foodAngle, 1.0);
            } else {
                // ন্যাচারাল মুভমেন্টের জন্য হালকা জিটার (Jitter)
                this.angle += (Math.random() - 0.5) * 0.2;
                this.smoothTurn(this.angle);
            }
            this.turnTimer = 20; 
        }
    }




    smoothTurn(targetAngle, multiplier = 1.0) {
        const sizeFactor = Math.max(1, 12 / this.radius); 
        const effectiveTurnSpeed = this.turnSpeed * multiplier * sizeFactor; 
        
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) < effectiveTurnSpeed) {
            this.angle = targetAngle;
        } else {
            this.angle += Math.sign(diff) * effectiveTurnSpeed;
        }
    }

    draw() {
        const isInvincible = !this.isBot && (Date.now() - gameStartTime < GRACE_PERIOD);
        
        if (isInvincible || this.activePowerUps.shield) {
            ctx.globalAlpha = (Math.floor(Date.now() / 100) % 2 === 0) ? 0.6 : 0.9;
        } else {
            ctx.globalAlpha = 1.0;
        }

        if (this.activePowerUps.shield) {
            ctx.shadowBlur = 20; ctx.shadowColor = '#2196F3'; ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        }

        if (this.activePowerUps.magnet > 0) {
             ctx.strokeStyle = 'rgba(156, 39, 176, 0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y, 150 + this.radius, 0, Math.PI * 2); ctx.stroke();
        }

        if (this.boosting || this.activePowerUps.speed > 0) {
            ctx.shadowBlur = 15; ctx.shadowColor = this.color;
        }

        ctx.fillStyle = this.color;
        const gap = this.getGap(); 
        
// script.js এর draw() ফাংশনের ভেতরের লুপটি আপডেট করুন
for (let i = 0; i < this.tailLength; i++) {
    // Math.floor() ব্যবহার করে দশমিক বাদ দেওয়া হলো
    const index = Math.floor(i * gap); 

    if (index < this.path.length) {
        const point = this.path[index];
        
        // সুরক্ষা চেক: যদি কোনো কারণে পয়েন্ট না থাকে
        if (!point) continue; 

        const decreaseRate = this.radius * 0.015; 
        const size = Math.max(this.radius - (i * decreaseRate), 5);

        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

        ctx.shadowBlur = 0; 

        // মাথা
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isBot ? '#FF5555' : (isInvincible ? '#AAFFAA' : '#4CAF50');
        ctx.fill();

        // চোখ এবং জিহ্বা
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle); 

        const tongueSpeed = Date.now() / 100; 
        const tongueExtension = Math.sin(tongueSpeed) * (this.radius * 0.6); 

        if (tongueExtension > 0) { 
            ctx.beginPath();
            ctx.moveTo(this.radius * 0.8, 0);
            const tipX = this.radius + (this.radius * 0.4) + tongueExtension;
            ctx.lineTo(tipX, 0);
            ctx.lineTo(tipX + 4, -3);
            ctx.lineTo(tipX, 0);
            ctx.lineTo(tipX + 4, 3);
            ctx.lineTo(tipX, 0);
            
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 2; 
            ctx.stroke();
        }

        const eyeX = this.radius * 0.4;
        const eyeY = this.radius * 0.45;
        const eyeSize = this.radius * 0.35;

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(eyeX, -eyeY, eyeSize, 0, Math.PI*2); 
        ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI*2);  
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(eyeX + (eyeSize*0.2), -eyeY, eyeSize * 0.5, 0, Math.PI*2); 
        ctx.arc(eyeX + (eyeSize*0.2), eyeY, eyeSize * 0.5, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(eyeX + (eyeSize*0.3), -eyeY - (eyeSize*0.2), eyeSize * 0.15, 0, Math.PI*2); 
        ctx.arc(eyeX + (eyeSize*0.3), eyeY - (eyeSize*0.2), eyeSize * 0.15, 0, Math.PI*2);
        ctx.fill();

        ctx.restore(); 

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = `bold ${Math.max(12, this.radius)}px 'Hind Siliguri', Arial`; 
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - (this.radius + 15)); 

        ctx.globalAlpha = 1.0;
    }
}


class Food {
    constructor(x, y, radius, color) {
        this.x = x || Math.random() * WORLD_WIDTH;
        this.y = y || Math.random() * WORLD_HEIGHT;
        
        // ৫% চান্স আছে এটি একটি কয়েন হবে
        this.isCoin = Math.random() < 0.05; 
        
        if (this.isCoin) {
            this.color = '#FFD700'; // গোল্ডেন
            this.radius = 15; // একটু বড়
        } else {
            this.color = color || `hsl(${Math.random() * 360}, 100%, 60%)`;
            this.radius = radius || (6 + Math.random() * 4);
        }
        
        this.pulse = Math.random() * 10;
        this.vx = 0; this.vy = 0;
    }

    draw() {
        this.pulse += 0.1;
        const glow = Math.sin(this.pulse) * 3;
        
        ctx.save();
        ctx.shadowBlur = 10 + glow; 
        ctx.shadowColor = this.color;
        
        if (this.isCoin) {
            // কয়েন দেখতে কেমন হবে
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', this.x, this.y);
        } else {
            // সাধারণ খাবার
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.9; this.vy *= 0.9;
    }
}

// --- শপ এবং স্কিন সিস্টেম ---
function loadShopSystem() {
    const shopCoins = document.getElementById('shopCoinsDisplay');
    if (shopCoins) shopCoins.innerText = totalCoins;

    const menuCoins = document.getElementById('userCoinsDisplay');
    if (menuCoins) menuCoins.innerText = totalCoins;

    const container = document.getElementById('skinContainer');
    if (!container) return;
    
    container.innerHTML = '';

    skinData.forEach(skin => {
        if (unlockedSkins.includes(skin.color)) {
            skin.locked = false;
        }

        const div = document.createElement('div');
        div.className = `skin-option ${selectedSkin === skin.color ? 'selected' : ''}`;
        
        div.style.background = skin.color;
        div.style.boxShadow = `0 0 15px ${skin.color}`;
        div.setAttribute('data-color', skin.color);
        
        if (skin.locked) {
            div.innerHTML = '<span style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:20px; text-shadow:none;">🔒</span>';
            div.style.opacity = '0.6';
            div.style.border = '2px solid #555';
        } else {
            div.style.border = '2px solid rgba(255,255,255,0.5)';
        }

        div.onclick = () => selectSkinInMenu(skin, div);
        container.appendChild(div);
    });
}


function selectSkinInMenu(skinObj, element) {
    const buyBtn = document.getElementById('buyBtn');
    
    document.querySelectorAll('.skin-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    if (skinObj.locked) {
        selectedSkin = null; 
        pendingSkin = skinObj.color;
        buyBtn.classList.remove('hidden');
        buyBtn.innerHTML = `আনলক করুন (${skinPrice} 💰)`;
    } else {
        selectedSkin = skinObj.color;
        pendingSkin = null;
        buyBtn.classList.add('hidden');
    }
}

function buySelectedSkin() {
    if (!pendingSkin) return;

    if (totalCoins >= skinPrice) {
        totalCoins -= skinPrice;
        localStorage.setItem('snakeCoins', totalCoins);
        
        // সব জায়গায় কয়েন আপডেট
        if(document.getElementById('userCoinsDisplay')) 
             document.getElementById('userCoinsDisplay').innerText = totalCoins;
        if(document.getElementById('shopCoinsDisplay'))
             document.getElementById('shopCoinsDisplay').innerText = totalCoins;

        unlockedSkins.push(pendingSkin);
        localStorage.setItem('snakeUnlockedSkins', JSON.stringify(unlockedSkins));

        playSound('eat'); 
        alert('সফলভাবে কেনা হয়েছে! 🎉');

        selectedSkin = pendingSkin;
        loadShopSystem();
        
        document.getElementById('buyBtn').classList.add('hidden');
    } else {
        alert('আপনার পর্যাপ্ত কয়েন নেই! আরও খেলুন। 😞');
    }
}


// --- গেম লজিক ---

function init(playerName = "You") { 
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    killFeed.innerHTML = ''; 
    activePowerUpsDiv.innerHTML = '';
    
    player = new Snake(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, false, selectedSkin, playerName);
    
    bots = [];
    for(let i=0; i<BOT_COUNT; i++) spawnBot();
    foods = [];
    for(let i=0; i<FOOD_COUNT; i++) foods.push(new Food());
    powerUps = [];
    for(let i=0; i<POWERUP_COUNT; i++) powerUps.push(new PowerUp());
    particles = [];

    score = 0;
    
    if (currentMap === 'cyber') {
        zoneRadius = 2200; 
    } else {
        zoneRadius = 0;
    }

    updateScore();
}


function spawnBot() {
    let x, y;
    // নিরাপদ দূরত্বে স্পন করা
    do {
        x = Math.random() * WORLD_WIDTH;
        y = Math.random() * WORLD_HEIGHT;
    } while (player && Math.hypot(x - player.x, y - player.y) < 300);

    let botColor;
    let botName;

    // --- টিম মোড লজিক ---
    if (currentMap === 'team') {
        // ৫০% চান্স লাল বা সবুজ হওয়ার
        const isRedTeam = Math.random() > 0.5;
        botColor = isRedTeam ? '#ff1744' : '#00e676';
        botName = isRedTeam ? "🔴 Red Fighter" : "🟢 Green Soldier";
    } else {
        // ক্লাসিক বা সাইবার মোড (র‍্যান্ডম কালার)
        const colors = ['#FF1744', '#00E676', '#2979FF', '#FFEA00', '#E040FB', '#FF9100', '#00BCD4'];
        botColor = colors[Math.floor(Math.random() * colors.length)];
        botName = null; // ক্লাস ডিফল্ট নাম নিবে
    }

    bots.push(new Snake(x, y, true, botColor, botName));
}


function createExplosion(x, y, color) {
    // পার্টিকল তৈরি হবে সব সময়
    for(let i=0; i<20; i++) {
        particles.push(new Particle(x, y, color));
    }

    // --- ফিক্স: দূরত্ব চেক ---
    // যদি প্লেয়ার থাকে এবং বিস্ফোরণটি প্লেয়ারের কাছাকাছি (যেমন ৮০০ পিক্সেলের মধ্যে) হয়
    if (player) {
        const distToPlayer = Math.hypot(player.x - x, player.y - y);
        
        // প্লেয়ারের স্ক্রিনের ভেতরে বা খুব কাছে হলেই কেবল শেক হবে
        if (distToPlayer < 400) { 
            addShake(5); 
        }
    }
}


function turnSnakeToFood(snake) {
    createExplosion(snake.x, snake.y, snake.color);
    const step = 3;
    for (let i = 0; i < snake.path.length; i += step) {
        const pt = snake.path[i];
        foods.push(new Food(pt.x + (Math.random()-0.5)*15, pt.y + (Math.random()-0.5)*15, 10, snake.color));
    }
}

// --- নতুন কিল ফিড সিস্টেম ---
function showKillMessage(killerName, victimName, killerColor) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'kill-msg';
    
    // নিজের নাম হলে সবুজ, অন্য কেউ হলে তাদের কালার অথবা লাল
    let killerStyle = killerName === "You" || killerName === player.name ? 'color: #00e676; font-weight:bold;' : `color: ${killerColor}; font-weight:bold;`;
    let victimStyle = victimName === "You" || victimName === player.name ? 'color: #ff1744; font-weight:bold;' : 'color: #fff;';

    msgDiv.innerHTML = `<span style="${killerStyle}">${killerName}</span> 
                        <span style="color:#aaa; font-size:12px; margin:0 5px;">⚔️</span> 
                        <span style="${victimStyle}">${victimName}</span>`;
    
    killFeed.appendChild(msgDiv);
    
    // ৫টার বেশি মেসেজ হলে উপরেরটা মুছে ফেলবে
    if (killFeed.children.length > 5) killFeed.removeChild(killFeed.firstChild);
    
    // ৪ সেকেন্ড পর মেসেজ গায়েব হবে
    setTimeout(() => { if(msgDiv.parentNode) msgDiv.remove(); }, 4000);
}


// --- চ্যাট সিস্টেম ---
function addChatMessage(name, msg, color) {
    if (!chatBox) return;
    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = `<span class="chat-name" style="color: ${color || '#aaa'};">${name}:</span> <span class="chat-msg">${msg}</span>`;
    chatBox.appendChild(line);
    chatBox.scrollTop = chatBox.scrollHeight;
    if (chatBox.children.length > 10) chatBox.removeChild(chatBox.firstChild);
}

function randomBotChat() {
    if (!gameRunning || isPaused) return;
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
    if (bot) {
        addChatMessage(bot.name, msg, bot.color);
    }
    setTimeout(randomBotChat, Math.random() * 5000 + 2000);
}

function drawMiniMap() {
    mmCtx.clearRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
    
    mmCtx.save();
    mmCtx.beginPath(); 
    mmCtx.arc(miniMapCanvas.width/2, miniMapCanvas.height/2, miniMapCanvas.width/2, 0, Math.PI*2); 
    mmCtx.clip();

    const scale = miniMapCanvas.width / WORLD_WIDTH;

    if (currentMap === 'cyber') {
        const centerX = (WORLD_WIDTH / 2) * scale;
        const centerY = (WORLD_HEIGHT / 2) * scale;
        const scaledRadius = zoneRadius * scale;

        mmCtx.beginPath();
        mmCtx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
        mmCtx.lineWidth = 2;
        mmCtx.strokeStyle = '#ff1744'; 
        mmCtx.stroke();
        
        mmCtx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        mmCtx.beginPath();
        mmCtx.arc(centerX, centerY, miniMapCanvas.width, 0, Math.PI * 2); 
        mmCtx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2, true); 
        mmCtx.fill();
    }

    mmCtx.fillStyle = '#FF5555';
    bots.forEach(bot => {
        mmCtx.beginPath(); mmCtx.arc(bot.x * scale, bot.y * scale, 2, 0, Math.PI * 2); mmCtx.fill();
    });

    powerUps.forEach(p => {
         mmCtx.fillStyle = p.type === 'magnet' ? '#E040FB' : (p.type === 'speed' ? '#FFFF00' : '#2196F3');
         mmCtx.beginPath(); mmCtx.arc(p.x * scale, p.y * scale, 2.5, 0, Math.PI * 2); mmCtx.fill();
    });

    if (player) {
        mmCtx.fillStyle = '#00e676';
        mmCtx.beginPath(); mmCtx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2); mmCtx.fill();
        
        mmCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; 
        mmCtx.lineWidth = 1;
        mmCtx.strokeRect(cameraX * scale, cameraY * scale, canvas.width * scale, canvas.height * scale);
    }
    mmCtx.restore();
}


function startGame() {
    // ১. নাম ইনপুট ভেরিয়েবলটি সবার শুরুতে ডিফাইন করা হলো (Error Fix)
    hasRevived = false; // নতুন গেম শুরু হলে রিভাইভ রিসেট হবে
    // --- নতুন যোগ করুন ---
    isSpectating = false;
    spectatingTarget = null;
    pendingKiller = null;
    // গেম ওভার স্ক্রিনের স্টাইল রিসেট করুন (যাতে পরের গেমে স্বচ্ছ না থাকে)
    const goScreen = document.getElementById('gameOverScreen');
    goScreen.style.background = 'rgba(15, 20, 30, 0.95)'; 
    goScreen.querySelector('h1').innerText = "গেম ওভার!";
    const msg = document.getElementById('spectatingMsg');
    if(msg) msg.style.display = 'none';
}
    const nameInput = document.getElementById('playerNameInput');
    let playerName = nameInput.value.trim();
    if (playerName === "") playerName = "You";
    localStorage.setItem('snakePlayerName', playerName);

    // ২. UI আপডেট
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('inGameSettingsBtn').style.display = 'flex';
    
    // ৩. গেম ভেরিয়েবল রিসেট
    gameRunning = true;
    score = 0;
    bots = [];
    foods = [];
    powerUps = [];
    particles = [];
    gameStartTime = Date.now();
    updateScore();

    // ৪. ম্যাপ অনুযায়ী জোন এবং কালার সেট করা
    let startX = WORLD_WIDTH / 2;
    let startY = WORLD_HEIGHT / 2;
    let playerColor = selectedSkin || '#00e676'; // ডিফল্ট স্কিন

    if (currentMap === 'team') {
        // টিম মোড: লাল বা সবুজ দল নির্বাচন
        const playerIsRed = Math.random() > 0.5;
        playerColor = playerIsRed ? '#ff1744' : '#00e676';
        
        // টিম স্কোরবোর্ড দেখানো
        const sb = document.getElementById('teamScoreBoard');
        if(sb) sb.style.display = 'block';
        zoneRadius = 0; // টিম মোডে জোন থাকে না
    } 
    else if (currentMap === 'cyber') {
        zoneRadius = 2500; // ব্যাটল রয়্যাল মোডে জোন থাকবে
        const sb = document.getElementById('teamScoreBoard');
        if(sb) sb.style.display = 'none';
    } 
    else {
        zoneRadius = 0; // ক্লাসিক মোড
        const sb = document.getElementById('teamScoreBoard');
        if(sb) sb.style.display = 'none';
    }

    // ৫. প্লেয়ার তৈরি (সঠিক কালার এবং নাম সহ)
    player = new Snake(startX, startY, false, playerColor, playerName);

    // ৬. বট এবং খাবার তৈরি
    for(let i=0; i<BOT_COUNT; i++) spawnBot();
    for(let i=0; i<FOOD_COUNT; i++) foods.push(new Food());
    
    // ৭. অডিও এবং অন্যান্য
    initAudio();
    if(typeof musicEnabled !== 'undefined' && musicEnabled) {
        bgMusic.currentTime = 0;
        bgMusic.play().catch(e=>{ console.log(e); });
    }
    
    speakText("Battle Start");
    
    // সুরক্ষা টেক্সট দেখানো
    const protText = document.getElementById('protectionText');
    if(protText) {
        protText.style.display = 'block';
        setTimeout(() => { protText.style.display = 'none'; }, GRACE_PERIOD);
    }

    // ৮. অ্যানিমেশন শুরু
    animate();
}




function gameOver(killer = null) {
    // ১. রিভাইভ চেক
    if (!hasRevived) {
        pendingKiller = killer; // কিলারকে মেমোরিতে রাখা হলো
        showReviveScreen();
        return; 
    }
    
    // ২. স্কোর সেভ এবং লেভেল আপ লজিক (আগের মতোই)
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('highScoreDisplay').innerText = highScore;
    }
    
    let gainedXP = Math.floor(score);
    currentXP += gainedXP;
    while (currentXP >= xpNeedForNextLevel) {
        currentXP -= xpNeedForNextLevel;
        userLevel++;
        xpNeedForNextLevel = userLevel * 500;
        alert(`অভিনন্দন! আপনি Level ${userLevel}-এ উঠেছেন! 🎉`);
    }
    localStorage.setItem('snakeLevel', userLevel);
    localStorage.setItem('snakeXP', currentXP);
    updateLevelUI();
    document.getElementById('finalScore').innerText = score;
    
    // ৩. সাউন্ড এবং এফেক্ট
    playSound('die');
    addShake(15);
    turnSnakeToFood(player); // প্লেয়ার খাবারে পরিণত হবে
    
    // ৪. স্পেক্টেটর মোড লজিক (যদি কেউ মেরে থাকে)
    if (killer) {
        isSpectating = true;
        spectatingTarget = killer;
        
        // কন্ট্রোল লুকিয়ে ফেলা
        joyBase.style.display = 'none';
        isTouching = false;
        isBoosting = false;
        if(isMobile) document.getElementById('controls').style.display = 'none';
        
        // গেম ওভার স্ক্রিনকে স্বচ্ছ (Transparent) করা
        const goScreen = document.getElementById('gameOverScreen');
        goScreen.classList.remove('hidden');
        goScreen.style.background = 'rgba(0, 0, 0, 0.2)'; // স্বচ্ছ ব্যাকগ্রাউন্ড
        
        // টাইটেল পরিবর্তন
        goScreen.querySelector('h1').innerText = "YOU DIED";
        
        // স্পেক্টেটিং মেসেজ দেখানো
        let specMsg = document.getElementById('spectatingMsg');
        if(!specMsg) {
             specMsg = document.createElement('div');
             specMsg.id = 'spectatingMsg';
             specMsg.style.color = '#00e676';
             specMsg.style.fontSize = '18px';
             specMsg.style.fontWeight = 'bold';
             specMsg.style.marginTop = '5px';
             goScreen.querySelector('h1').after(specMsg);
        }
        specMsg.style.display = 'block';
        specMsg.innerText = `Spectating: ${killer.name}`;

        // নোট: gameRunning = false করা যাবে না, কারণ আমরা খেলা দেখতে চাই
    } else {
        // যদি দেওয়ালের সাথে লেগে মরেন, তবে সাধারণ গেম ওভার
        gameRunning = false;
        cancelAnimationFrame(animationId);
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    document.getElementById('inGameSettingsBtn').style.display = 'none';
    protectionText.style.display = 'none';
}


function showStartScreen() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
}

function updateScore() {
    document.getElementById('scoreDisplay').innerText = score;
}

function updateLeaderboard() {
    let allSnakes = [...bots];
    if (gameRunning) allSnakes.push(player);
    allSnakes.sort((a, b) => b.getScore() - a.getScore());
    const top5 = allSnakes.slice(0, 5);
    
    let html = '';
    top5.forEach((s, index) => {
        const isMe = !s.isBot;
        const rank = index + 1;
        let rankIcon = rank + '.';
        if (rank === 1) rankIcon = '🥇'; else if (rank === 2) rankIcon = '🥈'; else if (rank === 3) rankIcon = '🥉';

        html += `<div class="lb-row ${isMe ? 'lb-me' : ''}"><span class="lb-rank">${rankIcon}</span><span class="lb-name">${s.name}</span><span class="lb-score">${Math.floor(s.getScore())}</span></div>`;
    });
    lbContent.innerHTML = html;
}

function animate() {
    if (!gameRunning || isPaused) {
        if (isPaused) requestAnimationFrame(animate);
        return;
    }

    // --- ১. জোন স্ট্যাটাস চেক ---
    const zoneStatusDiv = document.getElementById('zoneStatus');
    if (currentMap === 'cyber' && gameRunning) {
        zoneStatusDiv.style.display = 'block';
        if (zoneRadius <= 300) {
            zoneStatusDiv.innerText = "☠️ FINAL ZONE ☠️";
        } else {
            zoneStatusDiv.innerText = "🔥 ZONE SHRINKING 🔥";
        }
    } else {
        zoneStatusDiv.style.display = 'none';
    }

    // --- ২. ক্যানভাস ক্লিয়ার এবং ব্যাকগ্রাউন্ড ---
    if (currentMap === 'classic') {
        ctx.fillStyle = '#050505'; 
    } else {
        ctx.fillStyle = '#020a14'; 
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // --- ৩. ক্যামেরা এবং শেক লজিক (আপডেট করা) ---
    // যদি স্পেক্টেট মোডে থাকি এবং টার্গেট বেঁচে থাকে, তাকে দেখব। না হলে র‍্যান্ডম কাউকে দেখব।
    let targetObj = player;
    if (isSpectating) {
        // যদি টার্গেট মারা যায় বা না থাকে, নতুন টার্গেট নিন
        if (!spectatingTarget || !bots.includes(spectatingTarget)) {
             spectatingTarget = bots[Math.floor(Math.random() * bots.length)];
        }
        targetObj = spectatingTarget || player;
    }

    const targetScale = Math.max(0.4, 12 / (targetObj.radius * 0.85)); 
    currentScale += (targetScale - currentScale) * 0.05;

    // targetObj ব্যবহার করে ক্যামেরা সেট
    let targetCamX = targetObj.x - (canvas.width / 2) / currentScale;
    let targetCamY = targetObj.y - (canvas.height / 2) / currentScale;
    
    cameraX += (targetCamX - cameraX) * 0.1;
    cameraY += (targetCamY - cameraY) * 0.1;
    const targetScale = Math.max(0.4, 12 / (player.radius * 0.85)); 
    currentScale += (targetScale - currentScale) * 0.05;

    let targetCamX = player.x - (canvas.width / 2) / currentScale;
    let targetCamY = player.y - (canvas.height / 2) / currentScale;
    
    cameraX += (targetCamX - cameraX) * 0.1;
    cameraY += (targetCamY - cameraY) * 0.1;

    let shakeX = 0;
    let shakeY = 0;
    if (shakeMagnitude > 0) {
        shakeX = (Math.random() - 0.5) * shakeMagnitude;
        shakeY = (Math.random() - 0.5) * shakeMagnitude;
        shakeMagnitude *= shakeDecay;
        if (shakeMagnitude < 0.5) shakeMagnitude = 0;
    }

    ctx.save();
    ctx.scale(currentScale, currentScale);
    ctx.translate(-cameraX + shakeX, -cameraY + shakeY); 

    drawGrid();

    // --- ৪. সাইবার ম্যাপ জোন ড্রয়িং ---
    if (currentMap === 'cyber' && gameRunning) {
        const centerX = WORLD_WIDTH / 2;
        const centerY = WORLD_HEIGHT / 2;

        if (!isPaused && zoneRadius > 300) {
            zoneRadius -= ZONE_SHRINK_RATE;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, zoneRadius, 0, Math.PI*2);
        ctx.lineWidth = 30;
        ctx.strokeStyle = DANGER_BORDER_COLOR;
        
        if (graphicsQuality === 'high') {
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.stroke();
        
        // জোনের বাইরের লাল এরিয়া
        ctx.beginPath();
        ctx.arc(centerX, centerY, zoneRadius, 0, Math.PI*2);
        ctx.rect(WORLD_WIDTH + 5000, -5000, -WORLD_WIDTH - 10000, WORLD_HEIGHT + 10000); 
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.fill("evenodd");
        ctx.restore();

        // জোন ড্যামেজ লজিক
        const distFromCenter = Math.hypot(player.x - centerX, player.y - centerY);
        const distToEdge = zoneRadius - distFromCenter;

        if (distFromCenter > zoneRadius) {
            if (player.tailLength > 1) { 
                player.tailLength -= 0.15; 
                player.grow(0); 
                
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(cameraX, cameraY, canvas.width/currentScale, canvas.height/currentScale);
                
                ctx.fillStyle = '#ff1744';
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = "center";
                ctx.fillText("⚠️ ZONE DAMAGE! ⚠️", player.x, player.y - 120);
            } else {
                gameOver(); 
            }
        } 
        else if (distToEdge < 500) {
            ctx.fillStyle = '#FFEA00'; 
            ctx.font = 'bold 25px Arial';
            ctx.textAlign = "center";
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                ctx.fillText("⚠️ Warning: Zone is Near! ⚠️", player.x, player.y - 150);
            }
        }
    }

    // ম্যাপ বর্ডার
    ctx.strokeStyle = '#FF3333';
    ctx.lineWidth = 15 / currentScale; 
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    // --- ৫. পাওয়ার-আপ ম্যানেজমেন্ট ---
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.draw();
        
        const distPlayer = Math.hypot(player.x - p.x, player.y - p.y);
        if (distPlayer < player.radius + p.radius) {
            player.activatePowerUp(p.type);
            playSound('eat');
            powerUps.splice(i, 1);
            powerUps.push(new PowerUp()); 
            continue;
        }
        
        for (let bot of bots) {
            const distBot = Math.hypot(bot.x - p.x, bot.y - p.y);
            if (distBot < bot.radius + p.radius) {
                bot.activatePowerUp(p.type);
                powerUps.splice(i, 1);
                powerUps.push(new PowerUp());
                break;
            }
        }
    }

    // --- ৬. খাবার এবং কয়েন ম্যানেজমেন্ট ---
    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        
        // ম্যাগনেট লজিক
        if (player.activePowerUps.magnet > 0) {
            const d = Math.hypot(player.x - f.x, player.y - f.y);
            if (d < 200) { 
                const angle = Math.atan2(player.y - f.y, player.x - f.x);
                f.vx += Math.cos(angle) * 1.5; f.vy += Math.sin(angle) * 1.5;
            }
        }
        bots.forEach(bot => {
             if (bot.activePowerUps.magnet > 0) {
                const d = Math.hypot(bot.x - f.x, bot.y - f.y);
                if (d < 200) {
                    const angle = Math.atan2(bot.y - f.y, bot.x - f.x);
                    f.vx += Math.cos(angle) * 1.5; f.vy += Math.sin(angle) * 1.5;
                }
             }
        });

        f.update(); 
        f.draw();

        let eaten = false;
        const distPlayer = Math.hypot(player.x - f.x, player.y - f.y);
        
        // প্লেয়ার খাচ্ছে
        if (distPlayer < player.radius + f.radius) {
            if (f.isCoin) {
                totalCoins += 10; 
                localStorage.setItem('snakeCoins', totalCoins); 
                
                const coinDisplay = document.getElementById('userCoinsDisplay');
                if (coinDisplay) coinDisplay.innerText = totalCoins;

                floatingMessages.push(new FloatingMessage(player.x, player.y - 30, "+10 💰", "#FFD700", 25));
            } else {
                player.grow(f.radius > 8 ? 3 : 1);
                score += f.radius > 8 ? 50 : 10;
            }
    // --- নতুন যোগ করা অংশ (Healing) ---
    // সাধারণ খাবার খেলে ১% এবং বড় খাবার খেলে ৫% হেলথ বাড়বে
    let healAmount = f.radius > 8 ? 5 : 1;
    player.currentHealth = Math.min(player.maxHealth, player.currentHealth + healAmount);
    // ----------------------------------

    playSound('eat');

            playSound('eat');
            updateScore();
            eaten = true;
        }

        if (!eaten) {
            for (let bot of bots) {
                const distBot = Math.hypot(bot.x - f.x, bot.y - f.y);
                if (distBot < bot.radius + f.radius) {
                    bot.grow(f.radius > 8 ? 3 : 1);
                    eaten = true;
                    break; 
                }
            }
        }

        if (eaten) {
            foods.splice(i, 1);
            if (foods.length < FOOD_COUNT) foods.push(new Food());
        }
    }

    // --- ৭. প্লেয়ার আপডেট ---
    // --- ৭. প্লেয়ার আপডেট ---
    if (!isSpectating) { // শুধু বেঁচে থাকলেই আপডেট হবে
        if (!player.update()) {
            gameOver(); // দেওয়ালে বা জোনে মরলে (কিলার নেই)
            ctx.restore();
            return;
        }
        player.draw();
    }
    
    // --- ৮. ফ্লোটিং টেক্সট ---
    for (let i = floatingMessages.length - 1; i >= 0; i--) {
        const fm = floatingMessages[i];
        if (!fm.update()) {
            floatingMessages.splice(i, 1);
        } else {
            fm.draw();
        }
    }

    // --- ৯. পার্টিকল এফেক্ট ---
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) {
            particles.splice(i, 1);
        } else {
            if (graphicsQuality === 'high') {
                particles[i].draw(); 
            } else {
                if (Math.random() > 0.5) particles[i].draw();
            }
        }
    }

    // --- ১০. বট এবং সংঘর্ষ লজিক (Bot Logic & Collision) ---
    const BODY_HITBOX_PADDING = 12; 
    const HEAD_HITBOX_PADDING = 2; 
    const isInvincible = Date.now() - gameStartTime < GRACE_PERIOD;

    bots.forEach((bot, index) => {
        let botDies = false;

        // ক. দেওয়ালের সাথে সংঘর্ষ
        if (bot.x < 0 || bot.x > WORLD_WIDTH || bot.y < 0 || bot.y > WORLD_HEIGHT) botDies = true;
        
        // খ. অন্য বটের সাথে সংঘর্ষ (Bot vs Bot)
        if (!botDies) {
            for (let otherBot of bots) {
                if (bot === otherBot) continue; // নিজের সাথে চেক করবে না

                // অন্য বটের শরীরের পাথের সাথে চেক
                for (let i = 0; i < otherBot.path.length; i += 5) {
                    const seg = otherBot.path[i];
                    const dist = Math.hypot(bot.x - seg.x, bot.y - seg.y);
                    
                    // যদি ধাক্কা লাগে
                    if (dist < (bot.radius + otherBot.radius - BODY_HITBOX_PADDING)) {
                        
                        // যদি শিল্ড থাকে
                        if (bot.activePowerUps.shield) {
                            bot.activePowerUps.shield = false;
                            createExplosion(bot.x, bot.y, '#2196F3');
                            break; // মরবে না
                        } else {
                            botDies = true;
                            otherBot.grow(1); // হত্যাকারী বট একটু বড় হবে
                            
                            // *** এখানে কিল ফিড কল করা হলো ***
                            // শুধুমাত্র স্ক্রিনে দেখা যাচ্ছে এমন বটদের কিল দেখাবে (অপশনাল, সব দেখাতে চাইলে if কন্ডিশন বাদ দিন)
                            // তবে সব দেখালে ভালো লাগবে:
                            showKillMessage(otherBot.name, bot.name, otherBot.color);
                            break;
                        }
                    }
                }
                if (botDies) break;
            }
        }


        // গ. বট আপডেট (যদি না মরে থাকে)
        if (!botDies) bot.update();

        // ঘ. প্লেয়ারের সাথে সংঘর্ষ (Player Kills Bot)
        if (!botDies) {
            for (let i = 10; i < player.path.length; i += 4) {
                const seg = player.path[i];
                const d = Math.hypot(bot.x - seg.x, bot.y - seg.y);
                
                if (d < (bot.radius + player.radius - BODY_HITBOX_PADDING)) {
                    if (bot.activePowerUps.shield) {
                        bot.activePowerUps.shield = false; 
                        createExplosion(bot.x, bot.y, '#2196F3'); 
                    } else {
                        botDies = true; 
                        score += 200; 
                        updateScore(); 
                        showKillMessage("You", bot.name, "#00e676"); 

                        // কিল স্ট্রিক লজিক
                        const now = Date.now();
                        if (now - lastKillTime < 5000) { 
                            playerKillStreak++;
                        } else {
                            playerKillStreak = 1;
                        }
                        lastKillTime = now;

                        let kText = "KILL!";
                        let kColor = "#fff";
                        let kSize = 30;
                        let kSound = "kill_normal";

                        if (playerKillStreak === 2) { 
                            kText = "DOUBLE KILL!"; kColor = "#FFEB3B"; kSize = 40; kSound = "double_kill";
                            speakText("Double Kill"); 
                        } else if (playerKillStreak === 3) { 
                            kText = "TRIPLE KILL!"; kColor = "#FF9800"; kSize = 50; kSound = "double_kill";
                            speakText("Triple Kill"); 
                        } else if (playerKillStreak === 4) { 
                            kText = "RAMPAGE!"; kColor = "#F44336"; kSize = 60; kSound = "rampage";
                            speakText("Rampage"); 
                        } else if (playerKillStreak >= 5) { 
                            kText = "GODLIKE!"; kColor = "#E040FB"; kSize = 70; kSound = "rampage";
                            addShake(10); 
                            speakText("Godlike"); 
                        }

                        floatingMessages.push(new FloatingMessage(player.x, player.y - 50, kText, kColor, kSize));
                        playSound(kSound);
                    }
                    break;
                }
            }
        }

        // ঙ. বট মারা গেলে
        if (botDies) {
            turnSnakeToFood(bot); 
            bots.splice(index, 1); 
            spawnBot(); 
            return;
        }
        
        // চ. বট ড্র করা
        bot.draw();

        // ছ. বট প্লেয়ারকে মারলে (Bot Kills Player)
        let playerDies = false;
        for (let i = 0; i < bot.path.length; i += 5) {
            const segment = bot.path[i];
            const dist = Math.hypot(player.x - segment.x, player.y - segment.y);
            if (dist < (player.radius + bot.radius - BODY_HITBOX_PADDING)) { playerDies = true; break; }
        }
        
        const headDist = Math.hypot(player.x - bot.x, player.y - bot.y);
        if (headDist < (player.radius + bot.radius - HEAD_HITBOX_PADDING)) playerDies = true;

        if (playerDies) {
            if (player.activePowerUps.shield) {
                player.activePowerUps.shield = false; 
                createExplosion(player.x, player.y, '#2196F3');
} else if (!isInvincible) {
                // প্লেয়ার মারা গেলে মেসেজ এবং গেম ওভার
                showKillMessage(bot.name, "You", bot.color);
                
                gameOver(bot); // <--- এখানে 'bot' পাস করতে হবে
            }
        }
    });

    ctx.restore();
    
    // --- ১১. মিনিম্যাপ এবং লিডারবোর্ড ---
    drawMiniMap();
    if (animationId % 10 === 0) updateLeaderboard();
    
        // --- টিম স্কোর আপডেট লজিক ---
    if (currentMap === 'team' && gameRunning) {
        let redMass = 0;
        let greenMass = 0;

        // প্লেয়ার এবং সব বটের স্কোর যোগ করা
        const allSnakes = [player, ...bots];
        allSnakes.forEach(s => {
            if (s.color === '#ff1744') redMass += s.tailLength; // লাল স্কোর
            else if (s.color === '#00e676') greenMass += s.tailLength; // সবুজ স্কোর
        });

        const total = redMass + greenMass;
        if (total > 0) {
            const redPercent = (redMass / total) * 100;
            const greenPercent = (greenMass / total) * 100;
            
            const redBar = document.getElementById('redScoreBar');
            const greenBar = document.getElementById('greenScoreBar');

            if(redBar) redBar.style.width = redPercent + '%';
            if(greenBar) greenBar.style.width = greenPercent + '%';
        }
    }

    
    animationId = requestAnimationFrame(animate);
}





function drawGrid() {
    const gridSize = 100;
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1a1a1a'; 
    ctx.shadowBlur = 0; 

    const startX = Math.floor(cameraX / gridSize) * gridSize;
    const startY = Math.floor(cameraY / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize;
    const endY = startY + canvas.height + gridSize;
    
    ctx.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
        ctx.moveTo(x, startY); ctx.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.moveTo(startX, y); ctx.lineTo(endX, y);
    }
    ctx.stroke();
    
    if(currentMap === 'cyber') {
        ctx.shadowBlur = 0;
    }
}


// --- রিসাইজ লজিক (রোটেশন ফিক্স সহ) ---
function resizeGame() {
    const isRotated = document.body.classList.contains('force-landscape') || 
                      document.body.classList.contains('force-portrait');

    if (isRotated) {
        // যদি রোটেট করা থাকে, তবে হাইট এবং উইডথ উল্টে যাবে
        canvas.width = window.innerHeight;
        canvas.height = window.innerWidth;
    } else {
        // সাধারণ অবস্থায়
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

// রিসাইজ ইভেন্ট লিসেনার
window.addEventListener('resize', resizeGame);
// গেম লোড হওয়ার সাথে সাথেই একবার কল করা
resizeGame();

window.addEventListener('mousemove', (e) => { 
    if (!isTouching) { 
        if (document.body.classList.contains('force-landscape')) {
            // ল্যান্ডস্কেপ মোডে কোঅর্ডিনেট সোয়্যাপ
            mouseX = e.clientY;
            mouseY = window.innerWidth - e.clientX;
        } else {
            mouseX = e.clientX; 
            mouseY = e.clientY; 
        }
    } 
});

window.addEventListener('mousedown', () => isBoosting = true);
window.addEventListener('mouseup', () => isBoosting = false);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') isBoosting = true;
    if (e.code === 'Escape') togglePause();
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') isBoosting = false; });

window.addEventListener('touchstart', (e) => {
    if (e.target === boostBtn) { e.preventDefault(); isBoosting = true; boostBtn.style.transform = 'scale(0.9)'; return; }
    if (isCustomizing) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('.skin-option') || e.target.closest('#inGameSettingsBtn')) return;
    if (!gameRunning) return;
    e.preventDefault();
    
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    isTouching = true;

    // --- রোটেশন ফিক্স ---
    if (document.body.classList.contains('force-landscape')) {
        touchStartX = touch.clientY;
        touchStartY = window.innerWidth - touch.clientX;
    } else {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
    // ------------------

    joyBase.style.display = 'block';
    joyBase.style.left = touchStartX + 'px'; // নোট: এটি ভিজ্যুয়াল পজিশন, তাই এখানে CSS লজিক আলাদা হতে পারে, তবে গেমপ্লের জন্য উপরের লজিক ঠিক আছে
    joyBase.style.top = touchStartY + 'px';
    joyStick.style.transform = `translate(-50%, -50%)`;
}, { passive: false });


window.addEventListener('touchmove', (e) => {
    if (e.target === boostBtn) return;
    if (!isTouching) return;
    e.preventDefault();
    let touch = null;
    for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === touchId) { touch = e.changedTouches[i]; break; } }
    if (!touch) return;

    // --- রোটেশন ফিক্স ---
    let currentX, currentY;
    if (document.body.classList.contains('force-landscape')) {
        currentX = touch.clientY;
        currentY = window.innerWidth - touch.clientX;
    } else {
        currentX = touch.clientX;
        currentY = touch.clientY;
    }
    // ------------------

    const dx = currentX - touchStartX;
    const dy = currentY - touchStartY;
    
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(Math.hypot(dx, dy), 50);
    const stickX = Math.cos(angle) * distance;
    const stickY = Math.sin(angle) * distance;
    joyStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    
    // গেমের প্লেয়ার আপডেট
    const centerX = (document.body.classList.contains('force-landscape') ? canvas.height : canvas.width) / 2;
    const centerY = (document.body.classList.contains('force-landscape') ? canvas.width : canvas.height) / 2;
    
    mouseX = centerX + Math.cos(angle) * 100;
    mouseY = centerY + Math.sin(angle) * 100;
}, { passive: false });


window.addEventListener('touchend', (e) => {
    if (e.target === boostBtn) { isBoosting = false; boostBtn.style.transform = 'scale(1)'; return; }
    for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === touchId) { isTouching = false; joyBase.style.display = 'none'; break; } }
});

// --- কাস্টম লেআউট লজিক ---
const draggableElementsIds = ['leaderboard', 'killFeed', 'miniMap', 'scoreArea', 'controls'];
let isCustomizing = false;
let selectedElement = null;

function startCustomLayout() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('layoutEditorControls').classList.remove('hidden');
    document.getElementById('controls').style.display = 'block';
    document.getElementById('uiLayer').style.pointerEvents = 'auto'; 
    isCustomizing = true;
    enableDragMode();
}

function enableDragMode() {
    draggableElementsIds.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.classList.add('draggable-active');
        el.addEventListener('mousedown', onInteractStart);
        el.addEventListener('touchstart', onInteractStart, {passive: false});
    });
}

function onInteractStart(e) {
    if (!isCustomizing) return;
    if(e.type === 'touchstart') e.preventDefault();
    const el = this;
    selectElement(el);
    startDrag(e, el);
}

function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('draggable-selected');
    selectedElement = el;
    selectedElement.classList.add('draggable-selected');
}

function resizeSelectedElement(delta) {
    if (!selectedElement) { alert("প্রথমে একটি উপাদান সিলেক্ট করুন।"); return; }
    const currentTransform = selectedElement.style.transform || 'scale(1)';
    let scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
    let currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    let newScale = Math.max(0.5, Math.min(currentScale + delta, 2.5));
    selectedElement.style.transform = `scale(${newScale})`;
}

function startDrag(e, el) {
    const isTouch = e.type === 'touchstart';
    const eventObj = isTouch ? e.touches[0] : e;
    const rect = el.getBoundingClientRect();
    const offsetX = eventObj.clientX - rect.left;
    const offsetY = eventObj.clientY - rect.top;

    el.style.right = 'auto'; el.style.bottom = 'auto';
    if (!el.style.width) el.style.width = rect.width + 'px';

    function moveElement(moveEvent) {
        const moveObj = isTouch ? moveEvent.touches[0] : moveEvent;
        let newX = moveObj.clientX - offsetX;
        let newY = moveObj.clientY - offsetY;
        newX = Math.max(0, Math.min(window.innerWidth - 50, newX));
        newY = Math.max(0, Math.min(window.innerHeight - 50, newY));
        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        el.style.position = 'absolute';
    }
    function stopDrag() {
        document.removeEventListener('mousemove', moveElement);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', moveElement);
        document.removeEventListener('touchend', stopDrag);
    }
    if (isTouch) { document.addEventListener('touchmove', moveElement, {passive: false}); document.addEventListener('touchend', stopDrag); } 
    else { document.addEventListener('mousemove', moveElement); document.addEventListener('mouseup', stopDrag); }
}

function saveCustomLayout() {
    const layoutData = {};
    draggableElementsIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.classList.remove('draggable-active');
            el.classList.remove('draggable-selected');
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
            let scale = 1;
            const transform = newEl.style.transform;
            if (transform && transform.includes('scale')) {
                let match = transform.match(/scale\(([^)]+)\)/);
                if (match) scale = match[1];
            }
            layoutData[id] = { left: newEl.style.left, top: newEl.style.top, scale: scale };
        }
    });
    localStorage.setItem('snakeCustomLayout', JSON.stringify(layoutData));
    isCustomizing = false; selectedElement = null;
    document.getElementById('layoutEditorControls').classList.add('hidden');
    document.getElementById('uiLayer').style.pointerEvents = 'none'; 
    if (!isMobile) document.getElementById('controls').style.display = 'none';
    document.getElementById('controls').style.pointerEvents = 'auto'; 
    document.getElementById('layoutEditorControls').style.pointerEvents = 'none';
    showStartScreen();
    window.location.reload();
}

function loadSavedLayout() {
    const saved = localStorage.getItem('snakeCustomLayout');
    if (saved) {
        const layoutData = JSON.parse(saved);
        draggableElementsIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && layoutData[id]) {
                el.style.position = 'absolute';
                if(layoutData[id].left) { el.style.left = layoutData[id].left; el.style.right = 'auto'; }
                if(layoutData[id].top) { el.style.top = layoutData[id].top; el.style.bottom = 'auto'; }
                if(layoutData[id].scale) el.style.transform = `scale(${layoutData[id].scale})`;
            }
        });
    }
}
// --- ম্যাপ সিস্টেম ---
let currentMap = 'classic'; 

// --- ম্যাপ এবং মোড সিলেকশন ---
function selectMap(mapName) {
    currentMap = mapName;
    
    // UI আপডেট (বাটন হাইলাইট করা)
    document.getElementById('btnClassic').style.background = 'rgba(255, 255, 255, 0.05)';
    document.getElementById('btnCyber').style.background = 'rgba(255, 255, 255, 0.05)';
    document.getElementById('btnTeam').style.border = '1px solid rgba(255, 255, 255, 0.1)'; // বর্ডার রিসেট

    if (mapName === 'classic') {
        document.getElementById('btnClassic').style.background = 'rgba(0, 230, 118, 0.2)';
    } else if (mapName === 'cyber') {
        document.getElementById('btnCyber').style.background = 'rgba(0, 230, 118, 0.2)';
    } else if (mapName === 'team') {
        // টিম বাটনে স্পেশাল হাইলাইট
        document.getElementById('btnTeam').style.border = '2px solid #fff';
        document.getElementById('btnTeam').style.boxShadow = '0 0 15px white';
    }
}


// --- পেজ ভিত্তিক শপ সিস্টেম ---

function openShopPage() {
    document.getElementById('startScreen').classList.add('hidden');
    const shopScreen = document.getElementById('shopScreen');
    shopScreen.classList.remove('hidden');
    
    document.getElementById('shopCoinsDisplay').innerText = totalCoins;
    loadShopSystem(); 
    checkDailyRewardStatus();
}


function returnToMenu() {
    document.getElementById('shopScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    updateHomeSkinPreview();
}

function updateHomeSkinPreview() {
    const preview = document.getElementById('homeSkinPreview');
    if (preview && selectedSkin) {
        preview.style.background = selectedSkin;
        preview.style.boxShadow = `0 0 20px ${selectedSkin}`;
    }
}

// --- ডেইলি রিওয়ার্ড সিস্টেম ---

function checkDailyRewardStatus() {
    const lastClaim = localStorage.getItem('snakeLastDailyClaim');
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; 
    
    const btn = document.getElementById('claimRewardBtn');
    const timerText = document.getElementById('rewardTimer');

    if (!btn || !timerText) return;

    if (!lastClaim || (now - lastClaim) > cooldown) {
        btn.classList.remove('disabled');
        btn.disabled = false;
        btn.innerHTML = "সংগ্রহ করুন (১০০ 💰)";
        timerText.innerHTML = "আপনার উপহার প্রস্তুত! 🎉";
        timerText.style.color = "#00e676"; 
    } else {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.innerHTML = "অপেক্ষা করুন";
        
        const timeLeft = cooldown - (now - lastClaim);
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        timerText.innerHTML = `পরবর্তী উপহার: ${hours} ঘঃ ${minutes} মিঃ`;
        timerText.style.color = "#ff1744"; 
    }
}

function claimDailyReward() {
    const lastClaim = localStorage.getItem('snakeLastDailyClaim');
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (!lastClaim || (now - lastClaim) > cooldown) {
        totalCoins += 100;
        localStorage.setItem('snakeCoins', totalCoins);
        localStorage.setItem('snakeLastDailyClaim', now);
        
        document.getElementById('shopCoinsDisplay').innerText = totalCoins;
        if(document.getElementById('userCoinsDisplay')) 
             document.getElementById('userCoinsDisplay').innerText = totalCoins;
        
        playSound('eat'); 
        alert("অভিনন্দন! আপনি ১০০টি ফ্রি কয়েন পেয়েছেন! 🎉");
        
        checkDailyRewardStatus();
    }
}

// --- প্রধান লোডিং ফাংশন (সবশেষে কল হবে) ---
// এটি ফাইলের একদম শেষে থাকবে
window.onload = function() {
    loadSavedLayout();
    
    loadShopSystem();
    
    const savedName = localStorage.getItem('snakePlayerName');
    if (savedName) {
        const nameInput = document.getElementById('playerNameInput');
        if(nameInput) nameInput.value = savedName;
    }

    if (!document.getElementById('shopScreen').classList.contains('hidden')) {
        checkDailyRewardStatus();
    }
    updateLevelUI();
    updateHomeSkinPreview();
};


// --- সেটিংস মেনু ফাংশনালিটি ---

// ১. গেম রিস্টার্ট (Restart) করার ফাংশন
function restartGame() {
    // পজ মেনু বন্ধ করা
    document.getElementById('pauseScreen').classList.add('hidden');
    isPaused = false;
    
    // আগের গেম লুপ বন্ধ করা
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    // গেম ওভার সাউন্ড বা মিউজিক রিসেট
    bgMusic.pause();
    bgMusic.currentTime = 0;
    
    // নতুন করে গেম শুরু
    startGame();
}

// ২. মেইন মেনুতে (Main Menu) ফিরে যাওয়ার ফাংশন
function quitToMenu() {
    document.getElementById('inGameSettingsBtn').style.display = 'none';
    // পজ মেনু বন্ধ করা
    document.getElementById('pauseScreen').classList.add('hidden');
    isPaused = false;
    gameRunning = false;
    cancelAnimationFrame(animationId);

    // মিউজিক বন্ধ করা
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // জয়স্টিক এবং অন্যান্য UI লুকানো
    joyBase.style.display = 'none';
    isTouching = false;
    isBoosting = false;

    // স্টার্ট স্ক্রিন দেখানো
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    // হোম পেজের স্কিন প্রিভিউ আপডেট
    updateHomeSkinPreview();
}

// --- স্ক্রিন ওরিয়েন্টেশন ফাংশন ---
// --- নতুন স্ক্রিন ওরিয়েন্টেশন ফাংশন (CSS ভিত্তিক) ---
function changeOrientation(mode) {
    const body = document.body;
    
    // আগের সব ক্লাস মুছে ফেলা
    body.classList.remove('force-landscape', 'force-portrait');
    
    // বর্তমান স্ক্রিনের সাইজ চেক করা
    const isActuallyPortrait = window.innerHeight > window.innerWidth;

    if (mode === 'landscape') {
        if (isActuallyPortrait) {
            body.classList.add('force-landscape');
            alert("ল্যান্ডস্কেপ মোড চালু হয়েছে ↔");
        } else {
            alert("আপনি ইতিমধ্যেই ল্যান্ডস্কেপ মোডে আছেন!");
        }
    } else if (mode === 'portrait') {
        if (!isActuallyPortrait) {
            body.classList.add('force-portrait');
            alert("পোর্ট্রেট মোড চালু হয়েছে ↕");
        } else {
            alert("পোর্ট্রেট মোড রিসেট করা হয়েছে।");
        }
    }

    // ক্লাস যোগ করার পর ক্যানভাস রিসাইজ করতে হবে
    setTimeout(() => {
        resizeGame(); // আমাদের নতুন রিসাইজ ফাংশন
        window.dispatchEvent(new Event('resize')); // ডাবল চেক
    }, 100);
}

// --- রিভাইভ সিস্টেম লজিক ---

let reviveCountdown;
let reviveInterval;

function showReviveScreen() {
    gameRunning = false; // গেম পজ করা
    cancelAnimationFrame(animationId);
    
    document.getElementById('reviveScreen').classList.remove('hidden');
    document.getElementById('uiLayer').style.display = 'none'; // UI লুকানো
    
    let timeLeft = 5;
    const timerEl = document.getElementById('reviveTimer');
    timerEl.innerText = timeLeft;
    
    // টাইমার চালু
    clearInterval(reviveInterval);
    reviveInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            cancelRevive(); // সময় শেষ হলে গেম ওভার
        }
    }, 1000);
}

function useRevive() {
    const reviveCost = 200;
    
    if (totalCoins >= reviveCost) {
        clearInterval(reviveInterval);
        
        // কয়েন কাটা
        totalCoins -= reviveCost;
        localStorage.setItem('snakeCoins', totalCoins);
        if(document.getElementById('userCoinsDisplay')) 
             document.getElementById('userCoinsDisplay').innerText = totalCoins;
             
        // প্লেয়ারকে রিসেট করা (কিন্তু সাইজ ঠিক রাখা)
        hasRevived = true; // একবারই সুযোগ পাবে
        
        document.getElementById('reviveScreen').classList.add('hidden');
        document.getElementById('uiLayer').style.display = 'block';
        
        // প্লেয়ারকে নিরাপদ জায়গায় সরানো এবং সুরক্ষা দেওয়া
        player.x = Math.random() * WORLD_WIDTH;
        player.y = Math.random() * WORLD_HEIGHT;
        gameStartTime = Date.now(); // আবার সুরক্ষা (Invincible) পাবে
        
        // গেম আবার চালু
        gameRunning = true;
        animate();
        playSound('boost'); // সাউন্ড এফেক্ট
        
    } else {
        alert("আপনার পর্যাপ্ত কয়েন নেই! (২০০ দরকার)");
    }
}

function cancelRevive() {
    clearInterval(reviveInterval);
    document.getElementById('reviveScreen').classList.add('hidden');
    document.getElementById('uiLayer').style.display = 'block';
    hasRevived = true; 
    
    // পেন্ডিং কিলারকে পাস করা হলো
    gameOver(pendingKiller); 
}


function updateLevelUI() {
    const levelDisplay = document.getElementById('playerLevelDisplay');
    const xpDisplay = document.getElementById('playerXPDisplay');
    const xpBar = document.getElementById('xpProgressBar');
    
    if (levelDisplay && xpDisplay && xpBar) {
        xpNeedForNextLevel = userLevel * 500;
        
        levelDisplay.innerText = `LEVEL ${userLevel}`;
        levelDisplay.style.color = '#00e676';
        levelDisplay.style.fontWeight = 'bold';
        
        xpDisplay.innerText = `${currentXP} / ${xpNeedForNextLevel} XP`;
        
        const percentage = (currentXP / xpNeedForNextLevel) * 100;
        xpBar.style.width = `${Math.min(percentage, 100)}%`;
}
}