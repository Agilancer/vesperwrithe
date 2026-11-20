// Title screen atmosphere: two layers of drifting mist (one behind the logo, one curling in front of it) lit by
// the moon in the upper-right corner. Plain WebGL, half resolution, stops the moment the title is dismissed.
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FRAG = `precision mediump float;
uniform vec2 res; uniform float t; uniform float seed; uniform float front;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }
void main(){
  vec2 uv = gl_FragCoord.xy / res; float asp = res.x / res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  // slow drift to the left, away from the moon; the front layer moves faster and is wispier
  float sp = mix(.012, .028, front);
  vec2 q = p * mix(1.5, 2.3, front) + vec2(t * sp + seed, -t * sp * .25);
  vec2 warp = vec2(fbm(q + vec2(0., t * .02)), fbm(q + vec2(5.2, 1.3) - t * .016));
  float d = fbm(q + warp * 1.35);
  // the mist pools low and wraps the lettering (logo sits around y = .57 from the bottom)
  float band = exp(-pow((uv.y - .5) / .26, 2.)) * .95 + smoothstep(.5, 0., uv.y) * .9;
  float dens = smoothstep(mix(.33, .45, front), .88, d + band * .42) * mix(.9, .6, front);
  dens *= smoothstep(1.02, .7, uv.y);
  // moonlight: brightest toward the upper right, with a soft forward-scatter bloom around the moon itself
  vec2 m = vec2(.93 * asp, 1.02); float dm = distance(p, m);
  float lit = .2 + 1.25 * exp(-dm * 1.25) + .55 * exp(-dm * 4.2);
  float shade = .68 + .5 * (fbm(q * 1.9 + warp * 2.0 + 3.7) - .5);                                // self-shadowing
  vec3 col = mix(vec3(.2, .38, .42), vec3(.86, 1., .97), clamp(lit * .6, 0., 1.)) * lit * shade;
  float a = clamp(dens, 0., 1.);
  gl_FragColor = vec4(col * a, a);
}`;

function layer(canvas, front, seed) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(prog, n), uRes = u('res'), uT = u('t');
  gl.uniform1f(u('seed'), seed); gl.uniform1f(u('front'), front);
  return (time) => {
    const w = Math.max(2, Math.round(canvas.clientWidth * 0.5)), h = Math.max(2, Math.round(canvas.clientHeight * 0.5));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h); gl.uniform1f(uT, time); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

export function initTitle() {
  const title = document.getElementById('title'); if (!title) return;
  const draws = [layer(title.querySelector('.t-fog.back'), 0, 3.1), layer(title.querySelector('.t-fog.front'), 1, 41.7)].filter(Boolean);
  const t0 = performance.now(); let last = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = now => {
    if (title.classList.contains('hidden')) return;                        // the game has begun: release the loop
    if (now - last > 30) { last = now; const t = still ? 40 : 40 + (now - t0) / 1000; for (const d of draws) d(t); }
    requestAnimationFrame(frame);
  };
  for (const d of draws) d(40); requestAnimationFrame(frame);
  window.__titleDraw = t => { for (const d of draws) d(t); };            // lets a paused/hidden tab render a still for review
  // keyboard focus lands on the primary action as soon as it appears
  const start = document.getElementById('startBtn');
  new MutationObserver(() => { if (!start.classList.contains('hidden')) start.focus({ preventScroll: true }); }).observe(start, { attributes: true, attributeFilter: ['class'] });
}
initTitle();
