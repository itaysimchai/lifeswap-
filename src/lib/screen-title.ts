import { useEffect } from "react";
import { create } from "zustand";

/**
 * Lets a routed screen name itself in the shell's chrome.
 *
 * Most titles are static and come from the route table, but a pushed detail
 * screen is titled after its content - a chat is called after the person you
 * are talking to, not "Messages". The store is cleared on unmount so the route
 * table takes over again the moment the screen goes away.
 */
interface ScreenTitleState {
  title: string | null;
  set: (title: string | null) => void;
}

export const useScreenTitleStore = create<ScreenTitleState>((set) => ({
  title: null,
  set: (title) => set({ title }),
}));

/** Declares this screen's title for as long as it is mounted. */
export function useScreenTitle(title: string | null | undefined) {
  const set = useScreenTitleStore((s) => s.set);
  useEffect(() => {
    set(title ?? null);
    return () => set(null);
  }, [title, set]);
}
