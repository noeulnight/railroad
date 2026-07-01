import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const getIsMobile = () => window.innerWidth < MOBILE_BREAKPOINT;
const getServerSnapshot = () => false;

const subscribeToMobileBreakpoint = (onStoreChange: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onStoreChange);

  return () => mql.removeEventListener("change", onStoreChange);
};

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileBreakpoint,
    getIsMobile,
    getServerSnapshot,
  );
}
