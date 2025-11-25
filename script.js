/* ====================== AYARLAR ====================== */
const ROWS = 6, COLS = 3;
let values = new Array(ROWS * COLS).fill(0);
let currentLevel = 8;
let totalPopped = 0;

// GLOBAL PUAN SİSTEMİ
let globalScore = parseInt(localStorage.getItem("carpanTarlasi_score")) || 0;

// İPUCU ZAMANLAYICISI
let hintTimer = null;

/* ====================== SES MOTORU (WEB AUDIO API) ====================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume(); 

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } 
    else if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    }
    else if (type === 'bonus') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
    else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    else if (type === 'hint') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
    else if (type === 'win') {
        playNote(523.25, now, 0.1); 
        playNote(659.25, now + 0.1, 0.1); 
        playNote(783.99, now + 0.2, 0.2); 
        playNote(1046.50, now + 0.4, 0.4); 
    }
}

function playNote(freq, time, dur) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.start(time);
    osc.stop(time + dur);
}

/* ====================== AĞIRLIK HAVUZLARI ====================== */
let weightPools = {
    8:  {1:4, 2:5, 3:1, 4:5, 8:2}, 
    12: {1:4, 2:5, 3:5, 4:4, 6:3, 9:1, 12:2},
    16: {1:4, 2:4, 4:5, 3:1, 8:4, 16:2},
    18: {1:4, 2:4, 3:6, 6:3, 8:1, 9:3, 18:2},
    20: {1:4, 2:5, 4:5, 5:4, 8:1, 10:2, 20:2},
    24: {1:4, 2:5, 3:5, 4:4, 6:4, 8:3, 12:2, 15:1, 24:2},
    27: {1:5, 3:8, 9:4, 14:1, 27:2},
    30: {1:4, 2:4, 3:5, 4:2, 5:5, 6:4, 10:3, 12:1, 15:2, 30:2},
    36: {1:4, 2:4, 3:4, 4:4, 6:5, 9:4, 12:3, 14:1, 18:3, 36:2},
    40: {1:4, 2:5, 4:5, 5:5, 6:1, 8:3, 10:3, 20:1, 40:2},
    48: {1:4, 2:4, 3:4, 4:5, 6:4, 8:3, 12:3, 15:1, 16:2, 24:2, 48:2},
    60: {1:4, 2:4, 3:3, 4:3, 5:4, 6:3, 10:3, 12:2, 15:2, 16:1, 20:3, 30:2, 60:2}
};

window.onload = function() {
    updateGlobalScoreUI();
    createStars(); 
};

function weightedRandom() {
    let pool = weightPools[currentLevel];
    if(!pool) pool = {1:5, 2:5, 4:5}; 

    let sum = Object.values(pool).reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let k in pool) {
        if (r < pool[k]) return Number(k);
        r -= pool[k];
    }
}

/* ====================== RENDER ====================== */
function renderGrid() {
    let g = document.getElementById("grid");
    g.innerHTML = "";
    for (let i = 0; i < values.length; i++) {
        let c = document.createElement("div");
        c.className = "cell";
        
        let val = values[i];
        c.textContent = val;
        c.dataset.i = i;
        
        if(val === 2) c.classList.add("prime-2");
        if(val === 3) c.classList.add("prime-3");
        if(val === 5) c.classList.add("prime-5");

        c.addEventListener("mousedown", startDrag);
        c.addEventListener("touchstart", startDrag, {passive: false});
        g.appendChild(c);
    }
}

/* ====================== CANLI SÜRÜKLEME (LIVE DRAG) & HATA ====================== */
let dragIndex = null;
let touchStartY = 0;
let activeCell = null; // Şu an sürüklenen DOM elementi

function startDrag(e) {
    // Sadece sol tık veya dokunma
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    if (audioCtx.state === 'suspended') audioCtx.resume();

    resetHintTimer();
    clearHints();

    // Tıklanan hedefi bul (sayıya tıklansa bile ana kutuyu al)
    let target = e.target.closest('.cell');
    if(!target) return;

    activeCell = target;
    dragIndex = Number(activeCell.dataset.i);

    if(e.type === 'touchstart') {
        // --- DOKUNMATİK BAŞLANGIÇ ---
        touchStartY = e.touches[0].clientY;
        // Parmağı takip etmesi için 'touchmove' dinleyicisi ekle
        // passive: false önemli, çünkü preventDefault kullanacağız
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    } else {
        // --- MOUSE BAŞLANGIÇ ---
        document.addEventListener('mouseup', endDragMouse);
    }
}

