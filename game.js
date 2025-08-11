const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Bird
let birdX = 50;
let birdY = canvas.height / 2;
let birdRadius = 20;
let birdVelocity = 0;
const gravity = 0.5;
const jump = -8;

// Pipes
let pipes = [];
let pipeWidth = 60;
let pipeGap = 200;
let pipeSpeed = 3;

// Score
let score = 0;

// Sounds
const flapSound = new Audio("https://www.soundjay.com/button/sounds/button-16.mp3");
const hitSound = new Audio("https://www.soundjay.com/button/sounds/button-10.mp3");

function drawBird() {
  ctx.beginPath();
  ctx.arc(birdX, birdY, birdRadius, 0, Math.PI * 2);
  ctx.fillStyle = "yellow";
  ctx.fill();
}

function drawPipes() {
  ctx.fillStyle = "green";
  pipes.forEach(pipe => {
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    ctx.fillRect(pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
  });
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText(score, 20, 40);
}

function update() {
  birdVelocity += gravity;
  birdY += birdVelocity;

  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;

    // Collision detection
    if (
      birdX + birdRadius > pipe.x &&
      birdX - birdRadius < pipe.x + pipeWidth &&
      (birdY - birdRadius < pipe.topHeight || birdY + birdRadius > canvas.height - pipe.bottomHeight)
    ) {
      hitSound.play();
      if (navigator.vibrate) navigator.vibrate(200);
      resetGame();
    }

    // Score update
    if (pipe.x + pipeWidth === birdX) {
      score++;
    }
  });

  // Remove passed pipes
  pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);

  // Spawn new pipe
  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 300) {
    let topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
    let bottomHeight = canvas.height - pipeGap - topHeight;
    pipes.push({ x: canvas.width, topHeight, bottomHeight });
  }

  // Hit the ground or top
  if (birdY + birdRadius > canvas.height || birdY - birdRadius < 0) {
    hitSound.play();
    if (navigator.vibrate) navigator.vibrate(200);
    resetGame();
  }
}

function resetGame() {
  birdY = canvas.height / 2;
  birdVelocity = 0;
  pipes = [];
  score = 0;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBird();
  drawPipes();
  drawScore();
  update();
  requestAnimationFrame(gameLoop);
}

function flap() {
  birdVelocity = jump;
  flapSound.play();
  if (navigator.vibrate) navigator.vibrate(50);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") flap();
});

canvas.addEventListener("touchstart", flap);

gameLoop();
