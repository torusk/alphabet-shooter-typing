/**
 * ゲーム初期化とグローバル変数
 */
// Canvas要素とコンテキストを取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ゲーム状態管理オブジェクト
let gameState = {
  score: 0, // 撃ち落とした文字数
  isGameOver: false, // ゲームオーバー状態
  isPaused: false, // ポーズ状態（現在未使用）
  highScore: localStorage.getItem("alphabetShooterHighScore") || 0, // ハイスコア
  soundEnabled: localStorage.getItem("alphabetShooterSoundEnabled") !== "false", // 音声オン・オフ状態
};

/**
 * 音響効果システム
 * Web Audio APIを使用してリアルタイムで効果音を生成
 */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

/**
 * 基本的な効果音を生成する関数
 * @param {number} frequency - 周波数（Hz）
 * @param {number} duration - 持続時間（秒）
 * @param {string} type - 波形タイプ（sine, square, sawtooth, triangle）
 */
function playSound(frequency, duration, type = "sine") {
  // 音声がオフの場合は再生しない
  if (!gameState.soundEnabled) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // オーディオノードを接続
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // 音の設定
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = type;

  // 音量の設定（フェードアウト効果付き）
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + duration
  );

  // 音の再生
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

/**
 * アルファベット撃破時の効果音
 */
function playHitSound() {
  playSound(800, 0.1, "square");
}

/**
 * ゲームオーバー時の効果音
 */
function playGameOverSound() {
  playSound(200, 0.5, "sawtooth");
}

/**
 * レベルアップ時の効果音（3段階の音程）
 */
function playLevelUpSound() {
  playSound(1000, 0.3, "sine");
  setTimeout(() => playSound(1200, 0.3, "sine"), 100);
  setTimeout(() => playSound(1400, 0.3, "sine"), 200);
}

/**
 * ゲーム要素の配列
 */
let letters = []; // 降ってくるアルファベットの配列
let particles = []; // パーティクルエフェクトの配列

/**
 * ゲーム設定定数
 */
const LETTER_SIZE = 80; // アルファベットのサイズ（ピクセル）
const LETTER_SPEED = 1; // 基本の降下速度
const SPAWN_RATE = 0.015; // アルファベット生成確率（フレームあたり）

/**
 * カラフルな色配列（アルファベットの色に使用）
 */
const COLORS = [
  "#FF6B6B", // 赤
  "#4ECDC4", // ターコイズ
  "#45B7D1", // 青
  "#96CEB4", // 緑
  "#FFEAA7", // 黄
  "#DDA0DD", // 紫
  "#98D8C8", // ミント
  "#F7DC6F", // ゴールド
  "#BB8FCE", // ラベンダー
  "#85C1E9", // スカイブルー
  "#F8C471", // オレンジ
  "#82E0AA", // ライトグリーン
  "#F1948A", // ピンク
  "#85C1E9", // ライトブルー
  "#D7BDE2", // ライトパープル
];

/**
 * アルファベット配列（A-Z）
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * アルファベット文字クラス
 * 降ってくる各アルファベットの状態と描画を管理
 */
