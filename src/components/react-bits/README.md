# React Bits adaptations

Source: https://github.com/DavidHDev/react-bits, fetched 2026-09-11. Copyright David Haz. Full upstream license retained in LICENSE.md. Components integrated into this website, not offered as a component library.

- Backgrounds/Waves: upstream Perlin noise, point simulation and Canvas lines. Added Next client boundary, named export, deterministic seed, visibility/reduced-motion/pause support, passive touch and scroll-correct pointer coordinates. CSS owns layout.
- TextAnimations/GradientText: upstream markup and CSS gradient animation; Motion interpolation replaced with upstream CSS keyframe path. Site-specific palette and timing.
- Animations/StarBorder: upstream moving radial gradients and keyframes, specialized to typed anchor. CSS tokens replace inline props and any.

No new npm dependencies. Retain license in modifications and deployments.

- SpotlightCard and GlareHover: upstream pointer spotlight and sweeping glare CSS, integrated into project and capability cards.
- AnimatedContent: scroll-entry behavior adapted to native IntersectionObserver and Web Animations, without GSAP.
- DecryptedText: shuffled-character reveal adapted to native timers, with accessible static text and reduced-motion support.
