import { supabase } from "./supabase.js";

// ========================================
// UI ELEMENTS
// ========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");

const startScreen = document.getElementById("start-screen");
const nameScreen = document.getElementById("name-screen");
const howToScreen = document.getElementById("how-to-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const leaderboardScreen =
    document.getElementById("leaderboard-screen");

const playButton =
    document.getElementById("play-button");

const howToButton =
    document.getElementById("how-to-button");

const backButton =
    document.getElementById("back-button");

const startFromHowButton =
    document.getElementById("start-from-how-button");

const restartButton =
    document.getElementById("restart-button");

const leaderboardButton =
    document.getElementById("leaderboard-button");

const changeNameButton =
    document.getElementById("change-name-button");

const saveNameButton =
    document.getElementById("save-name-button");

const nameBackButton =
    document.getElementById("name-back-button");

const playerNameInput =
    document.getElementById("player-name");

const nameStatus =
    document.getElementById("name-status");

const currentPlayer =
    document.getElementById("current-player");

const finalScoreElement =
    document.getElementById("final-score");

const finalMessageElement =
    document.getElementById("final-message");

const saveScoreButton =
    document.getElementById("save-score-button");

const saveStatus =
    document.getElementById("save-status");

const leaderboardList =
    document.getElementById("leaderboard-list");

const leaderboardBackButton =
    document.getElementById(
        "leaderboard-back-button"
    );

const leaderboardPlayButton =
    document.getElementById(
        "leaderboard-play-button"
    );


// ========================================
// PLAYER NAME
// ========================================

const NAME_STORAGE_KEY =
    "modakCatchPlayerName";

let playerName =
    localStorage.getItem(NAME_STORAGE_KEY) || "";


// ========================================
// GAME VARIABLES
// ========================================

const laneCount = 4;

let bowlLane = 1;

let score = 0;
let lives = 3;

let objects = [];

let spawnTimer = 0;
let gameTime = 0;

let spawnInterval = 0.8;
let fallingSpeed = 180;

let gameRunning = false;

let lastTime = performance.now();


// ========================================
// POLISH EFFECTS
// ========================================

let scorePopups = [];
let particles = [];


// ========================================
// CANVAS
// ========================================

function resizeCanvas() {

    const container =
        document.getElementById(
            "game-container"
        );

    canvas.width =
        container.clientWidth;

    canvas.height =
        container.clientHeight;

    draw();
}

window.addEventListener(
    "resize",
    resizeCanvas
);

resizeCanvas();


// ========================================
// LANE POSITION
// ========================================

function laneX(lane) {

    const laneWidth =
        canvas.width / laneCount;

    return (
        lane * laneWidth +
        laneWidth / 2
    );
}


// ========================================
// SCREEN MANAGEMENT
// ========================================

function hideAllScreens() {

    startScreen.classList.add("hidden");
    nameScreen.classList.add("hidden");
    howToScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    leaderboardScreen.classList.add("hidden");
}


// ========================================
// SHOW START SCREEN
// ========================================

function showStartScreen() {

    hideAllScreens();

    startScreen.classList.remove(
        "hidden"
    );
}


// ========================================
// NAME SCREEN
// ========================================

function showNameScreen() {

    hideAllScreens();

    nameScreen.classList.remove(
        "hidden"
    );

    playerNameInput.value =
        playerName;

    nameStatus.textContent = "";

    setTimeout(() => {

        playerNameInput.focus();

    }, 100);
}


// ========================================
// START GAME
// ========================================

function beginPlaying() {

    resetGame();

    hideAllScreens();
}


// ========================================
// PLAY BUTTON
// ========================================

function handlePlayButton() {

    if (playerName) {

        beginPlaying();

    } else {

        showNameScreen();

    }
}


// ========================================
// CHECK IF NAME EXISTS
// ========================================

async function checkNameExists(name) {

    const {
        data,
        error
    } = await supabase
        .from("modak_leaderboard")
        .select("player_name")
        .eq("player_name", name)
        .maybeSingle();

    if (error) {

        console.error(
            "Name check error:",
            error
        );

        return {
            exists: false,
            error: true
        };
    }

    return {
        exists: !!data,
        error: false
    };
}


// ========================================
// SAVE PLAYER NAME
// ========================================

async function savePlayerName() {

    const enteredName =
        playerNameInput.value.trim();

    if (!enteredName) {

        nameStatus.textContent =
            "Please enter your name.";

        playerNameInput.focus();

        return;
    }

    const cleanName =
        enteredName.substring(0, 20);


    // ====================================
    // If this is already the current player
    // allow them to continue
    // ====================================

    if (
        playerName &&
        cleanName.toLowerCase() ===
        playerName.toLowerCase()
    ) {

        localStorage.setItem(
            NAME_STORAGE_KEY,
            playerName
        );

        beginPlaying();

        return;
    }


    saveNameButton.disabled =
        true;

    saveNameButton.textContent =
        "CHECKING...";

    nameStatus.textContent =
        "Checking name...";


    const result =
        await checkNameExists(
            cleanName
        );


    if (result.error) {

        saveNameButton.disabled =
            false;

        saveNameButton.textContent =
            "SAVE NAME";

        nameStatus.textContent =
            "Couldn't check the name. Please try again.";

        return;
    }


    if (result.exists) {

        saveNameButton.disabled =
            false;

        saveNameButton.textContent =
            "SAVE NAME";

        nameStatus.textContent =
            "That name is already taken. Please choose another name.";

        playerNameInput.focus();

        return;
    }


    // ====================================
    // New unique name
    // ====================================

    playerName =
        cleanName;

    localStorage.setItem(
        NAME_STORAGE_KEY,
        playerName
    );

    nameStatus.textContent =
        "Name saved!";

    saveNameButton.textContent =
        "SAVE NAME";

    saveNameButton.disabled =
        false;


    setTimeout(() => {

        beginPlaying();

    }, 300);
}


// ========================================
// RESET GAME
// ========================================

function resetGame() {

    score = 0;

    lives = 3;

    bowlLane = 1;

    objects = [];

    scorePopups = [];

    particles = [];

    spawnTimer = 0;

    gameTime = 0;

    spawnInterval = 0.8;

    fallingSpeed = 180;

    gameRunning = true;

    scoreElement.textContent =
        "0";

    updateLivesDisplay();

    canvas.style.opacity =
        "1";
}


// ========================================
// SPAWN MODAK
// ========================================

function spawnModak() {

    const lane =
        Math.floor(
            Math.random() *
            laneCount
        );

    const isGolden =
        Math.random() < 0.12;

    objects.push({

        type: isGolden
            ? "golden"
            : "normal",

        lane: lane,

        x: laneX(lane),

        y: 110,

        radius: isGolden
            ? 21
            : 18,

        speed: fallingSpeed
    });
}


// ========================================
// DRAW LANES
// ========================================

function drawLanes() {

    const laneWidth =
        canvas.width / laneCount;

    ctx.strokeStyle =
        "rgba(155, 88, 117, 0.14)";

    ctx.lineWidth = 2;

    for (
        let i = 1;
        i < laneCount;
        i++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i * laneWidth,
            78
        );

        ctx.lineTo(
            i * laneWidth,
            canvas.height
        );

        ctx.stroke();
    }
}


