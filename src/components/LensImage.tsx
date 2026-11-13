"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uVel;
  void main() {
    vUv = uv;
    vec3 p = position;
    // subtle cloth-like bend driven by pointer velocity
    p.z += sin(uv.y * 3.1415) * uVel * 0.35;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uMouse;
  uniform vec2 uPlane;
  uniform vec2 uImage;
  uniform float uHover;
  uniform float uVel;
  uniform float uTime;
  uniform float uReveal;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min((uPlane.x / uPlane.y) / (uImage.x / uImage.y), 1.0),
      min((uPlane.y / uPlane.x) / (uImage.y / uImage.x), 1.0)
    );
    return vec2(uv.x * ratio.x + (1.0 - ratio.x) * 0.5, uv.y * ratio.y + (1.0 - ratio.y) * 0.5);
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uPlane.x / uPlane.y, 1.0);

    // lens bulge around the pointer
    vec2 d = (uv - uMouse) * aspect;
    float dist = length(d);
    float lens = smoothstep(0.38, 0.0, dist) * uHover;
    uv -= d / aspect * lens * 0.22;

    // slow breathing zoom + reveal zoom
    vec2 c = uv - 0.5;
    c *= 1.0 - 0.03 * sin(uTime * 0.4) - 0.18 * (1.0 - uReveal);
    uv = c + 0.5;

    vec2 tuv = coverUv(uv);
    float shift = 0.002 + lens * 0.018 + uVel * 0.025;
    vec2 dir = normalize(d + 1e-4) * shift;

    float r = texture2D(uTex, tuv + dir).r;
    float g = texture2D(uTex, tuv).g;
    float b = texture2D(uTex, tuv - dir).b;
    vec3 col = vec3(r, g, b);

    // filmic contrast + grain + vignette
    col = smoothstep(0.02, 1.0, col);
    col += (hash(vUv * 900.0 + fract(uTime * 7.0)) - 0.5) * 0.07;
    float vig = smoothstep(1.05, 0.35, length((vUv - 0.5) * vec2(1.0, 1.15)));
    col *= mix(0.55, 1.0, vig);

    // focus ring tint
    float ring = smoothstep(0.012, 0.0, abs(dist - 0.14)) * uHover * 0.35;
    col += vec3(1.0, 0.23, 0.12) * ring;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane({ src, reveal }: { src: string; reveal: React.RefObject<number> }) {
  const tex = useTexture(src);
  const { viewport, size } = useThree();
  const mat = useRef<THREE.ShaderMaterial>(null);
  const target = useRef({ x: 0.5, y: 0.5, hover: 0 });
  const last = useRef({ x: 0.5, y: 0.5 });
  const mouse = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current = e.pointerType === "mouse";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const uniforms = useMemo(
    () => ({
      uTex: { value: tex },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uPlane: { value: new THREE.Vector2(1, 1) },
      uImage: { value: new THREE.Vector2((tex.image as HTMLImageElement).width, (tex.image as HTMLImageElement).height) },
      uHover: { value: 0 },
      uVel: { value: 0 },
      uTime: { value: 0 },
      uReveal: { value: 0 },
    }),
    [tex],
  );

  useFrame((state, delta) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uPlane.value.set(size.width, size.height);
    u.uTime.value += delta;
    u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value, reveal.current ?? 0, 2.2, delta);

    if (mouse.current) {
      const p = state.pointer; // -1..1 inside canvas
      const inside = Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
      target.current.x = p.x * 0.5 + 0.5;
      target.current.y = p.y * 0.5 + 0.5;
      target.current.hover = inside ? 1 : 0;
    } else {
      // touch / no mouse yet: a soft lens drifts slowly across the frame
      const t = u.uTime.value;
      target.current.x = 0.5 + Math.sin(t * 0.45) * 0.28;
      target.current.y = 0.55 + Math.cos(t * 0.33) * 0.22;
      target.current.hover = 0.16;
    }

    u.uMouse.value.x = THREE.MathUtils.damp(u.uMouse.value.x, target.current.x, 8, delta);
    u.uMouse.value.y = THREE.MathUtils.damp(u.uMouse.value.y, target.current.y, 8, delta);
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, target.current.hover, 4, delta);

    const v = Math.hypot(target.current.x - last.current.x, target.current.y - last.current.y);
    last.current = { x: target.current.x, y: target.current.y };
    // speed in uv-units per second, so the effect is frame-rate independent
    const speed = v / Math.max(delta, 1 / 240);
    u.uVel.value = THREE.MathUtils.damp(u.uVel.value, Math.min(speed * 0.4, 1), 5, delta);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}

/** WebGL portrait: chromatic lens follows the pointer, filmic grain + vignette. */
export default function LensImage({ src, reveal }: { src: string; reveal: React.RefObject<number> }) {
  // only render while the hero is on screen — no GPU work once the visitor has scrolled on
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="absolute inset-0">
    <Canvas
      frameloop={visible ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 5], fov: 30 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
      className="!absolute inset-0"
    >
      <color attach="background" args={["#0a0a09"]} />
      <Suspense fallback={null}>
        <Plane src={src} reveal={reveal} />
      </Suspense>
    </Canvas>
    </div>
  );
}
