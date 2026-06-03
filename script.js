// Game State
let deck = [];
let playerHand = [];
let dealerHand = [];
let playerScore = 0;
let dealerScore = 0;
let wins = 0;
let losses = 0;
let pushes = 0;
let gameOver = true;

// Betting State
let balance = 250;
let currentBet = 0;

// DOM Elements
const dealerCardsEl = document.getElementById('dealer-cards');
const playerCardsEl = document.getElementById('player-cards');
const dealerScoreEl = document.getElementById('dealer-score');
const playerScoreEl = document.getElementById('player-score');
const gameMessageEl = document.getElementById('game-message');
const btnDeal = document.getElementById('btn-deal');
const btnHit = document.getElementById('btn-hit');
const btnStand = document.getElementById('btn-stand');
const winsCountEl = document.getElementById('wins-count');
const lossesCountEl = document.getElementById('losses-count');
const pushesCountEl = document.getElementById('pushes-count');

// Betting DOM Elements
const balanceEl = document.getElementById('current-balance');
const currentBetEl = document.getElementById('current-bet');
const chipContainerBank = document.getElementById('chip-container-bank');
const chipContainerBet = document.getElementById('chip-container-bet');
const gameOverOverlay = document.getElementById('game-over-overlay');
const btnNewGame = document.getElementById('btn-new-game');

// Card values and suits
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suitSymbols = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };

// Initialize Game
function initGame() {
    btnDeal.addEventListener('click', startNewGame);
    btnHit.addEventListener('click', playerHit);
    btnStand.addEventListener('click', playerStand);
    btnNewGame.addEventListener('click', resetFullGame);
    
    // Add event listeners to bank chips (Left Click to Bet)
    const bankChips = chipContainerBank.querySelectorAll('.chip');
    bankChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (!gameOver && playerHand.length > 0) return; // Can't bet mid-game
            placeBet(parseInt(chip.getAttribute('data-value')), chip.className, chip.querySelector('span').textContent);
        });
    });
}

function updateBetUI() {
    balanceEl.textContent = balance;
    currentBetEl.textContent = currentBet;
    
    // Enable Deal if game is over AND they have a bet placed (including from last round)
    btnDeal.disabled = currentBet === 0 || !gameOver;
    
    if (balance === 0 && currentBet === 0 && gameOver) {
        showGameOver();
    }
}

function showGameOver() {
    gameOverOverlay.classList.remove('hidden');
}

function resetFullGame() {
    balance = 250;
    currentBet = 0;
    wins = 0;
    losses = 0;
    pushes = 0;
    winsCountEl.textContent = '0';
    lossesCountEl.textContent = '0';
    pushesCountEl.textContent = '0';
    chipContainerBet.innerHTML = '';
    gameOverOverlay.classList.add('hidden');
    gameMessageEl.textContent = 'Place your bet and deal!';
    updateBetUI();
}

function placeBet(value, className, text) {
    if (balance >= value) {
        balance -= value;
        currentBet += value;
        
        // Add chip to bet area
        const betChip = document.createElement('div');
        betChip.className = className;
        betChip.innerHTML = `<span>${text}</span>`;
        betChip.setAttribute('data-value', value);
        
        // Right Click to Remove Bet
        betChip.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default right-click menu
            if (!gameOver && playerHand.length > 0) return; // Can't remove bet mid-game
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

// Create a new deck of 52 cards
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

function startNewGame() {
    if (currentBet === 0) return;
    
    createDeck();
    shuffleDeck();
    
    playerHand = [deck.pop(), deck.pop()];
    dealerHand = [deck.pop(), deck.pop()];
    
    gameOver = false;
    
    btnDeal.disabled = true;
    btnHit.disabled = false;
    btnStand.disabled = false;
    
    gameMessageEl.textContent = "Your turn! Hit or Stand?";
    
    renderHands();
    checkBlackjack();
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
    
    playerScore = calculateScore(playerHand);
    playerScoreEl.textContent = playerScore;
    playerHand.forEach(card => playerCardsEl.appendChild(createCardElement(card)));
    
    dealerScore = calculateScore(dealerHand);
    if (gameOver) {
        dealerScoreEl.textContent = dealerScore;
        dealerHand.forEach(card => dealerCardsEl.appendChild(createCardElement(card)));
    } else {
        dealerScoreEl.textContent = "?";
        dealerCardsEl.appendChild(createCardElement(dealerHand[0]));
        dealerCardsEl.appendChild(createCardElement(dealerHand[1], true));
    }
}

function playerHit() {
    playerHand.push(deck.pop());
    renderHands();
    if (calculateScore(playerHand) > 21) endGame("Player Busts! Dealer Wins.", "loss");
}

function playerStand() {
    gameOver = true;
    btnHit.disabled = true;
    btnStand.disabled = true;
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(deck.pop());
    }
    renderHands();
    determineWinner();
}

function checkBlackjack() {
    playerScore = calculateScore(playerHand);
    dealerScore = calculateScore(dealerHand);
    
    if (playerScore === 21 && dealerScore === 21) {
        renderHands();
        endGame("Double Blackjack! It's a Push.", "push");
    } else if (playerScore === 21) {
        renderHands();
        endGame("Blackjack! Player Wins 3:2!", "blackjack");
    } else if (dealerScore === 21) {
        renderHands();
        endGame("Dealer Blackjack! Dealer Wins.", "loss");
    }
}

function determineWinner() {
    const pScore = calculateScore(playerHand);
    const dScore = calculateScore(dealerHand);
    
    if (dScore > 21) endGame("Dealer Busts! Player Wins!", "win");
    else if (pScore > dScore) endGame("Player Wins!", "win");
    else if (dScore > pScore) endGame("Dealer Wins!", "loss");
    else endGame("It's a Push!", "push");
}

function endGame(message, result) {
    gameOver = true;
    gameMessageEl.textContent = message;
    
    // Disable deal button immediately while we show the result
    btnHit.disabled = true;
    btnStand.disabled = true;
    btnDeal.disabled = true; 
    
    // Delay the payout and UI reset so the user sees the final cards
    setTimeout(() => {
        if (result === "win") {
            wins++;
            winsCountEl.textContent = wins;
            balance += (currentBet * 2); // Original bet + 1x winnings back to bank
        } else if (result === "blackjack") {
            wins++;
            winsCountEl.textContent = wins;
            balance += (currentBet * 2.5); // Original bet + 1.5x winnings back to bank
        } else if (result === "loss") {
            losses++;
            lossesCountEl.textContent = losses;
            // Bet is already deducted from balance, so nothing to add
        } else if (result === "push") {
            pushes++;
            pushesCountEl.textContent = pushes;
            balance += currentBet; // Original bet back to bank
        }
        
        // Always clear the table after a hand
        currentBet = 0;
        chipContainerBet.innerHTML = '';
        
        // updateBetUI will run, Deal button will be disabled until a new bet is placed
        updateBetUI();
    }, 1000);
}

// Start
initGame();
updateBetUI();