class Letter {
  /**
   * @param {number} x - 初期X座標
   * @param {number} y - 初期Y座標
   * @param {string} letter - 表示する文字
   */
  constructor(x, y, letter) {
    this.x = x; // X座標
    this.y = y; // Y座標
    this.letter = letter; // 表示文字
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)]; // ランダムな色
    this.speed = LETTER_SPEED + Math.floor(gameState.score / 30) * 0.3; // 動的速度調整
    this.size = LETTER_SIZE; // サイズ
    this.glowIntensity = 0; // グロー強度
    this.rotation = 0; // 回転角度
    this.rotationSpeed = (Math.random() - 0.5) * 0.02; // 回転速度
  }

  /**
   * フレームごとの更新処理
   * 位置、回転、グロー効果を更新
   */
  update() {
    this.y += this.speed; // 下方向に移動
    this.rotation += this.rotationSpeed; // 回転更新
    this.glowIntensity = Math.sin(Date.now() * 0.005) * 0.5 + 0.5; // グロー強度の波動
  }

  /**
   * 文字の描画処理
   * 3D効果とグロー効果を含む
   */
  draw() {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2); // 中心を基準に移動
    ctx.rotate(this.rotation); // 回転適用

    // グロー効果の設定
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 + this.glowIntensity * 10;

    // 3D効果のための影を描画
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.font = `bold ${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 3, 3); // 影の位置

    // メインの文字を描画
    ctx.fillStyle = this.color;
    ctx.fillText(this.letter, 0, 0);

    ctx.restore();
  }

  /**
   * 画面外に出たかどうかを判定
   * @returns {boolean} 画面外に出た場合true
   */
  isOffScreen() {
    return this.y > canvas.height;
  }

  /**
   * 当たり判定用の境界を取得
   * @returns {Object} x, y, width, heightを含むオブジェクト
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.size,
      height: this.size,
    };
  }

  /**
   * 文字が削除対象かどうかを判定
   * @returns {boolean} 削除対象の場合true
   */
  isDead() {
    return this.isOffScreen();
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

/**
 * アルファベット生成処理
 * スコアに応じて生成確率が上昇
 */
function spawnLetter() {
  // スコアベースの動的生成確率
  const dynamicSpawnRate =
    SPAWN_RATE + Math.floor(gameState.score / 30) * 0.003;

  if (Math.random() < dynamicSpawnRate) {
    const x = Math.random() * (canvas.width - LETTER_SIZE); // ランダムなX座標
    const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; // ランダムな文字
    letters.push(new Letter(x, -LETTER_SIZE, letter));
  }
}

/**
 * パーティクルエフェクト生成
 * @param {number} x - 爆発の中心X座標
 * @param {number} y - 爆発の中心Y座標
 * @param {string} color - パーティクルの色
 */
function createExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x, // 初期X座標
      y: y, // 初期Y座標
      vx: (Math.random() - 0.5) * 10, // X方向の速度
      vy: (Math.random() - 0.5) * 10, // Y方向の速度
      color: color, // パーティクルの色
      life: 1, // 生存時間（1.0から開始）
      decay: 0.02, // 減衰率
    });
  }
}

/**
 * 文字を破壊する処理
 * スコア更新、エフェクト生成、サウンド再生を行う
 * @param {number} index - 破壊する文字の配列インデックス
 */
function destroyLetter(index) {
  const letter = letters[index];

  // スコア更新
  gameState.score++;

  // エフェクト生成
  createExplosion(
    letter.x + letter.size / 2,
    letter.y + letter.size / 2,
    letter.color
  );

  // サウンド再生
  playHitSound();
  playLevelUpSound();

  // 文字を配列から削除
  letters.splice(index, 1);

  // UI更新
  updateUI();
}

/**
 * キーボードイベントハンドラー
 * ゲーム中の文字入力とゲームオーバー時のリスタートを処理
 */
document.addEventListener("keydown", (e) => {
  // ゲームオーバー時のEnterキーでリスタート
  if (gameState.isGameOver && e.key === "Enter") {
    restartGame();
    return;
  }

  // ゲームオーバー中は他のキー入力を無視
  if (gameState.isGameOver) return;

  // 入力されたキーを大文字に変換
  const key = e.key.toUpperCase();

  // 降ってくる文字の中から一致するものを探して破壊
  for (let i = letters.length - 1; i >= 0; i--) {
    if (letters[i].letter === key) {
      destroyLetter(i);
      break; // 最初に見つかった文字のみ破壊
    }
  }
});

/**
 * UI更新処理
 * スコアとハイスコアの表示を更新
 */
function updateUI() {
  // スコア表示を更新
  document.getElementById("score").textContent = gameState.score;

  // ハイスコアが更新された場合は保存
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("alphabetShooterHighScore", gameState.highScore);
  }

  // ハイスコア表示を更新
  document.getElementById("highScore").textContent = gameState.highScore;

  // 音声ボタンの表示を更新
  updateSoundButton();
}

/**
 * 音声のオン・オフを切り替える関数
 */
function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  localStorage.setItem("alphabetShooterSoundEnabled", gameState.soundEnabled);
  updateSoundButton();
}

/**
 * 音声ボタンの表示を更新する関数
 */
function updateSoundButton() {
  const soundButton = document.getElementById("soundToggle");
  if (soundButton) {
    soundButton.textContent = gameState.soundEnabled
      ? "🔊 音声ON"
      : "🔇 音声OFF";
  }
}

/**
 * ゲームオーバー処理
 * ゲーム状態を停止し、結果画面を表示
 */
function gameOver() {
  gameState.isGameOver = true;

  // ハイスコア更新チェック
  let isNewHighScore = false;
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("alphabetShooterHighScore", gameState.highScore);
    isNewHighScore = true;
  }

  // 効果音再生
  playGameOverSound();

  document.getElementById("finalScore").textContent = gameState.score;
  document.getElementById("finalHighScore").textContent = gameState.highScore;

  // ハイスコア表示の更新
  const newRecordElement = document.getElementById("newRecord");
  if (isNewHighScore) {
    newRecordElement.style.display = "block";
  } else {
    newRecordElement.style.display = "none";
  }

  document.getElementById("gameOver").style.display = "block";

  // Twitter共有リンクを生成
  const shareText = isNewHighScore
    ? `アルファベット シューティング タイピングゲームで新記録${gameState.score}文字を達成！`
    : `アルファベット シューティング タイピングゲームで${gameState.score}文字撃ち落としました！`;
  const shareUrl = encodeURIComponent(window.location.href);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${shareUrl}`;
  document.getElementById("shareBtn").href = twitterUrl;
}

