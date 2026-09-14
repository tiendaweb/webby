import { useEffect, useRef } from 'react';

/**
 * Particle-based animated background for professional landing pages.
 * Renders floating particles on a dark canvas with gradient blobs.
 */
export function AnimatedBackground({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Particles
        const COUNT = 60;
        type Particle = {
            x: number; y: number;
            vx: number; vy: number;
            radius: number;
            alpha: number;
            color: string;
        };

        const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
        const particles: Particle[] = Array.from({ length: COUNT }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2 + 1,
            alpha: Math.random() * 0.5 + 0.1,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));

        // Gradient blobs
        const blobs = [
            { x: 0.15, y: 0.2, r: 0.35, color: 'rgba(99,102,241,0.12)' },
            { x: 0.85, y: 0.15, r: 0.3, color: 'rgba(139,92,246,0.10)' },
            { x: 0.5, y: 0.7, r: 0.4, color: 'rgba(59,130,246,0.08)' },
            { x: 0.9, y: 0.8, r: 0.25, color: 'rgba(16,185,129,0.08)' },
        ];

        let tick = 0;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Animated gradient blobs
            blobs.forEach((blob, i) => {
                const bx = blob.x * canvas.width + Math.sin(tick * 0.0008 + i) * 80;
                const by = blob.y * canvas.height + Math.cos(tick * 0.0006 + i) * 60;
                const r = blob.r * Math.min(canvas.width, canvas.height);
                const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
                grad.addColorStop(0, blob.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(bx, by, r, 0, Math.PI * 2);
                ctx.fill();
            });

            // Particles
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // Connection lines between nearby particles
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;

            tick++;
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none ${className}`}
            style={{ zIndex: 0 }}
        />
    );
}
