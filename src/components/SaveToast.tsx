import { useEffect } from "react";

type Props = {
  message: string | null;
  onClear: () => void;
};

export function SaveToast({ message, onClear }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClear, 2400);
    return () => window.clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;

  const isError = message.toLowerCase().includes("fail");

  return (
    <div className={`save-toast${isError ? " error" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