/**
 * ゲーム再開処理
 * ゲーム状態をリセットして新しいゲームを開始
 */
function restartGame() {
  // ゲーム状態をリセット（ハイスコアは保持）
  gameState = {
    score: 0, // 文字数カウント
    isGameOver: false,
    isPaused: false,
    highScore: gameState.highScore, // ハイスコアは保持
  };

  // ゲーム要素をクリア
  letters = [];
  particles = [];

  // UI要素を更新
  document.getElementById("gameOver").style.display = "none";
  updateUI();

  // ゲームループを再開
  gameLoop();
}

/**
 * 背景描画処理
 * グラデーション背景と星のエフェクトを描画
 */
function drawBackground() {
  // グラデーション背景の作成
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a1a2e"); // 上部：濃い紫
  gradient.addColorStop(0.5, "#16213e"); // 中央：青紫
  gradient.addColorStop(1, "#0f3460"); // 下部：濃い青

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 星のエフェクト描画
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  for (let i = 0; i < 50; i++) {
    // 疑似ランダムな位置計算
    const x = (i * 137.5) % canvas.width;
    const y = (i * 73.3) % canvas.height;
    const size = Math.sin(Date.now() * 0.001 + i) * 1 + 1; // 点滅効果

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * メインゲームループ
 * ゲームの更新と描画を毎フレーム実行
 */
function gameLoop() {
  // ゲームオーバー時はループを停止
  if (gameState.isGameOver) return;

  // 背景描画
  drawBackground();

  // 新しいアルファベットを生成
  spawnLetter();

  // 全てのアルファベットを更新・描画
  for (let i = letters.length - 1; i >= 0; i--) {
    letters[i].update();
    letters[i].draw();

    // 画面外に出たらゲームオーバー
    if (letters[i].isOffScreen()) {
      gameOver();
      return;
    }
  }

  // 全てのパーティクルを更新・描画
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    // パーティクルの位置と生存時間を更新
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= particle.decay;

    // 生存時間が終了したパーティクルを削除
    if (particle.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // パーティクルを描画（透明度は生存時間に比例）
    ctx.save();
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 次のフレームをスケジュール
  requestAnimationFrame(gameLoop);
}

/**
 * ゲーム初期化処理
 * UIを更新してゲームループを開始
 */
function initGame() {
  // ハイスコアを数値に変換
  gameState.highScore = parseInt(gameState.highScore) || 0;
  updateUI();
  gameLoop();
}

// ゲーム開始
initGame();
