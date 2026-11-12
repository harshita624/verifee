"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const sdkLoaders = new Map();

function loadSdk(environment) {
  const mode = environment === "live" ? "live" : "sandbox";
  if (window.paypal?.createInstance) return Promise.resolve(window.paypal);
  if (sdkLoaders.has(mode)) return sdkLoaders.get(mode);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = mode === "live"
      ? "https://www.paypal.com/web-sdk/v6/core"
      : "https://www.sandbox.paypal.com/web-sdk/v6/core";
    script.async = true;
    script.onload = () => {
      if (window.paypal?.createInstance) resolve(window.paypal);
      else reject(new Error("PayPal v6 loaded but did not expose createInstance."));
    };
    script.onerror = () => reject(new Error("Could not load the PayPal v6 SDK. Check your connection and CSP settings."));
    document.head.appendChild(script);
  }).catch((error) => {
    sdkLoaders.delete(mode);
    throw error;
  });

  sdkLoaders.set(mode, promise);
  return promise;
}

export default function PayPalButton({
  clientId,
  currency = "USD",
  environment = "sandbox",
  createOrder,
  onApproved,
  onError,
  onCancel,
  disabled = false,
}) {
  const hostRef = useRef(null);
  const cb = useRef({});
  cb.current = { createOrder, onApproved, onError, onCancel, disabled };
  const [state, setState] = useState("loading");

  useEffect(() => {
    if (!clientId || !hostRef.current) return undefined;
    let cancelled = false;
    let button;
    let clickHandler;

    const reportError = (error) => {
      const normalized = error instanceof Error ? error : new Error(String(error?.message || error || "PayPal checkout failed."));
      normalized.paypalIssue ||= error?.code || error?.issue || error?.paypalIssue;
      normalized.paypalDebugId ||= error?.debug_id || error?.debugId || error?.paypalDebugId;
      console.error("PayPal v6 checkout failed", {
        name: normalized.name,
        message: normalized.message,
        code: normalized.code || error?.code,
        paypalIssue: normalized.paypalIssue,
        paypalDebugId: normalized.paypalDebugId,
      });
      cb.current.onError?.(normalized);
    };

    loadSdk(environment)
      .then(async (paypal) => {
        const sdk = await paypal.createInstance({
          clientId,
          components: ["paypal-payments"],
          pageType: "checkout",
        });
        const methods = await sdk.findEligibleMethods({ currencyCode: currency });
        if (cancelled || !hostRef.current) return;
        if (!methods.isEligible("paypal")) {
          setState("ineligible");
          return;
        }

        const session = await sdk.createPayPalOneTimePaymentSession({
          onApprove: async (data) => {
            const orderId = data?.orderId || data?.orderID;
            if (!orderId) throw new Error("PayPal approved the checkout but returned no order ID; capture was not requested.");
            return cb.current.onApproved(orderId);
          },
          onCancel: (data) => cb.current.onCancel?.(data?.orderId || data?.orderID),
          onError: reportError,
        });

        button = document.createElement("paypal-button");
        button.setAttribute("type", "pay");
        button.setAttribute("aria-label", "Pay with PayPal");
        clickHandler = () => {
          if (cb.current.disabled) return;
          // Start the server request immediately and pass its promise into the
          // session, preserving the browser's click activation for the popup.
          let createOrderPromise;
          try {
            createOrderPromise = cb.current.createOrder();
          } catch (error) {
            reportError(error);
            return;
          }
          const orderPromise = Promise.resolve(createOrderPromise)
            .then((orderId) => {
              if (typeof orderId !== "string" || !orderId.trim()) {
                throw new Error("Verifee did not receive a PayPal order ID from its backend.");
              }
              return { orderId };
            });
          session.start({ presentationMode: "auto" }, orderPromise).catch(reportError);
        };
        button.addEventListener("click", clickHandler);
        hostRef.current.replaceChildren(button);
        setState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setState("error");
        reportError(error);
      });

    return () => {
      cancelled = true;
      if (button && clickHandler) button.removeEventListener("click", clickHandler);
      hostRef.current?.replaceChildren();
    };
  }, [clientId, currency, environment]);

  return (
    <div style={{ opacity: disabled ? 0.5 : 1, transition: "opacity .2s" }} aria-busy={state === "loading"}>
      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading PayPal…
        </div>
      )}
      {state === "ineligible" && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          PayPal checkout isn&apos;t available for this browser, region, or currency.
        </p>
      )}
      {state === "error" && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          PayPal v6 could not initialize. See the error shown above and confirm your PayPal environment settings.
        </p>
      )}
      <div ref={hostRef} />
    </div>
  );
}
