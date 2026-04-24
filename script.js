// =============== CURSOR ===============
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mx = -100, my = -100, rx = -100, ry = -100;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
document.addEventListener('touchmove', e => { mx = e.clientX; my = e.clientY; });
function animCursor() {
  requestAnimationFrame(animCursor);
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
  rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
  cursorRing.style.left = rx + 'px'; cursorRing.style.top = ry + 'px';
}
animCursor();

// =============== THREE.JS BACKGROUND ===============
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas'), alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

// Ocean plane
const geometry = new THREE.PlaneGeometry(30, 30, 80, 80);
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#0a1f3c') },
    uColor2: { value: new THREE.Color('#0d6efd') },
    uColor3: { value: new THREE.Color('#38bdf8') },
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave1 = sin(pos.x * 1.5 + uTime * 0.8) * 0.18;
      float wave2 = sin(pos.y * 2.0 + uTime * 0.6) * 0.12;
      float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.2) * 0.08;
      float wave4 = cos(pos.x * 3.0 + uTime * 0.5) * 0.04;
      pos.z += wave1 + wave2 + wave3 + wave4;
      vElevation = pos.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      float t = (vElevation + 0.3) / 0.6;
      t = clamp(t, 0.0, 1.0);
      vec3 color = mix(uColor1, uColor2, t);
      color = mix(color, uColor3, t * t * 0.5);
      float foam = smoothstep(0.25, 0.42, vElevation) * 0.35;
      color += foam;
      float alpha = 0.55 + t * 0.25;
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true, side: THREE.DoubleSide
});
const ocean = new THREE.Mesh(geometry, material);
ocean.rotation.x = -Math.PI / 2.8;
ocean.position.y = -2.5;
scene.add(ocean);

// Floating particles
const partGeo = new THREE.BufferGeometry();
const N = 200;
const pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 20;
  pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
  pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
}
partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const partMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.04, transparent: true, opacity: 0.6 });
scene.add(new THREE.Points(partGeo, partMat));

let clock = { t: 0 };
function animThree() {
  requestAnimationFrame(animThree);
  clock.t += 0.01;
  material.uniforms.uTime.value = clock.t;
  ocean.position.y = -2.5 + Math.sin(clock.t * 0.4) * 0.1;
  renderer.render(scene, camera);
}
animThree();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =============== 2D WATER BUTTONS ===============
function makeWaterCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const parent = canvas.parentElement;
  canvas.width = parent.offsetWidth;
  canvas.height = parent.offsetHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = W / 2;

  const waves = [
    { amp: 12, freq: 0.022, speed: 1.3, phase: 0 },
    { amp: 8, freq: 0.035, speed: 0.9, phase: 1.5 },
    { amp: 5, freq: 0.05, speed: 1.6, phase: 0.8 },
  ];
  let t = Math.random() * 100;
  let hovered = false;
  let fillLevel = 0.52; // 0=empty, 1=full
  let targetFill = 0.52;

  parent.addEventListener('mouseenter', () => { hovered = true; targetFill = 0.65; });
  parent.addEventListener('mouseleave', () => { hovered = false; targetFill = 0.52; });

  function draw() {
    t += hovered ? 0.03 : 0.018;
    fillLevel += (targetFill - fillLevel) * 0.04;

    ctx.clearRect(0, 0, W, H);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();

    // Base glow
    const grad = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(30,100,200,0.5)');
    grad.addColorStop(0.6, 'rgba(10,40,100,0.7)');
    grad.addColorStop(1, 'rgba(4,13,26,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Water fill
    const waterY = H * (1 - fillLevel);
    for (let layer = 0; layer < 2; layer++) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) {
        let y = waterY;
        waves.forEach(w => {
          y += Math.sin(x * w.freq + t * w.speed + w.phase + layer * 0.5) * (w.amp * (1 - layer * 0.3));
        });
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      const wg = ctx.createLinearGradient(0, waterY - 20, 0, H);
      if (layer === 0) {
        wg.addColorStop(0, 'rgba(56,189,248,0.55)');
        wg.addColorStop(0.4, 'rgba(13,110,253,0.7)');
        wg.addColorStop(1, 'rgba(10,31,60,0.9)');
      } else {
        wg.addColorStop(0, 'rgba(168,216,240,0.25)');
        wg.addColorStop(1, 'rgba(56,189,248,0.1)');
      }
      ctx.fillStyle = wg;
      ctx.fill();
    }

    // Foam line
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= W; x += 2) {
      let y = waterY;
      waves.forEach(w => { y += Math.sin(x * w.freq + t * w.speed + w.phase) * w.amp; });
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(168,216,240,0.6)';
    ctx.lineWidth = 2; ctx.stroke();

    // Bubbles
    for (let b = 0; b < 4; b++) {
      const bx = (Math.sin(t * (0.3 + b * 0.2) + b * 2.1) * 0.4 + 0.5) * W;
      const by = waterY + 10 + ((t * (20 + b * 7) + b * 50) % (H - waterY - 10));
      const br = 2 + b * 0.8;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168,216,240,0.5)';
      ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.restore();

    // Ring glow
    const ringGrad = ctx.createRadialGradient(cx, cy, r - 8, cx, cy, r);
    ringGrad.addColorStop(0, 'transparent');
    ringGrad.addColorStop(1, hovered ? 'rgba(56,189,248,0.4)' : 'rgba(56,189,248,0.15)');
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.strokeStyle = hovered ? 'rgba(56,189,248,0.8)' : 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 2; ctx.stroke();

    requestAnimationFrame(draw);
  }
  draw();
}
makeWaterCanvas('wave-resume');
makeWaterCanvas('wave-portfolio');

