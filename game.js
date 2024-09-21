const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('startMenu');
const endScreen = document.getElementById('endScreen');
const startButton = document.getElementById('startButton');
const retryButton = document.getElementById('retryButton');
const finalTimeSpan = document.getElementById('finalTime');
const finalMushroomsSpan = document.getElementById('finalMushrooms');
const shareButton = document.getElementById('shareButton');
const leaderboardButton = document.getElementById('leaderboardButton');
const leaderboardButton2 = document.getElementById('leaderboardButton2');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardList = document.getElementById('leaderboardList');
const closeLeaderboardButton = document.getElementById('closeLeaderboardButton');
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const submitUsernameButton = document.getElementById('submitUsername');

const shareCanvas = document.getElementById('shareCanvas');
const shareCtx = shareCanvas.getContext('2d');

const player = {
    x: 100,
    y: 400,
    width: 60,
    height: 60,
    jumping: false,
    jumpHeight: 160,
    jumpSpeed: 5,
    breatheIntensity: 0.03,
    breatheProgress: 0
};

const items = [];
let score = 0;
let gameStartTime;
let gamePausedTime = 0;
let lastPauseStartTime;
let mushroomsCollected = 0;
let lastItemDistance = 0;
let gameSpeed = 3;
const maxGameSpeed = 5;
let finalTime;
let finalMushrooms;
let gameActive = false;
let lastUpdateTime;
let lastJumpTime = 0;
const jumpCooldown = 500;
let currentGameTime = 0;

const playerImg = new Image();
playerImg.src = 'melvin.png';

const mushroomImgs = [
    'mushroom_red.png',
    'mushroom_green.png',
    'mushroom_orange.png',
    'mushroom_pink.png'
].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

const obstacleImg = new Image();
obstacleImg.src = 'obstacle.png';
let obstacleCollisionMask;

const backgroundImg = new Image();
backgroundImg.src = 'background.png';

const groundImg = new Image();
groundImg.src = 'ground.png';

const muteImg = new Image();
muteImg.src = 'mute.png';

const unmuteImg = new Image();
unmuteImg.src = 'unmute.png';

let backgroundLoaded = false;
backgroundImg.onload = () => {
    backgroundLoaded = true;
};

const backgroundMusic = new Audio('background_music.mp3');
backgroundMusic.loop = true;
const jumpSound = new Audio('jump.mp3');
jumpSound.volume = 0.6;
const collectSound = new Audio('nom.mp3');
const deathSound = new Audio('gameover.mp3');

let mushroomChainCount = 0;
const maxMushroomChain = 3;

let backgroundX = 0;
let groundX = 0;

let isMuted = false;

function generateCollisionMask(img) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    const mask = new Array(img.height).fill().map(() => new Array(img.width).fill(false));
    
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const alpha = imageData.data[(y * img.width + x) * 4 + 3];
            if (alpha > 0) {
                mask[y][x] = true;
            }
        }
    }
    return mask;
}

obstacleImg.onload = () => {
    obstacleCollisionMask = generateCollisionMask(obstacleImg);
};

function startGame() {
    startMenu.style.opacity = 0;
    setTimeout(() => startMenu.style.display = 'none', 500);
    endScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    score = 0;
    mushroomsCollected = 0;
    items.length = 0;
    lastItemDistance = 0;
    gameSpeed = 3;
    player.y = 400;
    player.jumping = false;
    gameStartTime = performance.now();
    lastUpdateTime = gameStartTime;
    gamePausedTime = 0;
    lastPauseStartTime = null;
    lastJumpTime = 0;
    currentGameTime = 0;
    if (!isMuted) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
    }
    gameActive = true;
    requestAnimationFrame(update);
}

function endGame() {
    gameActive = false;
    backgroundMusic.pause();
    if (!isMuted) {
        deathSound.play();
    }
    finalTime = currentGameTime.toFixed(2);
    finalMushrooms = mushroomsCollected;
    endScreen.style.display = 'block';
    finalTimeSpan.textContent = finalTime + ' seconds';
    finalMushroomsSpan.textContent = finalMushrooms;

    const username = localStorage.getItem('username');
    if (username) {
        saveScore(username, finalMushrooms, parseFloat(finalTime));
    } else {
        showUsernameModal();
    }
}

