import { useEffect, useRef } from 'react';
import { ParticleType, ParticleIntensity } from '../types/letter';

interface ParticlesProps {
  type: ParticleType;
  intensity: ParticleIntensity;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  char?: string;
  color?: string;
}

export default function ParticlesBackground({ type, intensity }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (type === 'none' || intensity === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const countMap: Record<ParticleIntensity, number> = {
      none: 0,
      gentle: 18,
      medium: 32,
      high: 50,
    };

    const count = countMap[intensity] || 20;
    const heartChars = ['♥', '♡', '❤', '❥', '❣'];
    const starColors = ['#F5E6AB', '#FFF6D1', '#FFE4E6', '#FDE047'];
    const petalColors = ['#FDA4AF', '#F472B6', '#FECDD3', '#FFE4E6'];

    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: type === 'hearts' ? Math.random() * 12 + 10 : Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: type === 'petals' ? Math.random() * 0.8 + 0.5 : -(Math.random() * 0.7 + 0.3),
        opacity: Math.random() * 0.6 + 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        char: type === 'hearts' ? heartChars[Math.floor(Math.random() * heartChars.length)] : undefined,
        color:
          type === 'stars' || type === 'sparkles'
            ? starColors[Math.floor(Math.random() * starColors.length)]
            : petalColors[Math.floor(Math.random() * petalColors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.wobble += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobble) * 0.4;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        } else if (p.y > height + 30) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        if (p.x < -30) p.x = width + 20;
        else if (p.x > width + 30) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (type === 'hearts' && p.char) {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = p.color || '#FDA4AF';
          ctx.fillText(p.char, 0, 0);
        } else if (type === 'petals') {
          ctx.fillStyle = p.color || '#FDA4AF';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.6, p.size * 1.3, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'stars' || type === 'sparkles') {
          ctx.fillStyle = p.color || '#FFF';
          const r = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
          ctx.quadraticCurveTo(0, 0, -r, 0);
          ctx.quadraticCurveTo(0, 0, 0, -r);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [type, intensity]);

  if (type === 'none' || intensity === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10 h-full w-full opacity-80"
      aria-hidden="true"
    />
  );
}