// =============== SPLASH ANIMATION ===============
const splashCanvas = document.getElementById('splash-canvas');
const splashCtx = splashCanvas.getContext('2d');
let splashDrops = [];
let splashAnim = null;
let splashActive = false;

function resizeSplash() {
  splashCanvas.width = window.innerWidth;
  splashCanvas.height = window.innerHeight;
}
resizeSplash();
window.addEventListener('resize', resizeSplash);

function startSplash(originX, originY, onDone) {
  splashActive = true;
  splashDrops = [];
  const SW = splashCanvas.width, SH = splashCanvas.height;
  let rippleR = 0, expansion = 0;
  let fillRadius = 0;
  const maxFill = Math.sqrt(SW * SW + SH * SH);

  // Generate splash drops
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i / 60) + (Math.random() - 0.5) * 0.3;
    const speed = 4 + Math.random() * 14;
    splashDrops.push({
      x: originX, y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (2 + Math.random() * 8),
      r: 2 + Math.random() * 6,
      life: 1, decay: 0.015 + Math.random() * 0.02
    });
  }

  let frame = 0;
  function animSplash() {
    frame++;
    splashCtx.clearRect(0, 0, SW, SH);

    // Expanding fill circle
    if (frame > 15) {
      fillRadius += (maxFill - fillRadius) * 0.08 + 8;
      const grad = splashCtx.createRadialGradient(originX, originY, 0, originX, originY, fillRadius);
      grad.addColorStop(0, 'rgba(10,50,120,0.98)');
      grad.addColorStop(0.4, 'rgba(13,110,253,0.92)');
      grad.addColorStop(0.8, 'rgba(56,189,248,0.85)');
      grad.addColorStop(1, 'rgba(168,216,240,0)');
      splashCtx.beginPath();
      splashCtx.arc(originX, originY, fillRadius, 0, Math.PI * 2);
      splashCtx.fillStyle = grad;
      splashCtx.fill();
    }

    // Ripple
    rippleR += 12; expansion += 0.5;
    for (let rp = 0; rp < 3; rp++) {
      const rr = rippleR - rp * 30;
      if (rr > 0 && rr < maxFill * 1.5) {
        splashCtx.beginPath();
        splashCtx.arc(originX, originY, rr, 0, Math.PI * 2);
        splashCtx.strokeStyle = `rgba(168,216,240,${Math.max(0, 0.6 - rp * 0.2 - rr / maxFill)})`;
        splashCtx.lineWidth = 2 - rp * 0.5;
        splashCtx.stroke();
      }
    }

    // Drops
    splashDrops.forEach(d => {
      d.x += d.vx; d.y += d.vy; d.vy += 0.35;
      d.vx *= 0.98; d.life -= d.decay;
      if (d.life <= 0) return;
      splashCtx.beginPath();
      splashCtx.arc(d.x, d.y, d.r * d.life, 0, Math.PI * 2);
      splashCtx.fillStyle = `rgba(168,216,240,${d.life * 0.9})`;
      splashCtx.fill();
      // trail
      splashCtx.beginPath();
      splashCtx.moveTo(d.x, d.y);
      splashCtx.lineTo(d.x - d.vx * 3, d.y - d.vy * 3);
      splashCtx.strokeStyle = `rgba(56,189,248,${d.life * 0.5})`;
      splashCtx.lineWidth = d.r * d.life * 0.5;
      splashCtx.stroke();
    });

    if (fillRadius >= maxFill * 0.7 && frame > 20) {
      if (onDone) { onDone(); onDone = null; }
    }

    if (frame < 120) {
      splashAnim = requestAnimationFrame(animSplash);
    } else {
      splashCtx.clearRect(0, 0, SW, SH);
      splashActive = false;
    }
  }
  if (splashAnim) cancelAnimationFrame(splashAnim);
  splashAnim = requestAnimationFrame(animSplash);
}