function update(currentTime) {
    if (!gameActive) return;

    if (lastPauseStartTime) {
        gamePausedTime += currentTime - lastPauseStartTime;
        lastPauseStartTime = null;
    }

    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    if (deltaTime > 0.1) {
        lastPauseStartTime = currentTime;
        requestAnimationFrame(update);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    backgroundX -= gameSpeed;
    if (backgroundX <= -canvas.width) backgroundX = 0;

    groundX -= gameSpeed;
    if (groundX <= -canvas.width) groundX = 0;

    if (backgroundLoaded) {
        ctx.drawImage(backgroundImg, backgroundX, 0, canvas.width + 1, canvas.height);
        ctx.drawImage(backgroundImg, backgroundX + canvas.width, 0, canvas.width + 1, canvas.height);
    }

    ctx.drawImage(groundImg, groundX, 450, canvas.width + 1, 50);
    ctx.drawImage(groundImg, groundX + canvas.width, 450, canvas.width + 1, 50);

    if (player.jumping) {
        player.y -= player.jumpSpeed;
        if (player.y <= 400 - player.jumpHeight) {
            player.jumping = false;
        }
    } else if (player.y < 400) {
        player.y += player.jumpSpeed;
    }

    player.breatheProgress += 0.05;
    const breatheScale = 1 + Math.sin(player.breatheProgress) * player.breatheIntensity;

    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.scale(1, breatheScale);
    ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    if (lastItemDistance > 300) {
        if (mushroomChainCount < maxMushroomChain && Math.random() < 0.7) {
            const sizeVariation = Math.random() * 0.2 + 0.9;
            items.push({
                type: 'mushroom',
                image: mushroomImgs[Math.floor(Math.random() * mushroomImgs.length)],
                x: canvas.width,
                y: 400,
                width: 50 * sizeVariation,
                height: 50 * sizeVariation
            });
            mushroomChainCount++;
        } else {
            items.push({
                type: 'obstacle',
                image: obstacleImg,
                x: canvas.width,
                y: 400,
                width: 50,
                height: 50
            });
            mushroomChainCount = 0;
        }
        lastItemDistance = 0;
    }
    lastItemDistance += gameSpeed;

    let mushroomsCollectedThisFrame = 0;

    for (let i = items.length - 1; i >= 0; i--) {
        items[i].x -= gameSpeed;
        if (items[i].type === 'mushroom') {
            ctx.drawImage(items[i].image, items[i].x, items[i].y, items[i].width, items[i].height);
            if (collision(player, items[i])) {
                items.splice(i, 1);
                mushroomsCollectedThisFrame++;
                continue;
            }
        } else {
            ctx.drawImage(items[i].image, items[i].x, items[i].y, items[i].width, items[i].height);
            if (preciseCollision(player, items[i])) {
                endGame();
                return;
            }
        }
        if (items[i].x + items[i].width < 0) {
            items.splice(i, 1);
        }
    }

    if (mushroomsCollectedThisFrame > 0) {
        mushroomsCollected += mushroomsCollectedThisFrame;
        if (!isMuted) {
            collectSound.play();
        }
    }

    if (gameSpeed < maxGameSpeed) {
        gameSpeed += 0.001;
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Comic Sans MS';
    ctx.fillText(`Mushrooms: ${mushroomsCollected}`, 20, 40);
    currentGameTime = Math.max(0, (currentTime - gameStartTime - gamePausedTime) / 1000);
    ctx.fillText(`Time: ${currentGameTime.toFixed(2)}s`, 20, 80);

    ctx.drawImage(isMuted ? muteImg : unmuteImg, canvas.width - 60, 20, 40, 40);

    requestAnimationFrame(update);
}

function collision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}
// Improved precision on hitboxes
function preciseCollision(player, obstacle) {
    if (!collision(player, obstacle)) return false;

    const scaleX = obstacleCollisionMask[0].length / obstacle.width;
    const scaleY = obstacleCollisionMask.length / obstacle.height;

    for (let y = 0; y < player.height; y++) {
        for (let x = 0; x < player.width; x++) {
            const playerX = Math.floor(player.x + x - obstacle.x);
            const playerY = Math.floor(player.y + y - obstacle.y);
            
            if (playerX >= 0 && playerX < obstacle.width && playerY >= 0 && playerY < obstacle.height) {
                const maskX = Math.floor(playerX * scaleX);
                const maskY = Math.floor(playerY * scaleY);
                
                if (obstacleCollisionMask[maskY] && obstacleCollisionMask[maskY][maskX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function handleJump(event) {
    event.preventDefault();
    const currentTime = performance.now();
    if (gameActive && player.y === 400 && currentTime - lastJumpTime >= jumpCooldown) {
        player.jumping = true;
        if (!isMuted) {
            jumpSound.currentTime = 0;
            jumpSound.play();
        }
        lastJumpTime = currentTime;
    }
}

function toggleMute(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x >= canvas.width - 60 && x <= canvas.width - 20 && y >= 20 && y <= 60) {
        isMuted = !isMuted;
        if (isMuted) {
            backgroundMusic.pause();
        } else if (gameActive) {
            backgroundMusic.play();
        }
    }
}

function saveScore(username, score, time) {
    fetch('leaderboard.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            score: score,
            time: time
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
        } else {
            console.error('Error saving score:', data.error);
        }
    })
    .catch((error) => {
        console.error('Network error:', error);
    });
}

function showLeaderboard() {
    fetch('leaderboard.php')
    .then(response => response.json())
    .then(data => {
        leaderboardList.innerHTML = '';
        if (Array.isArray(data)) {
            data.forEach((entry, index) => {
                const li = document.createElement('li');
                const formattedTime = Number(entry.time) ? Number(entry.time).toFixed(2) : entry.time;
                li.textContent = `${index + 1}. ${entry.username}: ${entry.score} mushrooms in ${formattedTime}s`;
                leaderboardList.appendChild(li);
            });
        } else if (data.error) {
            console.error('Error loading leaderboard:', data.error);
            leaderboardList.innerHTML = '<li>Error loading leaderboard. Please try again later.</li>';
        }
        leaderboardScreen.style.display = 'block';
    })
    .catch((error) => {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = '<li>Error loading leaderboard. Please try again later.</li>';
        leaderboardScreen.style.display = 'block';
    });
}

function showUsernameModal() {
    usernameModal.style.display = 'block';
    endScreen.style.display = 'none';
}

function hideUsernameModal() {
    usernameModal.style.display = 'none';
    endScreen.style.display = 'block';
}

// Event listeners
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        handleJump(event);
    }
});

canvas.addEventListener('mousedown', (event) => {
    handleJump(event);
    toggleMute(event);
});
canvas.addEventListener('touchstart', handleJump);

startButton.addEventListener('click', startGame);
retryButton.addEventListener('click', startGame);
leaderboardButton.addEventListener('click', showLeaderboard);
leaderboardButton2.addEventListener('click', showLeaderboard);
closeLeaderboardButton.addEventListener('click', () => {
    leaderboardScreen.style.display = 'none';
});

submitUsernameButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        localStorage.setItem('username', username);
        saveScore(username, finalMushrooms, parseFloat(finalTime));
        hideUsernameModal();
    } else {
        console.error('Please enter a valid username.');
    }
});

