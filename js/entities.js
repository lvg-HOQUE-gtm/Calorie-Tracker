(function (global) {
  "use strict";

  var W = 480;
  var H = 720;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function Pool(create, size) {
    this.create = create;
    this.items = [];
    for (var i = 0; i < size; i++) this.items.push(create());
  }

  Pool.prototype.acquire = function () {
    var item = this.items.pop();
    if (!item) item = this.create();
    item.alive = true;
    return item;
  };

  Pool.prototype.release = function (item) {
    item.alive = false;
    this.items.push(item);
  };

  function Particle() {
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 2;
    this.color = "#fff";
  }

  Particle.prototype.reset = function (x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.alive = true;
  };

  Particle.prototype.update = function (dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    if (this.life <= 0) this.alive = false;
  };

  Particle.prototype.draw = function (ctx) {
    var a = clamp(this.life / this.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  };

  function Bullet() {
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.r = 3;
    this.fromPlayer = true;
  }

  Bullet.prototype.reset = function (x, y, vx, vy, fromPlayer) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.fromPlayer = fromPlayer;
    this.r = fromPlayer ? 3 : 4;
    this.alive = true;
  };

  Bullet.prototype.update = function (dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -20 || this.y > H + 20 || this.x < -20 || this.x > W + 20) {
      this.alive = false;
    }
  };

  Bullet.prototype.draw = function (ctx) {
    ctx.fillStyle = this.fromPlayer ? "#f4ff9a" : "#ff7a4a";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    if (this.fromPlayer) {
      ctx.fillStyle = "#7fe3ff";
      ctx.fillRect(this.x - 1.5, this.y + 2, 3, 8);
    }
  };

  function Player() {
    this.x = W / 2;
    this.y = H - 90;
    this.w = 28;
    this.h = 32;
    this.speed = 280;
    this.cooldown = 0;
    this.invuln = 0;
    this.alive = true;
  }

  Player.prototype.reset = function () {
    this.x = W / 2;
    this.y = H - 90;
    this.cooldown = 0;
    this.invuln = 1.2;
    this.alive = true;
  };

  Player.prototype.update = function (dt, input) {
    var dx = 0;
    var dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx && dy) {
      dx *= 0.707;
      dy *= 0.707;
    }
    this.x = clamp(this.x + dx * this.speed * dt, 22, W - 22);
    this.y = clamp(this.y + dy * this.speed * dt, 40, H - 40);
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
  };

  Player.prototype.canFire = function () {
    return this.cooldown <= 0;
  };

  Player.prototype.fire = function () {
    this.cooldown = 0.16;
  };

  Player.prototype.hitbox = function () {
    return { x: this.x - 10, y: this.y - 10, w: 20, h: 22 };
  };

  Player.prototype.draw = function (ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#7fe3ff";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 10);
    ctx.lineTo(0, 4);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d8fbff";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, 2);
    ctx.lineTo(-5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4aa0c8";
    ctx.fillRect(-16, 2, 10, 4);
    ctx.fillRect(6, 2, 10, 4);
    ctx.fillStyle = "#ffb347";
    ctx.fillRect(-3, 8, 6, 6);
    ctx.restore();
  };

  function Enemy() {
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.hp = 1;
    this.score = 100;
    this.kind = "grunt";
    this.t = 0;
    this.fireTimer = 0;
    this.w = 24;
    this.h = 24;
  }

  Enemy.prototype.reset = function (kind, x, y, wave) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.alive = true;
    if (kind === "weaver") {
      this.hp = 2;
      this.score = 150;
      this.vy = 70 + wave * 4;
      this.vx = 90;
      this.fireTimer = 0.8 + Math.random() * 0.8;
    } else if (kind === "tank") {
      this.hp = 4 + Math.floor(wave / 3);
      this.score = 300;
      this.vy = 45 + wave * 2;
      this.vx = 0;
      this.fireTimer = 0.5;
    } else {
      this.hp = 1;
      this.score = 100;
      this.vy = 90 + wave * 6;
      this.vx = (Math.random() - 0.5) * 40;
      this.fireTimer = 1.2 + Math.random();
    }
  };

  Enemy.prototype.update = function (dt) {
    this.t += dt;
    if (this.kind === "weaver") {
      this.x += Math.sin(this.t * 3) * this.vx * dt;
    } else {
      this.x += this.vx * dt;
    }
    this.y += this.vy * dt;
    this.fireTimer -= dt;
    if (this.x < 18) {
      this.x = 18;
      this.vx *= -1;
    }
    if (this.x > W - 18) {
      this.x = W - 18;
      this.vx *= -1;
    }
    if (this.y > H + 40) this.alive = false;
  };

  Enemy.prototype.canFire = function () {
    return this.fireTimer <= 0 && this.y > 20 && this.y < H - 120;
  };

  Enemy.prototype.didFire = function () {
    this.fireTimer = this.kind === "tank" ? 0.9 : 1.6 + Math.random();
  };

  Enemy.prototype.hitbox = function () {
    return { x: this.x - 12, y: this.y - 12, w: 24, h: 24 };
  };

  Enemy.prototype.draw = function (ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI);
    var body = this.kind === "tank" ? "#ff6b4a" : this.kind === "weaver" ? "#ffb347" : "#ff8a5c";
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(11, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a1010";
    ctx.fillRect(-12, 1, 8, 3);
    ctx.fillRect(4, 1, 8, 3);
    ctx.restore();
  };

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  global.SkyStrike = {
    W: W,
    H: H,
    clamp: clamp,
    Pool: Pool,
    Particle: Particle,
    Bullet: Bullet,
    Player: Player,
    Enemy: Enemy,
    rectsOverlap: rectsOverlap,
  };
})(window);
