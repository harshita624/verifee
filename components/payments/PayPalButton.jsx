"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const sdkLoaders = {};

function loadSdk(clientId, currency) {
  const key = `${clientId}:${currency}`;
  if (sdkLoaders[key]) return sdkLoaders[key];

  sdkLoaders[key] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${currency}&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () =>
      window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK failed to initialise"));
    script.onerror = () => {
      delete sdkLoaders[key];
      reject(new Error("Could not load PayPal. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return sdkLoaders[key];
}

/**
 * Props:
 *  clientId, currency        from GET /payments/config
 *  createOrder()             → Promise<orderId>   (calls our server)
 *  onApproved(orderId)       → called after the buyer approves; capture on the server here
 *  onError(err), onCancel()
 *  disabled                  greys the button out and blocks checkout
 */
export default function PayPalButton({
  clientId,
  currency = "USD",
  createOrder,
  onApproved,
  onError,
  onCancel,
  disabled = false,
}) {
  const hostRef = useRef(null);
  const cb = useRef({});
  cb.current = { createOrder, onApproved, onError, onCancel, disabled };

  const [state, setState] = useState("loading"); // loading | ready | ineligible | error

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    let buttons;

    loadSdk(clientId, currency)
      .then((paypal) => {
        if (cancelled || !hostRef.current) return undefined;
        buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 44 },
          onClick: (data, actions) => (cb.current.disabled ? actions.reject() : actions.resolve()),
          createOrder: () => cb.current.createOrder(),
          onApprove: (data) => cb.current.onApproved(data.orderID),
          onCancel: () => cb.current.onCancel?.(),
          onError: (err) => cb.current.onError?.(err),
        });
        if (!buttons.isEligible()) {
          setState("ineligible");
          return undefined;
        }
        return buttons.render(hostRef.current).then(() => {
          if (!cancelled) setState("ready");
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState("error");
        cb.current.onError?.(err);
      });

    return () => {
      cancelled = true;
      try {
        buttons?.close();
      } catch {
        /* already closed */
      }
    };
  }, [clientId, currency]);

  return (
    <div style={{ opacity: disabled ? 0.5 : 1, transition: "opacity .2s" }}>
      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading PayPal…
        </div>
      )}
      {state === "ineligible" && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          PayPal checkout isn&apos;t available in this browser or region.
        </p>
      )}
      {state === "error" && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          PayPal could not be loaded. Refresh the page and try again.
        </p>
      )}
      <div ref={hostRef} />
    </div>
  );
}