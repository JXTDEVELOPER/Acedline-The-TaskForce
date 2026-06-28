import React, { useEffect, useRef } from 'react';

export const LoginBackground: React.FC<{ enableShader?: boolean }> = ({ enableShader = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enableShader) return;
    // WebGL Liquid Aurora Shader
    const glCanvas = canvasRef.current;
    if (!glCanvas) return;
    const gl = glCanvas.getContext('webgl2') || glCanvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec4 a_position;
      varying vec2 v_uv;
      void main() {
        gl_Position = a_position;
        v_uv = a_position.xy * 0.5 + 0.5;
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      // Cosine based palette
      vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
          return a + b*cos( 6.28318*(c*t+d) );
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          uv.x *= u_resolution.x / u_resolution.y;
          vec2 uv0 = uv;
          
          vec2 mouse = u_mouse / u_resolution.xy;
          mouse.x *= u_resolution.x / u_resolution.y;

          vec3 finalColor = vec3(0.0);
          
          // Center coordinate system around mouse slightly
          uv -= (mouse - (u_resolution.xy/u_resolution.y)*0.5) * 0.1;
          
          for (float i = 0.0; i < 4.0; i++) {
              uv = fract(uv * 1.5) - 0.5;
              
              float d = length(uv) * exp(-length(uv0));
              
              vec3 col = palette(length(uv0) + i*.4 + u_time*.4, 
                                 vec3(0.5, 0.5, 0.5), 
                                 vec3(0.5, 0.5, 0.5), 
                                 vec3(1.0, 1.0, 1.0), 
                                 vec3(0.263, 0.416, 0.557)); // Amber / Blue / Cyan vibes

              d = sin(d*8. + u_time)/8.;
              d = abs(d);
              
              d = pow(0.01 / d, 1.2);
              
              finalColor += col * d;
          }
          
          // Darken and add contrast
          finalColor = finalColor * 0.15;
          finalColor += vec3(0.02, 0.05, 0.1); // Base deep blue
          
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
    
    if (!vertexShader || !fragmentShader) return;
    
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0,  1.0,
      -1.0,  1.0, 1.0, -1.0, 1.0,  1.0
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = window.innerHeight - e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
      glCanvas.width = window.innerWidth;
      glCanvas.height = window.innerHeight;
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId: number;
    let startTime = performance.now();

    const render = (time: number) => {
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      gl.uniform2f(uResolution, glCanvas.width, glCanvas.height);
      gl.uniform1f(uTime, (time - startTime) * 0.001);
      gl.uniform2f(uMouse, mouseX, mouseY);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (!enableShader) return;
    // 2D Orbs System (Soft, large floating gradients)
    const canvas = orbsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    type Orb = {
      x: number; y: number;
      vx: number; vy: number;
      radius: number;
      color: string;
      phase: number;
    };

    const colors = [
      'rgba(0, 255, 200, 0.15)',
      'rgba(0, 150, 255, 0.15)',
      'rgba(255, 100, 150, 0.1)',
      'rgba(150, 50, 255, 0.1)'
    ];

    const orbs: Orb[] = Array.from({ length: 6 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 200 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2
    }));

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'screen';

      orbs.forEach(orb => {
        // Float movement
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Mouse avoidance
        const dx = mouseX - orb.x;
        const dy = mouseY - orb.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 300) {
           orb.x -= dx * 0.01;
           orb.y -= dy * 0.01;
        }

        // Bounce off walls gently
        if (orb.x < -orb.radius) orb.vx *= -1;
        if (orb.x > canvas.width + orb.radius) orb.vx *= -1;
        if (orb.y < -orb.radius) orb.vy *= -1;
        if (orb.y > canvas.height + orb.radius) orb.vy *= -1;

        // Pulsing radius
        const currentRadius = orb.radius + Math.sin(time * 0.001 + orb.phase) * 30;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, currentRadius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-natural-bg dark:bg-[#02050f]">
      {enableShader && (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />
          <canvas ref={orbsRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
          <div className="absolute inset-0 backdrop-blur-[30px]" />
        </>
      )}
    </div>
  );
};
