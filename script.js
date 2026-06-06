// ====== DOM: MENU ======
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const btnMenuContinue = document.getElementById('btn-menu-continue');
const btnMenuDelete = document.getElementById('btn-menu-delete');
const btnMenuNew = document.getElementById('btn-menu-new');

// ====== GAME STATE ======
let deck = [];
let playerHands = [];
let dealerHand = [];
let activeHandIndex = 0;
let dealerScore = 0;
let wins = 0;
let losses = 0;
let pushes = 0;
let gameOver = true;
let hasDoubledDown = false;

// Betting State
let balance = 250;
let currentBet = 0;

// ====== DOM: GAME ======
const dealerCardsEl = document.getElementById('dealer-cards');
const playerCardsEl = document.getElementById('player-cards');
const dealerScoreEl = document.getElementById('dealer-score');
const gameMessageEl = document.getElementById('game-message');
const btnDeal = document.getElementById('btn-deal');
const btnHit = document.getElementById('btn-hit');
const btnStand = document.getElementById('btn-stand');
const btnSplit = document.getElementById('btn-split');
const btnDouble = document.getElementById('btn-double');
const winsCountEl = document.getElementById('wins-count');
const lossesCountEl = document.getElementById('losses-count');
const pushesCountEl = document.getElementById('pushes-count');

const balanceEl = document.getElementById('current-balance');
const currentBetEl = document.getElementById('current-bet');
const chipContainerBank = document.getElementById('chip-container-bank');
const chipContainerBet = document.getElementById('chip-container-bet');
const gameOverOverlay = document.getElementById('game-over-overlay');
const btnNewGame = document.getElementById('btn-new-game');

// ====== CARD DATA ======
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suitSymbols = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };

// ====== AUTO-SAVE ======
const SAVE_KEY = 'blackjack_save';

function saveGame() {
    const saveData = {
        deck,
        playerHands,
        dealerHand,
        activeHandIndex,
        wins,
        losses,
        pushes,
        gameOver,
        hasDoubledDown,
        balance,
        currentBet,
        // Save chip visual info for the bet area
        betChips: Array.from(chipContainerBet.querySelectorAll('.chip')).map(c => ({
            className: c.className,
            value: c.getAttribute('data-value'),
            text: c.querySelector('span').textContent
        }))
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
}

function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
        const s = JSON.parse(raw);
        deck = s.deck;
        playerHands = s.playerHands;
        dealerHand = s.dealerHand;
        activeHandIndex = s.activeHandIndex;
        wins = s.wins;
        losses = s.losses;
        pushes = s.pushes;
        gameOver = s.gameOver;
        hasDoubledDown = s.hasDoubledDown;
        balance = s.balance;
        currentBet = s.currentBet;

        // Restore bet chips visually
        chipContainerBet.innerHTML = '';
        (s.betChips || []).forEach(chip => {
            const el = document.createElement('div');
            el.className = chip.className;
            el.setAttribute('data-value', chip.value);
            el.innerHTML = `<span>${chip.text}</span>`;
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!gameOver) return;
                removeBet(el, parseInt(chip.value));
            });
            chipContainerBet.appendChild(el);
        });

        // Update stat displays
        winsCountEl.textContent = wins;
        lossesCountEl.textContent = losses;
        pushesCountEl.textContent = pushes;

        // Set button states
        btnDeal.disabled = currentBet === 0 || !gameOver;
        btnHit.disabled = gameOver;
        btnStand.disabled = gameOver;
        btnSplit.disabled = true;
        btnDouble.disabled = true;

        if (!gameOver) {
            checkSplitAvailability();
            checkDoubleAvailability();
        }

        renderHands();
        updateBetUI();
        return true;
    } catch (e) {
        console.error('Failed to load save:', e);
        localStorage.removeItem(SAVE_KEY);
        return false;
    }
}

function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}

// ====== MENU LOGIC ======
function showMenu() {
    mainMenu.classList.remove('hidden');
    gameScreen.classList.add('hidden');

    const saveExists = hasSave();
    btnMenuContinue.disabled = !saveExists;
    btnMenuDelete.disabled = !saveExists;
}

function showGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

btnMenuContinue.addEventListener('click', () => {
    showGame();
    loadGame();
});

btnMenuDelete.addEventListener('click', () => {
    clearSave();
    // Update button states without leaving the menu
    btnMenuContinue.disabled = true;
    btnMenuDelete.disabled = true;
});

btnMenuNew.addEventListener('click', () => {
    clearSave();
    showGame();
    fullReset();
});

// Auto-save whenever the user leaves the page
window.addEventListener('beforeunload', () => {
    saveGame();
});

// ====== INIT ======
function initGame() {
    btnDeal.addEventListener('click', startNewGame);
    btnHit.addEventListener('click', playerHit);
    btnStand.addEventListener('click', playerStand);
    btnSplit.addEventListener('click', splitHand);
    btnDouble.addEventListener('click', doubleDown);
    btnNewGame.addEventListener('click', () => {
        clearSave();
        gameOverOverlay.classList.add('hidden');
        showMenu();
    });

    const bankChips = chipContainerBank.querySelectorAll('.chip');
    bankChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (!gameOver && playerHands.length > 0) return;
            placeBet(parseInt(chip.getAttribute('data-value')), chip.className, chip.querySelector('span').textContent);
        });
    });

    // Show menu on load
    showMenu();
}

// ====== BETTING UI ======
function updateBetUI() {
    balanceEl.textContent = balance;
    currentBetEl.textContent = currentBet;
    btnDeal.disabled = currentBet === 0 || !gameOver;

    if (balance === 0 && currentBet === 0 && gameOver) {
        showGameOver();
    }
}

function showGameOver() {
    gameOverOverlay.classList.remove('hidden');
}

function fullReset() {
    balance = 250;
    currentBet = 0;
    wins = 0;
    losses = 0;
    pushes = 0;
    hasDoubledDown = false;
    deck = [];
    playerHands = [];
    dealerHand = [];
    activeHandIndex = 0;
    gameOver = true;
    winsCountEl.textContent = '0';
    lossesCountEl.textContent = '0';
    pushesCountEl.textContent = '0';
    chipContainerBet.innerHTML = '';
    gameOverOverlay.classList.add('hidden');
    dealerCardsEl.innerHTML = '';
    playerCardsEl.innerHTML = '';
    dealerScoreEl.textContent = '?';
    gameMessageEl.textContent = 'Place your bet and deal!';
    btnHit.disabled = true;
    btnStand.disabled = true;
    btnSplit.disabled = true;
    btnDouble.disabled = true;
    updateBetUI();
}

function placeBet(value, className, text) {
    if (balance >= value) {
        balance -= value;
        currentBet += value;

        const betChip = document.createElement('div');
        betChip.className = className;
        betChip.innerHTML = `<span>${text}</span>`;
        betChip.setAttribute('data-value', value);

        betChip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!gameOver && playerHands.length > 0) return;
            removeBet(betChip, value);
        });

        chipContainerBet.appendChild(betChip);
        updateBetUI();
    }
}

function removeBet(chipElement, value) {
    balance += value;
    currentBet -= value;
    chipElement.remove();
    updateBetUI();
}

// ====== DECK ======
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            let weight = parseInt(value);
            if (value === 'J' || value === 'Q' || value === 'K') weight = 10;
            if (value === 'A') weight = 11;
            deck.push({ value, suit, weight });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// ====== GAME LOGIC ======
function startNewGame() {
    if (currentBet === 0) return;

    createDeck();
    shuffleDeck();

    playerHands = [{
        cards: [deck.pop(), deck.pop()],
        status: 'active',
        bet: currentBet
    }];
    activeHandIndex = 0;
    dealerHand = [deck.pop(), deck.pop()];
    hasDoubledDown = false;

    gameOver = false;

    btnDeal.disabled = true;
    btnHit.disabled = false;
    btnStand.disabled = false;
    btnSplit.disabled = true;
    btnDouble.disabled = true;

    renderHands();
    checkSplitAvailability();
    checkDoubleAvailability();

    if (!btnSplit.disabled && !btnDouble.disabled) {
        gameMessageEl.textContent = "Your turn! Hit, Stand, Split, or Double Down?";
    } else if (!btnSplit.disabled) {
        gameMessageEl.textContent = "Your turn! Hit, Stand, or Split?";
    } else if (!btnDouble.disabled) {
        gameMessageEl.textContent = "Your turn! Hit, Stand, or Double Down?";
    } else {
        gameMessageEl.textContent = "Your turn! Hit or Stand?";
    }

    checkInitialBlackjack();
}

