const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ігри
const games = [
    { id: "book_of_ra", name: "Book of Ra" },
    { id: "lucky_lady", name: "Lucky Lady's Charm" }
];

// --- PRNG з seed ---
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getTimeSeed(interval = 5000) {
    return Math.floor(Date.now() / interval);
}

// --- Фаза гри ---
function getRandomPhase(seed) {
    const isGreen = seededRandom(seed) < 0.5;
    if (isGreen) {
        return { type: 'normal', color: '#00c107', duration: Math.floor(seededRandom(seed+1)*600)+180, minRTP: 60, maxRTP: 95 };
    } else {
        return { type: 'normal', color: '#ff6666', duration: Math.floor(seededRandom(seed+2)*600)+120, minRTP: 10, maxRTP: 45 };
    }
}

function formatCurrency(amount){
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

// --- Стани ігор ---
const states = {};
games.forEach((game, idx) => {
    const prices = [];
    let lastPrice = 50;
    for(let i=0;i<50;i++){
        let seed = i + idx*1000 + getTimeSeed();
        lastPrice = Math.max(20, Math.min(95, lastPrice + seededRandom(seed)*10 - 5));
        prices.push(lastPrice);
    }
    states[game.id] = {
        prices,
        maxPoints: 50,
        currentPhase: getRandomPhase(idx),
        phaseStartTime: Date.now(),
        longestStreakValue: 9,
        bonusProbabilityValue: 5,
        lastBigWinTime: '--',
        activePlayersValue: 0,
        lastJackpotTime: formatCurrency(Math.floor(Math.random()*(200000-50000)+50000)),
        lastJackpotUpdate: Date.now()
    };
});

// --- Оновлення станів ---
setInterval(()=>{
    games.forEach((game, idx)=>{
        const state = states[game.id];
        const now = Date.now();

        // Фаза
        if ((now - state.phaseStartTime)/1000 >= state.currentPhase.duration){
            state.currentPhase = getRandomPhase(idx);
            state.phaseStartTime = now;
        }

        // Нове значення RTP
        const lastPrice = state.prices[state.prices.length-1] || 50;
        let minRTP,maxRTP;
        if (state.currentPhase.color === '#00c107'){
            minRTP = 50; maxRTP = state.currentPhase.maxRTP;
        } else {
            minRTP = state.currentPhase.minRTP; maxRTP = 49.99;
        }
        const range = maxRTP - minRTP;
        const newPrice = Math.max(minRTP, Math.min(maxRTP, lastPrice + seededRandom(getTimeSeed()+idx*1000)*range - range/2));
        state.prices.push(newPrice);
        if(state.prices.length>state.maxPoints) state.prices.shift();

        // Бонуси
        const seed = getTimeSeed() + idx*1000;
        if(state.currentPhase.color === '#00c107'){
            if(seededRandom(seed+1)<0.15){
                state.longestStreakValue = 5;
                state.bonusProbabilityValue = 5.0;
                state.lastBigWinTime = formatCurrency(Math.floor(seededRandom(seed+2)*8000)+1000);
            } else {
                state.longestStreakValue = Math.floor(seededRandom(seed+3)*(15-5+1))+5;
                state.bonusProbabilityValue = Math.min(100,state.bonusProbabilityValue+0.5);
            }
        } else {
            if(seededRandom(seed+4)<0.02){
                state.longestStreakValue = 5;
                state.bonusProbabilityValue = 5.0;
                state.lastBigWinTime = formatCurrency(Math.floor(seededRandom(seed+5)*300)+50);
            } else {
                state.longestStreakValue = Math.floor(seededRandom(seed+6)*(50-25+1))+25;
                state.bonusProbabilityValue = Math.min(100,state.bonusProbabilityValue+0.5);
            }
        }

        state.activePlayersValue = Math.floor(seededRandom(seed+7)*2000)+1000;

        if(now - state.lastJackpotUpdate >= 3600000){
            state.lastJackpotTime = formatCurrency(Math.floor(Math.random()*(200000-50000+1))+50000);
            state.lastJackpotUpdate = now;
        }
    });
},5000);

// --- API ---
app.get('/game/:id',(req,res)=>{
    const gameId = req.params.id;
    const state = states[gameId];
    if(!state) return res.status(404).json({error:'Game not found'});

    const totalRTP = state.prices.reduce((s,p)=>s+p,0);
    const averageRTP = totalRTP/state.prices.length;
    const currentRTP = state.prices[state.prices.length-1];
    const rtpRange = Math.max(...state.prices)-Math.min(...state.prices);

    let volatilityText;
    if(rtpRange>50) volatilityText='Критична';
    else if(rtpRange>25) volatilityText='Висока';
    else if(rtpRange>10) volatilityText='Середня';
    else volatilityText='Низька';

    res.json({
        prices: state.prices,
        currentPhase: state.currentPhase,
        longestStreakValue: state.longestStreakValue,
        bonusProbabilityValue: state.bonusProbabilityValue,
        lastBigWinTime: state.lastBigWinTime,
        activePlayersValue: state.activePlayersValue,
        lastJackpotTime: state.lastJackpotTime,
        currentRTP,
        averageRTP,
        volatility: volatilityText
    });
});

app.listen(PORT,()=>console.log(`✅ Server running at http://localhost:${PORT}`));
