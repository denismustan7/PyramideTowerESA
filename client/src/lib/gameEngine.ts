import type { Card, CardValue, Suit, GameState, PyramidNode, ScoreBreakdown } from '@shared/schema';
import { 
  canPlayCard, 
  CARD_VALUES, 
  BASE_POINTS, 
  TOWER_BONUS, 
  PERFECT_BONUS, 
  TIME_BONUS_MULTIPLIER,
  BASE_TIME,
  TIME_DECREASE_PER_LEVEL,
  getRank
} from '@shared/schema';

// Generate a full deck of 52 cards
function generateDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const value of CARD_VALUES) {
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
        isFaceUp: false,
        isPlayable: false
      });
    }
  }
  
  return deck;
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck: Card[], seed?: number): Card[] {
  const shuffled = [...deck];
  let random = seed ? seededRandom(seed) : Math.random;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Simple seeded random for deterministic shuffles
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Create the tri-peaks pyramid structure
// Standard tri-peaks layout:
// Peak 0:       [0]
//            [1]   [2]
//         [3]  [4]  [5]
// Peak 1:       [6]
//            [7]   [8]
//         [9] [10] [11]
// Peak 2:       [12]
//            [13]  [14]
//        [15] [16] [17]
// Bottom row (shared): [18] [19] [20] [21] [22] [23] [24] [25] [26] [27]
// Total: 28 cards on the board

function createPyramids(cards: Card[]): PyramidNode[][] {
  const pyramids: PyramidNode[][] = [[], [], []];
  let cardIndex = 0;
  
  // Create three peaks (rows 0-3 for each)
  for (let peakIndex = 0; peakIndex < 3; peakIndex++) {
    // Each peak has 4 rows: 1, 2, 3, 4 cards
    // But the bottom row is shared across peaks
    
    // Row 0 (peak): 1 card
    pyramids[peakIndex].push({
      card: cards[cardIndex++],
      row: 0,
      col: 0,
      peakIndex,
      coveredBy: [] // Will be filled after all nodes created
    });
    
    // Row 1: 2 cards
    for (let col = 0; col < 2; col++) {
      pyramids[peakIndex].push({
        card: cards[cardIndex++],
        row: 1,
        col,
        peakIndex,
        coveredBy: []
      });
    }
    
    // Row 2: 3 cards
    for (let col = 0; col < 3; col++) {
      pyramids[peakIndex].push({
        card: cards[cardIndex++],
        row: 2,
        col,
        peakIndex,
        coveredBy: []
      });
    }
  }
  
  // Bottom row (row 3): 10 cards shared across all peaks
  // These are the only initially playable cards
  for (let col = 0; col < 10; col++) {
    const peakIndex = col < 3 ? 0 : (col < 7 ? 1 : 2);
    pyramids[peakIndex].push({
      card: cards[cardIndex++],
      row: 3,
      col,
      peakIndex,
      coveredBy: []
    });
  }
  
  // Set up coverage relationships and initial states
  for (let peakIndex = 0; peakIndex < 3; peakIndex++) {
    const peak = pyramids[peakIndex];
    
    // Mark bottom row cards as face-up and playable
    peak.forEach(node => {
      if (node.row === 3 && node.card) {
        node.card.isFaceUp = true;
        node.card.isPlayable = true;
      }
    });
    
    // Set coveredBy for upper rows
    // Row 0 is covered by row 1 cards
    // Row 1 is covered by row 2 cards
    // Row 2 is covered by row 3 cards
    peak.forEach(node => {
      if (node.row < 3) {
        // Find cards that cover this one (in the row below)
        const coveringCards = peak.filter(n => 
          n.row === node.row + 1 && 
          (n.col === node.col || n.col === node.col + 1)
        );
        node.coveredBy = coveringCards
          .filter(n => n.card)
          .map(n => n.card!.id);
      }
    });
  }
  
  return pyramids;
}

// Initialize a new game
export function initGame(level: number = 1, seed?: number): GameState {
  const deck = generateDeck();
  const shuffled = shuffleDeck(deck, seed);
  
  // First 28 cards go to the pyramids
  const pyramidCards = shuffled.slice(0, 28);
  const pyramids = createPyramids(pyramidCards);
  
  // Next card goes to discard pile (face up)
  const discardCard = shuffled[28];
  discardCard.isFaceUp = true;
  
  // Remaining cards are the draw pile
  const drawPile = shuffled.slice(29);
  
  // Calculate time based on level
  const totalTime = Math.max(30, BASE_TIME - (level - 1) * TIME_DECREASE_PER_LEVEL);
  
  return {
    pyramids,
    drawPile,
    discardPile: [discardCard],
    score: 0,
    combo: 0,
    maxCombo: 0,
    level,
    timeRemaining: totalTime,
    totalTime,
    towersCleared: 0,
    phase: 'playing',
    cardsRemaining: 28
  };
}

// Initialize a new game with a specific seed (for multiplayer)
export function initGameWithSeed(level: number, seed: number): GameState {
  return initGame(level, seed);
}

// Get all playable cards from pyramids
export function getPlayableCards(gameState: GameState): Card[] {
  const playable: Card[] = [];
  
  for (const peak of gameState.pyramids) {
    for (const node of peak) {
      if (node.card && node.card.isPlayable) {
        playable.push(node.card);
      }
    }
  }
  
  return playable;
}

// Get the top card of the discard pile
export function getDiscardTop(gameState: GameState): Card | null {
  if (gameState.discardPile.length === 0) return null;
  return gameState.discardPile[gameState.discardPile.length - 1];
}

// Check if a specific card can be played
export function canPlay(gameState: GameState, cardId: string): boolean {
  const discardTop = getDiscardTop(gameState);
  if (!discardTop) return false;
  
  // Find the card in pyramids
  for (const peak of gameState.pyramids) {
    for (const node of peak) {
      if (node.card && node.card.id === cardId) {
        if (!node.card.isPlayable) return false;
        return canPlayCard(node.card.value, discardTop.value);
      }
    }
  }
  
  return false;
}

// Play a card from the pyramids
export function playCard(gameState: GameState, cardId: string): GameState {
  if (!canPlay(gameState, cardId)) {
    return gameState; // Invalid move
  }
  
  const newState = { ...gameState };
  newState.pyramids = gameState.pyramids.map(peak => [...peak]);
  newState.discardPile = [...gameState.discardPile];
  
  let playedCard: Card | null = null;
  let playedPeakIndex = -1;
  
  // Find and remove the card from pyramids
  for (let peakIdx = 0; peakIdx < newState.pyramids.length; peakIdx++) {
    const peak = newState.pyramids[peakIdx];
    for (let nodeIdx = 0; nodeIdx < peak.length; nodeIdx++) {
      const node = peak[nodeIdx];
      if (node.card && node.card.id === cardId) {
        playedCard = { ...node.card };
        playedPeakIndex = peakIdx;
        newState.pyramids[peakIdx] = peak.map((n, i) => 
          i === nodeIdx ? { ...n, card: null } : n
        );
        break;
      }
    }
    if (playedCard) break;
  }
  
  if (!playedCard) return gameState;
  
  // Add card to discard pile
  playedCard.isFaceUp = true;
  newState.discardPile.push(playedCard);
  
  // Increase combo
  newState.combo++;
  newState.maxCombo = Math.max(newState.maxCombo, newState.combo);
  
  // Calculate score for this play
  const points = BASE_POINTS * newState.combo;
  newState.score += points;
  
  // Update cards remaining
  newState.cardsRemaining--;
  
  // Update playability of other cards
  newState.pyramids = updatePlayability(newState.pyramids);
  
  // Check if a tower was cleared
  const peakCleared = checkPeakCleared(newState.pyramids, playedPeakIndex);
  if (peakCleared) {
    newState.towersCleared++;
    // Tower bonus increases for each tower cleared
    const towerBonus = TOWER_BONUS * newState.towersCleared;
    newState.score += towerBonus;
  }
  
  // Check for win condition
  if (newState.cardsRemaining === 0) {
    newState.phase = 'won';
    // Perfect bonus if draw pile is not empty
    if (newState.drawPile.length > 0) {
      newState.score += PERFECT_BONUS;
    }
    // Time bonus
    newState.score += newState.timeRemaining * TIME_BONUS_MULTIPLIER;
  }
  
  return newState;
}

// Draw a card from the draw pile
export function drawCard(gameState: GameState): GameState {
  if (gameState.drawPile.length === 0) {
    // Check for game over - no moves possible
    const playableCards = getPlayableCards(gameState);
    const discardTop = getDiscardTop(gameState);
    
    if (discardTop) {
      const hasValidMove = playableCards.some(card => 
        canPlayCard(card.value, discardTop.value)
      );
      
      if (!hasValidMove) {
        return { ...gameState, phase: 'lost' };
      }
    }
    
    return gameState;
  }
  
  const newState = { ...gameState };
  newState.drawPile = [...gameState.drawPile];
  newState.discardPile = [...gameState.discardPile];
  
  // Draw top card from draw pile
  const drawnCard = { ...newState.drawPile.pop()! };
  drawnCard.isFaceUp = true;
  
  // Add to discard pile
  newState.discardPile.push(drawnCard);
  
  // Reset combo
  newState.combo = 0;
  
  return newState;
}

// Update playability of cards after a card is removed
function updatePlayability(pyramids: PyramidNode[][]): PyramidNode[][] {
  return pyramids.map(peak => 
    peak.map(node => {
      if (!node.card) return node;
      
      // Check if any covering cards still exist
      const stillCovered = node.coveredBy.some(coverId => {
        // Find if this covering card still exists
        for (const p of pyramids) {
          for (const n of p) {
            if (n.card && n.card.id === coverId) {
              return true;
            }
          }
        }
        return false;
      });
      
      if (!stillCovered && !node.card.isPlayable) {
        // Card is now uncovered - make it playable and face up
        return {
          ...node,
          card: {
            ...node.card,
            isFaceUp: true,
            isPlayable: true
          }
        };
      }
      
      return node;
    })
  );
}

// Check if a peak is completely cleared
function checkPeakCleared(pyramids: PyramidNode[][], peakIndex: number): boolean {
  const peak = pyramids[peakIndex];
  return peak.every(node => node.card === null);
}

// Tick the timer down by 1 second
export function tickTimer(gameState: GameState): GameState {
  if (gameState.phase !== 'playing') return gameState;
  
  const newTime = gameState.timeRemaining - 1;
  
  if (newTime <= 0) {
    return { ...gameState, timeRemaining: 0, phase: 'lost' };
  }
  
  return { ...gameState, timeRemaining: newTime };
}

// Calculate final score breakdown
export function calculateScoreBreakdown(gameState: GameState): ScoreBreakdown {
  const baseScore = gameState.score - (gameState.towersCleared * TOWER_BONUS);
  const towerBonus = gameState.towersCleared * TOWER_BONUS;
  const timeBonus = gameState.phase === 'won' ? gameState.timeRemaining * TIME_BONUS_MULTIPLIER : 0;
  const perfectBonus = gameState.phase === 'won' && gameState.drawPile.length > 0 ? PERFECT_BONUS : 0;
  
  return {
    baseScore,
    comboBonus: 0, // Combo is already included in base score
    towerBonus,
    timeBonus,
    perfectBonus,
    totalScore: gameState.score
  };
}

// Check if any valid moves exist
export function hasValidMoves(gameState: GameState): boolean {
  const playableCards = getPlayableCards(gameState);
  const discardTop = getDiscardTop(gameState);
  
  if (!discardTop) return false;
  
  // Check if any playable card can be placed
  const hasCardMove = playableCards.some(card => 
    canPlayCard(card.value, discardTop.value)
  );
  
  // Can also draw if draw pile is not empty
  return hasCardMove || gameState.drawPile.length > 0;
}

// Export getRank for use in components
export { getRank };
