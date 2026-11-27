import { useEffect, useRef } from 'react';
import { useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/**
 * Interactive Vanta Waves-inspired canvas backdrop using motion/react springs
 * and a matte warm-amber palette (#7e4400) without bundling Three.js.
 *
 * @param {object} props
 * @param {'login'|'hero'} [props.variant='login']
 * @param {string} [props.className]
 */
export default function WaveBackground({ variant = 'login', className = '' }) {
  const canvasRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 45, damping: 24, mass: 1.2 });
  const smoothY = useSpring(pointerY, { stiffness: 45, damping: 24, mass: 1.2 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const isHero = variant === 'hero';
    // Tuned to Vanta.WAVES config: color 0x7e4400, shininess 5.00, waveHeight 7.50, waveSpeed 0.20, zoom 1.75
    const waveSpeed = 0.2;
    const waveHeight = isHero ? 6.5 : 7.5;
    const zoom = isHero ? 1.55 : 1.75;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let startTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(200, Math.floor(rect.width));
      height = Math.max(200, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', resize, { passive: true });

    const handlePointerMove = (e) => {
      if (shouldReduceMotion) return;
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY : e.clientY;
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
      pointerX.set(Math.max(0, Math.min(1, clientX / Math.max(1, window.innerWidth))));
      pointerY.set(Math.max(0, Math.min(1, clientY / Math.max(1, window.innerHeight))));
    };

    const handlePointerLeave = () => {
      pointerX.set(0.5);
      pointerY.set(0.5);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    // Layered wave bands mimicking Vanta low-shininess faceted surface
    const layers = [
      { depth: 0.18, yRatio: 0.24, amp: waveHeight * 1.35, freq: 0.0022 * zoom, phase: 0.4, fillTop: '#4e2a00', fillBot: '#381e00', stroke: 'rgba(178, 127, 13, 0.10)' },
      { depth: 0.34, yRatio: 0.38, amp: waveHeight * 1.65, freq: 0.0027 * zoom, phase: 1.7, fillTop: '#5e3300', fillBot: '#462600', stroke: 'rgba(196, 140, 20, 0.13)' },
      { depth: 0.52, yRatio: 0.52, amp: waveHeight * 1.95, freq: 0.0031 * zoom, phase: 3.1, fillTop: '#6e3b00', fillBot: '#542d00', stroke: 'rgba(214, 152, 28, 0.16)' },
      { depth: 0.72, yRatio: 0.67, amp: waveHeight * 2.25, freq: 0.0036 * zoom, phase: 4.5, fillTop: '#7e4400', fillBot: '#5c3100', stroke: 'rgba(232, 168, 42, 0.18)' },
      { depth: 0.90, yRatio: 0.82, amp: waveHeight * 2.40, freq: 0.0040 * zoom, phase: 5.8, fillTop: '#8c4c00', fillBot: '#442400', stroke: 'rgba(245, 185, 66, 0.16)' },
    ];

    const renderFrame = (now) => {
      const elapsed = shouldReduceMotion ? 0 : ((now - startTime) / 1000) * waveSpeed;
      const mx = (smoothX.get() - 0.5) * 2;
      const my = (smoothY.get() - 0.5) * 2;

      // Base matte backdrop (#7e4400 deep warm amber gradient)
      const bgGrad = ctx.createLinearGradient(0, 0, width * 0.4, height);
      if (isHero) {
        bgGrad.addColorStop(0, '#172025');
        bgGrad.addColorStop(0.55, '#3b2409');
        bgGrad.addColorStop(1, '#5d3300');
      } else {
        bgGrad.addColorStop(0, '#3a1f00');
        bgGrad.addColorStop(0.45, '#623500');
        bgGrad.addColorStop(1, '#7e4400');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle matte ambient sheen (low shininess: 5.0)
      const glowX = width * (0.5 + mx * 0.18);
      const glowY = height * (0.28 + my * 0.12);
      const sheen = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, Math.max(width, height) * 0.72);
      sheen.addColorStop(0, isHero ? 'rgba(178, 127, 13, 0.18)' : 'rgba(218, 146, 36, 0.16)');
      sheen.addColorStop(0.55, 'rgba(126, 68, 0, 0.06)');
      sheen.addColorStop(1, 'rgba(23, 32, 37, 0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, width, height);

      const step = Math.max(18, Math.floor(width / 46));

      for (let i = 0; i < layers.length; i += 1) {
        const layer = layers[i];
        const baseY = height * layer.yRatio + my * (22 * layer.depth);
        const shiftX = mx * (34 * layer.depth);

        ctx.beginPath();
        ctx.moveTo(-20, height + 20);

        let firstX = -20;
        let firstY = baseY;

        for (let x = -20; x <= width + step + 20; x += step) {
          const nx = x + shiftX;
          const wave1 = Math.sin(nx * layer.freq + elapsed * 1.45 + layer.phase) * layer.amp;
          const wave2 = Math.cos(nx * (layer.freq * 0.58) - elapsed * 0.95 + layer.phase * 1.3) * (layer.amp * 0.55);
          const wave3 = Math.sin((nx * 0.0014 + elapsed * 0.7) + i) * (layer.amp * 0.35);
          const y = baseY + wave1 + wave2 + wave3;
          if (x === -20) {
            firstX = x;
            firstY = y;
            ctx.lineTo(firstX, firstY);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width + 30, height + 20);
        ctx.closePath();

        const layerGrad = ctx.createLinearGradient(0, baseY - layer.amp * 2, 0, height);
        layerGrad.addColorStop(0, isHero ? 'rgba(126, 68, 0, 0.28)' : layer.fillTop);
        layerGrad.addColorStop(1, isHero ? 'rgba(23, 32, 37, 0.55)' : layer.fillBot);
        ctx.fillStyle = layerGrad;
        ctx.fill();

        ctx.strokeStyle = layer.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (!shouldReduceMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [pointerX, pointerY, smoothX, smoothY, shouldReduceMotion, variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
