// Canvas setup
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextPiece');
const nextCtx = nextCanvas.getContext('2d');

// Game constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#00FFFF', // I - Cyan
    '#FF00FF', // J - Magenta
    '#FFFF00', // L - Yellow
    '#00FF00', // O - Green
    '#FF0066', // S - Hot Pink
    '#FF6600', // T - Orange
    '#0066FF'  // Z - Blue
];

// Tetromino shapes
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

// Game state
let board = createBoard();
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let currentPiece = null;
let nextPiece = null;
let dropInterval = 1000;
let lastDropTime = 0;

// UI elements
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');
const highScoresListElement = document.getElementById('highScoresList');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

// High score management
let highScores = loadHighScores();
let currentHighScore = highScores.length > 0 ? highScores[0] : 0;

// High score functions
function loadHighScores() {
    const saved = localStorage.getItem('tetrisHighScores');
    return saved ? JSON.parse(saved) : [];
}

function saveHighScores(scores) {
    localStorage.setItem('tetrisHighScores', JSON.stringify(scores));
}

function addHighScore(newScore) {
    highScores.push(newScore);
    highScores.sort((a, b) => b - a);
    highScores = highScores.slice(0, 5); // Keep top 5
    saveHighScores(highScores);
    currentHighScore = highScores[0];
}

function displayHighScores() {
    highScoresListElement.innerHTML = '';
    highScores.forEach(score => {
        const li = document.createElement('li');
        li.textContent = score.toLocaleString();
        highScoresListElement.appendChild(li);
    });
    highScoreElement.textContent = currentHighScore.toLocaleString();
}

// Event listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
document.addEventListener('keydown', handleKeyPress);

// Create empty board
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Create a new piece
function createPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[shapeIndex];
    return {
        shape: shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}

// Draw a single block
function drawBlock(ctx, x, y, colorIndex) {
    const color = COLORS[colorIndex];
    if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
}

// Draw the board
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
}

// Draw current piece
function drawPiece() {
    if (!currentPiece) return;

    currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                drawBlock(ctx, currentPiece.x + dx, currentPiece.y + dy, value);
            }
        });
    });
}

// Draw next piece
function drawNextPiece() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const offsetX = (4 - nextPiece.shape[0].length) / 2;
    const offsetY = (4 - nextPiece.shape.length) / 2;

    nextPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                const x = (offsetX + dx) * BLOCK_SIZE;
                const y = (offsetY + dy) * BLOCK_SIZE;
                nextCtx.fillStyle = COLORS[value];
                nextCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                nextCtx.strokeStyle = '#000';
                nextCtx.lineWidth = 2;
                nextCtx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Check collision
function collides(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Merge piece to board
function mergePiece() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                const y = currentPiece.y + dy;
                const x = currentPiece.x + dx;
                if (y >= 0) {
                    board[y][x] = value;
                }
            }
        });
    });
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check the same row again
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateScore();
    }
}

// Rotate piece
function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    return { ...piece, shape: rotated };
}

// Move piece
function move(direction) {
    if (!gameRunning || gamePaused) return;

    if (direction === 'left' && !collides(currentPiece, -1, 0)) {
        currentPiece.x--;
    } else if (direction === 'right' && !collides(currentPiece, 1, 0)) {
        currentPiece.x++;
    } else if (direction === 'down') {
        if (!collides(currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 1;
            updateScore();
        } else {
            lockPiece();
        }
    }

    draw();
}

// Hard drop
function hardDrop() {
    if (!gameRunning || gamePaused) return;

    while (!collides(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    updateScore();
    lockPiece();
    draw();
}

// Rotate current piece
function rotatePiece() {
    if (!gameRunning || gamePaused) return;

    const rotated = rotate(currentPiece);
    if (!collides(rotated)) {
        currentPiece = rotated;
        draw();
    }
}

// Lock piece and spawn new one
function lockPiece() {
    mergePiece();
    clearLines();
    spawnPiece();

    if (collides(currentPiece)) {
        gameOver();
    }
}

// Spawn new piece
function spawnPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();
    drawNextPiece();
}

// Handle keyboard input
function handleKeyPress(e) {
    if (!gameRunning) return;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            move('left');
            break;
        case 'ArrowRight':
            e.preventDefault();
            move('right');
            break;
        case 'ArrowDown':
            e.preventDefault();
            move('down');
            break;
        case 'ArrowUp':
            e.preventDefault();
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
    }
}

// Update score display
function updateScore() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;

    // Update high score display if current score exceeds it
    if (score > currentHighScore) {
        currentHighScore = score;
        highScoreElement.textContent = currentHighScore.toLocaleString();
    }
}

// Draw everything
function draw() {
    drawBoard();
    drawPiece();
}

// Game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;

    if (!gamePaused && timestamp - lastDropTime > dropInterval) {
        move('down');
        lastDropTime = timestamp;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    gameRunning = true;
    gamePaused = false;

    updateScore();
    spawnPiece();

    startBtn.style.display = 'none';
    pauseBtn.style.display = 'block';

    lastDropTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Toggle pause
function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'RESUME' : 'PAUSE';

    if (!gamePaused) {
        lastDropTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    gamePaused = false;

    // Check if it's a high score
    let isNewHighScore = false;
    if (score > 0 && (highScores.length < 5 || score > highScores[highScores.length - 1])) {
        addHighScore(score);
        displayHighScores();
        isNewHighScore = highScores.indexOf(score) === 0; // Is it the top score?
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

    if (isNewHighScore) {
        ctx.fillStyle = '#FF00FF';
        ctx.shadowColor = '#FF00FF';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, canvas.height / 2 - 15);
    }

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFFF00';
    ctx.shadowColor = '#FFFF00';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.shadowBlur = 0;

    startBtn.style.display = 'block';
    startBtn.textContent = 'PLAY AGAIN';
    pauseBtn.style.display = 'none';
}

// Initial draw
draw();
displayHighScores();