shareButton.addEventListener('click', () => {
    const bannerWidth = 600;
    const bannerHeight = 300;

    const backgroundImage = new Image();
    backgroundImage.src = 'banner.png';
    backgroundImage.onload = () => {
        shareCtx.clearRect(0, 0, bannerWidth, bannerHeight);
        shareCtx.drawImage(backgroundImage, 0, 0, bannerWidth, bannerHeight);
        shareCtx.fillStyle = '#fff';
        shareCtx.font = 'bold 28px Comic Sans MS';

        const text1 = `I ate ${finalMushrooms} mushrooms`;
        const text2 = `and survived for ${finalTime} seconds!`;

        const text1Width = shareCtx.measureText(text1).width;
        const text2Width = shareCtx.measureText(text2).width;

        const text1X = (bannerWidth - text1Width) / 2;
        const text2X = (bannerWidth - text2Width) / 2;

        const text1Y = (bannerHeight / 2) - 20;
        const text2Y = (bannerHeight / 2) + 20;
        shareCtx.fillText(text1, text1X, text1Y);
        shareCtx.fillText(text2, text2X, text2Y);

        shareCanvas.toBlob((blob) => {
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
                alert('Score copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy image: ', err);
            });
        });
    };

    backgroundImage.onerror = () => {
        console.error('Failed to load background image.');
    };
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        lastPauseStartTime = performance.now();
        backgroundMusic.pause();
    } else {
        if (lastPauseStartTime) {
            gamePausedTime += performance.now() - lastPauseStartTime;
            lastPauseStartTime = null;
        }
        if (gameActive && !isMuted) {
            backgroundMusic.play();
        }
    }
});

window.onload = () => {
};