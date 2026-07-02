import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { dprCap } from '../core/device';

/**
 * Bright-pass extraction — anything above uThreshold survives (dimmed toward black below it).
 * Runs at half resolution into a small HDR-ish target; feeds the blur pass below.
 */
const BrightExtractShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uThreshold: { value: 0.5 },
    uSrcResolution: { value: new THREE.Vector2(1, 1) },
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
    uniform float uThreshold;
    uniform vec2 uSrcResolution;
    varying vec2 vUv;
    // 4-tap supersample at the *source* (full-res) texel scale — this pass downsamples to a
    // quarter-res target, so a single point-sample has a real chance of skipping straight past
    // small bright features (candle flames, zap arcs). Sampling a small cluster of full-res
    // texels and taking the max keeps tiny hot spots from disappearing into the downsample.
    void main() {
      vec2 px = 0.5 / uSrcResolution;
      vec3 c0 = texture2D(tDiffuse, vUv + vec2(-px.x, -px.y)).rgb;
      vec3 c1 = texture2D(tDiffuse, vUv + vec2( px.x, -px.y)).rgb;
      vec3 c2 = texture2D(tDiffuse, vUv + vec2(-px.x,  px.y)).rgb;
      vec3 c3 = texture2D(tDiffuse, vUv + vec2( px.x,  px.y)).rgb;
      float l0 = dot(c0, vec3(0.2126, 0.7152, 0.0722));
      float l1 = dot(c1, vec3(0.2126, 0.7152, 0.0722));
      float l2 = dot(c2, vec3(0.2126, 0.7152, 0.0722));
      float l3 = dot(c3, vec3(0.2126, 0.7152, 0.0722));
      vec3 best = l0 > l1 ? c0 : c1;
      float bestL = max(l0, l1);
      if (l2 > bestL) { best = c2; bestL = l2; }
      if (l3 > bestL) { best = c3; bestL = l3; }
      float k = smoothstep(uThreshold, uThreshold + 0.3, bestL);
      gl_FragColor = vec4(best * k, 1.0);
    }
  `,
};

/** Cheap separable box-ish blur (single pass, both axes) — used at half-res for the bloom mip. */
const SoftBlurShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uRadius: { value: 1.6 },
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
    uniform float uRadius;
    varying vec2 vUv;
    void main() {
      vec2 px = uRadius / uResolution;
      vec4 c = texture2D(tDiffuse, vUv) * 0.28;
      c += texture2D(tDiffuse, vUv + vec2( px.x,  0.0)) * 0.13;
      c += texture2D(tDiffuse, vUv + vec2(-px.x,  0.0)) * 0.13;
      c += texture2D(tDiffuse, vUv + vec2(0.0,  px.y)) * 0.13;
      c += texture2D(tDiffuse, vUv + vec2(0.0, -px.y)) * 0.13;
      c += texture2D(tDiffuse, vUv + vec2( px.x,  px.y)) * 0.075;
      c += texture2D(tDiffuse, vUv + vec2(-px.x,  px.y)) * 0.075;
      c += texture2D(tDiffuse, vUv + vec2( px.x, -px.y)) * 0.075;
      c += texture2D(tDiffuse, vUv + vec2(-px.x, -px.y)) * 0.075;
      gl_FragColor = c;
    }
  `,
};

/**
 * Final composite: tilt-shift DOF (blur top/bottom bands, sharp center band), additive bloom
 * from the half-res bright blur, ACES filmic tonemap + slight saturation lift, warm grade,
 * vignette, then sRGB output-transfer (the EffectComposer chain is otherwise all-linear —
 * this pass is the screen-facing one so it must do the linear-to-sRGB encode itself).
 */
const DioramaShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tBloom: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFocusY: { value: 0.45 },
    uBlurStrength: { value: 1.6 },
    uVignette: { value: 0.34 },
    uWarmth: { value: 0.06 },
    uBloomStrength: { value: 0.32 },
    uSaturation: { value: 1.18 },
    uExposure: { value: 0.35 },
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
    uniform sampler2D tBloom;
    uniform vec2 uResolution;
    uniform float uFocusY;
    uniform float uBlurStrength;
    uniform float uVignette;
    uniform float uWarmth;
    uniform float uBloomStrength;
    uniform float uSaturation;
    uniform float uExposure;
    varying vec2 vUv;

    // ACES filmic fit (Narkowicz) — cheap, standard, matches THREE.ACESFilmicToneMapping closely.
    vec3 acesFilmic(vec3 x) {
      float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      // ---- tilt-shift: sharp center band, blurred top/bottom ----
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

      // ---- bloom add (half-res bright blur, upsampled by the sampler) ----
      vec3 bloom = texture2D(tBloom, vUv).rgb;
      c.rgb += bloom * uBloomStrength;

      // ---- warm grade — golden hour indoors ----
      c.rgb += vec3(uWarmth, uWarmth * 0.5, -uWarmth * 0.4);

      // ---- exposure + ACES filmic tonemap (done here since this is the final linear-space pass) ----
      c.rgb *= uExposure;
      c.rgb = acesFilmic(c.rgb);

      // ---- slight saturation lift ----
      float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(lum), c.rgb, uSaturation);

      // ---- vignette ----
      vec2 v = vUv - 0.5;
      float vig = 1.0 - dot(v, v) * uVignette * 2.4;
      c.rgb *= clamp(vig, 0.0, 1.0);

      // ---- sRGB output transfer (linear -> display) — this pass renders straight to screen ----
      c.rgb = clamp(c.rgb, 0.0, 1.0);
      c.rgb = mix(c.rgb * 12.92, 1.055 * pow(c.rgb, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c.rgb));

      gl_FragColor = vec4(c.rgb, 1.0);
    }
  `,
};

/**
 * Retro Mode (§20.1 Konami egg): blit-with-NearestFilter chunky-pixel pass. Renders whatever the
 * normal pipeline produced into a small fixed-resolution target, then upsamples it back to full
 * screen with nearest-neighbor sampling — the blockiness IS the effect, no shader math needed.
 */
const RetroBlitShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
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
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(tDiffuse, vUv);
    }
  `,
};

/** Retro Mode target resolution — low enough to read as unmistakably 8-bit-chunky at any window size. */
const RETRO_PIXELS_TALL = 135;

/**
 * Manual render pipeline (not EffectComposer's own pass-chain execution — we drive each step by
 * hand so the two bloom sub-passes can run at a small, fixed, DPR-capped half-resolution instead
 * of full framebuffer size, which is what keeps this affordable). All intermediate targets are
 * plain linear HDR (renderer.toneMapping is NoToneMapping — see renderer.ts); the final
 * DioramaShader pass does tonemap + sRGB output-transfer itself since it is the only pass that
 * writes to the actual screen.
 */
export class Post {
  /** Kept for API compatibility (resize uses it for size bookkeeping); passes are driven manually. */
  composer: EffectComposer;
  private pass: ShaderPass;
  private brightPass: ShaderPass;
  private blurPass: ShaderPass;
  private bloomTargetA: THREE.WebGLRenderTarget;
  private bloomTargetB: THREE.WebGLRenderTarget;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  // ---- Retro Mode (§20.1) ----
  private retroTarget: THREE.WebGLRenderTarget;
  private retroPass: ShaderPass;
  private retroOn = false;
  private lastW = 2;
  private lastH = 2;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = new EffectComposer(renderer);

    // half-res bloom mip: bright-extract then soft-blur, both cheap single-tap-cluster passes.
    this.bloomTargetA = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    this.bloomTargetB = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    this.bloomTargetA.texture.generateMipmaps = false;
    this.bloomTargetB.texture.generateMipmaps = false;

