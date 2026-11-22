<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Arcade Mini-Games</title>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
}

body {
    background: #101426;
    color: white;
    text-align: center;
    padding: 25px;
}

h1 {
    color: #00e5ff;
    margin-bottom: 20px;
}

.container {
    max-width: 700px;
    margin: auto;
}

.games {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 25px;
}

button {
    background: #273454;
    color: white;
    border: none;
    padding: 14px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 15px;
}

button:hover {
    background: #007bff;
}

.game-box {
    background: #1c2541;
    padding: 25px;
    border-radius: 15px;
    min-height: 250px;
}

.score {
    color: #00ffae;
    font-size: 22px;
    margin: 15px;
}

#gameArea {
    margin-top: 20px;
}

#gameArea button {
    margin: 5px;
}

input {
    padding: 12px;
    width: 100px;
    border-radius: 8px;
    border: none;
}

.hidden {
    display: none;
}

#result {
    margin-top: 20px;
    color: #ffd700;
    font-size: 20px;
}
</style>
</head>

<body>

<div class="container">

<h1>🎮 ARCADE MINI-GAMES</h1>

<div class="games">
    <button onclick="startGame('number')">🔢 Number Hunter</button>
    <button onclick="startGame('rps')">✊ Rock Paper Scissors</button>
    <button onclick="startGame('memory')">🧠 Memory Match</button>
    <button onclick="startGame('tic')">❌ Tic-Tac-Toe</button>
    <button onclick="startGame('reaction')">⚡ Reaction Rush</button>
</div>

<div class="game-box">
    <h2 id="gameTitle">Welcome to Arcade!</h2>

    <p id="instructions">
        Select a mini-game to begin playing.
    </p>

    <div class="score">
        Score: <span id="score">0</span>
    </div>

    <div id="gameArea"></div>

    <div id="result"></div>

    <button onclick="restartGame()">🔄 Restart</button>
    <button onclick="showMenu()">🏠 Main Menu</button>
</div>

</div>

<script>

let score = 0;
let currentGame = "";
let secretNumber;
let attempts;
let board = ["","","","","","","","",""];
let currentPlayer = "X";
let gameOver = false;
let reactionStart;
let reactionTimer;
let reactionTimeout;

function updateScore(points) {
    score += points;
    document.getElementById("score").textContent = score;
}

function startGame(game) {
    currentGame = game;
    score = 0;

    document.getElementById("score").textContent = 0;
    document.getElementById("result").textContent = "";

    const area = document.getElementById("gameArea");

    if(game === "number") {
        document.getElementById("gameTitle").textContent = "🔢 Number Hunter";
        document.getElementById("instructions").textContent =
            "Guess the secret number between 1 and 100. You have 7 attempts.";

        secretNumber = Math.floor(Math.random() * 100) + 1;
        attempts = 7;

        area.innerHTML = `
            <input type="number" id="guess" placeholder="Number">
            <button onclick="checkNumber()">Guess</button>
            <p id="hint">Attempts remaining: 7</p>
        `;
    }

    else if(game === "rps") {
        document.getElementById("gameTitle").textContent = "✊ Rock Paper Scissors";
        document.getElementById("instructions").textContent =
            "Choose your move and beat the computer.";

        area.innerHTML = `
            <button onclick="playRPS('Rock')">✊ Rock</button>
            <button onclick="playRPS('Paper')">✋ Paper</button>
            <button onclick="playRPS('Scissors')">✌️ Scissors</button>
        `;
    }

    else if(game === "memory") {
        document.getElementById("gameTitle").textContent = "🧠 Memory Match";
        document.getElementById("instructions").textContent =
            "Find all matching pairs of cards.";

        let cards = ["🍎","🍌","🍇","🍒","🍎","🍌","🍇","🍒"];
        cards.sort(() => Math.random() - 0.5);

        let first = null;
        let locked = false;
        let matched = 0;

        area.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
            ${cards.map((card,i) =>
                `<button id="card${i}" onclick="flipCard(${i})">❓</button>`
            ).join("")}
            </div>
        `;

        window.memoryCards = cards;
        window.firstCard = null;
        window.lockedCards = false;
        window.matchedCards = [];
    }

    else if(game === "tic") {
        document.getElementById("gameTitle").textContent = "❌ Tic-Tac-Toe";
        document.getElementById("instructions").textContent =
            "Take turns with another player. Get three in a row to win.";

        board = ["","","","","","","","",""];
        currentPlayer = "X";
        gameOver = false;

        renderTic();
    }

    else if(game === "reaction") {
        document.ge