/* ==========================================================================
   משחק הזיכרון הגדול — Interactive memory-card demo
   Loaded ONLY by memory-game.html, in addition to js/main.js.
   A short, self-contained product demo: 4 pairs, one clean round at a
   time. No score is saved or claimed anywhere outside this widget.
   ========================================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var SYMBOLS = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.2s-7.2-4.4-9.6-9C.8 7.5 2.4 4 5.8 4c2 0 3.3 1.1 4.2 2.3.3.4.7.4 1 0C11.9 5.1 13.2 4 15.2 4c3.4 0 5 3.5 3.4 7.2-2.4 4.6-6.6 9-6.6 9Z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1.2 2.8-2.6 4.3-2.6 7.6a2.6 2.6 0 0 0 5.2 0c0-.8-.3-1.5-.8-2.1.4 1.7 0 2.9-1 3.7a3 3 0 0 1-2.5-3C10.3 6.6 12.3 5.6 12 3Z"/><path d="M8.3 13a3.9 3.9 0 0 0 7.4 0"/></svg>',
    rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="13" r="4.2"/><circle cx="15" cy="13" r="4.2"/></svg>'
  };

  document.addEventListener('DOMContentLoaded', function () {
    var board = document.querySelector('[data-mg-board]');
    if (board) initBoard(board);
    initFlipReveal();
  });

  function initBoard(board) {
    var grid = board.querySelector('[data-mg-grid]');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.mg-card'));
    var matchesEl = board.querySelector('[data-mg-matches]');
    var streakEl = board.querySelector('[data-mg-streak]');
    var streakWrap = board.querySelector('[data-mg-streak-wrap]');
    var ringFill = board.querySelector('.mg-ring-fill');
    var successEl = board.querySelector('[data-mg-success]');
    var particlesLayer = board.querySelector('[data-mg-particles]');
    if (!cards.length) return;

    var TOTAL_PAIRS = cards.length / 2;
    var RING_R = 19;
    var ringCircumference = 2 * Math.PI * RING_R;
    if (ringFill) {
      ringFill.style.strokeDasharray = ringCircumference.toFixed(2);
      ringFill.style.strokeDashoffset = ringCircumference.toFixed(2);
    }

    var state = { flipped: [], matches: 0, streak: 0, busy: false };

    function symbolPool() {
      var pool = [];
      Object.keys(SYMBOLS).forEach(function (s) { pool.push(s, s); });
      return pool;
    }

    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }

    function assignSymbols() {
      var pool = shuffle(symbolPool());
      cards.forEach(function (card, i) {
        var symbol = pool[i];
        card.setAttribute('data-symbol', symbol);
        var front = card.querySelector('.mg-card-front');
        if (front) front.innerHTML = SYMBOLS[symbol];
        card.classList.remove('is-flipped', 'is-matched', 'is-flash', 'is-shake');
        card.removeAttribute('disabled');
        card.setAttribute('aria-pressed', 'false');
      });
    }

    function updateHud() {
      if (matchesEl) matchesEl.textContent = state.matches + '/' + TOTAL_PAIRS;
      if (streakEl) streakEl.textContent = String(state.streak);
      if (streakWrap) streakWrap.classList.toggle('is-hot', state.streak >= 2);
      if (ringFill) {
        var offset = ringCircumference * (1 - state.matches / TOTAL_PAIRS);
        ringFill.style.strokeDashoffset = offset.toFixed(2);
      }
    }

    function burstParticles(card) {
      if (reducedMotion.matches || !particlesLayer) return;
      var rect = card.getBoundingClientRect();
      var boardRect = board.getBoundingClientRect();
      var cx = rect.left - boardRect.left + rect.width / 2;
      var cy = rect.top - boardRect.top + rect.height / 2;
      for (var i = 0; i < 8; i++) {
        var p = document.createElement('span');
        p.className = 'mg-particle';
        var angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
        var dist = 28 + Math.random() * 16;
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.setProperty('--px', (Math.cos(angle) * dist).toFixed(1) + 'px');
        p.style.setProperty('--py', (Math.sin(angle) * dist).toFixed(1) + 'px');
        particlesLayer.appendChild(p);
        (function (el) { window.setTimeout(function () { el.remove(); }, 750); })(p);
      }
    }

    function flip(card) { card.classList.add('is-flipped'); card.setAttribute('aria-pressed', 'true'); }
    function unflip(card) { card.classList.remove('is-flipped'); card.setAttribute('aria-pressed', 'false'); }

    function onCardClick(e) {
      var card = e.currentTarget;
      if (state.busy || card.hasAttribute('disabled') || card.classList.contains('is-flipped')) return;

      flip(card);
      state.flipped.push(card);
      if (state.flipped.length < 2) return;

      state.busy = true;
      var a = state.flipped[0], b = state.flipped[1];
      state.flipped = [];

      if (a.getAttribute('data-symbol') === b.getAttribute('data-symbol')) {
        window.setTimeout(function () {
          [a, b].forEach(function (c) {
            c.classList.add('is-matched', 'is-flash');
            c.setAttribute('disabled', 'true');
          });
          burstParticles(a);
          burstParticles(b);
          state.matches++;
          state.streak++;
          updateHud();
          window.setTimeout(function () { a.classList.remove('is-flash'); b.classList.remove('is-flash'); }, 500);
          state.busy = false;
          if (state.matches === TOTAL_PAIRS) onComplete();
        }, reducedMotion.matches ? 0 : 150);
      } else {
        state.streak = 0;
        updateHud();
        if (!reducedMotion.matches) { a.classList.add('is-shake'); b.classList.add('is-shake'); }
        window.setTimeout(function () {
          a.classList.remove('is-shake'); b.classList.remove('is-shake');
          unflip(a); unflip(b);
          state.busy = false;
        }, reducedMotion.matches ? 0 : 700);
      }
    }

    function onComplete() {
      if (!successEl) return;
      successEl.classList.add('is-visible');
      window.setTimeout(function () {
        successEl.classList.remove('is-visible');
        newRound();
      }, reducedMotion.matches ? 400 : 2000);
    }

    function newRound() {
      state.matches = 0;
      state.streak = 0;
      updateHud();
      if (!reducedMotion.matches) {
        grid.classList.add('is-shuffling');
        window.setTimeout(function () { grid.classList.remove('is-shuffling'); }, 650);
      }
      assignSymbols();
    }

    cards.forEach(function (card) { card.addEventListener('click', onCardClick); });

    assignSymbols();
    updateHud();

    if (reducedMotion.matches) {
      // Static preview: settle one pair face-up at rest so the visual
      // hierarchy (symbol, match glow) reads without any motion.
      var firstSymbol = cards[0].getAttribute('data-symbol');
      cards
        .filter(function (c) { return c.getAttribute('data-symbol') === firstSymbol; })
        .forEach(function (c) { c.classList.add('is-flipped', 'is-matched'); c.setAttribute('disabled', 'true'); });
      state.matches = 1;
      updateHud();
    }
  }

  /* Sample-questions section: same flip mechanic, revealing real product
     copy instead of a demo symbol. Purely presentational — the question
     text already exists in the DOM (data-question), nothing invented. */
  function initFlipReveal() {
    var cards = document.querySelectorAll('[data-mg-reveal]');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var wasOpen = card.classList.contains('is-flipped');
        cards.forEach(function (c) { c.classList.remove('is-flipped'); c.setAttribute('aria-pressed', 'false'); });
        if (!wasOpen) { card.classList.add('is-flipped'); card.setAttribute('aria-pressed', 'true'); }
      });
    });
  }
})();
