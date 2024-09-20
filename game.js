const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('startMenu');
const endScreen = document.getElementById('endScreen');
const startButton = document.getElementById('startButton');
const retryButton = document.getElementById('retryButton');
const finalTimeSpan = document.getElementById('finalTime');
const finalMushroomsSpan = document.getElementById('finalMushrooms');
const shareButton = document.getElementById('shareButton');

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
let startTime;
let gameLoop;
let mushroomsCollected = 0;
let lastItemDistance = 0;
let gameSpeed = 3;
const maxGameSpeed = 5;
let finalTime;
let finalMushrooms;
let gameActive = false;

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

const backgroundImg = new Image();
backgroundImg.src = 'background.png';

const groundImg = new Image();
groundImg.src = 'ground.png';

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

function startGame() {
    startMenu.style.opacity = 0;
    setTimeout(() => startMenu.style.display = 'none', 500);
    endScreen.style.display = 'none';
    score = 0;
    mushroomsCollected = 0;
    items.length = 0;
    lastItemDistance = 0;
    gameSpeed = 3;
    player.y = 400;
    player.jumping = false;
    startTime = Date.now();
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
    gameActive = true;
    requestAnimationFrame(update);
}

function endGame() {
    gameActive = false;
    backgroundMusic.pause();
    deathSound.play();
    finalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    finalMushrooms = mushroomsCollected;
    endScreen.style.display = 'block';
    endScreen.style.opacity = 1;
    finalTimeSpan.textContent = finalTime + ' seconds';
    finalMushroomsSpan.textContent = finalMushrooms;
}

function update() {
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
            if (collision(player, items[i])) {
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
        collectSound.play();
    }

    if (gameSpeed < maxGameSpeed) {
        gameSpeed += 0.001;
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Comic Sans MS';
    ctx.fillText(`Mushrooms: ${mushroomsCollected}`, 20, 40);
    ctx.fillText(`Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`, 20, 80);

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

function handleJump() {
    if (gameActive && player.y === 400) {
        player.jumping = true;
        jumpSound.currentTime = 0;
        jumpSound.play();
    }
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        handleJump();
    }
});

canvas.addEventListener('click', handleJump);
canvas.addEventListener('touchstart', handleJump);

startButton.addEventListener('click', startGame);
retryButton.addEventListener('click', startGame);

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