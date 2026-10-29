
(function () {
  "use strict";

  var TARGET = new Date("2026-11-01T12:00:00+08:00");
  var TARGET_PRESSED = TARGET.getTime();

  var $ = function (id) { return document.getElementById(id); };

  var daysEl = $("days");
  var hoursEl = $("hours");
  var minutesEl = $("minutes");
  var clockEl = $("clock");
  var coreEl = $("core");
  var bgEl = $("bgParallax");

  var videoEl = $("bgVideo");
  var audioEl = $("bgm");
  var gateEl = $("gate");

  var pad2 = function (n) { return n < 10 ? "0" + n : String(n); };
  var eyebrowTextEl = document.querySelector(".eyebrow__text");
  var expiredShown = false;


  var prev = { d: null, h: null, m: null };
  var firstRender = true;

  function setValue(el, key, value) {
    if (prev[key] === value) return;
    var isFirst = prev[key] === null;
    prev[key] = value;
    el.textContent = value;
    if (isFirst) return;
    el.classList.remove("flip");
    void el.offsetWidth;
    el.classList.add("flip");
  }

  function updateTitle(d, h, m) {
    document.title = expiredShown
      ? "活动已开始 "
      : "塔露拉半周年倒计时";
  }

  function markEnded() {
    if (expiredShown) return;
    expiredShown = true;
    if (eyebrowTextEl) eyebrowTextEl.textContent = "活动已开始";
    document.body.classList.add("is-ended");
  }

  function tick() {
    var now = Date.now();
    var diff = TARGET_PRESSED - now;
    var expired = diff <= 0;
    if (diff < 0) diff = 0;

    var totalMinutes = Math.floor(diff / 60000);
    var d = Math.floor(totalMinutes / 1440);
    var h = Math.floor((totalMinutes % 1440) / 60);
    var m = totalMinutes % 60;

    if (expired) markEnded();

    setValue(daysEl, "d", pad2(d));
    setValue(hoursEl, "h", pad2(h));
    setValue(minutesEl, "m", pad2(m));

    var label = expired
      ? "活动已经开始"
      : "距离活动开始还有 " + d + " 天 " + h + " 小时 " + m + " 分钟";

    if (firstRender) {
      firstRender = false;
      clockEl.setAttribute("aria-label", label);
      updateTitle(d, h, m);
    } else if (prev.reported !== totalMinutes) {
      clockEl.setAttribute("aria-label", label);
      updateTitle(d, h, m);
    }
    prev.reported = totalMinutes;
  }


  var TARGET_VOLUME = 0.45;
  var FADE_DURATION = 3000;
  var FADE_DELAY = 120;

  var entered = false;
  var volumeTimer = null;

  function fadeVolume(to, duration) {
    if (volumeTimer) clearInterval(volumeTimer);
    var from = audioEl.volume;
    var startAt = performance.now();
    volumeTimer = setInterval(function () {
      var t = Math.min(1, (performance.now() - startAt) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      audioEl.volume = Math.min(1, Math.max(0, from + (to - from) * eased));
      if (t >= 1) {
        clearInterval(volumeTimer);
        volumeTimer = null;
      }
    }, 32);
  }

  function startPlayback() {
    if (entered) return;
    entered = true;

    try { videoEl.currentTime = 0; } catch (e) {}
    try { audioEl.currentTime = 0; } catch (e) {}
    audioEl.volume = 0;

    var videoPromise = videoEl.play();
    var audioPromise = audioEl.play();

    if (videoPromise && typeof videoPromise.catch === "function") {
      videoPromise.catch(function () {});
    }

    if (audioPromise && typeof audioPromise.then === "function") {
      audioPromise.then(function () {
        setTimeout(function () {
          fadeVolume(TARGET_VOLUME, FADE_DURATION);
        }, FADE_DELAY);
      }).catch(function () {});
    } else {
      setTimeout(function () {
        fadeVolume(TARGET_VOLUME, FADE_DURATION);
      }, FADE_DELAY);
    }

    document.body.classList.add("is-entered");
    if (gateEl) {
      gateEl.classList.add("is-hidden");
      gateEl.setAttribute("aria-hidden", "true");
      gateEl.setAttribute("inert", "");
      if (gateEl.blur) gateEl.blur();
    }
  }

  if (gateEl) {
    gateEl.addEventListener("click", startPlayback);
    gateEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " " || event.code === "Space") {
        event.preventDefault();
        startPlayback();
      }
    });
  }


  videoEl.muted = true;
  videoEl.volume = 0;

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      if (entered && videoEl.paused) {
        var p = videoEl.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
      tick();
    }
  });


  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion && bgEl && coreEl) {
    var mx = 0, my = 0, rafId = 0;

    function apply() {
      rafId = 0;
      coreEl.style.setProperty("--px", (mx * 9).toFixed(2) + "px");
      coreEl.style.setProperty("--py", (my * 7).toFixed(2) + "px");
      bgEl.style.transform =
        "translate3d(" + (-mx * 16).toFixed(2) + "px," + (-my * 12).toFixed(2) + "px,0)";
    }

    document.addEventListener("pointermove", function (event) {
      mx = event.clientX / window.innerWidth - 0.5;
      my = event.clientY / window.innerHeight - 0.5;
      if (!rafId) rafId = requestAnimationFrame(apply);
    }, { passive: true });
  }


  var DRAG_LIMIT_X = 52;
  var DRAG_LIMIT_Y = 74;
  var drag = { x: 0, y: 0, vx: 0, vy: 0, active: false, raf: 0, id: null, sx: 0, sy: 0, bx: 0, by: 0 };

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function applyDrag() {
    var scale = 1 - Math.min(0.035, Math.abs(drag.y) / 2200);
    clockEl.style.setProperty("--drag-x", drag.x.toFixed(2) + "px");
    clockEl.style.setProperty("--drag-y", drag.y.toFixed(2) + "px");
    clockEl.style.setProperty("--drag-r", (drag.x * 0.035).toFixed(2) + "deg");
    clockEl.style.setProperty("--drag-s", scale.toFixed(4));
  }

  function dragLoop() {
    drag.raf = 0;
    if (!drag.active) {
      drag.vx += -drag.x * 0.09;
      drag.vy += -drag.y * 0.09;
      drag.vx *= 0.84;
      drag.vy *= 0.84;
      drag.x = clamp(drag.x + drag.vx, -DRAG_LIMIT_X, DRAG_LIMIT_X);
      drag.y = clamp(drag.y + drag.vy, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
      if (Math.abs(drag.x) < 0.06 && Math.abs(drag.y) < 0.06 &&
          Math.abs(drag.vx) < 0.06 && Math.abs(drag.vy) < 0.06) {
        drag.x = 0;
        drag.y = 0;
        drag.vx = 0;
        drag.vy = 0;
        applyDrag();
        return;
      }
    }
    applyDrag();
    drag.raf = requestAnimationFrame(dragLoop);
  }

  function kickDrag() {
    if (!drag.raf) drag.raf = requestAnimationFrame(dragLoop);
  }

  window.addEventListener("wheel", function (event) {
    if (!entered || reduceMotion || event.ctrlKey) return;
    var unit = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? 100 : 1);
    drag.y = clamp(drag.y + event.deltaY * unit * 0.32, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
    drag.x = clamp(drag.x + event.deltaX * unit * 0.32, -DRAG_LIMIT_X, DRAG_LIMIT_X);
    applyDrag();
    kickDrag();
  }, { passive: true });

  if (clockEl) {
    clockEl.addEventListener("pointerdown", function (event) {
      if (!entered || reduceMotion) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag.active = true;
      drag.id = event.pointerId;
      drag.sx = event.clientX;
      drag.sy = event.clientY;
      drag.bx = drag.x;
      drag.by = drag.y;
      drag.vx = 0;
      drag.vy = 0;
      document.body.classList.add("is-dragging");
      if (clockEl.setPointerCapture) {
        try { clockEl.setPointerCapture(event.pointerId); } catch (e) {}
      }
      kickDrag();
    });

    clockEl.addEventListener("pointermove", function (event) {
      if (!drag.active || event.pointerId !== drag.id) return;
      var dx = event.clientX - drag.sx;
      var dy = event.clientY - drag.sy;
      drag.x = clamp(drag.bx + dx * 0.9, -DRAG_LIMIT_X, DRAG_LIMIT_X);
      drag.y = clamp(drag.by + dy * 0.75, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
      applyDrag();
    });

    function releaseDrag() {
      if (!drag.active) return;
      drag.active = false;
      document.body.classList.remove("is-dragging");
      drag.vx = 0;
      drag.vy = 0;
      kickDrag();
    }

    clockEl.addEventListener("pointerup", releaseDrag);
    clockEl.addEventListener("pointercancel", releaseDrag);
    clockEl.addEventListener("lostpointercapture", releaseDrag);
  }


  tick();

  setInterval(function () {
    tick();
  }, 1000);
})();
