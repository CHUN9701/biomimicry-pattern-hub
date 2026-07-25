"use client";

import { useEffect, useRef } from "react";
import { hexToRgbNorm } from "@/lib/colors";
import { FRAG_SHADER, VERT_SHADER } from "@/lib/shaders";

type MeshGradientCanvasProps = {
  colors: [string, string, string, string];
  speed?: number;
  seed?: number;
  glow?: number;
  className?: string;
};

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function MeshGradientCanvas({
  colors,
  speed = 1,
  seed = Math.PI,
  glow = 0,
  className = "",
}: MeshGradientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef(glow);
  glowRef.current = glow;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    const vertShader = compileShader(gl, gl.VERTEX_SHADER, VERT_SHADER);
    const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uSpeed = gl.getUniformLocation(program, "uSpeed");
    const uGlow = gl.getUniformLocation(program, "uGlow");
    const uSeed = gl.getUniformLocation(program, "uSeed");
    const uColor1 = gl.getUniformLocation(program, "uColor1");
    const uColor2 = gl.getUniformLocation(program, "uColor2");
    const uColor3 = gl.getUniformLocation(program, "uColor3");
    const uColor4 = gl.getUniformLocation(program, "uColor4");

    const [c1, c2, c3, c4] = colors.map(hexToRgbNorm);
    gl.uniform3f(uColor1, ...c1);
    gl.uniform3f(uColor2, ...c2);
    gl.uniform3f(uColor3, ...c3);
    gl.uniform3f(uColor4, ...c4);
    gl.uniform1f(uSeed, seed);
    gl.uniform1f(uSpeed, speed);

    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uResolution, w, h);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 }
    );
    intersectionObserver.observe(canvas);

    const start = performance.now();
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (!visible) return;
      const t = (now - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform1f(uGlow, glowRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      gl.deleteBuffer(positionBuffer);
    };
    // colors/speed/seed define the shader instance; changing them is rare
    // enough in this app that we intentionally don't re-init on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
