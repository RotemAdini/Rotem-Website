/* ==========================================================================
   משחק הזיכרון הגדול — "who remembered?" round demo
   Loaded ONLY by the memory-game page, in addition to js/main.js.
   Plays the game's real mechanic on six of its real questions (one per
   topic): read the question, mark who remembered, the score moves. Nothing
   is saved; the figure's caption labels it as an illustration.
   ========================================================================== */
(function () {
  'use strict';

  // Sample questions from the game's question bank. Counts (questions,
  // topics) are deliberately not shown until the current build confirms them.
  var QUESTIONS = [
    { topic: 'זיכרונות קלאסיים', text: 'איפה היה הדייט הראשון שלכם?' },
    { topic: 'הרגעים של עכשיו', text: 'מה הייתה ההודעה האחרונה ששלחתם אחד לשני?' },
    { topic: 'מפגשים חברתיים', text: 'מה היה האירוע החברתי האחרון שהייתם בו יחד – ואיפה זה היה?' },
    { topic: 'מה קרה בפעם האחרונה ש…', text: 'מה הייתה התמונה הזוגית האחרונה שצילמתם?' },
    { topic: 'אירועים זוגיים מיוחדים', text: 'מתי הייתה הפעם הראשונה שאמרתם ״אני אוהב/ת אותך״?' },
    { topic: 'מאחורי הקלעים של הזוגיות', text: 'מי התחיל עם מי?' }
  ];
  var NAMES = { a: 'שחקן א׳', b: 'שחקן ב׳' };

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // See the matching comment in main.js: this loads after hydration via
  // next/script, so DOMContentLoaded may already have fired.
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var root = document.querySelector('[data-mg-round]');
    if (root) initRound(root);
  });

  function initRound(root) {
    var card = root.querySelector('[data-mg-card]');
    var topicEl = root.querySelector('[data-mg-topic]');
    var countEl = root.querySelector('[data-mg-count]');
    var questionEl = root.querySelector('[data-mg-question]');
    var statusEl = root.querySelector('[data-mg-status]');
    var resetBtn = root.querySelector('[data-mg-reset]');
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-mg-award]'));
    var scoreEls = { a: root.querySelector('[data-mg-score="a"]'), b: root.querySelector('[data-mg-score="b"]') };
    var playerEls = { a: root.querySelector('[data-mg-player="a"]'), b: root.querySelector('[data-mg-player="b"]') };
    if (!card || !questionEl || !buttons.length) return;

    var state = { index: 0, score: { a: 0, b: 0 }, busy: false };

    function render() {
      var q = QUESTIONS[state.index];
      topicEl.textContent = q.topic;
      questionEl.textContent = q.text;
      countEl.textContent = 'דוגמה ' + (state.index + 1);
    }

    function paintScore(bumped) {
      ['a', 'b'].forEach(function (p) {
        scoreEls[p].textContent = String(state.score[p]);
        playerEls[p].classList.toggle('is-leading', state.score[p] > state.score[p === 'a' ? 'b' : 'a']);
        if (bumped.indexOf(p) !== -1 && !reducedMotion.matches) {
          scoreEls[p].classList.remove('is-bump');
          void scoreEls[p].offsetWidth; // restart the transition
          scoreEls[p].classList.add('is-bump');
          setTimeout(function () { scoreEls[p].classList.remove('is-bump'); }, 320);
        }
      });
    }

    function message(award) {
      if (award === 'both') return 'נקודה לכל אחד';
      if (award === 'none') return 'אף אחד לא זכר. קורה.';
      return 'נקודה ל' + NAMES[award];
    }

    function finish() {
      var a = state.score.a, b = state.score.b;
      var result = a === b ? 'תיקו!' : ('ניצחון ל' + (a > b ? NAMES.a : NAMES.b));
      statusEl.textContent = result + ' במשחק המלא יש עוד הרבה שאלות כאלה.';
      buttons.forEach(function (btn) { btn.disabled = true; });
      root.classList.add('is-done');
    }

    function award(who) {
      if (state.busy) return;
      var bumped = who === 'both' ? ['a', 'b'] : (who === 'none' ? [] : [who]);
      bumped.forEach(function (p) { state.score[p] += 1; });
      paintScore(bumped);
      statusEl.textContent = message(who);

      if (state.index === QUESTIONS.length - 1) { finish(); return; }

      state.busy = true;
      var delay = reducedMotion.matches ? 0 : 260;
      card.classList.add('is-leaving');
      setTimeout(function () {
        state.index += 1;
        render();
        card.classList.remove('is-leaving');
        state.busy = false;
      }, delay);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { award(btn.getAttribute('data-mg-award')); });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.index = 0;
        state.score = { a: 0, b: 0 };
        buttons.forEach(function (btn) { btn.disabled = false; });
        root.classList.remove('is-done');
        statusEl.textContent = '';
        paintScore([]);
        render();
        buttons[0].focus();
      });
    }

    render();
  }
})();
