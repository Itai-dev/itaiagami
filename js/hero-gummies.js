/* ============================================================
   HERO — gummy bears, loader
   The renderer is a large download for six pieces of jewellery
   in a hero, so this decides whether it is worth fetching at
   all — no host to fill, or no WebGL, and nothing is requested.

   The work itself lives in src/hero-gummies.js, bundled into
   js/hero-gummies.min.js. Fetched when the browser is idle, so
   it never competes with the first paint.
   ============================================================ */
(function(){
  const host = document.getElementById('heroGummies');
  if(!host || !('IntersectionObserver' in window)) return;

  let ok = false;
  try{
    const probe = document.createElement('canvas');
    ok = !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl')));
  }catch(e){ ok = false; }
  if(!ok) return;

  const go = () => import('/js/hero-gummies.min.js')
    .then(m => m.start(host))
    .catch(() => {});                         /* a hero without bears is fine */

  if(window.requestIdleCallback) requestIdleCallback(go, { timeout: 2200 });
  else setTimeout(go, 400);
})();