// =============== PANEL CONTENT ===============
const resumeContent = `
<div class="resume-section">
  <div class="resume-section-title">Contact</div>
  <div class="contact-row">
    <div class="contact-item"><span>📞</span> +62 812-8529-6458</div>
    <div class="contact-item"><span>✉</span> azharramadhan7777@gmail.com</div>
    <div class="contact-item"><span>🌐</span> reafuse.itch.io</div>
  </div>
</div>

<div class="resume-section">
  <div class="resume-section-title">Experience</div>
  <div class="resume-row">
    <div class="resume-date">2021 — Now</div>
    <div class="resume-content">
      <h3>Co-Founder & Game Programmer</h3>
      <div class="org">Renala Games (Self-Employed)</div>
      <ul>
        <li>Developed video games for PC, Web (WebGL), and Android platforms</li>
        <li>Responsible for C# programming, Unity Editor Tools, technical system design, and implementing art assets</li>
        <li>Managed feature flow within the game pipeline</li>
        <li>Participated as intermediate-level mentee in IGDX 2023 program</li>
      </ul>
    </div>
  </div>
  <div class="resume-row">
    <div class="resume-date">Aug — Nov 2024</div>
    <div class="resume-content">
      <h3>Virtual Reality Developer</h3>
      <div class="org">Intern</div>
      <ul>
        <li>Designed a Occupational Health &amp; Safety (OHS) simulation in VR using Unity</li>
        <li>Developed a sequence system to integrate OHS elements in structured order</li>
        <li>Implemented 3C system (Character, Controls, Camera) for the simulation</li>
      </ul>
      <div class="achieve">⭐ Gained experience in developing VR-based OHS simulations</div>
    </div>
  </div>
  <div class="resume-row">
    <div class="resume-date">Jul — Sep 2022</div>
    <div class="resume-content">
      <h3>Game Programmer</h3>
      <div class="org">Intern</div>
      <ul>
        <li>Designed and developed the Enemy AI system for <em>Let Me Out</em></li>
        <li>Collaborated with programmers to implement the full design</li>
        <li>Created a modular rotating tool for the door system</li>
      </ul>
      <div class="achieve">⭐ Developed a modular and extendable AI system</div>
    </div>
  </div>
</div>

<div class="resume-section">
  <div class="resume-section-title">Education</div>
  <div class="resume-row">
    <div class="resume-date">2021 — 2025</div>
    <div class="resume-content">
      <h3>Game Technology (Diploma) — GPA 3.66</h3>
      <div class="org">Politeknik Negeri Media Kreatif Jakarta</div>
      <ul>
        <li>Unity engine development from technical and visual perspectives</li>
        <li>Basic 3D modeling and animation using Blender</li>
      </ul>
    </div>
  </div>
</div>

<div class="resume-section">
  <div class="resume-section-title">Achievements</div>
  <div class="badge">🥇 1st Place — TSA (Talent Scout Academy) by Agate Academy 2024</div><br>
  <div class="badge">🎓 Junior Game Programmer Certificate — SKKNI No.18 Tahun 2022 · Agate Academy (2023–2025)</div>
</div>

<div class="resume-section">
  <div class="resume-section-title">Skills</div>
  <div class="skills-grid">
    <div class="skill-chip">Unity</div>
    <div class="skill-chip">C#</div>
    <div class="skill-chip">VS Code</div>
    <div class="skill-chip">Visual Studio</div>
    <div class="skill-chip">JetBrains</div>
    <div class="skill-chip">Java</div>
    <div class="skill-chip">JavaScript</div>
    <div class="skill-chip">TypeScript</div>
    <div class="skill-chip">Python</div>
    <div class="skill-chip">WebGL</div>
    <div class="skill-chip">VR Dev</div>
    <div class="skill-chip">Shader Graph</div>
  </div>
</div>
<div class="scroll-hint">↑ scroll to top</div>
`;

