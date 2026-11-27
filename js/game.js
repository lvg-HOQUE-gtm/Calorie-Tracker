(function (global) {
  "use strict";

  var E = global.SkyStrike;
  var W = E.W;
  var H = E.H;

  function Game(canvas, hud) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hud = hud;
    this.state = "menu";
    this.player = new E.Player();
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.bulletPool = new E.Pool(function () {
      return new E.Bullet();
    }, 80);
    this.enemyPool = new E.Pool(function () {
      return new E.Enemy();
    }, 24);
    this.particlePool = new E.Pool(function () {
      return new E.Particle();
    }, 120);
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnQueue = [];
    this.stars = this.makeStars();
    this.clouds = this.makeClouds();
    this.lastTs = 0;
    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
    };
  }

  Game.prototype.makeStars = function () {
    var stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 0.4 + Math.random() * 1.6,
        v: 20 + Math.random() * 80,
      });
    }
    return stars;
  };

  Game.prototype.makeClouds = function () {
    var clouds = [];
    for (var i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * W,
        y: Math.random() * H,
        w: 60 + Math.random() * 90,
        h: 18 + Math.random() * 16,
        v: 30 + Math.random() * 25,
      });
    }
    return clouds;
  };

  Game.prototype.start = function () {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.clearEntities();
    this.player.reset();
    this.queueWave(1);
    this.state = "playing";
    this.updateHud();
  };

  Game.prototype.clearEntities = function () {
    var i;
    for (i = 0; i < this.bullets.length; i++) this.bulletPool.release(this.bullets[i]);
    for (i = 0; i < this.enemies.length; i++) this.enemyPool.release(this.enemies[i]);
    for (i = 0; i < this.particles.length; i++) this.particlePool.release(this.particles[i]);
    this.bullets.length = 0;
    this.enemies.length = 0;
    this.particles.length = 0;
    this.spawnQueue.length = 0;
  };

  Game.prototype.queueWave = function (wave) {
    this.waveTimer = 1.1;
    var count = 5 + wave * 2;
    for (var i = 0; i < count; i++) {
      var kind = "grunt";
      if (i % 5 === 4) kind = "weaver";
      if (wave >= 3 && i % 8 === 7) kind = "tank";
      this.spawnQueue.push({
        delay: i * 0.38,
        kind: kind,
        x: 40 + Math.random() * (W - 80),
      });
    }
  };

  Game.prototype.spawnEnemy = function (kind, x) {
    var e = this.enemyPool.acquire();
    e.reset(kind, x, -24, this.wave);
    this.enemies.push(e);
  };

  Game.prototype.spawnBullet = function (x, y, vx, vy, fromPlayer) {
    var b = this.bulletPool.acquire();
    b.reset(x, y, vx, vy, fromPlayer);
    this.bullets.push(b);
  };

  Game.prototype.burst = function (x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var p = this.particlePool.acquire();
      var a = Math.random() * Math.PI * 2;
      var sp = 40 + Math.random() * 180;
      p.reset(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + Math.random() * 0.4, 2 + Math.random() * 3, color);
      this.particles.push(p);
    }
  };

  Game.prototype.updateHud = function () {
    this.hud.score.textContent = "Score " + this.score;
    this.hud.wave.textContent = "Wave " + this.wave;
    this.hud.lives.textContent = "Lives " + this.lives;
  };

  Game.prototype.tick = function (ts) {
    if (!this.lastTs) this.lastTs = ts;
    var dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (this.state === "playing") this.update(dt);
    this.draw(dt);
  };

  Game.prototype.update = function (dt) {
    this.scrollBg(dt);
    this.player.update(dt, this.input);
    if (this.input.fire && this.player.canFire()) {
      this.player.fire();
      this.spawnBullet(this.player.x, this.player.y - 18, 0, -520, true);
    }

    this.waveTimer -= dt;
    for (var q = 0; q < this.spawnQueue.length; q++) {
      this.spawnQueue[q].delay -= dt;
    }
    while (this.spawnQueue.length && this.spawnQueue[0].delay <= 0) {
      var next = this.spawnQueue.shift();
      this.spawnEnemy(next.kind, next.x);
    }

    this.updateList(this.enemies, dt);
    this.updateList(this.bullets, dt);
    this.updateList(this.particles, dt);

    for (var i = 0; i < this.enemies.length; i++) {
      var en = this.enemies[i];
      if (!en.alive) continue;
      if (en.canFire()) {
        en.didFire();
        var aim = en.kind === "tank" ? 220 : 180;
        var dy = this.player.y - en.y;
        var dx = this.player.x - en.x;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        this.spawnBullet(en.x, en.y + 12, (dx / len) * aim * 0.35, (dy / len) * aim, false);
      }
    }

    this.collide();

    if (!this.spawnQueue.length && !this.enemies.length && this.waveTimer <= 0) {
      this.wave += 1;
      this.queueWave(this.wave);
      this.updateHud();
    }
  };

  Game.prototype.updateList = function (list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      list[i].update(dt);
      if (!list[i].alive) {
        if (list[i] instanceof E.Bullet) this.bulletPool.release(list[i]);
        else if (list[i] instanceof E.Enemy) this.enemyPool.release(list[i]);
        else if (list[i] instanceof E.Particle) this.particlePool.release(list[i]);
        list.splice(i, 1);
      }
    }
  };

  Game.prototype.collide = function () {
    var i;
    var j;
    var pb;
    var en;
    var eb;
    var box;

    for (i = 0; i < this.bullets.length; i++) {
      pb = this.bullets[i];
      if (!pb.alive || !pb.fromPlayer) continue;
      for (j = 0; j < this.enemies.length; j++) {
        en = this.enemies[j];
        if (!en.alive) continue;
        box = en.hitbox();
        if (pb.x > box.x && pb.x < box.x + box.w && pb.y > box.y && pb.y < box.y + box.h) {
          pb.alive = false;
          en.hp -= 1;
          this.burst(pb.x, pb.y, "#fff4aa", 4);
          if (en.hp <= 0) {
            en.alive = false;
            this.score += en.score;
            this.burst(en.x, en.y, "#ff8a5c", 14);
            this.updateHud();
          }
          break;
        }
      }
    }

    if (this.player.invuln > 0) return;
    var pbox = this.player.hitbox();
    for (i = 0; i < this.bullets.length; i++) {
      eb = this.bullets[i];
      if (!eb.alive || eb.fromPlayer) continue;
      if (eb.x > pbox.x && eb.x < pbox.x + pbox.w && eb.y > pbox.y && eb.y < pbox.y + pbox.h) {
        eb.alive = false;
        this.hurt();
        return;
      }
    }
    for (i = 0; i < this.enemies.length; i++) {
      en = this.enemies[i];
      if (!en.alive) continue;
      if (E.rectsOverlap(pbox, en.hitbox())) {
        en.alive = false;
        this.burst(en.x, en.y, "#ff8a5c", 12);
        this.hurt();
        return;
      }
    }
  };

  Game.prototype.hurt = function () {
    this.burst(this.player.x, this.player.y, "#7fe3ff", 16);
    this.lives -= 1;
    this.updateHud();
    if (this.lives <= 0) {
      this.state = "gameover";
      return;
    }
    this.player.reset();
  };

  Game.prototype.scrollBg = function (dt) {
    var i;
    for (i = 0; i < this.stars.length; i++) {
      this.stars[i].y += this.stars[i].v * dt;
      if (this.stars[i].y > H) {
        this.stars[i].y = 0;
        this.stars[i].x = Math.random() * W;
      }
    }
    for (i = 0; i < this.clouds.length; i++) {
      this.clouds[i].y += this.clouds[i].v * dt;
      if (this.clouds[i].y > H + 30) {
        this.clouds[i].y = -40;
        this.clouds[i].x = Math.random() * W;
      }
    }
  };

  Game.prototype.draw = function (dt) {
    var ctx = this.ctx;
    ctx.fillStyle = "#071624";
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b2a44");
    g.addColorStop(1, "#071624");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#cfefff";
    var i;
    for (i = 0; i < this.stars.length; i++) {
      ctx.globalAlpha = 0.35 + (this.stars[i].s / 2) * 0.4;
      ctx.fillRect(this.stars[i].x, this.stars[i].y, this.stars[i].s, this.stars[i].s);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(160, 200, 230, 0.12)";
    for (i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.state !== "menu") {
      for (i = 0; i < this.particles.length; i++) this.particles[i].draw(ctx);
      for (i = 0; i < this.bullets.length; i++) this.bullets[i].draw(ctx);
      for (i = 0; i < this.enemies.length; i++) this.enemies[i].draw(ctx);
      this.player.draw(ctx);
    }

    if (this.state === "menu" || this.state === "gameover") {
      this.scrollBg(dt);
    }
  };

  global.SkyStrikeGame = Game;
})(window);
