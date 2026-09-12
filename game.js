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
const NAME_STORAGE_KEY = "modakCatchPlayerName";

let playerName =
    localStorage.getItem(NAME_STORAGE_KEY) || "";

const PLAYER_ID_STORAGE_KEY =
    "modakCatchPlayerId";

let playerId =
    localStorage.getItem(PLAYER_ID_STORAGE_KEY);

if (!playerId) {

    playerId =
        crypto.randomUUID();

    localStorage.setItem(
        PLAYER_ID_STORAGE_KEY,
        playerId
    );
}

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
// LEVEL SYSTEM
// ========================================

let currentLevel = 1;

let displayedLevel = 1;

let levelTransitionActive = false;

let levelTransitionTimer = 0;

let levelTransitionDuration = 1.8;


// ========================================
// POLISH EFFECTS
// ========================================

let scorePopups = [];
let particles = [];


// ========================================
// LEVEL THEMES
// ========================================

const levelThemes = [

    {
        level: 1,

        top: "#fff9f2",

        bottom: "#f8eaf0",

        lane: "rgba(155, 88, 117, 0.14)"
    },

    {
        level: 2,

        top: "#f8eef1",

        bottom: "#eadff0",

        lane: "rgba(132, 82, 112, 0.18)"
    },

    {
        level: 3,

        top: "#eee6ef",

        bottom: "#ded8e9",

        lane: "rgba(105, 73, 108, 0.20)"
    },

    {
        level: 4,

        top: "#e3dce9",

        bottom: "#d0c9dc",

        lane: "rgba(86, 67, 99, 0.23)"
    },

    {
        level: 5,

        top: "#d9d2df",

        bottom: "#c2bacf",

        lane: "rgba(72, 57, 87, 0.27)"
    }

];


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
// GET CURRENT THEME
// ========================================

