// script.js

document.addEventListener('DOMContentLoaded', () => {

    const games = [
        { id: "book_of_ra", name: "Book of Ra" },
        { id: "lucky_lady", name: "Lucky Lady's Charm" }
    ];

    const gameSeeds = {
        "book_of_ra": 12345,
        "lucky_lady": 67890
    };

    const states = {};
    const modals = {};

    function seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function getRandomPhase(gameIndex, gameId) {
        const seed = gameIndex + gameSeeds[gameId];
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

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    }

    function transitionToNextPhase(gameId, gameIndex) {
        const state = states[gameId];
        state.currentPhase = getRandomPhase(gameIndex, gameId);
        state.phaseStartTime = Date.now();
    }

    // --- Ініціалізація станів ---
    games.forEach((game, gameIndex) => {
        states[game.id] = {
            prices: [],
            maxPoints: 50,
            currentPhase: getRandomPhase(gameIndex, game.id),
            phaseStartTime: Date.now(),
            longestStreakValue: 9,
            bonusProbabilityValue: 5.0,
            lastBigWinTime: '--',
            activePlayersValue: 0,
            lastJackpotTime: formatCurrency(Math.floor(Math.random() * (200000 - 50000 + 1)) + 50000),
            lastJackpotUpdate: Date.now()
        };

        // --- Підключення модальних вікон ---
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

    // --- Функція синхронізації графіка з сервером ---
    async function fetchServerData(gameId) {
        try {
            const res = await fetch(`/api/prices/${gameId}`);
            if (!res.ok) throw new Error("Server fetch error");
            const data = await res.json();
            states[gameId].prices = data.prices;
            states[gameId].phaseStartTime = data.phaseStartTime;
            states[gameId].currentPhase = data.currentPhase;
        } catch(e) {
            console.error(e);
        }
    }

    async function sendServerData(gameId) {
        try {
            await fetch(`/api/prices/${gameId}`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    prices: states[gameId].prices,
                    currentPhase: states[gameId].currentPhase,
                    phaseStartTime: states[gameId].phaseStartTime
                })
            });
        } catch(e) { console.error(e); }
    }

    // --- Малювання графіка ---
    function drawChart(gameId) {
        const canvas = document.getElementById(`tradingChart_${gameId}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const Dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(width * Dpr));
        canvas.height = Math.max(1, Math.floor(height * Dpr));
        ctx.setTransform(1,0,0,1,0,0);
        ctx.scale(Dpr,Dpr);

        const state = states[gameId];
        if (!state.prices.length) return;

        const minRTP = Math.min(...state.prices);
        const maxRTP = Math.max(...state.prices);
        const padding = (maxRTP - minRTP) * 0.1;
        const yMinDynamic = Math.max(0, minRTP - padding);
        const yMaxDynamic = Math.min(100, maxRTP + padding);
        const yRange = (yMaxDynamic - yMinDynamic) || 1;

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

        ctx.fillStyle = '#00ffffff';
        ctx.font = `10px sans-serif`;
        ctx.textAlign = 'left';
        const yLabels = [yMinDynamic, yMinDynamic + yRange*0.25, yMinDynamic + yRange*0.5, yMinDynamic + yRange*0.75, yMaxDynamic];
        yLabels.forEach(label => {
            const y = height - ((label - yMinDynamic)/yRange)*height;
            ctx.fillText(label.toFixed(0),10,y);
        });

        const xStep = width/(state.maxPoints-1);
        const gradient = ctx.createLinearGradient(0,0,0,height);
        const topShadowColor = (state.prices[state.prices.length-1]>=50)?'rgba(0,255,183,0.78)':'rgba(255,0,0,0.75)';
        gradient.addColorStop(0,topShadowColor);
        gradient.addColorStop(1,'rgba(28,28,28,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0,height);
        for (let i=0;i<state.prices.length;i++){
            const x = i*xStep;
            const y = height - ((state.prices[i]-yMinDynamic)/yRange)*height;
            ctx.lineTo(x,y);
        }
        ctx.lineTo(width,height);
        ctx.closePath();
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 100;
        for (let i=0;i<state.prices.length-1;i++){
            const x1 = i*xStep;
            const y1 = height - ((state.prices[i]-yMinDynamic)/yRange)*height;
            const x2 = (i+1)*xStep;
            const y2 = height - ((state.prices[i+1]-yMinDynamic)/yRange)*height;
            ctx.strokeStyle = (state.prices[i+1]>=50)?'#00ffe5ff':'#b90000ff';
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(x1,y1);
            ctx.lineTo(x2,y2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        const lastX = (state.prices.length-1)*xStep;
        const lastY = height - ((state.prices[state.prices.length-1]-yMinDynamic)/yRange)*height;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lastX,lastY,3,0,2*Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 13px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        let textX = lastX;
        let textY = lastY - 8;
        if (textX<20) textX=20;
        if (textX>width-20) textX=width-20;
        if (textY<20) textY=20;
        ctx.fillText(`${state.prices[state.prices.length-1].toFixed(1)}%`,textX,textY);
    }

    // --- Оновлення даних гри ---
    async function updateData(gameId, gameIndex) {
        const state = states[gameId];
        const now = Date.now();

        // --- Синхронізація з сервером ---
        await fetchServerData(gameId);

        const elapsedTime = (now - state.phaseStartTime)/1000;
        if (elapsedTime >= state.currentPhase.duration) {
            transitionToNextPhase(gameId, gameIndex);
        }

        const lastPrice = state.prices.length>0?state.prices[state.prices.length-1]:50;
        let minRTP,maxRTP;
        if (state.currentPhase.color === '#00c107'){
            minRTP = 50;
            maxRTP = state.currentPhase.maxRTP;
        } else {
            minRTP = state.currentPhase.minRTP;
            maxRTP = 49.99;
        }

        const range = maxRTP - minRTP;
        const seed = gameSeeds[gameId] + gameIndex * 1000;
        const volatilityFactor = seededRandom(seed) * range - (range/2); 
        const newPrice = lastPrice + volatilityFactor;
        const clampedPrice = Math.max(minRTP,Math.min(maxRTP,newPrice));
        state.prices.push(clampedPrice);
        if (state.prices.length>state.maxPoints) state.prices.shift();

        await sendServerData(gameId);

        drawChart(gameId);

        const container = document.getElementById(`tradingChart_${gameId}`).closest('.slot-item');
        const currentRTPElement = container.querySelector('.currentRTP');
        const averageRTPElement = container.querySelector('.averageRTP');
        const volatilityElement = container.querySelector('.volatility');

        const totalRTP = state.prices.reduce((sum,p)=>sum+p,0);
        const averageRTP = totalRTP/state.prices.length;
        const rtpRange = Math.max(...state.prices)-Math.min(...state.prices);

        let volatilityText;
        if (rtpRange>50) volatilityText='Критична';
        else if (rtpRange>25) volatilityText='Висока';
        else if (rtpRange>10) volatilityText='Середня';
        else volatilityText='Низька';

        currentRTPElement.textContent = `${state.prices[state.prices.length-1].toFixed(2)}%`;
        averageRTPElement.textContent = `${averageRTP.toFixed(2)}%`;
        volatilityElement.textContent = volatilityText;

        if (modals[gameId].modalElement.style.display === 'block') {
            updateModalData(gameId);
        }
    }

    function updateModalData(gameId){
        const state = states[gameId];
        const modal = modals[gameId];

        const currentRTP = state.prices[state.prices.length-1];
        const averageRTP = state.prices.reduce((sum,p)=>sum+p,0)/state.prices.length;
        const rtpRange = Math.max(...state.prices)-Math.min(...state.prices);

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

    games.forEach((game, index) => {
        updateData(game.id, index);
        setInterval(() => updateData(game.id, index), 5000);
    });

});
