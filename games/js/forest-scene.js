/* ==========================================================================
   היער הקסום — Immersive forest scene behavior
   Loaded ONLY by forest-game.html, in addition to js/main.js.
   Handles: viewport-gated ambient animation (pause offscreen), and a
   lightweight scroll parallax on the background photo layers.
   ========================================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('DOMContentLoaded', function () {
    initSceneVisibility();
    if (!reducedMotion.matches) initParallax();
  });

  /* Pause ambient animation (fog/fireflies/leaves/guide/medallions) while a
     scene is off-screen, so a long page never keeps a dozen loops running
     in tabs the visitor has scrolled past. */
  function initSceneVisibility() {
    var scenes = document.querySelectorAll('.forest-scene');
    if (!scenes.length) return;
    if (!('IntersectionObserver' in window)) {
      scenes.forEach(function (s) { s.classList.add('is-active'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { threshold: 0.01, rootMargin: '15% 0px 15% 0px' });
    scenes.forEach(function (s) { io.observe(s); });
  }

  /* Subtle scroll parallax: each [data-parallax] layer drifts a few
     percent slower/faster than scroll, computed only for the scene
     currently near the viewport (via the same IntersectionObserver
     class) and applied with rAF batching. Background-photo only — never
     applied to text or interactive controls. */
  function initParallax() {
    var layers = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!layers.length) return;

    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      layers.forEach(function (layer) {
        var scene = layer.closest('.forest-scene');
        if (!scene || !scene.classList.contains('is-active')) return;
        var rect = scene.getBoundingClientRect();
        // -1 (scene fully above) .. 0 (centered) .. 1 (scene fully below)
        var progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        var speed = parseFloat(layer.getAttribute('data-parallax')) || 0.15;
        var offset = Math.max(-1, Math.min(1, progress)) * speed * 60; // px
        layer.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }
})();
