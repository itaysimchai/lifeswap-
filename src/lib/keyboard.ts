import { useEffect } from "react";

/**
 * Publishes the on-screen keyboard's height as `--keyboard-inset`.
 *
 * WKWebView does not resize the layout viewport when the keyboard appears, so a
 * bottom-anchored composer ends up underneath it. VisualViewport does report
 * the change, which is enough to lift the composer by exactly the right amount
 * without a native plugin.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    const apply = () => {
      frame = 0;
      // offsetTop covers the case where the page is scrolled up to keep the
      // focused field visible; without it the composer over-corrects.
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    apply();
    return () => {
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);
}