// ========================================
// DRAW NORMAL MODAK
// ========================================

function drawNormalModak(modak) {

    ctx.save();

    ctx.translate(
        modak.x,
        modak.y
    );

    ctx.fillStyle =
        "#e5a13a";

    ctx.beginPath();

    ctx.moveTo(
        -20,
        8
    );

    ctx.quadraticCurveTo(
        -18,
        20,
        0,
        22
    );

    ctx.quadraticCurveTo(
        18,
        20,
        20,
        8
    );

    ctx.lineTo(
        0,
        -25
    );

    ctx.closePath();

    ctx.fill();

    ctx.strokeStyle =
        "#c77c24";

    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.strokeStyle =
        "#c77c24";

    for (
        let i = -12;
        i <= 12;
        i += 8
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i,
            5
        );

        ctx.lineTo(
            i * 0.45,
            -10
        );

        ctx.stroke();
    }

    ctx.restore();
}


// ========================================
// DRAW GOLDEN MODAK
// ========================================

function drawGoldenModak(modak) {

    ctx.save();

    ctx.translate(
        modak.x,
        modak.y
    );

    ctx.shadowColor =
        "rgba(255, 190, 45, 0.9)";

    ctx.shadowBlur = 22;

    const gradient =
        ctx.createLinearGradient(
            -20,
            -25,
            20,
            25
        );

    gradient.addColorStop(
        0,
        "#fff1a6"
    );

    gradient.addColorStop(
        0.35,
        "#ffd45a"
    );

    gradient.addColorStop(
        0.7,
        "#f2ad24"
    );

    gradient.addColorStop(
        1,
        "#c77b13"
    );

    ctx.fillStyle =
        gradient;

    ctx.beginPath();

    ctx.moveTo(
        -22,
        8
    );

    ctx.quadraticCurveTo(
        -19,
        21,
        0,
        24
    );

    ctx.quadraticCurveTo(
        19,
        21,
        22,
        8
    );

    ctx.lineTo(
        0,
        -28
    );

    ctx.closePath();

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle =
        "#b8780d";

    ctx.lineWidth = 2.5;

    ctx.stroke();

    ctx.strokeStyle =
        "rgba(160, 95, 8, 0.75)";

    ctx.lineWidth = 2;

    for (
        let i = -13;
        i <= 13;
        i += 8
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i,
            6
        );

        ctx.lineTo(
            i * 0.45,
            -11
        );

        ctx.stroke();
    }

    ctx.fillStyle =
        "#fff8d5";

    ctx.beginPath();

    ctx.arc(
        -7,
        -12,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


// ========================================
// DRAW MODAK
// ========================================

function drawModak(modak) {

    if (
        modak.type === "golden"
    ) {

        drawGoldenModak(
            modak
        );

    } else {

        drawNormalModak(
            modak
        );
    }
}


// ========================================
// DRAW BOWL
// ========================================

function drawBowl() {

    const x =
        laneX(bowlLane);

    const y =
        canvas.height - 90;

    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.fillStyle =
        "rgba(100, 60, 80, 0.15)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        30,
        38,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#a85f7d";

    ctx.beginPath();

    ctx.moveTo(
        -42,
        0
    );

    ctx.quadraticCurveTo(
        -35,
        42,
        0,
        45
    );

    ctx.quadraticCurveTo(
        35,
        42,
        42,
        0
    );

    ctx.closePath();

    ctx.fill();

    ctx.fillStyle =
        "#f4c7d8";

    ctx.beginPath();

    ctx.ellipse(
        0,
        -2,
        42,
        11,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


// ========================================
// CREATE SCORE POPUP
// ========================================

function createScorePopup(
    x,
    y,
    points,
    isGolden
) {

    scorePopups.push({

        x: x,

        y: y,

        text:
            `+${points}`,

        life: 1,

        isGolden: isGolden
    });
}


// ========================================
// UPDATE SCORE POPUPS
// ========================================

function updateScorePopups(deltaTime) {

    for (
        let i = scorePopups.length - 1;
        i >= 0;
        i--
    ) {

        const popup =
            scorePopups[i];

        popup.y -=
            35 * deltaTime;

        popup.life -=
            deltaTime * 1.7;

        if (
            popup.life <= 0
        ) {

            scorePopups.splice(
                i,
                1
            );
        }
    }
}


// ========================================
// DRAW SCORE POPUPS
// ========================================

function drawScorePopups() {

    for (
        const popup of scorePopups
    ) {

        ctx.save();

        ctx.globalAlpha =
            Math.max(
                popup.life,
                0
            );

        ctx.textAlign =
            "center";

        ctx.font =
            popup.isGolden
                ? "900 22px Arial"
                : "900 17px Arial";

        ctx.fillStyle =
            popup.isGolden
                ? "#d99313"
                : "#a9577b";

        ctx.shadowColor =
            "rgba(255,255,255,0.9)";

        ctx.shadowBlur =
            popup.isGolden
                ? 8
                : 5;

        ctx.fillText(
            popup.text,
            popup.x,
            popup.y
        );

        ctx.restore();
    }
}


// ========================================
// CREATE CATCH PARTICLES
// ========================================

function createCatchParticles(
    x,
    y,
    isGolden
) {

    const particleCount =
        isGolden
            ? 14
            : 8;

    for (
        let i = 0;
        i < particleCount;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;

        const speed =
            isGolden
                ? 80 + Math.random() * 100
                : 50 + Math.random() * 70;

        particles.push({

            x: x,

            y: y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            life: 1,

            size:
                isGolden
                    ? 3 + Math.random() * 3
                    : 2 + Math.random() * 2,

            golden:
                isGolden
        });
    }
}


// ========================================
// UPDATE PARTICLES
// ========================================

function updateParticles(deltaTime) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];

        particle.x +=
            particle.vx *
            deltaTime;

        particle.y +=
            particle.vy *
            deltaTime;

        particle.vy +=
            60 *
            deltaTime;

        particle.life -=
            deltaTime * 2.2;

        if (
            particle.life <= 0
        ) {

            particles.splice(
                i,
                1
            );
        }
    }
}


