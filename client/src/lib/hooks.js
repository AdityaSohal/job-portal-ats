import { useCallback, useEffect, useState } from "react";

// Counts down once per second, for "resend code in 42s" buttons
export function useCountdown(initial = 0) {
  const [left, setLeft] = useState(initial);

  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const start = useCallback((seconds = 60) => setLeft(seconds), []);
  return [left, start];
}