function getCurrentTheme() {

    const themeIndex =
        Math.min(
            currentLevel - 1,
            levelThemes.length - 1
        );

    return levelThemes[
        themeIndex
    ];
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


    // Same name — nothing to change
 // Same name — make sure the old leaderboard
// row is connected to this player's permanent ID
if (
    playerName &&
    cleanName.toLowerCase() ===
    playerName.toLowerCase()
) {

    const {
        data: existingRow,
        error: existingRowError
    } = await supabase
        .from("modak_leaderboard")
        .select("id, player_id, player_name, score")
        .eq("player_name", playerName)
        .maybeSingle();

    if (existingRowError) {

        console.error(
            "Existing player lookup error:",
            existingRowError
        );

        nameStatus.textContent =
            "Couldn't find your player record.";

        return;
    }

    // Connect old row to this browser/player
    if (
        existingRow &&
        !existingRow.player_id
    ) {

        const {
            error: linkError
        } = await supabase
            .from("modak_leaderboard")
            .update({
                player_id: playerId
            })
            .eq(
                "id",
                existingRow.id
            );

        if (linkError) {

            console.error(
                "Player ID link error:",
                linkError
            );

            nameStatus.textContent =
                "Couldn't connect your player account.";

            return;
        }
    }

    localStorage.setItem(
        NAME_STORAGE_KEY,
        playerName
    );

    beginPlaying();

    return;
}


    // Check whether the NEW name belongs
    // to another player.
    const {
        data: nameOwner,
        error: nameCheckError
    } = await supabase
        .from("modak_leaderboard")
        .select("player_id, player_name")
        .eq("player_name", cleanName)
        .maybeSingle();


    if (nameCheckError) {

        console.error(
            "Name check error:",
            nameCheckError
        );

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";

        nameStatus.textContent =
            "Couldn't check the name. Please try again.";

        return;
    }


    // Name is already being used by
    // another player.
    if (
        nameOwner &&
        nameOwner.player_id !== playerId
    ) {

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";

        nameStatus.textContent =
            "That name is already taken. Please choose another name.";

        playerNameInput.focus();

        return;
    }


    // ========================================
    // FIRST NAME
    // ========================================

    if (!playerName) {

        // Check whether this player already
        // has a leaderboard row.
        const {
            data: existingById,
            error: existingByIdError
        } = await supabase
            .from("modak_leaderboard")
            .select("id, player_name, score")
            .eq("player_id", playerId)
            .maybeSingle();


        if (existingByIdError) {

            console.error(
                "Player lookup error:",
                existingByIdError
            );

            saveNameButton.disabled = false;

            saveNameButton.textContent =
                "SAVE NAME";

            nameStatus.textContent =
                "Couldn't save your name. Please try again.";

            return;
        }


        if (existingById) {

            // Player already exists.
            // Just change the display name.
            const {
                error: updateError
            } = await supabase
                .from("modak_leaderboard")
                .update({
                    player_name: cleanName
                })
                .eq(
                    "player_id",
                    playerId
                );


            if (updateError) {

                console.error(
                    "Name update error:",
                    updateError
                );

                saveNameButton.disabled = false;

                saveNameButton.textContent =
                    "SAVE NAME";

                nameStatus.textContent =
                    "Couldn't update your name. Please try again.";

                return;
            }

        } else {

            // No leaderboard row yet.
            // We don't actually need to create
            // a score row until they save a score.
            // Just remember the name locally.
        }


        playerName =
            cleanName;

        localStorage.setItem(
            NAME_STORAGE_KEY,
            playerName
        );

        nameStatus.textContent =
            "Name saved!";

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";


        setTimeout(() => {

            beginPlaying();

        }, 300);

        return;
    }


    // ========================================
    // CHANGING EXISTING NAME
    // ========================================

    nameStatus.textContent =
        "Updating your name...";


    /*
     * First try to find the player's row
     * using their permanent player_id.
     */
    const {
        data: playerRow,
        error: playerRowError
    } = await supabase
        .from("modak_leaderboard")
        .select("id, player_name, score")
        .eq("player_id", playerId)
        .maybeSingle();


    if (playerRowError) {

        console.error(
            "Player ID lookup error:",
            playerRowError
        );

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";

        nameStatus.textContent =
            "Couldn't find your player record. Please try again.";

        return;
    }


    // ========================================
    // PLAYER HAS AN EXISTING ID ROW
    // ========================================

    if (playerRow) {

        const {
            error: updateError
        } = await supabase
            .from("modak_leaderboard")
            .update({
                player_name: cleanName
            })
            .eq(
                "player_id",
                playerId
            );


        if (updateError) {

            console.error(
                "Name update error:",
                updateError
            );

            saveNameButton.disabled = false;

            saveNameButton.textContent =
                "SAVE NAME";

            nameStatus.textContent =
                "Couldn't update your name. Please try again.";

            return;
        }


        playerName =
            cleanName;

        localStorage.setItem(
            NAME_STORAGE_KEY,
            playerName
        );

        nameStatus.textContent =
            "Name updated! Your score is still محفوظ.";

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";


        setTimeout(() => {

            beginPlaying();

        }, 500);

        return;
    }


    // ========================================
    // OLD PLAYER ROW HAS NO PLAYER_ID
    // ========================================

    /*
     * This handles players created BEFORE
     * player_id was added to the database.
     *
     * Example:
     *
     * Lohitha | 500 | NULL
     *
     * We find that old row using the old
     * player name and attach the permanent
     * player_id to it.
     */

    const {
        data: oldPlayerRow,
        error: oldPlayerError
    } = await supabase
        .from("modak_leaderboard")
        .select("id, player_name, score")
        .eq(
            "player_name",
            playerName
        )
        .maybeSingle();


    if (oldPlayerError) {

        console.error(
            "Old player lookup error:",
            oldPlayerError
        );

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";

        nameStatus.textContent =
            "Couldn't find your old score. Please try again.";

        return;
    }


    if (oldPlayerRow) {

        const {
            error: migrateError
        } = await supabase
            .from("modak_leaderboard")
            .update({

                player_id: playerId,

                player_name: cleanName

            })
            .eq(
                "id",
                oldPlayerRow.id
            );


        if (migrateError) {

            console.error(
                "Player migration error:",
                migrateError
            );

            saveNameButton.disabled = false;

            saveNameButton.textContent =
                "SAVE NAME";

            nameStatus.textContent =
                "Couldn't transfer your old score. Please try again.";

            return;
        }


        playerName =
            cleanName;

        localStorage.setItem(
            NAME_STORAGE_KEY,
            playerName
        );

        nameStatus.textContent =
            "Name updated! Your old score stayed with you.";

        saveNameButton.disabled = false;

        saveNameButton.textContent =
            "SAVE NAME";


        setTimeout(() => {

            beginPlaying();

        }, 500);

        return;
    }


    // ========================================
    // NO OLD ROW
    // ========================================

    playerName =
        cleanName;

    localStorage.setItem(
        NAME_STORAGE_KEY,
        playerName
    );

    nameStatus.textContent =
        "Name saved!";

    saveNameButton.disabled = false;

    saveNameButton.textContent =
        "SAVE NAME";


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

    currentLevel = 1;

    displayedLevel = 1;

    levelTransitionActive = false;

    levelTransitionTimer = 0;

    gameRunning = true;

    scoreElement.textContent =
        "0";

    updateLivesDisplay();

    canvas.style.opacity =
        "1";
}