// ========================================
// DRAW PARTICLES
// ========================================

function drawParticles() {

    for (
        const particle of particles
    ) {

        ctx.save();

        ctx.globalAlpha =
            Math.max(
                particle.life,
                0
            );

        ctx.fillStyle =
            particle.golden
                ? "#f6c445"
                : "#d98ca8";

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}


// ========================================
// MOVE BOWL
// ========================================

function moveBowl(direction) {

    bowlLane += direction;

    if (
        bowlLane < 0
    ) {

        bowlLane = 0;
    }

    if (
        bowlLane >= laneCount
    ) {

        bowlLane =
            laneCount - 1;
    }
}


// ========================================
// UPDATE HEARTS
// ========================================

function updateLivesDisplay() {

    let hearts = "";

    for (
        let i = 0;
        i < lives;
        i++
    ) {

        hearts += "❤️";
    }

    livesElement.textContent =
        hearts;
}


// ========================================
// LOSE LIFE
// ========================================

function loseLife() {

    lives--;

    updateLivesDisplay();

    canvas.style.opacity =
        "0.6";

    setTimeout(() => {

        canvas.style.opacity =
            "1";

    }, 100);

    if (
        lives <= 0
    ) {

        lives = 0;

        updateLivesDisplay();

        endGame();
    }
}


// ========================================
// END GAME
// ========================================

function endGame() {

    gameRunning = false;

    finalScoreElement.textContent =
        score;

    currentPlayer.textContent =
        `Playing as ${playerName || "Player"}`;

    saveScoreButton.disabled =
        false;

    saveScoreButton.textContent =
        "SAVE SCORE";

    saveStatus.textContent = "";

    if (
        score >= 500
    ) {

        finalMessageElement.textContent =
            "Bappa would be proud! ✨";

    } else if (
        score >= 200
    ) {

        finalMessageElement.textContent =
            "Beautiful catching! 🪔";

    } else {

        finalMessageElement.textContent =
            "Keep practicing, Modak Master! 🍬";
    }

    setTimeout(() => {

        gameOverScreen.classList.remove(
            "hidden"
        );

    }, 350);
}


// ========================================
// UPDATE GAME
// ========================================

function update(deltaTime) {

    if (!gameRunning) {

        return;
    }

    gameTime += deltaTime;


    // ====================================
    // GRADUAL DIFFICULTY
    // ====================================

    if (
        gameTime < 20
    ) {

        spawnInterval = 0.8;
        fallingSpeed = 180;

    } else if (
        gameTime < 40
    ) {

        spawnInterval = 0.7;
        fallingSpeed = 205;

    } else if (
        gameTime < 60
    ) {

        spawnInterval = 0.62;
        fallingSpeed = 225;

    } else if (
        gameTime < 90
    ) {

        spawnInterval = 0.55;
        fallingSpeed = 245;

    } else if (
        gameTime < 120
    ) {

        spawnInterval = 0.5;
        fallingSpeed = 265;

    } else {

        spawnInterval = 0.45;
        fallingSpeed = 285;
    }


    // ====================================
    // SPAWN
    // ====================================

    spawnTimer += deltaTime;

    if (
        spawnTimer >= spawnInterval
    ) {

        spawnModak();

        spawnTimer = 0;
    }


    const bowlY =
        canvas.height - 90;


    // ====================================
    // MOVE OBJECTS
    // ====================================

    for (
        let i = objects.length - 1;
        i >= 0;
        i--
    ) {

        const modak =
            objects[i];

        modak.speed =
            fallingSpeed;

        modak.y +=
            modak.speed *
            deltaTime;


        // =================================
        // CATCH
        // =================================

        if (
            modak.lane === bowlLane &&
            modak.y >
                bowlY - 35 &&
            modak.y <
                bowlY + 25
        ) {

            const isGolden =
                modak.type === "golden";

            const points =
                isGolden
                    ? 50
                    : 10;


            score += points;

            scoreElement.textContent =
                score;


            // Score popup
            createScorePopup(
                modak.x,
                modak.y - 15,
                points,
                isGolden
            );


            // Particle burst
            createCatchParticles(
                modak.x,
                modak.y,
                isGolden
            );


            objects.splice(
                i,
                1
            );

            continue;
        }


        // =================================
        // MISS
        // =================================

        if (
            modak.y >
            canvas.height + 40
        ) {

            loseLife();

            objects.splice(
                i,
                1
            );
        }
    }


    // ====================================
    // EFFECTS
    // ====================================

    updateParticles(
        deltaTime
    );

    updateScorePopups(
        deltaTime
    );
}


// ========================================
// DRAW
// ========================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawLanes();


    for (
        const modak of objects
    ) {

        drawModak(
            modak
        );
    }


    drawParticles();

    drawScorePopups();

    drawBowl();
}