function calculateScore(hand) {
    let score = 0;
    let aceCount = 0;
    for (let card of hand) {
        if (card.value === 'A') aceCount++;
        score += card.weight;
    }
    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }
    return score;
}

function createCardElement(card, hidden = false) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    if (hidden) {
        cardDiv.classList.add('card-hidden');
        return cardDiv;
    }
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    cardDiv.classList.add(isRed ? 'red' : 'black');
    const symbol = suitSymbols[card.suit];
    cardDiv.innerHTML = `
        <div class="top-left"><span class="value">${card.value}</span><span class="suit">${symbol}</span></div>
        <div class="center-suit">${symbol}</div>
        <div class="bottom-right"><span class="value">${card.value}</span><span class="suit">${symbol}</span></div>
    `;
    return cardDiv;
}

function renderHands() {
    dealerCardsEl.innerHTML = '';
    playerCardsEl.innerHTML = '';

    playerHands.forEach((hand, index) => {
        const handScore = calculateScore(hand.cards);

        const handDiv = document.createElement('div');
        handDiv.className = 'hand-container';
        if (index === activeHandIndex && !gameOver) {
            handDiv.classList.add('active-hand');
        }

        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'hand-score';
        scoreDiv.textContent = `Hand ${index + 1}: ${handScore} ${hand.status !== 'active' ? `(${hand.status.toUpperCase()})` : ''}`;

        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'cards-container';
        hand.cards.forEach(card => cardsDiv.appendChild(createCardElement(card)));

        handDiv.appendChild(scoreDiv);
        handDiv.appendChild(cardsDiv);
        playerCardsEl.appendChild(handDiv);
    });

    dealerScore = calculateScore(dealerHand);
    if (gameOver) {
        dealerScoreEl.textContent = dealerScore || '?';
        dealerHand.forEach(card => dealerCardsEl.appendChild(createCardElement(card)));
    } else {
        dealerScoreEl.textContent = "?";
        dealerCardsEl.appendChild(createCardElement(dealerHand[0]));
        dealerCardsEl.appendChild(createCardElement(dealerHand[1], true));
    }
}

function checkSplitAvailability() {
    if (gameOver || activeHandIndex >= playerHands.length) {
        btnSplit.disabled = true;
        return;
    }
    const activeHand = playerHands[activeHandIndex];
    if (activeHand.cards.length === 2 &&
        activeHand.cards[0].value === activeHand.cards[1].value &&
        balance >= activeHand.bet) {
        btnSplit.disabled = false;
    } else {
        btnSplit.disabled = true;
    }
}

function checkDoubleAvailability() {
    if (gameOver || hasDoubledDown || activeHandIndex >= playerHands.length) {
        btnDouble.disabled = true;
        return;
    }
    const activeHand = playerHands[activeHandIndex];
    if (activeHand.cards.length === 2 && balance >= activeHand.bet) {
        btnDouble.disabled = false;
    } else {
        btnDouble.disabled = true;
    }
}

function splitHand() {
    const activeHand = playerHands[activeHandIndex];
    balance -= activeHand.bet;
    updateBetUI();

    const card1 = activeHand.cards[0];
    const card2 = activeHand.cards[1];

    const newHand1 = { cards: [card1, deck.pop()], status: 'active', bet: activeHand.bet };
    const newHand2 = { cards: [card2, deck.pop()], status: 'active', bet: activeHand.bet };

    playerHands.splice(activeHandIndex, 1, newHand1, newHand2);

    renderHands();
    checkSplitAvailability();
    checkDoubleAvailability();
}

