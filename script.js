const canvas = document.getElementById("spinnerCanvas");

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.z = 6;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
const canvasSize = Math.min(120, window.innerWidth * 0.15);
renderer.setSize(canvasSize, canvasSize);
renderer.setPixelRatio(window.devicePixelRatio);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 3, 5);
scene.add(light);

scene.add(new THREE.AmbientLight(0x404040, 1.5));

// Material
const material = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  metalness: 0.6,
  roughness: 0.3
});

// Spinner
const spinner = new THREE.Group();

// center
const center = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.5, 0.6, 32),
  material
);
spinner.add(center);

// arms
for (let i = 0; i < 3; i++) {
  const armGroup = new THREE.Group();

  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 2.2, 32),
    material
  );
  arm.rotation.z = Math.PI / 2;
  arm.position.x = 1.1;

  const end = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.4, 32),
    material
  );
  end.position.x = 2.2;

  armGroup.add(arm);
  armGroup.add(end);

  armGroup.rotation.z = (i / 3) * Math.PI * 2;
  spinner.add(armGroup);
}

scene.add(spinner);

//
// ===== PHYSICS =====
//
let angularVelocity = 0;
let friction = 0.98;

//
// ===== DRAG INPUT =====
//

let isDragging = false;
let lastMouse = new THREE.Vector2();

const rect = canvas.getBoundingClientRect();

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();

  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
}


function screenToWorld(pos) {
  const vector = new THREE.Vector3(pos.x, pos.y, 0);
  vector.unproject(camera);

  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;

  return camera.position.clone().add(dir.multiplyScalar(distance));
}

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  lastMouse = getMousePos(e);
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const currentMouse = getMousePos(e);

  // world positions
  const prevWorld = screenToWorld(lastMouse);
  const currWorld = screenToWorld(currentMouse);

  // movement vector
  const movement = currWorld.clone().sub(prevWorld);

  // vector from center to mouse
  const toCenter = currWorld.clone().sub(spinner.position);

  // 2D cross product (Z axis torque)
  const force = (movement.x * toCenter.y - movement.y * toCenter.x);

  // apply torque
  angularVelocity += force * -0.05; // tweak multiplier

  lastMouse = currentMouse;
});

//
// ===== ANIMATION =====
//
function animate() {
  requestAnimationFrame(animate);

  // apply rotation
  spinner.rotation.z += angularVelocity;

  // apply friction (slow down over time)
  angularVelocity *= friction;

  // stop tiny jitter
  if (Math.abs(angularVelocity) < 0.0001) {
    angularVelocity = 0;
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  const canvasSize = Math.min(120, window.innerWidth * 0.15);
  renderer.setSize(canvasSize, canvasSize);
});

animate();