// ========================================
// GAME LOOP
// ========================================

function gameLoop(currentTime) {

    const deltaTime =
        Math.min(
            (currentTime - lastTime) / 1000,
            0.05
        );

    lastTime =
        currentTime;

    update(
        deltaTime
    );

    draw();

    requestAnimationFrame(
        gameLoop
    );
}


// ========================================
// MOBILE CONTROLS
// ========================================

canvas.addEventListener(
    "touchstart",
    function(event) {

        if (!gameRunning) {

            return;
        }

        const touchX =
            event.touches[0].clientX;

        const middle =
            window.innerWidth / 2;

        if (
            touchX < middle
        ) {

            moveBowl(-1);

        } else {

            moveBowl(1);
        }
    },
    {
        passive: true
    }
);


// ========================================
// KEYBOARD CONTROLS
// ========================================

document.addEventListener(
    "keydown",
    function(event) {

        if (!gameRunning) {

            return;
        }

        if (
            event.key === "ArrowLeft" ||
            event.key.toLowerCase() === "a"
        ) {

            moveBowl(-1);
        }

        if (
            event.key === "ArrowRight" ||
            event.key.toLowerCase() === "d"
        ) {

            moveBowl(1);
        }
    }
);


// ========================================
// SHOW LEADERBOARD
// ========================================

