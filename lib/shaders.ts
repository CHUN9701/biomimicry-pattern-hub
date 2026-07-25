export const VERT_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Organic mesh-gradient field: domain-warped simplex noise blended between
// four palette colors, plus soft moving "pooling" blobs for extra saturation.
export const FRAG_SHADER = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uGlow;
uniform float uSeed;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * snoise(p);
    p *= 2.02;
    amp *= 0.55;
  }
  return value;
}

float blobField(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  return smoothstep(radius, radius * 0.05, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * uSpeed * 0.06;
  float seed = uSeed * 13.7;

  vec2 warp = vec2(
    fbm(p * 1.1 + vec2(seed, t)),
    fbm(p * 1.1 + vec2(t * 0.8, seed + 4.2))
  );
  vec2 wp = p + warp * 0.6;

  float field = fbm(wp * 1.3 + vec2(seed * 0.3, t * 0.5));
  field = field * 0.5 + 0.5;

  vec3 base = mix(uColor1, uColor2, smoothstep(0.15, 0.55, field));
  base = mix(base, uColor3, smoothstep(0.45, 0.8, field));
  base = mix(base, uColor4, smoothstep(0.72, 1.0, field));

  vec2 b1 = vec2(sin(t * 0.9 + seed) * 0.5, cos(t * 0.7 + seed) * 0.4);
  vec2 b2 = vec2(cos(t * 0.6 + seed * 1.7) * 0.55, sin(t * 1.1 + seed * 0.9) * 0.5);
  vec2 b3 = vec2(sin(t * 0.5 + seed * 2.3) * 0.4, cos(t * 0.4 + seed * 1.3) * 0.55);

  float pool1 = blobField(wp, b1, 0.85);
  float pool2 = blobField(wp, b2, 0.75);
  float pool3 = blobField(wp, b3, 0.65);

  vec3 color = base;
  color = mix(color, uColor2, pool1 * 0.35);
  color = mix(color, uColor4, pool2 * 0.3);
  color = mix(color, uColor1, pool3 * 0.25);

  float vignette = smoothstep(1.35, 0.2, length(p));
  color *= mix(0.72, 1.0, vignette);

  color += uGlow * 0.12 * (base + 0.3);

  float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;
