// The review. Scrolling through the tall #review section runs a monthly
// review on an example week: every meeting gets a decision, and the number
// does not move; then the decisions are carried out one by one, the week
// clears, the weekly hours fall, and the color follows them from sunset
// back toward clear sky. Nothing is stored or sent.

(function () {
  var review = document.getElementById('review');
  if (!review) return;

  var root = document.documentElement;
  var blocks = Array.prototype.slice.call(review.querySelectorAll('.mtg'));
  var steps = review.querySelectorAll('.steps li');
  var hoursVal = document.getElementById('hours-val');
  var hoursCount = document.getElementById('hours-count');

  // Weekly hours for each standing meeting, before and after its decision.
  // Monthly meetings count as twelve a year; Design Review is every other
  // week. The total is 12.9 before and 6.2 after.
  var meetings = {
    program:  { before: 5,      after: 2.5,    decision: 'Shorten' },
    standup:  { before: 2.5,    after: 1.25,   decision: 'Shorten' },
    sprint:   { before: 2,      after: 0,      decision: 'Cut' },
    staff:    { before: 1,      after: 0.5,    decision: 'Shorten' },
    alex:     { before: 50 / 60, after: 50 / 60, decision: 'Keep' },
    design:   { before: 0.5,    after: 0.5,    decision: 'Keep' },
    bug:      { before: 0.5,    after: 0.25,   decision: 'Shorten' },
    vendor:   { before: 12 / 52, after: 0,     decision: 'Cut' },
    allhands: { before: 12 / 52, after: 12 / 52, decision: 'Keep' },
    skip:     { before: 6 / 52, after: 6 / 52, decision: 'Keep' }
  };

  var reviewOrder = ['program', 'standup', 'sprint', 'staff', 'alex', 'design', 'bug', 'vendor', 'allhands', 'skip'];
  var actionOrder = ['vendor', 'sprint', 'staff', 'bug', 'standup', 'program'];

  // The app's five tones, placed along weekly hours.
  var tones = [
    [0,  ['#4a90c2', '#7fb8dc']],
    [4,  ['#d9a441', '#efc76b']],
    [8,  ['#e58a4e', '#f2ac72']],
    [12, ['#de5845', '#ee7e63']],
    [16, ['#c7302b', '#e04e38']]
  ];

  function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
  }
  function tone(h) {
    for (var i = 1; i < tones.length; i++) {
      if (h <= tones[i][0] || i === tones.length - 1) {
        var t = Math.max(0, Math.min(1, (h - tones[i - 1][0]) / (tones[i][0] - tones[i - 1][0])));
        return [mix(tones[i - 1][1][0], tones[i][1][0], t), mix(tones[i - 1][1][1], tones[i][1][1], t)];
      }
    }
  }

  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  function place(el, len) {
    var start = +el.dataset.start, day = +el.dataset.day;
    el.style.left = (day * 20) + '%';
    el.style.width = 'calc(20% - 6px)';
    el.style.top = (start / 480 * 100) + '%';
    el.style.height = 'calc(' + (len / 480 * 100) + '% - 2px)';
  }

  function sizeClasses() {
    blocks.forEach(function (el) {
      var h = el.getBoundingClientRect().height;
      el.classList.toggle('is-short', h < 44);
      el.classList.toggle('is-tiny', h < 30);
    });
  }

  function update() {
    var top = review.offsetTop;
    var span = review.offsetHeight - innerHeight;
    var p = clamp((scrollY - top) / Math.max(1, span));

    // Decisions, one meeting at a time.
    var decided = p < 0.08 ? 0 : Math.min(reviewOrder.length, Math.floor((p - 0.08) / 0.3 * reviewOrder.length) + 1);
    var shown = {};
    reviewOrder.forEach(function (id, i) { shown[id] = i < decided; });

    // Actions, carried out one after another.
    var done = {};
    actionOrder.forEach(function (id, i) { done[id] = clamp((p - 0.48) / 0.4 * actionOrder.length - i); });

    var total = 0, count = 0;
    Object.keys(meetings).forEach(function (id) {
      var m = meetings[id], a = done[id] || 0;
      var now = m.before + (m.after - m.before) * a;
      total += now;
      if (!(m.after === 0 && a >= 1)) count++;
    });

    blocks.forEach(function (el) {
      var id = el.dataset.m, a = done[id] || 0;
      var len = +el.dataset.len, to = +el.dataset.to;
      var d = meetings[id].decision;
      if (a >= 1) d = d === 'Cut' ? 'Ended' : 'Shortened';
      if (shown[id]) el.dataset.decision = d;
      else delete el.dataset.decision;
      if (to === 0) {
        place(el, len);
        el.style.opacity = String(1 - 0.92 * a);
        el.classList.toggle('is-gone', a > 0.15);
      } else {
        place(el, len + (to - len) * a);
        el.style.opacity = '1';
      }
    });

    hoursVal.textContent = total.toFixed(1);
    hoursCount.textContent = count;
    var c = tone(total);
    root.style.setProperty('--now', c[0]);
    root.style.setProperty('--now-2', c[1]);

    var step = p < 0.08 ? 0 : p < 0.4 ? 1 : p < 0.48 ? 2 : p < 0.9 ? 3 : 4;
    steps.forEach(function (li, i) { li.classList.toggle('is-on', i === step); });

    sizeClasses();
  }

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();
