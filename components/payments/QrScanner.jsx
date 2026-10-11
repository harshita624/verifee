"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Upload, X, Loader2 } from "lucide-react";

function decodeImage(img) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" })?.data || null;
}

export default function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const resultRef = useRef(onResult);
  resultRef.current = onResult;

  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream;
    let raf;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
        const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          stopped = true;
          resultRef.current(code.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not available here (it needs HTTPS). Upload a screenshot of the QR instead.");
        setStarting(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStarting(false);
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Could not open the camera. Allow camera access, or upload a screenshot of the QR.");
        setStarting(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const text = decodeImage(img);
      URL.revokeObjectURL(url);
      if (text) resultRef.current(text);
      else setError("No QR code found in that image. Try a clearer, closer photo.");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That file could not be read as an image.");
    };
    img.src = url;
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <p className="text-[13px] font-bold text-zinc-900">Scan the vendor&apos;s UPI QR</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100" aria-label="Close scanner">
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      <div className="relative bg-black" style={{ aspectRatio: "4 / 3" }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
        {!starting && !error && (
          <div
            className="absolute inset-[18%] rounded-2xl pointer-events-none"
            style={{ border: "2px solid rgba(255,255,255,0.85)", boxShadow: "0 0 0 999px rgba(0,0,0,0.35)" }}
          />
        )}
      </div>

      <div className="p-4 space-y-3">
        {error && <p className="text-[12px] text-red-600 leading-relaxed">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold text-zinc-700 border border-zinc-200 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload a QR screenshot instead
        </button>
      </div>
    </div>
  );
}