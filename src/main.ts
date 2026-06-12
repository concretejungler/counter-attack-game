// Boot. (T1: toolchain verification scene — replaced by Game shell in T7+.)
import './style.css';
import * as THREE from 'three';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a2018');
const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
cam.position.set(3, 3, 5);
cam.lookAt(0, 0, 0);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 1.4, 1.4),
  new THREE.MeshStandardMaterial({ color: '#ffd97a' }),
);
scene.add(cube);
scene.add(new THREE.AmbientLight('#fff4e0', 0.5));
const key = new THREE.DirectionalLight('#ffe8c0', 2.2);
key.position.set(4, 6, 3);
scene.add(key);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((t) => {
  cube.rotation.y = t / 900;
  cube.rotation.x = t / 1700;
  renderer.render(scene, cam);
});

// Debug hook contract (populated for real by the Game shell later)
(window as unknown as { __game: object }).__game = { boot: 'T1' };
