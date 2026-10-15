import { useEffect, useState } from "react";

// Only an explicit "hidden" counts as hidden, so environments that never
// report visibility (e.g. jsdom's "prerender") keep behaving as visible.
const readVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

/** True while the browser tab is visible. Used to pause background polling. */
const usePageVisible = () => {
  const [visible, setVisible] = useState(readVisible);

  useEffect(() => {
    const handleChange = () => setVisible(readVisible());
    document.addEventListener("visibilitychange", handleChange);
    return () => document.removeEventListener("visibilitychange", handleChange);
  }, []);

  return visible;
};

export default usePageVisible;