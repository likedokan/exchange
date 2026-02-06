// --- সেটিংস ভেরিয়েবল (Global) ---
// এগুলো এখানে থাকলে script.js থেকেও এক্সেস করা যাবে
let graphicsQuality = localStorage.getItem('snakeGraphics') || 'high';
let musicEnabled = localStorage.getItem('snakeMusic') !== 'false'; // ডিফল্ট true
let sfxEnabled = localStorage.getItem('snakeSFX') !== 'false';     // ডিফল্ট true

// --- সেটিংস পেজ খোলার ফাংশন ---
function openSettingsPage() {
    const startScreen = document.getElementById('startScreen');
    const settingsScreen = document.getElementById('settingsScreen');
    
    // মেইন মেনু লুকিয়ে সেটিংস দেখাও
    if (startScreen) startScreen.classList.add('hidden');
    if (settingsScreen) settingsScreen.classList.remove('hidden');

    // UI আপডেট করা (আগের সেভ করা ডাটা অনুযায়ী)
    updateSettingsUI();
}

// --- সেটিংস পেজ বন্ধ করার ফাংশন ---
function closeSettingsPage() {
    const startScreen = document.getElementById('startScreen');
    const settingsScreen = document.getElementById('settingsScreen');

    // সেটিংস লুকিয়ে মেইন মেনু দেখাও
    if (settingsScreen) settingsScreen.classList.add('hidden');
    if (startScreen) startScreen.classList.remove('hidden');
}

// --- UI আপডেট করার লজিক ---
function updateSettingsUI() {
    // গ্রাফিক্স বাটন আপডেট
    const gfxHigh = document.getElementById('gfxHigh');
    const gfxLow = document.getElementById('gfxLow');

    if (gfxHigh && gfxLow) {
        if (graphicsQuality === 'high') {
            gfxHigh.classList.add('selected');
            gfxLow.classList.remove('selected');
        } else {
            gfxLow.classList.add('selected');
            gfxHigh.classList.remove('selected');
        }
    }

    // মিউজিক এবং সাউন্ড চেকবক্স আপডেট
    const musicCheck = document.getElementById('musicCheck');
    const sfxCheck = document.getElementById('sfxCheck');

    if (musicCheck) musicCheck.checked = musicEnabled;
    if (sfxCheck) sfxCheck.checked = sfxEnabled;
}

// --- গ্রাফিক্স সেট করা ---
function setGraphics(quality) {
    graphicsQuality = quality;
    localStorage.setItem('snakeGraphics', quality);
    updateSettingsUI();
    
    // ইউজারকে ফিডব্যাক দেওয়া
    if(quality === 'low') {
        // টোস্ট মেসেজ বা অ্যালার্ট (অপশনাল)
        console.log("Low Graphics Mode Activated"); 
    }
}

// --- মিউজিক টগল করা ---
function toggleMusic(isChecked) {
    musicEnabled = isChecked;
    localStorage.setItem('snakeMusic', musicEnabled);
    
    // bgMusic ভেরিয়েবলটি script.js এ আছে, তাই চেক করে নিতে হবে
    if (typeof bgMusic !== 'undefined') {
        if (musicEnabled) {
            // যদি গেম রানিং থাকে তবেই মিউজিক বাজবে
            if (typeof gameRunning !== 'undefined' && gameRunning && !isPaused) {
                bgMusic.play().catch(e => console.log(e));
            }
        } else {
            bgMusic.pause();
        }
    }
}

// --- সাউন্ড এফেক্ট টগল করা ---
function toggleSFX(isChecked) {
    sfxEnabled = isChecked;
    localStorage.setItem('snakeSFX', sfxEnabled);
}

// --- সেটিংস থেকে কাস্টম লেআউট এডিটর চালু করা ---
function startCustomLayoutFromSettings() {
    closeSettingsPage();
    // এই ফাংশনটি script.js এ আছে, তাই এটি কল হবে
    if (typeof startCustomLayout === 'function') {
        startCustomLayout(); 
    } else {
        console.error("startCustomLayout function not found!");
    }
}
