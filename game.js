// Simple Flappy-style game (clean fullscreen canvas)
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // resolution scaling for crisp canvas on mobile/retina
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Game variables
  const GRAVITY = 0.5;
  const JUMP = -8.5;
  const PIPE_GAP = 140; // gap between pipes
  const PIPE_WIDTH = 60;
  const PIPE_INTERVAL = 1500; // ms

  let bird = {
    x: 80,
    y: 100,
    vy: 0,
    radius: 14
  };

  let pipes = [];
  let lastPipeTime = 0;
  let score = 0;
  let best = 0;
  let running = false;
  let gameOver = false;
  let lastTimestamp = 0;

  function reset() {
    bird.y = canvas.height / (window.devicePixelRatio || 1) / 2;
    bird.vy = 0;
    pipes = [];
    lastPipeTime = performance.now();
    score = 0;
    running = true;
    gameOver = false;
    lastTimestamp = performance.now();
  }

  function spawnPipe() {
    const h = Math.max(60, (canvas.height / (window.devicePixelRatio || 1)) * (0.2 + Math.random() * 0.4));
    pipes.push({ x: canvas.width / (window.devicePixelRatio || 1) + 20, top: h, passed: false });
  }

  function jump() {
    if (!running) { reset(); return; }
    if (gameOver) { reset(); return; }
    bird.vy = JUMP;
  }

  // Input: touch and keyboard
  window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
  }, { passive:false });

  window.addEventListener('mousedown', (e) => {
    // desktop mouse click
    jump();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  });

  // Basic collision detection
  function collides(pipe) {
    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);
    // bird as circle, pipes as rectangles
    const bx = bird.x;
    const by = bird.y;
    const br = bird.radius;

    // top pipe rect
    const topRect = { x: pipe.x, y: 0, w: PIPE_WIDTH, h: pipe.top };
    const bottomRect = { x: pipe.x, y: pipe.top + PIPE_GAP, w: PIPE_WIDTH, h: ch - (pipe.top + PIPE_GAP) };

    function circleRect(cx, cy, r, rx, ry, rw, rh) {
      const nearestX = Math.max(rx, Math.min(cx, rx + rw));
      const nearestY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - nearestX;
      const dy = cy - nearestY;
      return (dx*dx + dy*dy) < (r*r);
    }

    if (circleRect(bx, by, br, topRect.x, topRect.y, topRect.w, topRect.h)) return true;
    if (circleRect(bx, by, br, bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h)) return true;
    // ground / ceiling
    if (by - br <= 0) return true;
    if (by + br >= ch) return true;

    return false;
  }

  // Draw functions
  function drawBackground() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    // simple vertical gradient sky
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#9ee0ff');
    g.addColorStop(1,'#53b0d9');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // ground strip at bottom
    ctx.fillStyle = '#0b1720';
    ctx.fillRect(0,h-24,w,24);
  }

  function drawBird() {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = '#ff6b6b';
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI*2);
    ctx.fill();
    // eye
    ctx.beginPath();
    ctx.fillStyle='#fff';
    ctx.arc(bird.x + 5, bird.y - 3, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle='#000';
    ctx.arc(bird.x + 6, bird.y - 3, 1.8, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawPipes() {
    const ch = canvas.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = '#074f57';
    for (let p of pipes) {
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
      ctx.fillRect(p.x, p.top + PIPE_GAP, PIPE_WIDTH, ch - (p.top + PIPE_GAP));
    }
  }

  function drawScore() {
    ctx.save();
    ctx.font = '20px serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('Score: ' + score, 12, 28);
    ctx.restore();
  }

  function drawGameOver() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.save();
    ctx.font = '32px serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', w/2, h/2 - 10);
    ctx.font = '18px serif';
    ctx.fillText('Tap / Click to Restart', w/2, h/2 + 20);
    ctx.restore();
  }

  // Main loop
  function loop(ts) {
    const dt = Math.min(40, ts - lastTimestamp);
    lastTimestamp = ts;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // spawn pipe periodically
    if (ts - lastPipeTime > PIPE_INTERVAL) {
      spawnPipe();
      lastPipeTime = ts;
    }

    // update bird
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // move pipes
    for (let p of pipes) {
      p.x -= 2.2; // pipe speed
      // score when passed
      if (!p.passed && p.x + PIPE_WIDTH < bird.x - bird.radius) {
        p.passed = true;
        score += 1;
        if (score > best) best = score;
      }
    }
    // remove offscreen pipes
    pipes = pipes.filter(p => p.x + PIPE_WIDTH > -20);

    // collision check
    if (pipes.some(p => collides(p))) {
      gameOver = true;
      running = false;
    }

    // draw
    drawBackground();
    drawPipes();
    drawBird();
    drawScore();
    if (gameOver) drawGameOver();

    requestAnimationFrame(loop);
  }

  // first start
  reset();
  requestAnimationFrame(loop);

})();
