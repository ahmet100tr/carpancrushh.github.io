/* ====================== AYARLAR ====================== */
const ROWS = 6, COLS = 3;
let values = new Array(ROWS * COLS).fill(0);
let currentLevel = 8;
let totalPopped = 0;

/* ====================== AĞIRLIK HAVUZLARI ====================== */
let weightPools = {
    8:  {1:4, 2:5, 4:5, 5:1, 6:2, 8:3, 9:1, 10:1},
    16: {1:3, 2:4, 3:2, 4:5, 7:1, 8:4, 16:2, 18:1},
    24: {1:3, 2:5, 3:5, 4:4, 5:2, 6:4, 8:3, 9:2, 12:3, 15:1, 24:1, 30:1},
    30: {1:3, 2:4, 3:5, 4:3, 5:5, 6:4, 8:1, 9:1, 10:3, 15:3, 30:2, 45:1},
    60: {1:4, 2:4, 3:4, 4:3, 5:4, 6:3, 7:1, 10:3, 12:2, 15:2, 20:2, 30:1, 35:1, 40:1, 60:1, 90:1}
};

function weightedRandom() {
    let pool = weightPools[currentLevel];
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
        c.textContent = values[i];
        c.dataset.i = i;
        c.addEventListener("mousedown", startDrag);
        g.appendChild(c);
    }
}

/* ====================== DRAG-SWAP (YUMUŞAK) ====================== */
let dragIndex = null;

function startDrag(e) {
    dragIndex = Number(e.target.dataset.i);
    document.addEventListener("mouseup", endDrag);
}

async function endDrag(e) {
    document.removeEventListener("mouseup", endDrag);

    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || !target.classList.contains("cell")) return;

    let dropIndex = Number(target.dataset.i);

    if (Math.abs(dragIndex - dropIndex) === COLS) {
        await softSwap(dragIndex, dropIndex);
        await processMove();
    }
}

function softSwap(a, b) {
    return new Promise(res => {
        let g = document.getElementById("grid");
        let ca = g.children[a], cb = g.children[b];

        let dy = (b - a === COLS) ? "100px" : "-100px";

        ca.style.setProperty("--dy", dy);
        cb.style.setProperty("--dy", dy === "100px" ? "-100px" : "100px");

        ca.classList.add("swap-anim");
        cb.classList.add("swap-anim");

        setTimeout(() => {
            [values[a], values[b]] = [values[b], values[a]];
            renderGrid();
            res();
        }, 180);
    });
}

/* ====================== PATTIRLATMA ====================== */
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
    const rect = cell.getBoundingClientRect();
    for (let p = 0; p < 14; p++) {
        let part = document.createElement("div");
        part.className = "particle";
        part.style.left = (rect.left + 40) + "px";
        part.style.top = (rect.top + 40) + "px";
        part.style.setProperty("--dx", (Math.random() * 140 - 70) + "px");
        part.style.setProperty("--dy", (Math.random() * 140 - 70) + "px");
        document.body.appendChild(part);
        setTimeout(() => part.remove(), 600);
    }
}

function popRow(r) {
    let base = r * COLS;
    for (let c = 0; c < COLS; c++) {
        spawnParticles(base + c);
        values[base + c] = 0;
    }
    totalPopped += 3;
    updateScore();
}

/* ====================== GRAVITY ====================== */
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

/* ====================== TIKANMA TESPİTİ ====================== */
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

/* ====================== KARISTIRMA ====================== */
async function reshuffle() {
    showMsg("Tahta tıkalı — karıştırılıyor...");
    let g = document.getElementById("grid");

    g.classList.add("fade-out");
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

    g.classList.remove("fade-out");
    g.classList.add("fade-in");

    await delay(350);
    showMsg("Hazır ✔️");
}

/* ====================== ZİNCİRLEME KONTROL ====================== */
async function processMove() {
    let loop = true;
    while (loop) {
        let matches = findMatches();
        if (matches.length === 0) {
            if (isStuck()) await reshuffle();
            return;
        }
        for (let r of matches) popRow(r);
        applyGravity();
        renderGrid();
        await delay(200);

        if (totalPopped >= 24) {
            await delay(500);
            showVictory();
            return;
        }
    }
}

/* ====================== LEVEL BAŞLAT ====================== */
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
    document.getElementById("grid").classList.add("start-animation");
}

async function startLevel(lvl) {
    currentLevel = lvl;
    totalPopped = 0;

    document.getElementById("menu").style.display = "none";
    document.getElementById("game").style.display = "block";

    document.getElementById("targetText").textContent = "Hedef Çarpım: " + lvl;
    updateScore();

    await generatePlayableBoard();
}

/* ====================== YARDIMCI FONKSİYONLAR ====================== */
function updateScore() {
    document.getElementById("scoreText").textContent =
        "Patlatılan Hücre: " + totalPopped + " / 24";
}

function showMsg(t, timeout = 1200) {
    let m = document.getElementById("msg");
    m.textContent = t;
    if (timeout > 0) setTimeout(() => m.textContent = "", timeout);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ====================== ZAFER EKRANI FONKSİYONLARI ====================== */
function showVictory() {
    document.getElementById("victoryOverlay").style.display = "flex";
}

function backToMenu() {
    document.getElementById("victoryOverlay").style.display = "none";
    document.getElementById("game").style.display = "none";
    document.getElementById("menu").style.display = "flex";
}