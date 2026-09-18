/* ==========================================================================
   משחקי זוגיות · רותם עדיני — Redesign v1
   Shared behavior: nav drawer, header shadow on scroll, staggered scroll
   reveal, focal card tilt/spotlight, sticky mobile buy bar, lead-form UX.
   ========================================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Migration note: on the original static site this file was always parsed
  // synchronously before DOMContentLoaded fired. In the Next.js app it loads
  // via next/script after the page has hydrated, i.e. after DOMContentLoaded
  // has usually already fired once — so a plain event listener would never
  // run. Falling back to an immediate call when the document is already
  // ready keeps the exact same init behavior either way.
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
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
      // The status message lives as a sibling right before the form, not
      // inside it — fall back to the shared parent so lookup finds it either way.
      var status = form.querySelector('[data-form-status]') || (form.parentElement && form.parentElement.querySelector('[data-form-status]'));
      var submitBtn = form.querySelector('[type="submit"]');
      if (status && !status.id) {
        status.id = 'form-status-' + (form.getAttribute('data-track-form') || 'lead');
      }
      var validationShown = false;
      function syncValidation() {
        var messages = [];
        var firstInvalid = null;
        form.querySelectorAll('[required]').forEach(function (field) {
          var invalid = !field.validity.valid || (field.type !== 'checkbox' && !field.value.trim());
          field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          // Preserve any existing help-text associations.
          var descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
          if (status) descriptions = descriptions.filter(function (id) { return id !== status.id; });
          if (invalid) {
            if (!firstInvalid) firstInvalid = field;
            if (status) descriptions.push(status.id);
            messages.push(field.type === 'checkbox'
              ? 'יש לסמן הסכמה לקבלת עדכונים, הטבות ותוכן שיווקי כדי להירשם.'
              : field.type === 'email' ? 'נא להזין כתובת אימייל תקינה.' : 'נא למלא שם מלא.');
          }
          if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
          else field.removeAttribute('aria-describedby');
        });
        if (status) {
          status.textContent = messages.join(' ');
          status.className = messages.length ? 'form-status is-error' : 'form-status';
        }
        return firstInvalid;
      }
      // Capture non-bubbling invalid events without cancelling native UI/focus.
      form.addEventListener('invalid', function () {
        validationShown = true;
        syncValidation();
      }, true);
      function updateValidation() {
        if (validationShown) syncValidation();
      }
      form.addEventListener('input', updateValidation);
      form.addEventListener('change', updateValidation);
      form.addEventListener('submit', function (e) {
        var firstInvalid = syncValidation();
        if (firstInvalid) {
          e.preventDefault();
          validationShown = true;
          firstInvalid.focus();
          return;
        }
        // Keep the existing guard for the unconfigured bundle endpoint.
        var formIdField = form.querySelector('[name="form"]');
        if (formIdField && /^REPLACE_WITH/.test(formIdField.value)) {
          e.preventDefault();
          if (status) {
            status.textContent = 'הרכישה הזו עדיין לא מחוברת. אפשר לפנות אלינו ישירות דרך עמוד יצירת הקשר.';
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

    // A Formspree AJAX handler for `[data-contact-form]` used to live here,
    // carried over from the pre-Next static site. Nothing renders that
    // selector any more — the contact page is components/ContactForm.tsx,
    // which composes a mailto: and posts nothing anywhere. The handler was
    // removed rather than left dormant: it was a live third-party endpoint
    // sitting in a script that loads on every game page, one stray attribute
    // away from silently sending form data off-site.
  }
})();
