// ═══════════════════════════════════════════════════════════════════════════════
// SPIRO BATTERY QMS — PWA Bootstrap
// Handles: SW registration, install prompts, offline detection, splash
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Splash hide ─────────────────────────────────────────────────────────────
  function hideSplash() {
    var splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('fade');
    setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 400);
  }
  // Hide splash when React mounts something into #app
  var appEl = document.getElementById('app');
  if (appEl) {
    var mo = new MutationObserver(function () {
      if (appEl.children.length > 0) { hideSplash(); mo.disconnect(); }
    });
    mo.observe(appEl, { childList: true, subtree: true });
  }
  // Fallback: hide after 5s
  setTimeout(hideSplash, 5000);

  // ── Offline / online detection ───────────────────────────────────────────────
  var bar = document.getElementById('offline-bar');
  function updateOnline() {
    if (!bar) return;
    if (navigator.onLine) {
      bar.classList.remove('visible');
      // Trigger retry sync
      window.dispatchEvent(new CustomEvent('spiro:retry-sync'));
    } else {
      bar.classList.add('visible');
    }
  }
  window.addEventListener('online',  updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  // ── Service Worker ───────────────────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: '/' })
        .then(function (reg) {
          console.log('[SpiroQMS] SW registered:', reg.scope);

          // Check for updates
          reg.addEventListener('updatefound', function () {
            var newSW = reg.installing;
            newSW.addEventListener('statechange', function () {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                if (confirm('⚡ Spiro QMS has been updated. Reload now?')) {
                  newSW.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });

          // Background sync for failed OneDrive uploads
          if ('sync' in reg) {
            window.registerBgSync = function () {
              reg.sync.register('spiro-sync').catch(function () {});
            };
          }

          // Listen for SW messages
          navigator.serviceWorker.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'RETRY_SYNC') {
              window.dispatchEvent(new CustomEvent('spiro:retry-sync'));
            }
          });
        })
        .catch(function (err) {
          console.warn('[SpiroQMS] SW registration failed:', err);
        });
    });
  }

  // ── Android install prompt ───────────────────────────────────────────────────
  var dip = null;
  var banner = document.getElementById('android-banner');
  var installBtn = document.getElementById('install-btn');
  var dismissBtn = document.getElementById('dismiss-btn');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    dip = e;
    if (!localStorage.getItem('spiro_pwa_dismissed') && banner) {
      setTimeout(function () { banner.classList.add('visible'); }, 3000);
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (banner) banner.classList.remove('visible');
      if (dip) { dip.prompt(); dip.userChoice.then(function () { dip = null; }); }
    });
  }
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function () {
      if (banner) banner.classList.remove('visible');
      localStorage.setItem('spiro_pwa_dismissed', '1');
    });
  }

  window.addEventListener('appinstalled', function () {
    if (banner) banner.classList.remove('visible');
    console.log('[SpiroQMS] PWA installed successfully');
  });

  // ── iOS install hint ─────────────────────────────────────────────────────────
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = window.navigator.standalone === true;
  var hint = document.getElementById('ios-hint');
  if (isIOS && !isStandalone && hint && !localStorage.getItem('spiro_ios_dismissed')) {
    setTimeout(function () { hint.classList.add('visible'); }, 5000);
  }

}());