// --- CANLI TAKİP (TOUCHMOVE) ---
function handleTouchMove(e) {
    // Sayfanın kaymasını engelle (Scroll kill)
    e.preventDefault(); 
    
    if(!activeCell) return;

    // Parmağın anlık konumu ve başlangıca göre farkı
    let currentY = e.touches[0].clientY;
    let diffY = currentY - touchStartY;

    // Görsel Geri Bildirim: Kutucuğu parmakla beraber hareket ettir
    // Maksimum 100px yukarı veya aşağı gitmesine izin ver (Görsel sınır)
    let moveY = Math.max(-100, Math.min(100, diffY));
    
    // CSS transform ile anlık konumlandırma
    activeCell.style.transform = `translateY(${moveY}px)`;
    activeCell.style.zIndex = 100; // Diğerlerinin üzerinde görünsün
    // CSS geçişlerini geçici olarak kapat ki anlık tepki versin
    activeCell.style.transition = 'none';
}

// --- DOKUNMA BİTİŞ (TOUCHEND) ---
async function handleTouchEnd(e) {
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);

    if(!activeCell) return;

    // Bırakılan yerdeki son parmak pozisyonu
    let endY = e.changedTouches[0].clientY;
    let diffY = endY - touchStartY;
    
    // Görsel değişiklikleri sıfırla (CSS eski haline dönsün)
    activeCell.style.transform = ''; 
    activeCell.style.zIndex = '';
    activeCell.style.transition = ''; // Transition'ı geri aç

    // EŞİK DEĞERİ: En az 40 piksel sürüklenmiş olmalı
    const SWIPE_THRESHOLD = 40;
    let targetIndex = null;

    // Aşağı mı Yukarı mı?
    if (diffY > SWIPE_THRESHOLD) {
        // AŞAĞI SWIPE -> Alt komşu var mı?
        if (dragIndex + COLS < ROWS * COLS) {
            targetIndex = dragIndex + COLS;
        }
    } else if (diffY < -SWIPE_THRESHOLD) {
        // YUKARI SWIPE -> Üst komşu var mı?
        if (dragIndex - COLS >= 0) {
            targetIndex = dragIndex - COLS;
        }
    }

    activeCell = null; // Temizle

    // Geçerli bir hedef varsa işlemi yap
    if (targetIndex !== null) {
        await executeMove(dragIndex, targetIndex);
    } else {
        // Hamle yapılmadı, ipucunu tekrar başlat
        resetHintTimer();
    }
}

// --- MOUSE BİTİŞ (ESKİ MANTIK) ---
async function endDragMouse(e) {
    document.removeEventListener('mouseup', endDragMouse);
    activeCell = null;

    let clientX = e.clientX;
    let clientY = e.clientY;

    let target = document.elementFromPoint(clientX, clientY);
    if (!target) { resetHintTimer(); return; }
    
    target = target.closest('.cell');
    if(!target) { resetHintTimer(); return; }

    let dropIndex = Number(target.dataset.i);

    if (Math.abs(dragIndex - dropIndex) === COLS) {
        await executeMove(dragIndex, dropIndex);
    } else {
        resetHintTimer();
    }
}

// --- ORTAK HAMLE ÇALIŞTIRICI (Touch ve Mouse için) ---
async function executeMove(fromIdx, toIdx) {
    playSound('move'); // Hamle sesi
    await softSwap(fromIdx, toIdx);
    
    let matches = findMatches();
    if (matches.length > 0) {
        await processMove();
    } else {
        playSound('error'); // Hata sesi
        await triggerErrorEffect();
        await softSwap(fromIdx, toIdx); // Geri al
        resetHintTimer();
    }
}

async function triggerErrorEffect() {
    let g = document.getElementById("grid");
    g.classList.add("error-shake"); 
    await delay(400); 
    g.classList.remove("error-shake"); 
}

function softSwap(a, b) {
    return new Promise(res => {
        let g = document.getElementById("grid");
        let ca = g.children[a], cb = g.children[b];
        let isDown = (b - a === COLS); 
        let dy = isDown ? "100%" : "-100%"; 
        let dyRev = isDown ? "-100%" : "100%";

        ca.style.setProperty("--dy", dy);
        cb.style.setProperty("--dy", dyRev);
        ca.classList.add("swap-anim");
        cb.classList.add("swap-anim");

        setTimeout(() => {
            [values[a], values[b]] = [values[b], values[a]];
            renderGrid();
            res();
        }, 180);
    });
}

