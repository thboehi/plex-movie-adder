"use client";

import { usePathname } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { useRef, useEffect, useCallback } from "react";

// Route order — lower index = more "left" in the nav
const ROUTE_ORDER = {
  "/": 0,
  "/brunch": 1,
};

function getRouteIndex(pathname) {
  if (ROUTE_ORDER[pathname] !== undefined) return ROUTE_ORDER[pathname];
  for (const [route, index] of Object.entries(ROUTE_ORDER)) {
    if (route !== "/" && pathname.startsWith(route)) return index;
  }
  return 0;
}

const SLIDE_DISTANCE = 60;

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prevIndexRef = useRef(getRouteIndex(pathname));
  const controls = useAnimationControls();
  const isFirstRender = useRef(true);

  const playEntrance = useCallback((direction) => {
    // Instantly jump to the "from" position, then animate in
    controls.set({
      x: direction * SLIDE_DISTANCE,
      opacity: 0,
    });
    controls.start({
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      },
    });
  }, [controls]);

  useEffect(() => {
    // Skip animation on first mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      controls.set({ x: 0, opacity: 1 });
      return;
    }

    const currentIndex = getRouteIndex(pathname);
    const prevIndex = prevIndexRef.current;
    const direction = currentIndex >= prevIndex ? 1 : -1;
    prevIndexRef.current = currentIndex;

    playEntrance(direction);
  }, [pathname, controls, playEntrance]);

  return (
    <motion.div
      animate={controls}
      initial={{ x: 0, opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}
