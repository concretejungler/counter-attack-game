import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * One cheap pass: tilt-shift-ish vertical blur falloff + vignette + warm grade.
 * The diorama feel in a single fragment shader.
 */
const DioramaShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFocusY: { value: 0.45 },     // screen-space focus band center
    uBlurStrength: { value: 1.6 },
    uVignette: { value: 0.32 },
    uWarmth: { value: 0.05 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uFocusY;
    uniform float uBlurStrength;
    uniform float uVignette;
    uniform float uWarmth;
    varying vec2 vUv;

    void main() {
      float dist = abs(vUv.y - uFocusY) * 2.2;
      float blur = smoothstep(0.25, 1.0, dist) * uBlurStrength;
      vec2 px = blur / uResolution;

      vec4 c = texture2D(tDiffuse, vUv) * 0.30;
      c += texture2D(tDiffuse, vUv + vec2( px.x,  0.0)) * 0.12;
      c += texture2D(tDiffuse, vUv + vec2(-px.x,  0.0)) * 0.12;
      c += texture2D(tDiffuse, vUv + vec2(0.0,  px.y)) * 0.12;
      c += texture2D(tDiffuse, vUv + vec2(0.0, -px.y)) * 0.12;
      c += texture2D(tDiffuse, vUv + vec2( px.x,  px.y)) * 0.055;
      c += texture2D(tDiffuse, vUv + vec2(-px.x,  px.y)) * 0.055;
      c += texture2D(tDiffuse, vUv + vec2( px.x, -px.y)) * 0.055;
      c += texture2D(tDiffuse, vUv + vec2(-px.x, -px.y)) * 0.055;

      // warm grade — golden hour indoors
      c.rgb += vec3(uWarmth, uWarmth * 0.5, -uWarmth * 0.4) * c.a;

      // vignette
      vec2 v = vUv - 0.5;
      float vig = 1.0 - dot(v, v) * uVignette * 2.4;
      c.rgb *= clamp(vig, 0.0, 1.0);

      gl_FragColor = c;
    }
  `,
};

export class Post {
  composer: EffectComposer;
  private pass: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.pass = new ShaderPass(DioramaShader);
    this.pass.renderToScreen = true;
    this.composer.addPass(this.pass);
  }

  resize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.pass.uniforms.uResolution.value.set(w, h);
  }

  render(): void {
    this.composer.render();
  }
}