async function showLeaderboard() {

    hideAllScreens();

    leaderboardScreen.classList.remove(
        "hidden"
    );

    await loadLeaderboard();
}


// ========================================
// LOAD LEADERBOARD
// ========================================

async function loadLeaderboard() {

    leaderboardList.innerHTML = `
        <p class="leaderboard-empty">
            Loading scores...
        </p>
    `;

    const {
        data,
        error
    } = await supabase
        .from("modak_leaderboard")
        .select(
            "player_name, score, created_at"
        )
        .order(
            "score",
            {
                ascending: false
            }
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        )
        .limit(10);


    if (error) {

        console.error(
            "Leaderboard error:",
            error
        );

        leaderboardList.innerHTML = `
            <p class="leaderboard-empty">
                Couldn't load the leaderboard.
                Please try again.
            </p>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        leaderboardList.innerHTML = `
            <p class="leaderboard-empty">
                No scores yet.<br>
                Be the first Modak Master!
            </p>
        `;

        return;
    }


    leaderboardList.innerHTML = "";


    data.forEach(
        (entry, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "leaderboard-row";


            const rank =
                document.createElement(
                    "span"
                );

            rank.className =
                "rank";

            rank.textContent =
                `#${index + 1}`;


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "leaderboard-name";

            name.textContent =
                entry.player_name;


            const playerScore =
                document.createElement(
                    "span"
                );

            playerScore.className =
                "leaderboard-score";

            playerScore.textContent =
                entry.score;


            row.appendChild(
                rank
            );

            row.appendChild(
                name
            );

            row.appendChild(
                playerScore
            );

            leaderboardList.appendChild(
                row
            );
        }
    );
}


