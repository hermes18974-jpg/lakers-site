// WebGL plasma shader runner: finds every canvas[data-shader-bg] and animates it.
// Zero-dependency (raw WebGL), pauses offscreen, honors prefers-reduced-motion.
(function () {
  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FRAG = [
    "precision mediump float;",
    "uniform float t;uniform vec2 r;",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);",
    "  float waves=0.;",
    "  for(float i=1.;i<4.;i++){",
    "    waves+=sin(uv.y*(3.-i*.55)*.9+uv.x*(2.2+i*.35)-i*.8+t*.4)/i;",
    "  }",
    "  float d=length(uv*vec2(1.,1.25));",
    "  float glow=smoothstep(1.15,.1,d);",
    "  vec3 purple=vec3(.333,.145,.514);",
    "  vec3 gold=vec3(.992,.725,.153);",
    "  vec3 col=mix(purple*.92,purple+gold*.5,(waves*.5+.5)*.5+.15);",
    "  col=mix(col,gold,glow*.14+.05*max(0.,waves));",
    "  col*= .55+.5*(waves*.5+.5)+glow*.35;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function setup(canvas) {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { canvas.style.background = "linear-gradient(160deg,#180b2a,#2a1250)"; return; }
    function mk(src, type) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    const vs = mk(VERT, gl.VERTEX_SHADER), fs = mk(FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, "t");
    const uR = gl.getUniformLocation(prog, "r");
    const speed = parseFloat(canvas.dataset.speed || "0.6");
    let raf = 0, running = false;
    const t0 = performance.now();
    function draw(now) {
      const w = (canvas.clientWidth * 0.5) | 0, h = (canvas.clientHeight * 0.5) | 0;
      if (w && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uT, ((now - t0) / 1000) * speed);
      gl.uniform2f(uR, canvas.width || 2, canvas.height || 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { draw(4200); return; }
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
        else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
      });
    });
    obs.observe(canvas);
  }
  document.querySelectorAll("canvas[data-shader-bg]").forEach(setup);
  // MutationObserver catches late-mounted canvases
  const mo = new MutationObserver(function () {
    document.querySelectorAll("canvas[data-shader-bg]:not([data-shader-on])").forEach(function (c) {
      c.dataset.shaderOn = "1"; setup(c);
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();