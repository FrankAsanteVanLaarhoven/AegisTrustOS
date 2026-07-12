"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IdCapture } from "@/components/trust/IdCapture";

export function VerifyClient() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleComplete(payload: {
    idImageDataUrl: string;
    selfieDataUrl: string;
    livenessScore: number;
  }) {
    setErr(null);
    setMsg("Submitting…");
    try {
      const res = await fetch("/api/v1/idv/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json?.error?.message ?? "Verification failed");
        setMsg(null);
        return;
      }
      setMsg("Identity capture recorded. Awaiting Trust & Safety review.");
      router.refresh();
    } catch {
      setErr("Network error");
      setMsg(null);
    }
  }

  return (
    <div className="space-y-3">
      <IdCapture onComplete={handleComplete} />
      {msg ? <p className="text-sm text-[#3fb950]">{msg}</p> : null}
      {err ? <p className="text-sm text-[#f85149]">{err}</p> : null}
    </div>
  );
}