function checkInitialBlackjack() {
    if (playerHands.length === 1) {
        const pScore = calculateScore(playerHands[0].cards);
        const dScore = calculateScore(dealerHand);

        if (pScore === 21 && dScore === 21) {
            playerHands[0].status = 'push';
            processRoundOver("Double Blackjack! It's a Push.");
        } else if (pScore === 21) {
            playerHands[0].status = 'blackjack';
            processRoundOver("Blackjack! Player Wins 3:2!");
        } else if (dScore === 21) {
            playerHands[0].status = 'loss';
            processRoundOver("Dealer Blackjack! Dealer Wins.");
        }
    }
}

function playerHit() {
    btnDouble.disabled = true;
    const hand = playerHands[activeHandIndex];
    hand.cards.push(deck.pop());
    renderHands();

    if (calculateScore(hand.cards) > 21) {
        hand.status = 'busted';
        moveToNextHand();
    } else {
        checkSplitAvailability();
    }
}

function doubleDown() {
    if (hasDoubledDown) return;

    const hand = playerHands[activeHandIndex];
    balance -= hand.bet;
    hand.bet *= 2;
    hasDoubledDown = true;
    btnDouble.disabled = true;
    btnSplit.disabled = true;

    // Visually clone bet chips to show doubled bet
    const existingChips = Array.from(chipContainerBet.querySelectorAll('.chip'));
    existingChips.forEach(chip => {
        const clone = chip.cloneNode(true);
        const value = parseInt(clone.getAttribute('data-value'));
        clone.addEventListener('contextmenu', (e) => e.preventDefault());
        chipContainerBet.appendChild(clone);
        currentBet += value;
    });

    hand.cards.push(deck.pop());
    renderHands();
    updateBetUI();

    if (calculateScore(hand.cards) > 21) {
        hand.status = 'busted';
        moveToNextHand();
    } else {
        playerStand();
    }
}

function playerStand() {
    playerHands[activeHandIndex].status = 'stood';
    moveToNextHand();
}

function moveToNextHand() {
    if (activeHandIndex < playerHands.length - 1) {
        activeHandIndex++;
        renderHands();
        checkSplitAvailability();
        checkDoubleAvailability();
    } else {
        playDealerTurn();
    }
}

function playDealerTurn() {
    btnHit.disabled = true;
    btnStand.disabled = true;
    btnSplit.disabled = true;
    btnDouble.disabled = true;
    btnDeal.disabled = true;

    const allBusted = playerHands.every(h => h.status === 'busted');

    if (!allBusted) {
        while (calculateScore(dealerHand) < 17) {
            dealerHand.push(deck.pop());
        }
    }

    renderHands();
    determineWinners();
}

function determineWinners() {
    const dScore = calculateScore(dealerHand);
    let totalWon = 0;

    playerHands.forEach(hand => {
        if (hand.status === 'blackjack') {
            totalWon += (hand.bet * 2.5);
            wins++;
        } else if (hand.status === 'busted') {
            losses++;
        } else {
            const hScore = calculateScore(hand.cards);
            if (dScore > 21 || hScore > dScore) {
                totalWon += (hand.bet * 2);
                wins++;
                hand.status = 'win';
            } else if (dScore > hScore) {
                losses++;
                hand.status = 'loss';
            } else {
                totalWon += hand.bet;
                pushes++;
                hand.status = 'push';
            }
        }
    });

    balance += totalWon;
    winsCountEl.textContent = wins;
    lossesCountEl.textContent = losses;
    pushesCountEl.textContent = pushes;

    setTimeout(() => {
        gameOver = true;
        currentBet = 0;
        chipContainerBet.innerHTML = '';

        gameMessageEl.textContent = `Round Over! Winnings: $${totalWon}. Place your bet!`;

        updateBetUI();
        renderHands();
    }, 1000);
}

function processRoundOver(message) {
    btnHit.disabled = true;
    btnStand.disabled = true;
    btnSplit.disabled = true;
    btnDouble.disabled = true;
    btnDeal.disabled = true;

    gameMessageEl.textContent = message;

    setTimeout(() => {
        determineWinners();
    }, 1000);
}

// ====== START ======
initGame();
