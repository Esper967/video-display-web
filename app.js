/*
 * 可拓展前端框架 · 交互逻辑
 * ------------------------------------------------------------
 * 纯音画页面：素材地址由 assets/manifest.js 提供。
 * 进入层会等待视频与音频都加载到可播放状态后才开放。
 */
(function () {
  "use strict";

  var DEFAULTS = {
    enterText: "点击进入",
    targetVolume: 0.45,
    fadeDuration: 3000,
    fadeDelay: 120,
    mediaErrorTitle: "素材未就绪",
    mediaErrorText: "请把 1 个视频和 1 个音频放入 assets 文件夹，然后双击“启动网页.bat”。",
    mediaErrorHint: "支持 MP4 / WebM / OGV / MOV / M4V 与 MP3 / WAV / OGG / M4A / AAC / FLAC / OPUS；除框架自带示例外，视频和音频请各保留一个。"
  };

  var userConfig = window.FRAME_CONFIG || {};
  var config = {};
  Object.keys(DEFAULTS).forEach(function (key) {
    config[key] = Object.prototype.hasOwnProperty.call(userConfig, key)
      ? userConfig[key]
      : DEFAULTS[key];
  });

  var manifest = window.FRAME_ASSETS || null;

  var $ = function (id) { return document.getElementById(id); };

  var bgEl = $("bgParallax");
  var videoEl = $("bgVideo");
  var audioEl = $("bgm");
  var gateEl = $("gate");
  var gateLoadingEl = $("gateLoading");
  var loadTrackEl = $("loadTrack");
  var loadFillEl = $("loadFill");
  var loadTextEl = $("loadText");
  var enterLabelEl = $("enterLabel");
  var mediaErrorTitleEl = $("mediaErrorTitle");
  var mediaErrorTextEl = $("mediaErrorText");
  var mediaErrorHintEl = $("mediaErrorHint");

  var mediaFailed = false;
  var mediaReady = false;
  var entered = false;
  var volumeTimer = null;
  var progressTimer = null;
  var lastProgress = -1;
  var canPlayThrough = { video: false, audio: false };


  /* ---------- 提示文案 ---------- */

  function applyCopy() {
    if (enterLabelEl) enterLabelEl.textContent = config.enterText;
    if (mediaErrorTitleEl) mediaErrorTitleEl.textContent = config.mediaErrorTitle;
    if (mediaErrorTextEl) mediaErrorTextEl.textContent = config.mediaErrorText;
    if (mediaErrorHintEl) mediaErrorHintEl.textContent = config.mediaErrorHint;
  }

  function showError(title, text, hint) {
    mediaFailed = true;
    stopProgressTimer();
    document.body.classList.add("has-media-error");

    if (title && mediaErrorTitleEl) mediaErrorTitleEl.textContent = title;
    if (text && mediaErrorTextEl) mediaErrorTextEl.textContent = text;
    if (hint && mediaErrorHintEl) mediaErrorHintEl.textContent = hint;

    if (!gateEl) return;
    gateEl.classList.remove("is-hidden");
    gateEl.classList.remove("is-loading");
    gateEl.removeAttribute("inert");
    gateEl.removeAttribute("aria-hidden");
    gateEl.setAttribute("aria-busy", "false");
    gateEl.setAttribute("aria-disabled", "true");
    gateEl.setAttribute("aria-label", title || "素材未就绪");
    try { gateEl.focus(); } catch (e) {}
  }


  /* ---------- 加载进度 ---------- */

  function setProgress(value) {
    var pct = Math.max(0, Math.min(100, Math.round(value)));
    if (pct === lastProgress) return;
    lastProgress = pct;

    if (loadFillEl) loadFillEl.style.width = pct + "%";
    if (loadTrackEl) loadTrackEl.setAttribute("aria-valuenow", String(pct));
    if (loadTextEl) loadTextEl.textContent = "正在加载音画 " + pct + "%";
  }

  function bufferRatio(el) {
    if (el.readyState >= 4) return 1;

    var duration = el.duration;
    if (isFinite(duration) && duration > 0) {
      try {
        var buffered = el.buffered;
        if (buffered && buffered.length) {
          return Math.max(0, Math.min(1, buffered.end(buffered.length - 1) / duration));
        }
      } catch (e) {}
    }

    if (el.readyState < 1) return 0;
    return Math.min(0.3, el.readyState / 12);
  }

  function bufferedToEnd(el) {
    if (el.readyState < 3) return false;
    var duration = el.duration;
    if (!isFinite(duration) || duration <= 0) return false;

    try {
      var buffered = el.buffered;
      if (buffered && buffered.length) {
        return buffered.end(buffered.length - 1) >= duration * 0.995;
      }
    } catch (e) {}

    return false;
  }

  function stopProgressTimer() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function markMediaReady() {
    if (mediaReady || mediaFailed) return;
    mediaReady = true;
    stopProgressTimer();
    setProgress(100);

    if (gateLoadingEl) gateLoadingEl.setAttribute("aria-hidden", "true");
    if (gateEl) {
      gateEl.classList.remove("is-loading");
      gateEl.classList.add("is-ready");
      gateEl.setAttribute("aria-busy", "false");
      gateEl.removeAttribute("aria-disabled");
      gateEl.setAttribute("tabindex", "0");
      gateEl.setAttribute("aria-label", config.enterText);
      try { gateEl.focus(); } catch (e) {}
    }
  }

  function checkMediaReady() {
    if (mediaReady || mediaFailed) return;

    var videoReady = canPlayThrough.video || videoEl.readyState >= 4 || bufferedToEnd(videoEl);
    var audioReady = canPlayThrough.audio || audioEl.readyState >= 4 || bufferedToEnd(audioEl);

    if (videoReady && audioReady) markMediaReady();
  }

  function updateProgress() {
    if (mediaFailed) return;
    if (mediaReady) {
      setProgress(100);
      return;
    }

    var ratio = (bufferRatio(videoEl) + bufferRatio(audioEl)) / 2;
    setProgress(Math.min(96, ratio * 100));
    checkMediaReady();
  }

  function startProgressTimer() {
    stopProgressTimer();
    progressTimer = setInterval(updateProgress, 250);
  }


  /* ---------- 音画进入与渐入 ---------- */

  function mediaErrorTextFor(kind, file) {
    var which = kind === "video" ? "视频" : "音频";
    return "无法读取" + which + "：" + (file || "未知文件") +
      "。请确认文件未损坏、格式受当前浏览器支持，然后重新运行“启动网页.bat”。";
  }

  function initMedia() {
    if (!manifest || !manifest.video || !manifest.audio) {
      showError(
        config.mediaErrorTitle,
        "还没有可用的素材清单。请把 1 个视频和 1 个音频放入 assets，然后双击“启动网页.bat”。",
        config.mediaErrorHint
      );
      return false;
    }

    function bindProgress(el) {
      ["progress", "loadedmetadata", "loadeddata", "canplay", "durationchange"].forEach(function (name) {
        el.addEventListener(name, updateProgress);
      });
    }

    bindProgress(videoEl);
    bindProgress(audioEl);

    videoEl.addEventListener("canplaythrough", function () {
      canPlayThrough.video = true;
      updateProgress();
    });
    audioEl.addEventListener("canplaythrough", function () {
      canPlayThrough.audio = true;
      updateProgress();
    });

    videoEl.addEventListener("error", function () {
      showError(config.mediaErrorTitle, mediaErrorTextFor("video", manifest.videoName || manifest.video), config.mediaErrorHint);
    });
    audioEl.addEventListener("error", function () {
      showError(config.mediaErrorTitle, mediaErrorTextFor("audio", manifest.audioName || manifest.audio), config.mediaErrorHint);
    });

    videoEl.src = manifest.video;
    audioEl.src = manifest.audio;

    setProgress(0);
    startProgressTimer();
    return true;
  }

  function fadeVolume(to, duration) {
    if (volumeTimer) clearInterval(volumeTimer);
    var from = audioEl.volume;
    var startAt = performance.now();
    var safeDuration = Math.max(1, Number(duration) || 1);
    volumeTimer = setInterval(function () {
      var t = Math.min(1, (performance.now() - startAt) / safeDuration);
      var eased = 1 - Math.pow(1 - t, 3);
      audioEl.volume = Math.min(1, Math.max(0, from + (to - from) * eased));
      if (t >= 1) {
        clearInterval(volumeTimer);
        volumeTimer = null;
      }
    }, 32);
  }

  function startPlayback() {
    if (entered || mediaFailed || !mediaReady) return;
    entered = true;

    try { videoEl.currentTime = 0; } catch (e) {}
    try { audioEl.currentTime = 0; } catch (e) {}
    audioEl.volume = 0;

    var videoPromise = videoEl.play();
    var audioPromise = audioEl.play();

    if (videoPromise && typeof videoPromise.catch === "function") {
      videoPromise.catch(function () {
        if (videoEl.error) {
          showError(config.mediaErrorTitle, mediaErrorTextFor("video", manifest.videoName || manifest.video), config.mediaErrorHint);
        }
      });
    }

    if (audioPromise && typeof audioPromise.then === "function") {
      audioPromise.then(function () {
        setTimeout(function () {
          fadeVolume(config.targetVolume, config.fadeDuration);
        }, config.fadeDelay);
      }).catch(function () {});
    } else {
      setTimeout(function () {
        fadeVolume(config.targetVolume, config.fadeDuration);
      }, config.fadeDelay);
    }

    if (gateEl) {
      gateEl.classList.add("is-hidden");
      gateEl.setAttribute("aria-hidden", "true");
      gateEl.setAttribute("inert", "");
      if (gateEl.blur) gateEl.blur();
    }
  }


  /* ---------- 启动 ---------- */

  applyCopy();

  videoEl.muted = true;
  videoEl.volume = 0;

  var mediaAvailable = initMedia();

  if (gateEl) {
    gateEl.addEventListener("click", startPlayback);
    gateEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " " || event.code === "Space") {
        event.preventDefault();
        startPlayback();
      }
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && mediaAvailable && entered && videoEl.paused && !mediaFailed) {
      var p = videoEl.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    }
  });


  /* ---------- 鼠标视差 ---------- */

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion && bgEl) {
    var mx = 0, my = 0, rafId = 0;

    function apply() {
      rafId = 0;
      bgEl.style.transform =
        "translate3d(" + (-mx * 16).toFixed(2) + "px," + (-my * 12).toFixed(2) + "px,0)";
    }

    document.addEventListener("pointermove", function (event) {
      mx = event.clientX / window.innerWidth - 0.5;
      my = event.clientY / window.innerHeight - 0.5;
      if (!rafId) rafId = requestAnimationFrame(apply);
    }, { passive: true });
  }
})();
