import { useEffect, useRef } from "react";

type Rocket = { x: number; y: number; vy: number; targetY: number; hue: number };
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
};

const GRAVITY = 0.04;

// Full-screen 2D fireworks drawn on a transparent canvas above the 3D scene.
export function FireworksOverlay({
  isActive,
  daytime = false,
}: {
  isActive: boolean;
  // on a bright sky additive blending washes out, so draw solid, saturated sparks
  daytime?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    let frame = 0;
    let raf = 0;

    const launch = () => {
      rockets.push({
        x: width * (0.15 + Math.random() * 0.7),
        y: height,
        vy: -(height / 55) * (0.9 + Math.random() * 0.3),
        targetY: height * (0.12 + Math.random() * 0.3),
        hue: Math.random() * 360,
      });
    };

    const explode = (r: Rocket) => {
      const count = 90 + Math.floor(Math.random() * 50);
      const power = Math.min(width, height) / 110;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.1;
        const speed = power * (0.5 + Math.random() * 0.6);
        const maxLife = 60 + Math.random() * 40;
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          hue: r.hue + (Math.random() - 0.5) * 40,
          size: 2 + Math.random() * 2,
        });
      }
    };

    // immediate bursts so the sky lights up right as the candle goes out
    for (let i = 0; i < 3; i++) {
      explode({
        x: width * (0.2 + Math.random() * 0.6),
        y: height * (0.12 + Math.random() * 0.25),
        vy: 0,
        targetY: 0,
        hue: Math.random() * 360,
      });
    }
    for (let i = 0; i < 2; i++) launch();

    const tick = () => {
      frame += 1;
      // fade previous frame (keeps trails while staying transparent)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = daytime ? "source-over" : "lighter";

      if (frame % 25 === 0) launch();
      if (frame % 60 === 0) launch();

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy;
        r.vy *= 0.985;
        ctx.fillStyle = `hsl(${r.hue}, 100%, 75%)`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.targetY || r.vy > -1) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= 0.975;
        s.vy = s.vy * 0.975 + GRAVITY;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;
        const alpha = Math.max(s.life / s.maxLife, 0);
        ctx.fillStyle = `hsla(${s.hue}, 100%, ${daytime ? 52 : 65}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, daytime ? s.size * 1.3 : s.size, 0, Math.PI * 2);
        ctx.fill();
        if (s.life <= 0) sparks.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [isActive, daytime]);

  if (!isActive) return null;
  return <canvas ref={canvasRef} className="fireworks-overlay" aria-hidden="true" />;
}
