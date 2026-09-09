"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * FLIP transitions for a list whose members are filtered or reordered.
 *
 * "First, Last, Invert, Play": we remember where every row was, let React paint
 * the new arrangement, then transform each row back to its old position and
 * animate that transform away. The browser only ever composites — no layout
 * property is animated and no row is ever measured mid-flight.
 *
 * Rows opt in with `data-flip-id`. Pass a `key` that changes whenever the
 * visible set changes.
 */
export function useFlip(container: React.RefObject<HTMLElement | null>, key: string, enabled = true) {
  const previous = useRef<Map<string, DOMRect>>(new Map());
  const first = useRef(true);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;

    const rows = [...root.querySelectorAll<HTMLElement>("[data-flip-id]")];
    const measure = () => {
      const next = new Map<string, DOMRect>();
      for (const row of rows) {
        const id = row.dataset.flipId;
        if (id) next.set(id, row.getBoundingClientRect());
      }
      return next;
    };

    // The first paint has nothing to animate from; just record positions.
    if (first.current) {
      first.current = false;
      previous.current = measure();
      return;
    }

    const still = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || still || rows.length > 120) {
      previous.current = measure();
      return;
    }

    const now = measure();
    const animations: Animation[] = [];

    for (const row of rows) {
      const id = row.dataset.flipId;
      if (!id) continue;
      const before = previous.current.get(id);
      const after = now.get(id);
      if (!after) continue;

      if (!before) {
        // Newly matched rows fade up in place rather than sliding from nowhere.
        row.classList.remove("mo-flip-enter");
        // Force a reflow so re-adding the class restarts the animation.
        void row.offsetWidth;
        row.classList.add("mo-flip-enter");
        continue;
      }

      const dy = before.top - after.top;
      const dx = before.left - after.left;
      if (Math.abs(dy) < 1 && Math.abs(dx) < 1) continue;

      row.classList.add("mo-flip");
      const animation = row.animate(
        [{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: "translate3d(0, 0, 0)" }],
        { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
      // `will-change` must come off however the animation ends. A cancel (the
      // effect re-running because the filter changed again mid-flight) fires no
      // `finish`, so listening only for that would strand a compositor layer on
      // every row the reader filtered through.
      const settle = () => row.classList.remove("mo-flip");
      animation.addEventListener("finish", settle, { once: true });
      animation.addEventListener("cancel", settle, { once: true });
      animations.push(animation);
    }

    previous.current = now;
    return () => animations.forEach(animation => animation.cancel());
  }, [container, key, enabled]);
}