// ========================================
// GET LEVEL FROM SCORE
// ========================================

function getLevelFromScore() {

    return (
        Math.floor(
            score / 500
        ) + 1
    );
}


// ========================================
// CHECK LEVEL CHANGE
// ========================================

function checkLevelProgression() {

    const newLevel =
        getLevelFromScore();


    if (
        newLevel > currentLevel
    ) {

        currentLevel =
            newLevel;

        startLevelTransition();
    }
}


// ========================================
// START LEVEL TRANSITION
// ========================================

function startLevelTransition() {

    levelTransitionActive =
        true;

    levelTransitionTimer =
        levelTransitionDuration;

    displayedLevel =
        currentLevel;

    objects = [];

    spawnTimer = 0;
}


// ========================================
// UPDATE LEVEL DIFFICULTY
// ========================================

function updateLevelDifficulty() {

    const level =
        currentLevel;


    /*
     * Every level becomes harder.
     *
     * Level 1:
     * 180 speed / 0.80 spawn
     *
     * Level 2:
     * 225 speed / 0.68 spawn
     *
     * Level 3:
     * 265 speed / 0.58 spawn
     *
     * Level 4:
     * 300 speed / 0.50 spawn
     *
     * Level 5:
     * 330 speed / 0.44 spawn
     *
     * After level 5:
     * continues increasing gradually.
     */


    fallingSpeed =
        Math.min(
            180 +
            (level - 1) * 38,
            390
        );


    spawnInterval =
        Math.max(
            0.8 -
            (level - 1) * 0.075,
            0.34
        );
}


// ========================================
// LEVEL TRANSITION UPDATE
// ========================================

function updateLevelTransition(
    deltaTime
) {

    if (
        !levelTransitionActive
    ) {

        return false;
    }


    levelTransitionTimer -=
        deltaTime;


    if (
        levelTransitionTimer <= 0
    ) {

        levelTransitionTimer = 0;

        levelTransitionActive =
            false;

        spawnTimer = 0;

        return false;
    }


    return true;
}


// ========================================
// DRAW LEVEL TRANSITION
// ========================================

