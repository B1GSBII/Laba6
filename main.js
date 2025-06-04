let canvas, ctx, w, h;
let mousePos;
let balls = [];
let player = { x: 10, y: 10, width: 20, height: 20, color: 'red' };
let animationFrameId;
let currentLevel = 1;
let playerName = '';
let playerHealth = 100;
let ballsEaten = 0;
let levelCompleted = false;
let gameOver = false;

let ballSpeedMultiplier = 0.1;
const speedIncreaseStep = 0.005;
const speedIncreaseFrequency = 5;
let frameCounter = 0;

window.onload = function init() {
  canvas = document.querySelector("#myCanvas");
  canvas.width = 750; 
  canvas.height = 500;

  w = canvas.width;
  h = canvas.height;
  ctx = canvas.getContext('2d');
  canvas.addEventListener('mousemove', mouseMoved);
  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('stopButton').addEventListener('click', stopGame);
  displayResults();
};

function mouseMoved(evt) {
  mousePos = getMousePos(canvas, evt);
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  };
}

function movePlayerWithMouse() {
  if (mousePos !== undefined) {
    player.x = Math.max(0, Math.min(w - player.width, mousePos.x - player.width / 2));
    player.y = Math.max(0, Math.min(h - player.height, mousePos.y - player.height / 2));
  }
}

function readInputValues() {
  const numBalls = parseInt(document.getElementById('numBalls').value);
  const maxSpeed = parseInt(document.getElementById('maxSpeed').value);
  const minRadius = parseInt(document.getElementById('minRadius').value);
  const maxRadius = parseInt(document.getElementById('maxRadius').value);
  const playerSize = parseInt(document.getElementById('playerSize').value);
  const goodColor = document.getElementById('goodColor').value; 
  const initialHealth = parseInt(document.getElementById('initialHealth').value);
  const ballsToEat = parseInt(document.getElementById('ballsToEat').value);
  return { numBalls, maxSpeed, minRadius, maxRadius, playerSize, goodColor, initialHealth, ballsToEat };
}

function startGame() {
  readPlayerName();
  const { numBalls, maxSpeed, minRadius, maxRadius, playerSize, goodColor, initialHealth, ballsToEat } = readInputValues();
  const actualNumBalls = Math.max(numBalls, ballsToEat); 
  
  ballSpeedMultiplier = 0.1;
  frameCounter = 0;

  balls = createBalls(actualNumBalls, maxSpeed, minRadius, maxRadius, goodColor, ballsToEat);
  player.width = playerSize;
  player.height = playerSize;
  playerHealth = initialHealth;
  ballsEaten = 0;
  currentLevel = 1;
  levelCompleted = false;
  gameOver = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(mainLoop);
}

function stopGame() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    saveResults();
    displayResults();
  }
}

function readPlayerName() {
  playerName = document.getElementById('playerName').value || 'Гравець';
}

function saveResults() {
  const results = JSON.parse(localStorage.getItem('gameResults')) || [];
  results.push({ name: playerName, level: currentLevel, date: new Date().toLocaleString() });
  localStorage.setItem('gameResults', JSON.stringify(results));
}

function displayResults() {
  let results = JSON.parse(localStorage.getItem('gameResults')) || [];
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '<h3>Результати:</h3>';
  if (results.length === 0) {
    resultsDiv.innerHTML += '<p>Немає збережених результатів.</p>';
    return;
  }
  results = results.slice(-20);

  results.forEach(result => {
    const p = document.createElement('p');
    p.textContent = `${result.name} досяг рівня ${result.level} (${result.date})`;
    resultsDiv.appendChild(p);
  });
}