/* ====================== İPUCU SİSTEMİ ====================== */
function resetHintTimer() {
    if(hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(showHint, 25000);
}

function clearHints() {
    let cells = document.querySelectorAll(".cell");
    cells.forEach(c => c.classList.remove("hint-active"));
}

function showHint() {
    let move = findPossibleMove();
    
    if(move) {
        playSound('hint');

        globalScore -= 15;
        localStorage.setItem("carpanTarlasi_score", globalScore);
        updateScoreUI();
        
        showFloatingPenalty();

        let g = document.getElementById("grid");
        let c1 = g.children[move[0]];
        let c2 = g.children[move[1]];
        
        if(c1) c1.classList.add("hint-active");
        if(c2) c2.classList.add("hint-active");
    }
}

function findPossibleMove() {
    for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS; c++) {
            let i = r * COLS + c;     
            let j = (r + 1) * COLS + c; 
            [values[i], values[j]] = [values[j], values[i]];
            let m = findMatches();
            [values[i], values[j]] = [values[j], values[i]];
            if(m.length > 0) return [i, j];
        }
    }
    return null; 
}

function showFloatingPenalty() {
    let scoreBox = document.querySelector(".score-box");
    if(!scoreBox) return;
    let rect = scoreBox.getBoundingClientRect();

    let floater = document.createElement("div");
    floater.className = "floating-penalty";
    floater.textContent = "İpucu -8";
    floater.style.left = (rect.left + 30) + "px"; 
    floater.style.top = (rect.bottom + 5) + "px";

    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 2000);
}

/* ====================== OYUN MANTIĞI ====================== */
function findMatches() {
    let rows = [];
    for (let r = 0; r < ROWS; r++) {
        let i = r * COLS;
        let p = values[i] * values[i + 1] * values[i + 2];
        if (p === currentLevel) rows.push(r);
    }
    return rows;
}

function spawnParticles(i) {
    const cell = document.getElementById("grid").children[i];
    if(!cell) return;
    const rect = cell.getBoundingClientRect();
    const size = rect.width;

    for (let p = 0; p < 14; p++) {
        let part = document.createElement("div");
        part.className = "particle";
        part.style.left = (rect.left + size/2) + "px";
        part.style.top = (rect.top + size/2) + "px";
        part.style.setProperty("--dx", (Math.random() * 140 - 70) + "px");
        part.style.setProperty("--dy", (Math.random() * 140 - 70) + "px");
        document.body.appendChild(part);
        setTimeout(() => part.remove(), 600);
    }
}

/* ====================== PUANLAMA & BONUS ====================== */
function popRow(r) {
    let base = r * COLS;
    let earnedPoints = 0;
    let bonusPoints = 0;
    let hasBonus = false;

    for (let c = 0; c < COLS; c++) {
        let idx = base + c;
        let val = values[idx];

        spawnParticles(idx);
        values[idx] = 0;
        
        let point = 3;
        
        if(val === 2 || val === 3 || val === 5) {
            point += 7; 
            bonusPoints += 7;
            hasBonus = true;
        }
        
        earnedPoints += point;
    }
    
    if (hasBonus) playSound('bonus');
    else playSound('pop');

    totalPopped += 3;
    globalScore += earnedPoints;
    
    if(bonusPoints > 0) {
        showFloatingBonus(bonusPoints);
    }
    
    localStorage.setItem("carpanTarlasi_score", globalScore);
    updateScoreUI();
}

function showFloatingBonus(amount) {
    let scoreBox = document.querySelector(".score-box");
    if(!scoreBox) return;
    let rect = scoreBox.getBoundingClientRect();

    let floater = document.createElement("div");
    floater.className = "floating-bonus";
    floater.textContent = "Asal Sayı Bonusu +" + amount;
    floater.style.left = (rect.left - 40) + "px"; 
    floater.style.top = (rect.bottom + 5) + "px";

    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 2000);
}

function applyGravity() {
    for (let c = 0; c < COLS; c++) {
        let col = [];
        for (let r = 0; r < ROWS; r++) {
            let i = r * COLS + c;
            if (values[i] !== 0) col.push(values[i]);
        }
        while (col.length < ROWS) col.unshift(weightedRandom());
        for (let r = 0; r < ROWS; r++) {
            values[r * COLS + c] = col[r];
        }
    }
}