function drawLevelTransition() {

    if (
        !levelTransitionActive
    ) {

        return;
    }


    const progress =
        1 -
        (
            levelTransitionTimer /
            levelTransitionDuration
        );


    let alpha;


    if (
        progress < 0.25
    ) {

        alpha =
            progress / 0.25;

    } else if (
        progress > 0.75
    ) {

        alpha =
            (1 - progress) / 0.25;

    } else {

        alpha = 1;
    }


    ctx.save();

    ctx.globalAlpha =
        Math.max(
            0,
            Math.min(
                1,
                alpha
            )
        );


    // Soft overlay

    ctx.fillStyle =
        "rgba(255, 249, 244, 0.72)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // Small decorative glow

    ctx.fillStyle =
        "#d69ab4";

    ctx.globalAlpha *= 0.16;

    ctx.beginPath();

    ctx.arc(
        canvas.width / 2,
        canvas.height / 2 - 20,
        100,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.globalAlpha =
        Math.max(
            0,
            Math.min(
                1,
                alpha
            )
        );


    // Completion text

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";


    ctx.font =
        "800 13px Arial";

    ctx.fillStyle =
        "#9b6876";

    ctx.fillText(
        `LEVEL ${currentLevel - 1} COMPLETE`,
        canvas.width / 2,
        canvas.height / 2 - 42
    );


    // Main level

    ctx.font =
        "900 30px Arial";

    ctx.fillStyle =
        "#74465c";

    ctx.fillText(
        `ENTERING LEVEL ${currentLevel}`,
        canvas.width / 2,
        canvas.height / 2
    );


    // Difficulty text

    ctx.font =
        "600 13px Arial";

    ctx.fillStyle =
        "#956d7e";

    ctx.fillText(
        "The celebration grows...",
        canvas.width / 2,
        canvas.height / 2 + 38
    );


    ctx.restore();
}


// ========================================
// DRAW LEVEL INDICATOR
// ========================================

function drawLevelIndicator() {

    if (!gameRunning) {

        return;
    }


    if (
        levelTransitionActive
    ) {

        return;
    }


    ctx.save();

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";


    const x =
        canvas.width / 2;

    const y = 92;


    ctx.font =
        "800 11px Arial";

    ctx.fillStyle =
        currentLevel >= 3
            ? "rgba(72, 57, 87, 0.72)"
            : "rgba(116, 70, 92, 0.72)";


    ctx.fillText(
        `LEVEL ${currentLevel}`,
        x,
        y
    );


    ctx.restore();
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
// DRAW BACKGROUND
// ========================================

function drawBackground() {

    const theme =
        getCurrentTheme();


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );


    gradient.addColorStop(
        0,
        theme.top
    );

    gradient.addColorStop(
        1,
        theme.bottom
    );


    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * Very subtle festival glow.
     * It becomes softer as levels increase.
     */

    const glowAlpha =
        Math.max(
            0.07 -
            (currentLevel - 1) * 0.012,
            0.025
        );


    const glow =
        ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height * 0.72,
            20,
            canvas.width / 2,
            canvas.height * 0.72,
            canvas.width * 0.75
        );


    glow.addColorStop(
        0,
        `rgba(255, 220, 205, ${glowAlpha})`
    );

    glow.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    ctx.fillStyle =
        glow;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}


// ========================================
// DRAW LANES
// ========================================