function mainLoop() {
  ctx.clearRect(0, 0, w, h);
  drawFilledRectangle(player);
  drawAllBalls(balls);
  drawNumberOfBallsAlive(); 
  drawCurrentLevel();
  drawPlayerHealth();
  movePlayerWithMouse();

  frameCounter++;
  if (ballSpeedMultiplier < 1 && frameCounter % speedIncreaseFrequency === 0 && !levelCompleted && playerHealth > 0 && !gameOver) {
    ballSpeedMultiplier = Math.min(1, ballSpeedMultiplier + speedIncreaseStep);
  }

  handleBallCollisions(); 

  moveAllBalls(balls); 

  const { numBalls, maxSpeed, minRadius, maxRadius, goodColor, ballsToEat } = readInputValues();

  if (playerHealth <= 0 && !gameOver) {
    gameOver = true;
    stopGame();
    drawGameOverScreen();
    return;
  }

  if (ballsEaten >= ballsToEat && !levelCompleted && !gameOver) {
    levelCompleted = true;
    
    ctx.save();
    ctx.font = "40px Arial";
    ctx.fillStyle = "gold";
    ctx.textAlign = "center";
    ctx.fillText("РІВЕНЬ ЗАВЕРШЕНО!", w / 2, h / 2);
    ctx.restore();

    setTimeout(() => {
      currentLevel++;
      const nextLevelNumBalls = numBalls + currentLevel - 1;
      
      ballSpeedMultiplier = 0.1;
      frameCounter = 0;

      balls = createBalls(nextLevelNumBalls, maxSpeed, minRadius, maxRadius, goodColor, ballsToEat);
      ballsEaten = 0;
      playerHealth = readInputValues().initialHealth;
      levelCompleted = false;
    }, 2000);
  }
  
  if (animationFrameId !== null) {
      animationFrameId = requestAnimationFrame(mainLoop);
  }
}

function handleBallCollisions() { 
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const b1 = balls[i];
      const b2 = balls[j];

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const sumRadii = b1.radius + b2.radius;

      if (distance < sumRadii) {
        const nx = dx / distance;
        const ny = dy / distance;

        const tx = -ny;
        const ty = nx;

        const dp_normal1 = b1.speedX * nx + b1.speedY * ny;
        const dp_tangent1 = b1.speedX * tx + b1.speedY * ty;
        const dp_normal2 = b2.speedX * nx + b2.speedY * ny;
        const dp_tangent2 = b2.speedX * tx + b2.speedY * ty;

        const new_dp_normal1 = dp_normal2;
        const new_dp_normal2 = dp_normal1;

        b1.speedX = new_dp_normal1 * nx + dp_tangent1 * tx;
        b1.speedY = new_dp_normal1 * ny + dp_tangent1 * ty;
        b2.speedX = new_dp_normal2 * nx + dp_tangent2 * tx;
        b2.speedY = new_dp_normal2 * ny + dp_tangent2 * ty;

        const overlap = sumRadii - distance;
        const separationX = overlap * nx / 2;
        const separationY = overlap * ny / 2;

        b1.x -= separationX;
        b1.y -= separationY;
        b2.x += separationX;
        b2.y += separationY;
      }
    }
  }
}

function drawGameOverScreen() {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.font = "60px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "center";
  ctx.fillText("ГРУ ЗАВЕРШЕНО!", w / 2, h / 2 - 30);
  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  ctx.fillText(`Ваш результат: Рівень ${currentLevel}`, w / 2, h / 2 + 20);
  ctx.restore();
}

function drawCurrentLevel() {
  ctx.save();
  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  ctx.fillText(`Рівень: ${currentLevel}`, 20, 60);
  ctx.restore();
}

function drawPlayerHealth() {
  ctx.save();
  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  ctx.fillText(`Здоров'я: ${playerHealth}`, 20, 90);
  ctx.restore();
}

function circRectsOverlap(x0, y0, w0, h0, cx, cy, r) {
  let testX = cx;
  let testY = cy;
  if (testX < x0) testX = x0;
  if (testX > (x0 + w0)) testX = (x0 + w0);
  if (testY < y0) testY = y0;
  if (testY > (y0 + h0)) testY = (y0 + h0);
  return (((cx - testX) * (cx - testX) + (cy - testY) * (cy - testY)) < r * r);
}