    this.brightPass = new ShaderPass(BrightExtractShader);
    this.blurPass = new ShaderPass(SoftBlurShader);
    this.pass = new ShaderPass(DioramaShader);

    this.retroTarget = new THREE.WebGLRenderTarget(2, 2);
    this.retroTarget.texture.minFilter = THREE.NearestFilter;
    this.retroTarget.texture.magFilter = THREE.NearestFilter;
    this.retroTarget.texture.generateMipmaps = false;
    this.retroPass = new ShaderPass(RetroBlitShader);
  }

  /** Konami-code Retro Mode toggle (§20.1) — session-only, set by game.ts. */
  setRetro(on: boolean): void {
    this.retroOn = on;
  }

  /** PHOTO MODE (§18): live tilt-shift uniform tweak — uFocusY/uBlurStrength are already
   *  per-frame-read uniforms on the DioramaShader pass, so a slider can drive them directly
   *  with zero pipeline changes. */
  setUniform(name: 'uFocusY' | 'uBlurStrength', v: number): void {
    this.pass.uniforms[name].value = v;
  }

  resize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.pass.uniforms.uResolution.value.set(w, h);
    this.lastW = w;
    this.lastH = h;

    // bloom chain runs at a quarter of the *device-capped* resolution — cheap and still reads
    // as a soft glow once additively upsampled back over the sharp full-res image.
    const cap = Math.min(devicePixelRatio || 1, dprCap());
    const fullW = Math.max(2, Math.round(w * cap));
    const fullH = Math.max(2, Math.round(h * cap));
    const bw = Math.max(2, Math.round(fullW / 4));
    const bh = Math.max(2, Math.round(fullH / 4));
    this.bloomTargetA.setSize(bw, bh);
    this.bloomTargetB.setSize(bw, bh);
    this.blurPass.uniforms.uResolution.value.set(bw, bh);
    this.brightPass.uniforms.uSrcResolution.value.set(fullW, fullH);

    // retro target: fixed short-side pixel count, aspect-matched to the real viewport.
    const rh = RETRO_PIXELS_TALL;
    const rw = Math.max(2, Math.round(rh * (w / h)));
    this.retroTarget.setSize(rw, rh);
  }

  render(): void {
    // 1) main scene, linear HDR, into a full-res target we own
    const readBuffer = this.composer.readBuffer;
    this.renderer.setRenderTarget(readBuffer);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // 2) bright-pass extract (full scene -> quarter-res bright mip)
    this.brightPass.uniforms.tDiffuse.value = readBuffer.texture;
    this.renderer.setRenderTarget(this.bloomTargetA);
    this.brightPass.fsQuad.render(this.renderer);

    // 3) soft blur the bright mip (single pass, both axes)
    this.blurPass.uniforms.tDiffuse.value = this.bloomTargetA.texture;
    this.renderer.setRenderTarget(this.bloomTargetB);
    this.blurPass.fsQuad.render(this.renderer);

    if (this.retroOn) {
      // 4a) composite into the small retro target instead of the screen...
      this.renderer.setRenderTarget(this.retroTarget);
      this.pass.uniforms.tDiffuse.value = readBuffer.texture;
      this.pass.uniforms.tBloom.value = this.bloomTargetB.texture;
      this.pass.fsQuad.render(this.renderer);

      // 4b) ...then blit it back up to full screen with nearest-neighbor sampling — chunky pixels.
      this.renderer.setRenderTarget(null);
      this.retroPass.uniforms.tDiffuse.value = this.retroTarget.texture;
      this.retroPass.fsQuad.render(this.renderer);
      return;
    }

    // 4) final composite straight to screen: tilt-shift + bloom add + tonemap + vignette + sRGB
    this.renderer.setRenderTarget(null);
    this.pass.uniforms.tDiffuse.value = readBuffer.texture;
    this.pass.uniforms.tBloom.value = this.bloomTargetB.texture;
    this.pass.fsQuad.render(this.renderer);
  }
}
