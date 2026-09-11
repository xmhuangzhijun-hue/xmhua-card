"use client";

import { useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

const snapshot = () => document.documentElement.dataset.motion === "paused";
const serverSnapshot = () => false;
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => observer.disconnect();
}
export function useMotionPaused() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export function EffectsToggle() {
  const paused = useMotionPaused();
  return <button className="effects-toggle" type="button" aria-label={paused ? "播放页面动效" : "暂停页面动效"} aria-pressed={paused} onClick={() => { document.documentElement.dataset.motion = paused ? "running" : "paused"; }}>
    {paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? "继续动效" : "暂停动效"}</span>
  </button>;
}
