/**
 * SURPRISE-S03: Confetti animation on first catalog open
 * Zero dependencies, pure canvas implementation
 */

export function fireConfetti(): void {
  // Only fire once per session
  if (localStorage.getItem('nafas_welcomed')) return;
  localStorage.setItem('nafas_welcomed', '1');

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
  }

  const particles: Particle[] = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    color: ['#b61615', '#e11d48', '#f59e0b', '#10b981', '#3b82f6'][Math.floor(Math.random() * 5)] ?? '#b61615',
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  }));

  let animationFrameId: number;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;

      // Reset if off-screen or invisible (don't respawn)
      if (p.y > canvas.height || p.opacity <= 0) {
        p.opacity = 0;
      }

      if (p.opacity > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    // Continue animation if any particles are visible
    if (particles.some(p => p.opacity > 0)) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrameId);
      document.body.removeChild(canvas);
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}
