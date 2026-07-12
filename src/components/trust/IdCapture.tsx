"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";

type Props = {
  onComplete: (payload: {
    idImageDataUrl: string;
    selfieDataUrl: string;
    livenessScore: number;
  }) => void;
};

export function IdCapture({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<"consent" | "id" | "selfie" | "done">("consent");
  const [idShot, setIdShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  useEffect(() => () => stop(), [stop]);

  async function startCamera() {
    setError(null);
    setBusy(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setStep("id");
    } catch {
      setError("Camera permission denied or unavailable. Allow camera access and retry.");
    } finally {
      setBusy(false);
    }
  }

  function captureFrame(): string | null {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  function captureId() {
    const data = captureFrame();
    if (!data) {
      setError("Could not capture frame.");
      return;
    }
    setIdShot(data);
    setStep("selfie");
  }

  function captureSelfie() {
    const selfie = captureFrame();
    if (!selfie || !idShot) {
      setError("Could not capture selfie.");
      return;
    }
    stop();
    // Simulated liveness score from capture success (vendor-ready path)
    const livenessScore = 0.94 + Math.random() * 0.05;
    setStep("done");
    onComplete({ idImageDataUrl: idShot, selfieDataUrl: selfie, livenessScore });
  }

  return (
    <div className="space-y-4">
      {step === "consent" ? (
        <div className="space-y-3 text-sm text-zinc-400">
          <p>
            We will use your camera once to capture a photo of your ID and a
            short selfie for liveness. Images are used only for identity
            verification and Trust &amp; Safety review.
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-500">
            <li>No continuous recording</li>
            <li>You can revoke access in browser settings after</li>
            <li>Human review still required for full clearance</li>
          </ul>
          <button
            type="button"
            disabled={busy}
            className={buttonClass("primary", "md")}
            onClick={startCamera}
          >
            {busy ? "Starting…" : "I consent — start camera"}
          </button>
        </div>
      ) : null}

      {(step === "id" || step === "selfie") && (
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e87722]">
            {step === "id" ? "Step 1 — Capture photo ID" : "Step 2 — Selfie / liveness"}
          </p>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
          </div>
          {step === "id" ? (
            <button type="button" className={buttonClass("primary", "md")} onClick={captureId}>
              Capture ID
            </button>
          ) : (
            <button type="button" className={buttonClass("primary", "md")} onClick={captureSelfie}>
              Capture selfie &amp; finish
            </button>
          )}
        </div>
      )}

      {step === "done" ? (
        <p className="text-sm text-[#3fb950]">
          Capture complete. Submitting verification…
        </p>
      ) : null}

      {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}
    </div>
  );
}
