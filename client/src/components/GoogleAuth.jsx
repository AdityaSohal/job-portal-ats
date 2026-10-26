import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { useAuth } from "../store/auth";
import { OrDivider } from "./ui";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const GOOGLE_ENABLED = Boolean(CLIENT_ID);

let scriptPromise;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => {
      scriptPromise = undefined;
      s.remove();
      reject(new Error("Google script failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
};

function GoogleButton({ onCredential, text }) {
  const box = useRef(null);
  const handler = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handler.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => handler.current(response.credential),
        });
        box.current.innerHTML = "";
        window.google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(Math.max(box.current.offsetWidth, 200), 400),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (failed) return <p className="text-center text-sm text-ink/60">Google sign-in could not be loaded.</p>;
  return <div ref={box} className="flex min-h-[44px] w-full justify-center" />;
}

// The Google button plus an "or" divider. Renders nothing when no client ID is configured.
export default function GoogleAuth({ onError, text = "continue_with" }) {
  const setSession = useAuth((s) => s.setSession);

  const handleCredential = async (credential) => {
    onError("");
    try {
      const { data } = await api.post("/auth/google", { credential });
      setSession(data); // the route guard sends the user to their dashboard
      toast.success(`Welcome, ${data.user.name.split(" ")[0]}`);
    } catch (err) {
      onError(getError(err).message);
    }
  };

  if (!GOOGLE_ENABLED) return null;
  return (
    <div className="space-y-4">
      <GoogleButton onCredential={handleCredential} text={text} />
      <OrDivider />
    </div>
  );
}