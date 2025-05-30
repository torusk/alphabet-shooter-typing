// ゲーム設定
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ゲーム状態
let gameState = {
  score: 0, // 文字数カウント
  level: 1,
  isGameOver: false,
  isPaused: false,
};

// アルファベット配列
let letters = [];
let particles = [];

// ゲーム設定値
const LETTER_SIZE = 80; // 大きなアルファベット
const LETTER_SPEED = 1;
const SPAWN_RATE = 0.015; // 少し遅めに調整

// カラフルな色配列
const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#85C1E9",
  "#D7BDE2",
];

// アルファベット配列
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// アルファベットクラス
class Letter {
  constructor(x, y, letter) {
    this.x = x;
    this.y = y;
    this.letter = letter;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.speed = LETTER_SPEED + (gameState.level - 1) * 0.3;
    this.size = LETTER_SIZE;
    this.glowIntensity = 0;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
  }

  update() {
    this.y += this.speed;
    this.glowIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    this.rotation += this.rotationSpeed;
  }

  draw() {
    ctx.save();

    // 移動と回転
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate(this.rotation);

    // グロー効果
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 * this.glowIntensity;

    // 大きなアルファベット
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 0, 0);

    // 白いアウトライン
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeText(this.letter, 0, 0);

    ctx.restore();
  }

  isOffScreen() {
    return this.y > canvas.height + this.size;
  }

  // 当たり判定用の境界取得
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.size,
      height: this.size,
    };
  }
}

// パーティクルクラス（爆発エフェクト用）
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.color = color;
    this.life = 1.0;
    this.decay = 0.02;
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // 重力
    this.life -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

// アルファベット生成
function spawnLetter() {
  if (Math.random() < SPAWN_RATE + gameState.level * 0.003) {
    const x = Math.random() * (canvas.width - LETTER_SIZE);
    const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    letters.push(new Letter(x, -LETTER_SIZE, letter));
  }
}

// パーティクル生成
function createExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// アルファベット破壊
function destroyLetter(index) {
  const letter = letters[index];
  createExplosion(
    letter.x + letter.size / 2,
    letter.y + letter.size / 2,
    letter.color
  );

  // 文字数カウント加算
  gameState.score += 1;

  // アルファベット削除
  letters.splice(index, 1);

  // レベルアップチェック（30文字ごと）
  if (gameState.score > 0 && gameState.score % 30 === 0) {
    gameState.level++;
    updateUI();
  }
}

// キーボード入力処理
document.addEventListener("keydown", (event) => {
  if (gameState.isGameOver) return;

  const key = event.key.toUpperCase();

  // アルファベットキーの場合
  if (key.match(/[A-Z]/)) {
    // 対応するアルファベットを探す（一番下にあるもの）
    let targetIndex = -1;
    let lowestY = -1;

    for (let i = 0; i < letters.length; i++) {
      if (letters[i].letter === key && letters[i].y > lowestY) {
        targetIndex = i;
        lowestY = letters[i].y;
      }
    }

    if (targetIndex !== -1) {
      destroyLetter(targetIndex);
    }
  }
});

// UI更新
function updateUI() {
  document.getElementById("score").textContent = gameState.score;
  document.getElementById("level").textContent = gameState.level;
}

// ゲームオーバー
function gameOver() {
  gameState.isGameOver = true;
  document.getElementById("finalScore").textContent = gameState.score;
  document.getElementById("gameOver").style.display = "block";
}

// ゲーム再開
function restartGame() {
  gameState = {
    score: 0, // 文字数カウント
    level: 1,
    isGameOver: false,
    isPaused: false,
  };

  letters = [];
  particles = [];

  document.getElementById("gameOver").style.display = "none";
  updateUI();
}

// 背景描画
function drawBackground() {
  // グラデーション背景
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(0.5, "#16213e");
  gradient.addColorStop(1, "#0f3460");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 星の背景
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 50; i++) {
    const x = (i * 137.5) % canvas.width;
    const y = (i * 73.3) % canvas.height;
    const opacity = Math.sin(Date.now() * 0.001 + i) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// メインゲームループ
function gameLoop() {
  if (gameState.isGameOver) return;

  // 画面クリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景描画
  drawBackground();

  // アルファベット生成
  spawnLetter();

  // アルファベット更新・描画
  for (let i = letters.length - 1; i >= 0; i--) {
    const letter = letters[i];
    letter.update();
    letter.draw();

    // 画面外に出たアルファベットの処理（1回でもゲームオーバー）
    if (letter.isOffScreen()) {
      letters.splice(i, 1);
      gameOver();
      return;
    }
  }

  // パーティクル更新・描画
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.update();
    particle.draw();

    if (particle.isDead()) {
      particles.splice(i, 1);
    }
  }

  requestAnimationFrame(gameLoop);
}

// ゲーム初期化
function initGame() {
  updateUI();
  gameLoop();
}

// ゲーム開始
initGame();