function createBalls(n, maxSpeed, minRadius, maxRadius, goodColor, ballsToEat) {
  const ballArray = [];
  const badColors = ['blue', 'cyan', 'purple', 'pink', 'yellow', 'red'].filter(c => c !== goodColor);

  for (let i = 0; i < ballsToEat; i++) {
    const radius = minRadius + (maxRadius - minRadius) * Math.random();
    const speedX = -maxSpeed + 2 * maxSpeed * Math.random();
    const speedY = -maxSpeed + 2 * maxSpeed * Math.random();

    const b = {
      x: Math.random() * (w - 2 * radius) + radius,
      y: Math.random() * (h - 2 * radius) + radius,
      radius: radius,
      speedX: speedX, 
      speedY: speedY, 
      color: goodColor,
      sizeChangeRate: 0.1 * Math.random(),
      isGood: true
    };
    ballArray.push(b);
  }

  for (let i = ballsToEat; i < n; i++) {
    const radius = minRadius + (maxRadius - minRadius) * Math.random();
    const randomColor = badColors[Math.floor(Math.random() * badColors.length)];
    const speedX = -maxSpeed + 2 * maxSpeed * Math.random();
    const speedY = -maxSpeed + 2 * maxSpeed * Math.random();

    const b = {
      x: Math.random() * (w - 2 * radius) + radius,
      y: Math.random() * (h - 2 * radius) + radius,
      radius: radius,
      speedX: speedX, 
      speedY: speedY, 
      color: randomColor,
      sizeChangeRate: 0.1 * Math.random(),
      isGood: false
    };
    ballArray.push(b);
  }
  return ballArray;
}

function drawNumberOfBallsAlive() {
  ctx.save();
  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  const { ballsToEat } = readInputValues();

  if (ballsEaten >= ballsToEat) {
    ctx.fillText("ВИ ПЕРЕМОГЛИ!", 20, 30);
  } else if (playerHealth <= 0) {
    ctx.fillText("ГРУ ЗАВЕРШЕНО!", 20, 30);
  } else {
    ctx.fillText(`Залишилось з'їсти: ${ballsToEat - ballsEaten}`, 20, 30);
  }
  ctx.restore();
}

function drawAllBalls(ballArray) {
  ballArray.forEach(function(b) {
    drawFilledCircle(b);
  });
}

function moveAllBalls(ballArray) {
  for (let i = ballArray.length - 1; i >= 0; i--) {
    let b = ballArray[i];
    b.x += b.speedX * ballSpeedMultiplier;
    b.y += b.speedY * ballSpeedMultiplier;
    b.radius += b.sizeChangeRate;
    const { minRadius, maxRadius } = readInputValues();
    if (b.radius > maxRadius || b.radius < minRadius) {
      b.sizeChangeRate *= -1;
    }
    testCollisionBallWithWalls(b);
    testCollisionWithPlayer(b, i);
  }
}

function testCollisionWithPlayer(b, index) {
  if (circRectsOverlap(player.x, player.y, player.width, player.height, b.x, b.y, b.radius)) {
    if (b.isGood) {
      ballsEaten++;
      balls.splice(index, 1);
    } else {
      playerHealth -= 10;
      balls.splice(index, 1);
      if (playerHealth <= 0) {
      }
    }
  }
}

function testCollisionBallWithWalls(b) {
  if ((b.x + b.radius) > w) {
    b.speedX = -b.speedX;
    b.x = w - b.radius;
  } else if ((b.x - b.radius) < 0) {
    b.speedX = -b.speedX;
    b.x = b.radius;
  }
  if ((b.y + b.radius) > h) {
    b.speedY = -b.speedY;
    b.y = h - b.radius;
  } else if ((b.y - b.radius) < 0) {
    b.speedY = -b.speedY;
    b.y = b.radius;
  }
}

function drawFilledRectangle(r) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.fillStyle = r.color;
  ctx.fillRect(0, 0, r.width, r.height);
  ctx.restore();
}

function drawFilledCircle(c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.arc(0, 0, c.radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
