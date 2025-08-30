const games = [
  { id: "book_of_ra", name: "Book of Ra", img: "/img/book_of_ra.jpg" },
  { id: "lucky_lady", name: "Lucky Lady's Charm", img: "/img/lady.jpg" },
  // ...додай всі інші ігри сюди
];

const container = document.querySelector('.box_list_slots');

let gamesPerPage = 10; // скільки ігор показувати за раз
let currentIndex = 0; // з якого індексу починати

function renderGames() {
    const slice = games.slice(currentIndex, currentIndex + gamesPerPage);
    slice.forEach(game => {
        const gameDiv = document.createElement('div');
        gameDiv.classList.add('list_slots');

        gameDiv.innerHTML = `
          <div class="list_slots_img_button">
            <img src="${game.img}" alt="">
            <button class="more_info" data-game="${game.id}">More information</button>
          </div>
          <div class="slot-item">
            <div class="slot-info">
              <div class="slot-name">${game.name}</div>
              <div class="slot-details">Поточний RTP: <span class="currentRTP">--</span></div>
              <div class="slot-details">Середній RTP: <span class="averageRTP">--</span></div>
              <div class="slot-details">Волатильність: <span class="volatility">--</span></div>
            </div>
            <div class="chart-container">
              <canvas id="tradingChart_${game.id}"></canvas>
            </div>
          </div>
        `;
        container.appendChild(gameDiv);

        // Створюємо модальне вікно для цієї гри
        const modalHtml = `
          <div id="modal_${game.id}" class="modal-overlay" style="display:none;">
            <div class="modal-content">
              <span class="close-button" data-game="${game.id}">&times;</span>
              <h2>Детальна інформація про ${game.name}</h2>
              <div class="additional-stats-container">
                <div class="slot-details">Поточний RTP: <span id="modal_currentRTP_${game.id}">--</span></div>
                <div class="slot-details">Середній RTP: <span id="modal_averageRTP_${game.id}">--</span></div>
                <div class="slot-details">Волатильність: <span id="modal_volatility_${game.id}">--</span></div>
                <div class="additional-stat-item"><span class="label">Останній великий виграш</span><span id="lastBigWin_${game.id}" class="value">--</span></div>
                <div class="additional-stat-item"><span class="label">Частота випадіння «Книг»</span><span id="booksFrequency_${game.id}" class="value">--</span></div>
                <div class="additional-stat-item"><span class="label">Найбільша серія без бонуса</span><span id="longestStreak_${game.id}" class="value">--</span></div>
                <div class="additional-stat-item"><span class="label">Ймовірність бонус-гри</span><span id="bonusProbability_${game.id}" class="value">--</span></div>
                <div class="additional-stat-item"><span class="label">Активних гравців</span><span id="activePlayers_${game.id}" class="value">--</span></div>
                <div class="additional-stat-item"><span class="label">Останній джекпот</span><span id="lastJackpotTime_${game.id}" class="value">--</span></div>
                <button class="play_button">Play now</button>
                <p class="text_spin_and_win">Spin the wheel — win $100!</p>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    });

    currentIndex += gamesPerPage;

    // ховаємо кнопку, якщо всі ігри показані
    if(currentIndex >= games.length) {
        document.getElementById('loadMoreBtn').style.display = 'none';
    }
}

// Додаємо кнопку “Показати ще” під контейнером
const loadMoreBtn = document.createElement('button');
loadMoreBtn.id = 'loadMoreBtn';
loadMoreBtn.textContent = 'Показати ще';
loadMoreBtn.addEventListener('click', renderGames);
container.after(loadMoreBtn);

// Перший рендер
renderGames();