function isStuck() {
    if (findMatches().length > 0) return false;
    for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS; c++) {
            let i = r * COLS + c, j = (r + 1) * COLS + c;
            [values[i], values[j]] = [values[j], values[i]];
            let m = findMatches().length;
            [values[i], values[j]] = [values[j], values[i]];
            if (m > 0) return false;
        }
    }
    return true;
}

async function reshuffle() {
    showMsg("Karıştırılıyor...");
    let g = document.getElementById("grid");
    g.style.opacity = "0.5"; 
    await delay(350);

    let ok = false;
    while (!ok) {
        for (let i = 0; i < values.length; i++) {
            values[i] = weightedRandom();
        }
        applyGravity();
        renderGrid();
        if (findMatches().length > 0) continue;
        if (!isStuck()) ok = true;
    }

    g.style.opacity = "1"; 
    await delay(350);
    showMsg("Hazır ✔️");
    resetHintTimer();
}

async function processMove() {
    if(hintTimer) clearTimeout(hintTimer);
    clearHints();

    let loop = true;
    while (loop) {
        let matches = findMatches();
        if (matches.length === 0) {
            if (isStuck()) await reshuffle();
            else resetHintTimer(); 
            return;
        }
        for (let r of matches) popRow(r);
        applyGravity();
        renderGrid();
        await delay(200);

        if (totalPopped >= 24) {
            await delay(500);
            playSound('win'); 
            showVictory();
            return;
        }
    }
}

/* ====================== YÖNETİM & UI ====================== */
async function generatePlayableBoard() {
    let ok = false;
    while (!ok) {
        for (let i = 0; i < values.length; i++) {
            values[i] = weightedRandom();
        }
        applyGravity();
        renderGrid();
        if (findMatches().length > 0) continue;
        if (!isStuck()) ok = true;
    }
}

async function startLevel(lvl) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    currentLevel = lvl;
    totalPopped = 0;
    
    document.getElementById("menu").style.display = "none";
    let gameEl = document.getElementById("game");
    gameEl.style.display = "flex";
    
    gameEl.classList.remove("game-enter");
    void gameEl.offsetWidth; 
    gameEl.classList.add("game-enter");

    let targetEl = document.getElementById("targetVal");
    if(targetEl) targetEl.textContent = lvl; 
    
    updateScoreUI();
    
    await generatePlayableBoard();
    resetHintTimer();
}

function updateScoreUI() {
    document.getElementById("progressVal").textContent = totalPopped + " / 24";
    updateGlobalScoreUI();
}

function updateGlobalScoreUI() {
    let hudScore = document.getElementById("globalScoreVal");
    let menuScore = document.getElementById("menuScoreDisplay");
    
    if(hudScore) hudScore.textContent = globalScore;
    if(menuScore) menuScore.textContent = "Puan: " + globalScore;
}

function showMsg(t, timeout = 1200) {
    let m = document.getElementById("msg");
    m.textContent = t;
    if (timeout > 0) setTimeout(() => m.textContent = "", timeout);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function showVictory() {
    if(hintTimer) clearTimeout(hintTimer);
    clearHints();

    document.getElementById("victoryOverlay").style.display = "flex";
    document.getElementById("victoryScore").textContent = "Toplam Puan: " + globalScore;
}

function backToMenu() {
    if(hintTimer) clearTimeout(hintTimer);
    
    document.getElementById("victoryOverlay").style.display = "none";
    document.getElementById("game").style.display = "none";
    document.getElementById("menu").style.display = "flex";
    updateGlobalScoreUI(); 
}

function createStars() {
    const bg = document.getElementById("background-layer");
    if(!bg) return;
    bg.innerHTML = "";
    const starCount = 100; 

    for(let i=0; i<starCount; i++) {
        let star = document.createElement("div");
        star.className = "bg-star";
        
        let x = Math.random() * 100;
        let y = Math.random() * 100;
        let size = Math.random() * 2 + 1;
        let duration = Math.random() * 3 + 2; 

        star.style.left = x + "%";
        star.style.top = y + "%";
        star.style.width = size + "px";
        star.style.height = size + "px";
        star.style.animationDuration = duration + "s";

        bg.appendChild(star);
    }
}


