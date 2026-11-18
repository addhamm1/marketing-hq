"use client";

import { useCallback, useEffect, useState } from "react";
import { isDeviceRegistered, removePushSubscription, savePushSubscription } from "./actions";
import { isIosDevice, pushSupport, vapidKeyBytes, type PushSupport } from "./support";

type DeviceState = { support: PushSupport | "checking"; on: boolean };

function readSupport(vapidKey: string | null): PushSupport {
  const nav = navigator as Navigator & { standalone?: boolean };
  return pushSupport({
    hasKey: !!vapidKey,
    isIos: isIosDevice(nav.userAgent, nav.platform, nav.maxTouchPoints),
    isStandalone: nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches,
    hasServiceWorker: "serviceWorker" in nav,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : null,
  });
}

async function subscribe(registration: ServiceWorkerRegistration, vapidKey: string) {
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(vapidKey) });
}

function saveDevice(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  return savePushSubscription({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth, userAgent: navigator.userAgent });
}

/** This device's phone-notification state, and turning it on or off. */
export function usePushDevice(vapidKey: string | null) {
  const [state, setState] = useState<DeviceState>({ support: "checking", on: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const support = readSupport(vapidKey);
      let on = false;
      if (support === "ready") {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const current = await registration?.pushManager.getSubscription();
        if (current) {
          const result = await isDeviceRegistered({ endpoint: current.endpoint });
          on = result.ok && result.data && Notification.permission === "granted";
        }
      }
      if (live) setState({ support, on });
    })().catch(() => {
      if (live) setState({ support: "unsupported", on: false });
    });
    return () => {
      live = false;
    };
  }, [vapidKey]);

  const enable = useCallback(async () => {
    if (!vapidKey) return;
    setBusy(true);
    setError(null);
    try {
      // iPhone only shows the prompt when it comes straight from the tap.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState({ support: permission === "denied" ? "denied" : "ready", on: false });
        if (permission !== "denied") setError("pushSettings.errors.notAllowed");
        return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      let subscription = existing ?? (await subscribe(registration, vapidKey));
      let saved = await saveDevice(subscription);
      if (!saved.ok && saved.error === "pushSettings.errors.deviceTaken") {
        // The browser still holds the previous person's subscription: start a fresh one.
        await subscription.unsubscribe();
        subscription = await subscribe(registration, vapidKey);
        saved = await saveDevice(subscription);
      }
      if (!saved.ok) {
        await subscription.unsubscribe();
        setError(saved.error);
        return;
      }
      setState({ support: "ready", on: true });
    } catch {
      setError("pushSettings.errors.enableFailed");
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const current = await registration?.pushManager.getSubscription();
      if (current) {
        const removed = await removePushSubscription({ endpoint: current.endpoint });
        if (!removed.ok) {
          setError(removed.error);
          return;
        }
        await current.unsubscribe();
      }
      setState({ support: "ready", on: false });
    } catch {
      setError("pushSettings.errors.disableFailed");
    } finally {
      setBusy(false);
    }
  }, []);

  return { ...state, busy, error, enable, disable };
}