function drawLanes() {

    const laneWidth =
        canvas.width / laneCount;

    const theme =
        getCurrentTheme();


    ctx.strokeStyle =
        theme.lane;

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
// DRAW MUSHIK + BOWL
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


    /* Soft ground shadow */

    ctx.fillStyle =
        "rgba(91, 55, 70, 0.14)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        39,
        43,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Mushik tail */

    ctx.strokeStyle =
        "#8b5a68";

    ctx.lineWidth = 5;

    ctx.lineCap =
        "round";

    ctx.beginPath();

    ctx.moveTo(
        27,
        16
    );

    ctx.bezierCurveTo(
        43,
        20,
        48,
        4,
        38,
        -3
    );

    ctx.stroke();


    /* Mushik body */

    ctx.fillStyle =
        "#9b6876";

    ctx.beginPath();

    ctx.ellipse(
        0,
        17,
        25,
        20,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Belly */

    ctx.fillStyle =
        "#d9a7a9";

    ctx.beginPath();

    ctx.ellipse(
        0,
        21,
        14,
        13,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Ears */

    ctx.fillStyle =
        "#9b6876";

    ctx.beginPath();

    ctx.arc(
        -16,
        -1,
        10,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        16,
        -1,
        10,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Inner ears */

    ctx.fillStyle =
        "#e7b5b9";

    ctx.beginPath();

    ctx.arc(
        -16,
        -1,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        16,
        -1,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Head */

    ctx.fillStyle =
        "#a46d7b";

    ctx.beginPath();

    ctx.ellipse(
        0,
        6,
        22,
        18,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Eyes */

    ctx.fillStyle =
        "#49343d";

    ctx.beginPath();

    ctx.arc(
        -8,
        3,
        2.8,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        8,
        3,
        2.8,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Nose */

    ctx.fillStyle =
        "#6f4051";

    ctx.beginPath();

    ctx.arc(
        0,
        10,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Smile */

    ctx.strokeStyle =
        "#704352";

    ctx.lineWidth = 1.5;

    ctx.beginPath();

    ctx.arc(
        0,
        9,
        6,
        0.25,
        Math.PI - 0.25
    );

    ctx.stroke();


    /* Feet */

    ctx.fillStyle =
        "#805263";

    ctx.beginPath();

    ctx.ellipse(
        -12,
        35,
        8,
        4,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.ellipse(
        12,
        35,
        8,
        4,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Arms */

    ctx.strokeStyle =
        "#8b5a68";

    ctx.lineWidth = 6;

    ctx.lineCap =
        "round";

    ctx.beginPath();

    ctx.moveTo(
        -16,
        17
    );

    ctx.lineTo(
        -27,
        8
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        16,
        17
    );

    ctx.lineTo(
        27,
        8
    );

    ctx.stroke();


    /* Bowl */

    ctx.fillStyle =
        "#a85f7d";

    ctx.beginPath();

    ctx.moveTo(
        -40,
        5
    );

    ctx.quadraticCurveTo(
        -34,
        31,
        0,
        34
    );

    ctx.quadraticCurveTo(
        34,
        31,
        40,
        5
    );

    ctx.closePath();

    ctx.fill();


    /* Bowl highlight */

    ctx.fillStyle =
        "#d88da9";

    ctx.beginPath();

    ctx.moveTo(
        -30,
        13
    );

    ctx.quadraticCurveTo(
        0,
        25,
        30,
        13
    );

    ctx.quadraticCurveTo(
        25,
        28,
        0,
        30
    );

    ctx.quadraticCurveTo(
        -25,
        28,
        -30,
        13
    );

    ctx.fill();


    /* Bowl rim */

    ctx.fillStyle =
        "#f3c8d7";

    ctx.beginPath();

    ctx.ellipse(
        0,
        5,
        41,
        10,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Bowl inner */

    ctx.fillStyle =
        "#ffe7dc";

    ctx.beginPath();

    ctx.ellipse(
        0,
        4,
        34,
        7,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* Tiny decorative flower */

    ctx.fillStyle =
        "#c79642";

    ctx.beginPath();

    ctx.arc(
        0,
        14,
        2.5,
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
        score >= 2000
    ) {

        finalMessageElement.textContent =
            "You are a true Modak Master! ✨";

    } else if (
        score >= 1000
    ) {

        finalMessageElement.textContent =
            "The celebration was incredible! ✨";

    } else if (
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


    // Level transition

    if (
        levelTransitionActive
    ) {

        updateLevelTransition(
            deltaTime
        );

        updateParticles(
            deltaTime
        );

        updateScorePopups(
            deltaTime
        );

        return;
    }


    gameTime += deltaTime;


    // Check score-based level

    checkLevelProgression();


    // If a new level started,
    // stop this frame here.

    if (
        levelTransitionActive
    ) {

        return;
    }


    // Update difficulty

    updateLevelDifficulty();


    // Spawn

    spawnTimer += deltaTime;

    if (
        spawnTimer >= spawnInterval
    ) {

        spawnModak();

        spawnTimer = 0;
    }


    const bowlY =
        canvas.height - 90;


    // Move objects

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


        // Catch

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


            createScorePopup(
                modak.x,
                modak.y - 15,
                points,
                isGolden
            );


            createCatchParticles(
                modak.x,
                modak.y,
                isGolden
            );


            objects.splice(
                i,
                1
            );


            // Check level immediately
            checkLevelProgression();

            continue;
        }


        // Miss

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


    // Background changes
    // according to level

    drawBackground();

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

    drawLevelIndicator();

    drawLevelTransition();
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
// MOBILE + MOUSE CONTROLS
// ========================================

function moveBowlToPointer(clientX) {

    const rect =
        canvas.getBoundingClientRect();

    const canvasX =
        clientX - rect.left;

    const laneWidth =
        canvas.width / laneCount;

    let selectedLane =
        Math.floor(
            canvasX / laneWidth
        );

    selectedLane =
        Math.max(
            0,
            Math.min(
                laneCount - 1,
                selectedLane
            )
        );

    bowlLane =
        selectedLane;
}


// ========================================
// TOUCH + DRAG
// ========================================

let isDraggingBowl = false;

canvas.addEventListener(
    "touchstart",
    function(event) {

        if (!gameRunning) {
            return;
        }

        event.preventDefault();

        isDraggingBowl = true;

        const touch =
            event.touches[0];

        moveBowlToPointer(
            touch.clientX
        );
    },
    {
        passive: false
    }
);


canvas.addEventListener(
    "touchmove",
    function(event) {

        if (
            !gameRunning ||
            !isDraggingBowl
        ) {
            return;
        }

        event.preventDefault();

        const touch =
            event.touches[0];

        moveBowlToPointer(
            touch.clientX
        );
    },
    {
        passive: false
    }
);


canvas.addEventListener(
    "touchend",
    function() {

        isDraggingBowl = false;
    }
);


canvas.addEventListener(
    "touchcancel",
    function() {

        isDraggingBowl = false;
    }
);


// ========================================
// MOUSE CLICK
// ========================================

canvas.addEventListener(
    "click",
    function(event) {

        if (!gameRunning) {
            return;
        }

        moveBowlToPointer(
            event.clientX
        );
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

// ========================================
// SAVE SCORE
// ========================================

async function saveScore() {

    if (!playerName) {
        showNameScreen();
        return;
    }

    saveScoreButton.disabled = true;
    saveScoreButton.textContent = "SAVING...";
    saveStatus.textContent = "Saving your best score...";


    // ========================================
    // 1. FIND PLAYER BY PLAYER ID
    // ========================================

    let {
        data: existingPlayer,
        error: findError
    } = await supabase
        .from("modak_leaderboard")
        .select("id, player_name, score, player_id")
        .eq("player_id", playerId)
        .maybeSingle();


    if (findError) {

        console.error(
            "Find player by ID error:",
            findError
        );

        saveScoreButton.disabled = false;
        saveScoreButton.textContent = "SAVE SCORE";
        saveStatus.textContent =
            "Couldn't save score. Try again.";

        return;
    }


    // ========================================
    // 2. IF NOT FOUND, FIND PLAYER BY NAME
    // ========================================

    if (!existingPlayer) {

        const {
            data: namePlayer,
            error: nameError
        } = await supabase
            .from("modak_leaderboard")
            .select("id, player_name, score, player_id")
            .eq("player_name", playerName)
            .maybeSingle();


        if (nameError) {

            console.error(
                "Find player by name error:",
                nameError
            );

            saveScoreButton.disabled = false;
            saveScoreButton.textContent = "SAVE SCORE";
            saveStatus.textContent =
                "Couldn't find your player record.";

            return;
        }


        // ========================================
        // 3. OLD PLAYER FOUND
        // CONNECT IT TO CURRENT PLAYER ID
        // ========================================

        if (namePlayer) {

            console.log(
                "Found existing player by name:",
                namePlayer
            );


            const {
                data: linkedPlayer,
                error: linkError
            } = await supabase
                .from("modak_leaderboard")
                .update({
                    player_id: playerId,
                    player_name: playerName
                })
                .eq("id", namePlayer.id)
                .select("id, player_name, score, player_id")
                .single();


            if (linkError) {

                console.error(
                    "Link player error:",
                    linkError
                );

                saveScoreButton.disabled = false;
                saveScoreButton.textContent = "SAVE SCORE";
                saveStatus.textContent =
                    "Couldn't connect your player account.";

                return;
            }


            existingPlayer = linkedPlayer;
        }
    }


    // ========================================
    // 4. EXISTING PLAYER
    // ========================================

    if (existingPlayer) {

        if (score > existingPlayer.score) {

            const {
                error: updateError
            } = await supabase
                .from("modak_leaderboard")
                .update({
                    score: score,
                    player_name: playerName
                })
                .eq("id", existingPlayer.id);


            if (updateError) {

                console.error(
                    "Update score error:",
                    updateError
                );

                saveScoreButton.disabled = false;
                saveScoreButton.textContent = "SAVE SCORE";
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


    // ========================================
    // 5. COMPLETELY NEW PLAYER
    // ========================================

    const {
        error: insertError
    } = await supabase
        .from("modak_leaderboard")
        .insert({
            player_id: playerId,
            player_name: playerName.substring(0, 20),
            score: score
        });


    if (insertError) {

        console.error(
            "Insert score error:",
            insertError
        );

        saveScoreButton.disabled = false;
        saveScoreButton.textContent = "SAVE SCORE";
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