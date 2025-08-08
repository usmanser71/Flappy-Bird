/* VIP Flappy — script.js
   - Responsive canvas
   - Tap / Click / Space to flap
   - Pipes spawn, score, best (localStorage)
   - WebAudio background tune + effects (no external files)
*/

(() => {
  // --- DOM
  const menu = document.getElementById('menu');
  const playBtn = document.getElementById('btn-play');
  const soundBtn = document.getElementById('btn-sound');
  const gameWrap = document.getElementById('game-wrap');
  const canvas = document.getElementById('game');
  const overlay = document.getElementById('overlay');
  const finalScoreEl = document.getElementById('final-score');
  const restartBtn = document.getElementById('btn-restart');
  const menuBtn = document.getElementById('btn-menu');
  const bestEl = document.getElementById('best');
  const currentEl = document.getElementById('current');

  // canvas sizing
  const GAME_W = 720, GAME_H = 540;
  canvas.width = GAME_W; canvas.height = GAME_H;
  const ctx = canvas.getContext('2d');

  // game state
  let running = false;
  let score = 0;
  let best = parseInt(localStorage.getItem('vip_flappy_best') || '0');
  bestEl.innerText = `Best: ${best}`;
  currentEl.innerText = `Score: ${score}`;

  // player
  const bird = { x: 160, y: GAME_H/2, r: 18, vy: 0, gravity: 850, flapPower: -290, rotation: 0 };

  // pipes
  const pipes = [];
  const PIPE_GAP = 160;
  const PIPE_W = 80;
  let pipeTimer = 0;
  let speed = 180;

  // timing
  let last = 0;

  // audio — WebAudio synth (simple loop + effects)
  let audioEnabled = true;
  let audioCtx = null;
  let bgInterval = null;

  function ensureAudio() {
    if (!audioEnabled) return;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTone(freq, time=0.12, vol=0.03, type='sine') {
    if (!audioEnabled) return;
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + time);
    } catch(e) { /* no-op */ }
  }

  function startBackgroundLoop() {
    if (!audioEnabled) return;
    ensureAudio();
    stopBackgroundLoop();
    const notes = [440, 523.25, 659.25, 784]; // A4, C5, E5, G5
    let idx = 0;
    bgInterval = setInterval(()=>{
      playTone(notes[idx % notes.length], 0.18, 0.01, 'sine');
      idx++;
    }, 420);
  }
  function stopBackgroundLoop(){ if (bgInterval) { clearInterval(bgInterval); bgInterval=null; } }

  // controls
  function flap() {
    if (!running) return;
    bird.vy = bird.flapPower;
    playTone(900, 0.08, 0.04, 'triangle');
  }

  function startGame() {
    menu.classList.add('hidden');
    gameWrap.classList.remove('hidden');
    overlay.classList.add('hidden');
    running = true;
    score = 0; currentEl.innerText = `Score: ${score}`;
    bird.y = GAME_H/2; bird.vy = 0; bird.rotation = 0;
    pipes.length = 0;
    pipeTimer = 0; speed = 180;
    last = performance.now();
    startBackgroundLoop();
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    stopBackgroundLoop();
    playTone(120, 0.28, 0.08, 'sawtooth');
    // update best
    if (score > best) {
      best = score;
      localStorage.setItem('vip_flappy_best', ''+best);
      bestEl.innerText = `Best: ${best}`;
    }
    // show overlay
    finalScoreEl.innerText = `Score: ${score}`;
    overlay.classList.remove('hidden');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('visible');
  }

  // spawn pipe pair
  function spawnPipe() {
    const margin = 80;
    const hTop = Math.floor(Math.random() * (GAME_H - PIPE_GAP - margin*2)) + margin;
    pipes.push({ x: GAME_W + 50, y: 0, w: PIPE_W, h: hTop, passed: false, top:true });
    pipes.push({ x: GAME_W + 50, y: hTop + PIPE_GAP, w: PIPE_W, h: GAME_H - (hTop + PIPE_GAP), passed: false, top:false });
  }

  // collision
  function collided(pipe) {
    // rectangle vs circle
    const cx = Math.max(pipe.x, Math.min(bird.x, pipe.x + pipe.w));
    const cy = Math.max(pipe.y, Math.min(bird.y, pipe.y + pipe.h));
    const dx = bird.x - cx;
    const dy = bird.y - cy;
    return (dx*dx + dy*dy) < (bird.r * bird.r);
  }

  // main loop
  function loop(now) {
    if (!last) last = now;
    const dt = Math.min(40, now - last) / 1000; // seconds
    last = now;

    // physics
    bird.vy += bird.gravity * dt;
    bird.y += bird.vy * dt;
    bird.rotation = Math.max(-0.6, Math.min(1.2, bird.vy / 700));

    // ground collision
    if (bird.y + bird.r > GAME_H - 40) {
      bird.y = GAME_H - 40 - bird.r;
      endGame();
      draw(); return;
    }
    if (bird.y - bird.r < 0) {
      bird.y = bird.r;
      bird.vy = 0;
    }

    // pipes
    pipeTimer += dt*1000;
    if (pipeTimer > 1400) { pipeTimer = 0; spawnPipe(); }

    for (let i = pipes.length-1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= speed * dt;
      // scoring when a top pipe passes bird.x
      if (!p.passed && !p.top && (p.x + p.w) < bird.x) {
        p.passed = true;
        score++;
        playTone(1400,0.06,0.03,'sine');
        currentEl.innerText = `Score: ${score}`;
      }
      // collision
      if (collided(p)) {
        endGame();
        draw(); return;
      }
      // remove offscreen
      if (p.x + p.w < -50) pipes.splice(i,1);
    }

    // speed up slowly
    speed += 0.5 * dt;

    // draw
    draw();

    if (running) requestAnimationFrame(loop);
  }

  // drawing
  function draw() {
    // sky gradient
    const g = ctx.createLinearGradient(0,0,0,GAME_H);
    g.addColorStop(0, '#9be7ff');
    g.addColorStop(1, '#2a9bd7');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,GAME_W,GAME_H);

    // sun / city silhouette (VIP flair)
    ctx.fillStyle = '#ffd166'; ctx.beginPath();
    ctx.ellipse(GAME_W - 120, 80, 44, 44, 0, 0, Math.PI*2); ctx.fill();

    // pipes
    pipes.forEach(p => {
      ctx.fillStyle = '#0f9d58';
      // pipe body
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // pipe rim
      ctx.fillStyle = '#0b6b3f';
      ctx.fillRect(p.x, p.y + (p.top ? p.h - 12: 0), p.w, 12);
    });

    // ground
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, GAME_H - 40, GAME_W, 40);

    // bird (circle + wing)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    // body
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath(); ctx.arc(0,0,bird.r,0,Math.PI*2); ctx.fill();
    // eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6,-6,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7,-6,2,0,Math.PI*2); ctx.fill();
    // wing (animated)
    const wingY = Math.sin(Date.now()/120) * 4;
    ctx.fillStyle = '#f06595'; ctx.beginPath(); ctx.ellipse(-6, wingY, 10,6, Math.PI/6,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // top HUD in canvas (small)
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(8,8,140,34);
    ctx.fillStyle = '#fff'; ctx.font = '18px Inter, Arial'; ctx.fillText(`Score: ${score}`, 16, 32);
  }

  // event listeners
  window.addEventListener('resize', fitCanvas);
  function fitCanvas() {
    const parentW = Math.min(window.innerWidth - 28, 860);
    canvas.style.width = parentW + 'px';
    canvas.style.height = (parentW * (GAME_H / GAME_W)) + 'px';
  }
  fitCanvas();

  // pointer/touch/click
  function pointerDown(e) {
    // if overlay visible (game over) do nothing
    if (!running) return;
    flap();
  }
  canvas.addEventListener('pointerdown', pointerDown);
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (!running) return;
      flap();
    } else if (ev.code === 'Enter') {
      if (!running) startGame();
    }
  });

  // menu controls
  playBtn.addEventListener('click', ()=> {
    // resume audio context on some browsers on gesture
    if (!audioCtx && audioEnabled) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
    startGame();
  });
  soundBtn.addEventListener('click', ()=> {
    audioEnabled = !audioEnabled;
    soundBtn.innerText = audioEnabled ? '🔊 Sound On' : '🔈 Sound Off';
    if (audioEnabled) startBackgroundLoop(); else stopBackgroundLoop();
  });

  // overlay buttons (create after overlay exists)
  restartBtn.addEventListener('click', ()=> {
    overlay.classList.add('hidden');
    startGame();
  });
  menuBtn.addEventListener('click', ()=> {
    overlay.classList.add('hidden');
    gameWrap.classList.add('hidden');
    menu.classList.remove('hidden');
    stopBackgroundLoop();
  });

  // init
  overlay.classList.add('hidden');
  gameWrap.classList.add('hidden');
  // pre-draw initial canvas (menu shows but canvas behind)
  draw();

})(); // IIFE end