const portfolioContent = `
<div class="portfolio-grid">

  <div class="port-card port-full">
    <div class="card-thumb" style="background: linear-gradient(135deg, #1a0830, #2d1060, #0d1f50);">
      <div class="card-thumb-bg" style="background:linear-gradient(135deg,#6d28d9,#1d4ed8);opacity:0.3;"></div>
      <span>🏚️</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Puzzle Platformer · Adventure · Desktop</div>
      <div class="card-name">House of Everlast</div>
      <div class="card-desc">A mystifying puzzle game that weaves a profound tale exploring the essence of life and family bonds. Follow Nala, a young girl trapped within a haunted house, accompanied by her unexpected ally, Mr. G.</div>
      <div class="card-links">
        <a class="card-link" href="https://store.steampowered.com/app/2579680/House_of_Everlast/" target="_blank">🎮 Wishlist on Steam</a>
        <a class="card-link" href="https://renalagames.itch.io/house-of-everlast" target="_blank">🕹 Play demo on itch.io</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #0c2340, #1a5280);">
      <span>🧙‍♀️</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Endless Runner · Mobile</div>
      <div class="card-name">Flying Witch</div>
      <div class="card-desc">Flappy Bird-inspired endless runner. A wizard seeks immortality by collecting Golden Apples and reaching the Tree of Eden.</div>
      <div class="card-links">
        <a class="card-link" href="https://play.google.com/store/apps/details?id=com.RenalaGames.FlyingWitch" target="_blank">📱 Google Play</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background: linear-gradient(135deg, #3a0f0f, #b91c1c, #ff6b00);">
      <span>🍲</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Narrative Driven · Cooking · PC</div>
      <div class="card-name">Dungeon Hotpot</div>
      <div class="card-desc">Cozy narrative game set in a torchlit dungeon, where you comfort weary adventurers with warm, delicious bowls of monster hotpot.</div>
      <div class="card-links">
        <a class="card-link" href="https://store.steampowered.com/app/3333380/Dungeon_Hotpot/" target="_blank">🎮 Wishlist on Steam</a>
        <a class="card-link" href="https://candrapota.itch.io/dungeon-hotpot" target="_blank">🕹 Play demo on itch.io</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #001a10, #003d25, #005c38);">
      <span>💧</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Unity VFX · Shader + Particle</div>
      <div class="card-name">Water Casting VFX</div>
      <div class="card-desc">Inspired by Witch Hat Atelier — magic circle casting VFX using vertex displacement shader for water bubbles and particle system for spiral movement.</div>
      <div class="card-links">
        <a class="card-link" href="https://youtu.be/YKongoN4qio" target="_blank">▶ YouTube Demo</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #2a1000, #5c2800);">
      <span>🃏</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Card Game · Browser</div>
      <div class="card-name">Tu-ru!</div>
      <div class="card-desc">A card game where player trapped into through sleep and fight with card.</div>
      <div class="card-links">
        <a class="card-link" href="https://renalagames.itch.io/renala-games-turu" target="_blank">🕹 Demo in Browser</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #001230, #002860);">
      <span>🤖</span>
    </div>
    <div class="card-body">
      <div class="card-tag">AI System · Enemy Design</div>
      <div class="card-name">Let Me Out — Enemy AI</div>
      <div class="card-desc">Modular and extendable Enemy AI system developed during internship. Published on Steam with full collaborative implementation.</div>
      <div class="card-links">
        <a class="card-link" href="https://store.steampowered.com/app/1269520/Let_Me_Out/" target="_blank">🎮 Steam Page</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #0a2000, #1a4000);">
      <span>🏗️</span>
    </div>
    <div class="card-body">
      <div class="card-tag">VR · Simulation · Intern</div>
      <div class="card-name">Occupational, Health and Safety (OHS) VR Simulation</div>
      <div class="card-desc">Workplace Health &amp; Safety simulation in Virtual Reality using Unity. Features 3C system and structured OHS sequence integration.</div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #1a1000, #3d2800);">
      <span>🍵</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Simulation · Narrative</div>
      <div class="card-name">Seeds &amp; Remedies</div>
      <div class="card-desc">Cozy simulation narrative where players brew and serve remedies through tea in a charming fantasy world.</div>
      <div class="card-links">
        <a class="card-link" href="https://renalagames.itch.io/seeds-remedies" target="_blank">🕹 itch.io</a>
      </div>
    </div>
  </div>

  <div class="port-card">
    <div class="card-thumb" style="background:linear-gradient(135deg, #1a0a00, #3d1800);">
      <span>🧹</span>
    </div>
    <div class="card-body">
      <div class="card-tag">Role Playing · Action</div>
      <div class="card-name">Super Cleaner</div>
      <div class="card-desc">A game about a cleaner in a super hero world — unique premise with action-packed gameplay elements.</div>
      <div class="card-links">
        <a class="card-link" href="https://reafuse.itch.io/super-cleaner" target="_blank">🕹 itch.io</a>
      </div>
    </div>
  </div>

</div>
<div style="margin-top:24px; text-align:center; font-size:0.75rem; color:var(--muted); letter-spacing:0.2em;">
  MORE PROJECTS AT <a href="https://reafuse.itch.io" target="_blank" style="color:var(--glow); text-decoration:none;">REAFUSE.ITCH.IO</a>
</div>
<div class="scroll-hint">↑ scroll to top</div>
`;

// =============== PANEL OPEN/CLOSE ===============
function openPanel(type) {
  const btn = document.getElementById(type === 'resume' ? 'btn-resume' : 'btn-portfolio');
  const rect = btn.getBoundingClientRect();
  const ox = rect.left + rect.width / 2;
  const oy = rect.top + rect.height / 2;

  document.getElementById('panel-title').textContent = type === 'resume' ? '— Resume —' : '— Portfolio —';
  document.getElementById('panel-body').innerHTML = type === 'resume' ? resumeContent : portfolioContent;

  // Hide center UI
  document.getElementById('center-ui').style.opacity = '0';
  document.getElementById('center-ui').style.pointerEvents = 'none';

  startSplash(ox, oy, () => {
    document.getElementById('panel').classList.add('open');
    // Fade out splash
    setTimeout(() => {
      splashCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);
      if (splashAnim) cancelAnimationFrame(splashAnim);
    }, 400);
  });
}

function closePanel() {
  const panel = document.getElementById('panel');
  panel.classList.remove('open');
  document.getElementById('center-ui').style.opacity = '1';
  document.getElementById('center-ui').style.pointerEvents = 'all';
}

// Close with Escape key
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });