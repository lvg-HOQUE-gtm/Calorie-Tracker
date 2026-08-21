(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayMessage = document.getElementById("overlay-message");
  var startBtn = document.getElementById("start-btn");
  var hudEl = document.getElementById("hud");
  var touchEl = document.getElementById("touch");
  var stick = document.getElementById("stick");
  var knob = document.getElementById("stick-knob");
  var fireBtn = document.getElementById("fire-btn");

  var game = new SkyStrikeGame(canvas, {
    score: document.getElementById("hud-score"),
    wave: document.getElementById("hud-wave"),
    lives: document.getElementById("hud-lives"),
  });

  var KEY_MAP = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    a: "left",
    d: "right",
    w: "up",
    s: "down",
    A: "left",
    D: "right",
    W: "up",
    S: "down",
  };

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function showPlayingUi() {
    overlay.classList.add("hidden");
    hudEl.classList.remove("hidden");
    if (isTouchDevice()) touchEl.classList.remove("hidden");
  }

  function showOverlay(title, message, buttonLabel) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    startBtn.textContent = buttonLabel;
    overlay.classList.remove("hidden");
    hudEl.classList.add("hidden");
    touchEl.classList.add("hidden");
  }

  function begin() {
    game.start();
    showPlayingUi();
  }

  window.addEventListener("keydown", function (e) {
    var dir = KEY_MAP[e.key];
    if (dir) {
      game.input[dir] = true;
      e.preventDefault();
    }
    if (e.code === "Space") {
      game.input.fire = true;
      e.preventDefault();
      if (game.state !== "playing") begin();
    }
    if (e.key === "Enter" && game.state !== "playing") begin();
  });

  window.addEventListener("keyup", function (e) {
    var dir = KEY_MAP[e.key];
    if (dir) {
      game.input[dir] = false;
      e.preventDefault();
    }
    if (e.code === "Space") {
      game.input.fire = false;
      e.preventDefault();
    }
  });

  startBtn.addEventListener("click", begin);

  var stickId = null;

  function setStick(clientX, clientY) {
    var rect = stick.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = clientX - cx;
    var dy = clientY - cy;
    var max = rect.width / 2 - 8;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
      len = max;
    }
    knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    var nx = dx / max;
    var ny = dy / max;
    game.input.left = nx < -0.25;
    game.input.right = nx > 0.25;
    game.input.up = ny < -0.25;
    game.input.down = ny > 0.25;
  }

  function resetStick() {
    knob.style.transform = "translate(-50%, -50%)";
    game.input.left = game.input.right = game.input.up = game.input.down = false;
    stickId = null;
  }

  stick.addEventListener("pointerdown", function (e) {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    setStick(e.clientX, e.clientY);
  });

  stick.addEventListener("pointermove", function (e) {
    if (stickId === e.pointerId) setStick(e.clientX, e.clientY);
  });

  stick.addEventListener("pointerup", resetStick);
  stick.addEventListener("pointercancel", resetStick);

  fireBtn.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    game.input.fire = true;
  });
  fireBtn.addEventListener("pointerup", function () {
    game.input.fire = false;
  });
  fireBtn.addEventListener("pointercancel", function () {
    game.input.fire = false;
  });
  fireBtn.addEventListener("pointerleave", function () {
    game.input.fire = false;
  });

  function loop(ts) {
    game.tick(ts);
    if (game.state === "gameover" && overlay.classList.contains("hidden")) {
      showOverlay("Game Over", "Final score " + game.score + ". Wave " + game.wave + ".", "Play again");
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
