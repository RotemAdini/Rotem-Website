/* ==========================================================================
   משחקי זוגיות · רותם עדיני — Redesign v1
   Shared behavior: nav drawer, header shadow on scroll, staggered scroll
   reveal, focal card tilt/spotlight, sticky mobile buy bar, lead-form UX.
   ========================================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHeaderScroll();
    initReveal();
    initTilt();
    initStickyBuy();
    initForms();
  });

  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var drawer = document.querySelector('[data-nav-drawer]');
    var scrim = document.querySelector('[data-nav-scrim]');
    var closeBtn = document.querySelector('[data-nav-close]');
    if (!toggle || !drawer || !scrim) return;

    function open() {
      drawer.classList.add('is-open');
      scrim.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.classList.remove('is-open');
      scrim.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    toggle.addEventListener('click', function () {
      drawer.classList.contains('is-open') ? close() : open();
    });
    scrim.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  function initHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initReveal() {
    var singles = document.querySelectorAll('.reveal');
    var groups = document.querySelectorAll('.reveal-group');
    if (!singles.length && !groups.length) return;

    function revealGroup(el) {
      var kids = Array.prototype.slice.call(el.children);
      kids.forEach(function (child, i) {
        // Cap the stagger so long grids don't feel sluggish to finish.
        if (!reducedMotion.matches) {
          child.style.transitionDelay = (Math.min(i, 6) * 0.08) + 's';
        }
        child.classList.add('is-visible');
      });
    }

    if (!('IntersectionObserver' in window)) {
      singles.forEach(function (el) { el.classList.add('is-visible'); });
      groups.forEach(revealGroup);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.classList.contains('reveal-group')) {
          revealGroup(el);
        } else {
          el.classList.add('is-visible');
        }
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    singles.forEach(function (el) { io.observe(el); });
    groups.forEach(function (el) { io.observe(el); });
  }

  /* Focal tilt + cursor-follow spotlight, reserved for [data-tilt] elements
     only (the bundle card) — see UI/UX Pro Max "complex hover" guidance:
     limit magnetic/tilt effects to 1-2 focal elements per screen. Skipped
     entirely on touch devices and under prefers-reduced-motion. */
  function initTilt() {
    var els = document.querySelectorAll('[data-tilt]');
    if (!els.length) return;
    if (reducedMotion.matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    els.forEach(function (el) {
      function onMove(e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (0.5 - py) * 5; // clamp: max ~5deg so it stays subtle
        var ry = (px - 0.5) * 5;
        el.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
        el.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
        el.style.setProperty('--spot-x', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--spot-y', (py * 100).toFixed(1) + '%');
      }
      function onLeave() {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      }
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    });
  }

  function initStickyBuy() {
    var bar = document.querySelector('[data-sticky-buy]');
    var trigger = document.querySelector('[data-sticky-trigger]');
    if (!bar || !trigger) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        bar.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0 });
    io.observe(trigger);
  }

  function initForms() {
    document.querySelectorAll('[data-lead-form]').forEach(function (form) {
      var status = form.querySelector('[data-form-status]');
      var submitBtn = form.querySelector('[type="submit"]');
      form.addEventListener('submit', function (e) {
        var required = form.querySelectorAll('[required]');
        var missing = false;
        required.forEach(function (field) {
          if (field.type === 'checkbox' ? !field.checked : !field.value.trim()) {
            missing = true;
          }
        });
        if (missing) {
          e.preventDefault();
          if (status) {
            status.textContent = 'נא למלא את כל השדות המסומנים לפני השליחה.';
            status.className = 'form-status is-error';
          }
          return;
        }
        if (submitBtn) {
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.textContent = 'שולח…';
          submitBtn.disabled = true;
          window.setTimeout(function () {
            submitBtn.textContent = submitBtn.dataset.originalText;
            submitBtn.disabled = false;
          }, 4000);
        }
      });
    });

    // Contact page: AJAX submit to Formspree (reused from existing site config)
    var contactForm = document.querySelector('[data-contact-form]');
    if (contactForm) {
      var successEl = contactForm.querySelector('[data-form-success]');
      var errorEl = contactForm.querySelector('[data-form-error]');
      var btn = contactForm.querySelector('[type="submit"]');
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (successEl) successEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (btn) { btn.disabled = true; btn.dataset.originalText = btn.textContent; btn.textContent = 'שולח…'; }

        fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' }
        }).then(function (res) {
          if (!res.ok) throw new Error('network');
          if (successEl) successEl.style.display = 'block';
          contactForm.reset();
        }).catch(function () {
          if (errorEl) errorEl.style.display = 'block';
        }).finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText; }
        });
      });
    }
  }
})();
