// Цей код запускається, коли вся HTML-структура сторінки завантажена.
document.addEventListener('DOMContentLoaded', () => {

    // Ігри беруться з games.js
    const games = [
        { id: "book_of_ra", name: "Book of Ra" },
        { id: "lucky_lady", name: "Lucky Lady's Charm" }
    ];

    // --- Додаємо фіксовані seed для кожної гри ---
    const gameSeeds = {
        "book_of_ra": 12345,
        "lucky_lady": 67890
    };

    // Стани для кожної гри
    const states = {};

    // Елементи DOM для модалів кожної гри
    const modals = {};

    // --- PRNG з seed ---
    function seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // --- Генерація випадкової фази ---
    function getRandomPhase(seed) {
        const isGreen = seededRandom(seed) < 0.5;
        if (isGreen) {
            return {
                type: 'normal',
                color: '#00c107',
                duration: Math.floor(seededRandom(seed + 1) * 600) + 180,
                minRTP: 60,
                maxRTP: 95
            };
        } else {
            return {
                type: 'normal',
                color: '#ff6666',
                duration: Math.floor(seededRandom(seed + 2) * 600) + 120,
                minRTP: 10,
                maxRTP: 45
            };
        }
    }

    // --- Отримання "синхронізованої" ціни графіка ---
    function getPriceAtTick(gameId, tickIndex) {
        const seedBase = gameSeeds[gameId];
        let lastPrice = 50;
        for (let i = 0; i <= tickIndex; i++) {
            const seed = seedBase + i;
            const phase = getRandomPhase(seed);
            const range = phase.maxRTP - phase.minRTP;
            const volatilityFactor = (seededRandom(seed) - 0.5) * range;
            lastPrice = Math.max(phase.minRTP, Math.min(phase.maxRTP, lastPrice + volatilityFactor));
        }
        return lastPrice;
    }

    // Ініціалізація станів
    games.forEach((game, gameIndex) => {
        states[game.id] = {
            maxPoints: 50,
            currentPhase: getRandomPhase(gameSeeds[game.id]),
            phaseStartTime: Date.now(),
            longestStreakValue: 9,
            bonusProbabilityValue: 5.0,
            lastBigWinTime: '--',
            activePlayersValue: 0,
            lastJackpotTime: formatCurrency(Math.floor(Math.random() * (200000 - 50000 + 1)) + 50000),
            lastJackpotUpdate: Date.now()
        };

        // Підключаємо елементи модальних вікон
        modals[game.id] = {
            currentRTPElement: document.getElementById(`modal_currentRTP_${game.id}`),
            averageRTPElement: document.getElementById(`modal_averageRTP_${game.id}`),
            volatilityElement: document.getElementById(`modal_volatility_${game.id}`),
            lastBigWinElement: document.getElementById(`lastBigWin_${game.id}`),
            booksFrequencyElement: document.getElementById(`booksFrequency_${game.id}`),
            longestStreakElement: document.getElementById(`longestStreak_${game.id}`),
            bonusProbabilityElement: document.getElementById(`bonusProbability_${game.id}`),
            activePlayersElement: document.getElementById(`activePlayers_${game.id}`),
            lastJackpotTimeElement: document.getElementById(`lastJackpotTime_${game.id}`),
            modalElement: document.getElementById(`modal_${game.id}`)
        };

        // Події для кнопок модального вікна
        const moreInfoBtn = document.querySelector(`.list_slots button[data-game="${game.id}"]`);
        if (moreInfoBtn) {
            moreInfoBtn.addEventListener('click', () => {
                modals[game.id].modalElement.style.display = 'block';
                updateModalData(game.id);
            });
        }

        const closeBtn = modals[game.id].modalElement.querySelector('.close-button');
        closeBtn.addEventListener('click', () => {
            modals[game.id].modalElement.style.display = 'none';
        });

        modals[game.id].modalElement.addEventListener('click', (e) => {
            if (e.target === modals[game.id].modalElement) {
                modals[game.id].modalElement.style.display = 'none';
            }
        });
    });

    // Форматування валюти
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Малювання графіка
    function drawChart(gameId) {
        const canvas = document.getElementById(`tradingChart_${gameId}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.clientWidth;
        let height = canvas.clientHeight;
        const Dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(width * Dpr));
        canvas.height = Math.max(1, Math.floor(height * Dpr));
        ctx.setTransform(1,0,0,1,0,0);
        ctx.scale(Dpr,Dpr);

        const state = states[gameId];
        const prices = [];
        const nowTick = Math.floor(Date.now() / 5000); // один tick = 5 сек

        for (let i = state.maxPoints - 1; i >= 0; i--) {
            prices.unshift(getPriceAtTick(gameId, nowTick - i));
        }

        const minRTP = Math.min(...prices);
        const maxRTP = Math.max(...prices);
        const padding = (maxRTP - minRTP) * 0.1;
        const yMinDynamic = Math.max(0, minRTP - padding);
        const yMaxDynamic = Math.min(100, maxRTP + padding);
        const yRange = (yMaxDynamic - yMinDynamic) || 1;

        // Фонова сітка
        ctx.clearRect(0,0,width,height);
        ctx.strokeStyle = 'rgba(0,255,247,0.2)';
        ctx.lineWidth = 0.5;
        const gridXStep = width / 10;
        const gridYStep = height / 5;
        for (let i=1;i<10;i++){
            ctx.beginPath();
            ctx.moveTo(i*gridXStep,0);
            ctx.lineTo(i*gridXStep,height);
            ctx.stroke();
        }
        for (let i=1;i<5;i++){
            ctx.beginPath();
            ctx.moveTo(0,i*gridYStep);
            ctx.lineTo(width,i*gridYStep);
            ctx.stroke();
        }

        // Осі
        ctx.strokeStyle = '#959595ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(5,0);
        ctx.lineTo(5,height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0,height-5);
        ctx.lineTo(width,height-5);
        ctx.stroke();

        // Мітки по осі Y
        ctx.fillStyle = '#00ffffff';
        ctx.font = `10px sans-serif`;
        ctx.textAlign = 'left';
        const yLabels = [yMinDynamic, yMinDynamic + yRange*0.25, yMinDynamic + yRange*0.5, yMinDynamic + yRange*0.75, yMaxDynamic];
        yLabels.forEach(label => {
            const y = height - ((label - yMinDynamic)/yRange)*height;
            ctx.fillText(label.toFixed(0),10,y);
        });

        // Градієнт під лінією
        const xStep = width/(prices.length-1);
        const gradient = ctx.createLinearGradient(0,0,0,height);
        const topShadowColor = (prices[prices.length-1]>=50)?'rgba(0,255,183,0.78)':'rgba(255,0,0,0.75)';
        gradient.addColorStop(0,topShadowColor);
        gradient.addColorStop(1,'rgba(28,28,28,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0,height);
        for (let i=0;i<prices.length;i++){
            const x = i*xStep;
            const y = height - ((prices[i]-yMinDynamic)/yRange)*height;
            ctx.lineTo(x,y);
        }
        ctx.lineTo(width,height);
        ctx.closePath();
        ctx.fill();

        // Лінія графіка
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 100;
        for (let i=0;i<prices.length-1;i++){
            const x1 = i*xStep;
            const y1 = height - ((prices[i]-yMinDynamic)/yRange)*height;
            const x2 = (i+1)*xStep;
            const y2 = height - ((prices[i+1]-yMinDynamic)/yRange)*height;
            ctx.strokeStyle = (prices[i+1]>=50)?'#00ffe5ff':'#b90000ff';
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(x1,y1);
            ctx.lineTo(x2,y2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Остання точка
        const lastX = (prices.length-1)*xStep;
        const lastY = height - ((prices[prices.length-1]-yMinDynamic)/yRange)*height;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lastX,lastY,3,0,2*Math.PI);
        ctx.fill();

        // Текст поточного RTP
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 13px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        let textX = lastX;
        let textY = lastY - 8;
        if (textX<20) textX=20;
        if (textX>width-20) textX=width-20;
        if (textY<20) textY=20;
        ctx.fillText(`${prices[prices.length-1].toFixed(1)}%`,textX,textY);

        return prices;
    }

    // --- Оновлення даних гри ---
    function updateData(gameId, gameIndex) {
        const state = states[gameId];
        const prices = drawChart(gameId);

        // Встановлюємо RTP і волатильність для DOM
        const container = document.getElementById(`tradingChart_${gameId}`).closest('.slot-item');
        const currentRTPElement = container.querySelector('.currentRTP');
        const averageRTPElement = container.querySelector('.averageRTP');
        const volatilityElement = container.querySelector('.volatility');

        const totalRTP = prices.reduce((sum,p)=>sum+p,0);
        const averageRTP = totalRTP/prices.length;
        const rtpRange = Math.max(...prices)-Math.min(...prices);

        let volatilityText;
        if (rtpRange>50) volatilityText='Критична';
        else if (rtpRange>25) volatilityText='Висока';
        else if (rtpRange>10) volatilityText='Середня';
        else volatilityText='Низька';

        currentRTPElement.textContent = `${prices[prices.length-1].toFixed(2)}%`;
        averageRTPElement.textContent = `${averageRTP.toFixed(2)}%`;
        volatilityElement.textContent = volatilityText;

        // Модальне вікно
        if (modals[gameId].modalElement.style.display === 'block') {
            updateModalData(gameId, prices);
        }
    }

    // --- Оновлення модального вікна ---
    function updateModalData(gameId, prices){
        const state = states[gameId];
        const modal = modals[gameId];

        const currentRTP = prices[prices.length-1];
        const averageRTP = prices.reduce((sum,p)=>sum+p,0)/prices.length;
        const rtpRange = Math.max(...prices)-Math.min(...prices);

        let volatilityText;
        if (rtpRange>50) volatilityText='Критична';
        else if (rtpRange>25) volatilityText='Висока';
        else if (rtpRange>10) volatilityText='Середня';
        else volatilityText='Низька';

        modal.currentRTPElement.textContent = `${currentRTP.toFixed(2)}%`;
        modal.averageRTPElement.textContent = `${averageRTP.toFixed(2)}%`;
        modal.volatilityElement.textContent = volatilityText;
        modal.lastBigWinElement.textContent = state.lastBigWinTime;
        modal.booksFrequencyElement.textContent = `${(Math.random()*(25-5)+5).toFixed(1)}%`;
        modal.longestStreakElement.textContent = state.longestStreakValue;
        modal.bonusProbabilityElement.textContent = `${state.bonusProbabilityValue.toFixed(1)}%`;
        modal.activePlayersElement.textContent = state.activePlayersValue;
        modal.lastJackpotTimeElement.textContent = state.lastJackpotTime;
    }

    // --- Запуск оновлення ---
    games.forEach((game, index) => {
        updateData(game.id, index);
        setInterval(() => updateData(game.id, index), 1000); // кожну секунду
    });

});
