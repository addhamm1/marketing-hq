// Marketing HQ service worker: phone notifications only. It caches nothing.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** A path on this site, or the home page for anything else. */
function sameSitePath(link) {
  try {
    const url = new URL(link, self.location.origin);
    if (url.origin === self.location.origin) return url.pathname + url.search + url.hash;
  } catch {
    // Not a usable link: fall through to the home page.
  }
  return "/";
}

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // Browsers require a visible notification for every push, so show the default.
  }
  const text = (value, fallback) => (typeof value === "string" && value ? value : fallback);
  event.waitUntil(
    self.registration.showNotification(text(message.title, "Marketing HQ"), {
      body: text(message.body, ""),
      tag: text(message.tag, undefined),
      lang: text(message.lang, undefined),
      dir: message.dir === "rtl" ? "rtl" : "ltr",
      icon: "/icons/icon-192.png",
      data: { link: sameSitePath(message.link) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = sameSitePath(event.notification.data && event.notification.data.link);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(path);
        return;
      }
      await self.clients.openWindow(path);
    })(),
  );
});