// ========================================
// SAVE SCORE
// ========================================

async function saveScore() {

    if (!playerName) {

        showNameScreen();

        return;
    }


    saveScoreButton.disabled =
        true;

    saveScoreButton.textContent =
        "SAVING...";

    saveStatus.textContent =
        "Saving your best score...";


    // ====================================
    // Get existing score
    // ====================================

    const {
        data: existingPlayer,
        error: findError
    } = await supabase
        .from("modak_leaderboard")
        .select(
            "score"
        )
        .eq(
            "player_name",
            playerName
        )
        .maybeSingle();


    if (findError) {

        console.error(
            "Find score error:",
            findError
        );

        saveScoreButton.disabled =
            false;

        saveScoreButton.textContent =
            "SAVE SCORE";

        saveStatus.textContent =
            "Couldn't save score. Try again.";

        return;
    }


    // ====================================
    // PLAYER ALREADY HAS A SCORE
    // ====================================

    if (existingPlayer) {

        // Only update if new score is higher

        if (
            score > existingPlayer.score
        ) {

            const {
                error: updateError
            } = await supabase
                .from("modak_leaderboard")
                .update({
                    score: score
                })
                .eq(
                    "player_name",
                    playerName
                );


            if (updateError) {

                console.error(
                    "Update score error:",
                    updateError
                );

                saveScoreButton.disabled =
                    false;

                saveScoreButton.textContent =
                    "SAVE SCORE";

                saveStatus.textContent =
                    "Couldn't update score. Try again.";

                return;
            }

            saveScoreButton.textContent =
                "BEST SCORE SAVED ✓";

            saveStatus.textContent =
                "New personal best!";

        } else {

            saveScoreButton.textContent =
                "SCORE SAVED ✓";

            saveStatus.textContent =
                `Your best score is still ${existingPlayer.score}.`;
        }


        setTimeout(() => {

            showLeaderboard();

        }, 700);

        return;
    }


    // ====================================
    // NEW PLAYER
    // ====================================

    const {
        error: insertError
    } = await supabase
        .from("modak_leaderboard")
        .insert({

            player_name:
                playerName.substring(
                    0,
                    20
                ),

            score: score
        });


    if (insertError) {

        console.error(
            "Insert score error:",
            insertError
        );

        saveScoreButton.disabled =
            false;

        saveScoreButton.textContent =
            "SAVE SCORE";

        saveStatus.textContent =
            "Couldn't save score. Try again.";

        return;
    }


    saveScoreButton.textContent =
        "SCORE SAVED ✓";

    saveStatus.textContent =
        "Your score is on the leaderboard!";


    setTimeout(() => {

        showLeaderboard();

    }, 700);
}


// ========================================
// BUTTONS
// ========================================

playButton.addEventListener(
    "click",
    handlePlayButton
);


howToButton.addEventListener(
    "click",
    function() {

        hideAllScreens();

        howToScreen.classList.remove(
            "hidden"
        );
    }
);


backButton.addEventListener(
    "click",
    function() {

        showStartScreen();
    }
);


startFromHowButton.addEventListener(
    "click",
    function() {

        if (playerName) {

            beginPlaying();

        } else {

            showNameScreen();
        }
    }
);


restartButton.addEventListener(
    "click",
    function() {

        beginPlaying();
    }
);


changeNameButton.addEventListener(
    "click",
    function() {

        showNameScreen();
    }
);


saveNameButton.addEventListener(
    "click",
    savePlayerName
);


nameBackButton.addEventListener(
    "click",
    function() {

        showStartScreen();
    }
);


playerNameInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter"
        ) {

            savePlayerName();
        }
    }
);


saveScoreButton.addEventListener(
    "click",
    saveScore
);


leaderboardButton.addEventListener(
    "click",
    showLeaderboard
);


leaderboardBackButton.addEventListener(
    "click",
    function() {

        leaderboardScreen.classList.add(
            "hidden"
        );

        gameOverScreen.classList.remove(
            "hidden"
        );
    }
);


leaderboardPlayButton.addEventListener(
    "click",
    beginPlaying
);


// ========================================
// INITIALIZE
// ========================================

updateLivesDisplay();

gameRunning = false;

draw();

requestAnimationFrame(
    gameLoop
);