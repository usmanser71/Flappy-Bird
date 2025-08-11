const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let parrotImg = new Image();
parrotImg.src = "parrot.png"; // اپنی parrot image اسی فولڈر میں رکھو

let pipeWidth = 80;
let pipeGap = 200;
let pipeSpeed = 3;
let gravity = 0.4;
let jump = -7;

let birdX = 100;
let birdY = canvas.height / 2;
let birdVelocity = 0;
let score = 0;
let paused = false;

let pipes = [];
pipes.push({
    x: canvas.width,
    y: Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50
});

function drawBird() {
    ctx.drawImage(parrotImg, birdX, birdY, 50, 50);
}

function drawPipes() {
    ctx.fillStyle = "green";
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.y);
        ctx.fillRect(pipe.x, pipe.y + pipeGap, pipeWidth, canvas.height);
    });
}

function drawScore() {
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText("Score: " + score, 20, 40);
}

function update() {
    if (!paused) {
        birdVelocity += gravity;
        birdY += birdVelocity;

        pipes.forEach(pipe => {
            pipe.x -= pipeSpeed;
            if (pipe.x + pipeWidth < 0) {
                pipe.x = canvas.width;
                pipe.y = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50;
                score++;
            }

            // Collision
            if (
                birdX + 50 > pipe.x &&
                birdX < pipe.x + pipeWidth &&
                (birdY < pipe.y || birdY + 50 > pipe.y + pipeGap)
            ) {
                resetGame();
            }
        });

        // زمین یا اوپر لگنے پر گیم ری سیٹ
        if (birdY + 50 > canvas.height || birdY < 0) {
            resetGame();
        }
    }

    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPipes();
    drawBird();
    drawScore();
}

function resetGame() {
    score = 0;
    birdY = canvas.height / 2;
    birdVelocity = 0;
    pipes = [{
        x: canvas.width,
        y: Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 50
    }];
}

canvas.addEventListener("click", () => {
    if (paused) {
        paused = false;
    } else {
        birdVelocity = jump;
    }
});

window.addEventListener("keydown", e => {
    if (e.code === "Space") {
        paused = !paused;
    }
});

setInterval(update, 20);
