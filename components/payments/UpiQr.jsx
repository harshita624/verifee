"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Smartphone } from "lucide-react";

export default function UpiQr({ uri, vpa, size = 208 }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    QRCode.toDataURL(uri, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [uri, size]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white rounded-2xl border border-zinc-200 p-3" style={{ width: size + 24, height: size + 24 }}>
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="UPI payment QR code" width={size} height={size} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[12px] text-zinc-400">
            {failed ? "Could not draw QR" : "Generating…"}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href={uri}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl hover:bg-green-100 transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" /> Open UPI app
        </a>
        {vpa && (
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {vpa}
          </button>
        )}
      </div>
    </div>
  );
}