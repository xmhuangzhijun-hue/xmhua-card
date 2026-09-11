"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { EffectsToggle, useMotionPaused } from "./effects-toggle";

/** A small Canvas scene, independent of content and usable without animation. */
export function KnowledgeOrbit({ notes, projects }: { notes: number; projects: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paused = useMotionPaused();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, frame = 0, phase = 0, last = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const radius = Math.min(width, height) * .36;
      const cx = width / 2, cy = height / 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.45);
      glow.addColorStop(0, "rgba(83,105,255,.17)");
      glow.addColorStop(.6, "rgba(76,211,242,.05)");
      glow.addColorStop(1, "rgba(76,211,242,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      for (let band = 0; band < 21; band++) {
        const latitude = (band / 20 - .5) * Math.PI;
        for (let step = 0; step < 44; step++) {
          const angle = step / 44 * Math.PI * 2 + phase + band * .095;
          const x = Math.cos(latitude) * Math.cos(angle);
          const y = Math.sin(latitude);
          const z = Math.cos(latitude) * Math.sin(angle);
          const twist = .36 + pointer.x * .18;
          const px = x * Math.cos(twist) - y * Math.sin(twist);
          const py = x * Math.sin(twist) + y * Math.cos(twist);
          const depth = (z + 1) / 2;
          ctx.beginPath();
          ctx.arc(cx + px * radius + pointer.x * 12 * depth, cy + py * radius * .94 + pointer.y * 14 * depth, .65 + depth * 1.15, 0, Math.PI * 2);
          ctx.fillStyle = band % 5 === 0 ? `rgba(182,165,255,${.15 + depth * .7})` : `rgba(113,231,244,${.1 + depth * .75})`;
          ctx.fill();
        }
      }
      canvas.dataset.ready = "true";
    };
    const running = () => !paused && !reduced.matches && visible && !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      if (!running()) return;
      if (now - last > 30) {
        phase += Math.min(now - (last || now), 60) * .00012;
        pointer.x += (pointer.targetX - pointer.x) * .08;
        pointer.y += (pointer.targetY - pointer.y) * .08;
        draw();
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0; last = 0;
      draw();
      if (running()) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    });
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.targetX = (event.clientX - box.left) / box.width * 2 - 1;
      pointer.targetY = (event.clientY - box.top) / box.height * 2 - 1;
    };
    const leave = () => { pointer.targetX = 0; pointer.targetY = 0; };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    resize.observe(canvas); intersection.observe(canvas);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
      canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync); reduced.removeEventListener("change", sync);
    };
  }, [paused]);

  return (
    <div className="knowledge-orbit" data-paused={paused}>
      <div className="orbit-caption"><span>FIELD NOTES / LIVE INDEX</span><span aria-hidden="true">✳</span></div>
      <canvas ref={canvasRef} aria-hidden="true" />
      <svg className="orbit-fallback" viewBox="0 0 500 500" aria-hidden="true">
        {Array.from({ length: 480 }, (_, index) => {
          const y = 1 - index / 479 * 2;
          const radius = Math.sqrt(1 - y * y);
          const angle = index * 2.399963;
          const depth = (Math.sin(angle) * radius + 1) / 2;
          return <circle key={index} cx={250 + Math.cos(angle) * radius * 180} cy={250 + y * 175} r={.8 + depth} fill="#84dded" opacity={.18 + depth * .65} />;
        })}
      </svg>
      <div className="orbit-ring orbit-ring--one" aria-hidden="true" />
      <div className="orbit-ring orbit-ring--two" aria-hidden="true" />
      <Link href="/notes" className="orbit-node orbit-node--notes"><span>01 / 阅读与思考</span><strong>{notes} 篇公开笔记 <ArrowUpRight size={16} /></strong></Link>
      <Link href="/work" className="orbit-node orbit-node--work"><span>02 / 从想法到交付</span><strong>探索实践案例 <ArrowUpRight size={16} /></strong></Link>
      <a href="#products" className="orbit-node orbit-node--products"><span>03 / 持续构建</span><strong>{projects} 个公开项目 <ArrowUpRight size={16} /></strong></a>
      <div className="orbit-bottom"><span>连接知识，让想法发生。</span><EffectsToggle /></div>
    </div>
  );
}
