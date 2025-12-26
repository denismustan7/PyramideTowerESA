import type { Card, CardValue, Suit, GameState, PyramidNode, ScoreBreakdown, BonusSlotState } from '@shared/schema';
import { 
  canPlayCard, 
  CARD_VALUES, 
  BASE_POINTS, 
  TOWER_BONUS, 
  PERFECT_BONUS, 
  TIME_BONUS_MULTIPLIER,
  BASE_TIME,
  TIME_DECREASE_PER_LEVEL,
  BONUS_SLOT_1_COMBO,
  BONUS_SLOT_2_COMBO,
  PYRAMID_ROWS,
  TOTAL_PYRAMID_CARDS,
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

// Generate a deterministic bonus card based on seed, slot number, and activation count
function generateBonusCard(gameSeed: number, slotNumber: 1 | 2, activationCount: number): Card {
  // Create a unique seed for this specific bonus card generation
  const uniqueSeed = gameSeed ^ (slotNumber * 1000000) ^ (activationCount * 10000);
  const random = seededRandom(uniqueSeed);
  
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const suitIndex = Math.floor(random() * 4);
  const valueIndex = Math.floor(random() * 13);
  
  const suit = suits[suitIndex];
  const value = CARD_VALUES[valueIndex];
  
  return {
    id: `bonus-${slotNumber}-${activationCount}-${suit}-${value}`,
    suit,
    value,
    isFaceUp: true,
    isPlayable: false
  };
}

// Create the brick-pattern pyramid structure
// Layout (visually from top to bottom, back to front):
// Row 0 (back):   5 cards   (even row - no offset)
// Row 1:          6 cards   (odd row - offset by half card)
// Row 2:          7 cards   (even row - no offset)
// Row 3:          8 cards   (odd row - offset)
// Row 4:          9 cards   (even row - no offset)
// Row 5 (front): 10 cards   (odd row - offset)
// Total: 45 cards
// 
// A card in row R, col C is covered by the TWO cards below it in the larger row
// Coverage in brick pattern: card at (R,C) covered by (R+1, C) and (R+1, C+1) for even rows
// For odd rows: (R,C) covered by (R+1, C-1) and (R+1, C) - but we need to account for offset
//
// Visibility rules:
// - Front row (5): Face up, bright, playable
// - Second row (4): Face up, darkened, locked until uncovered
// - Back rows (0-3): Face down until they become front/second row

function createBrickPyramid(cards: Card[]): PyramidNode[] {
  const pyramid: PyramidNode[] = [];
  let cardIndex = 0;
  const numRows = PYRAMID_ROWS.length; // 6 rows
  
  // PYRAMID_ROWS = [5, 6, 7, 8, 9, 10] - cards per row from back to front
  // Row 0 = 5 cards (back/top), Row 5 = 10 cards (front/bottom)
  for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
    const cardsInRow = PYRAMID_ROWS[rowIdx];
    for (let col = 0; col < cardsInRow; col++) {
      pyramid.push({
        card: cards[cardIndex++],
        row: rowIdx,
        col,
        coveredBy: [],
        isSecondRow: false
      });
    }
  }
  
  // Set up coverage relationships - which cards from the FRONT cover cards in BACK
  // A card in row N is covered by overlapping cards in row N+1 (the row closer to front)
  // 
  // Brick offset alternates: even rows (0,2,4) are left-aligned, odd rows (1,3,5) are offset right
  // When going from even row to odd row: card at col C is covered by (row+1, col) and (row+1, col+1)
  // When going from odd row to even row: card at col C is covered by (row+1, col) and (row+1, col+1)
  // Because the odd row is shifted right, the relationship changes slightly
  
  for (const node of pyramid) {
    if (node.row < numRows - 1) {
      // This card can be covered by cards in the next row (closer to front)
      const nextRowCards = pyramid.filter(n => n.row === node.row + 1);
      const isThisRowOdd = node.row % 2 === 1;
      
      // For brick pattern, cards in back rows are covered by 2 adjacent cards in front
      // Even row (no offset) -> Odd row (offset): col C covered by cols C and C+1 in next row
      // Odd row (offset) -> Even row (no offset): col C covered by cols C and C+1 in next row
      // (This is because the next row has one more card, so indices work out the same)
      const coveringCols = [node.col, node.col + 1];
      
      node.coveredBy = nextRowCards
        .filter(n => n.card && coveringCols.includes(n.col))
        .map(n => n.card!.id);
    }
  }
  
  // Set initial visibility states
  const frontRowIdx = numRows - 1; // Row 5 (10 cards)
  const secondRowIdx = numRows - 2; // Row 4 (9 cards)
  
  for (const node of pyramid) {
    if (!node.card) continue;
    
    if (node.row === frontRowIdx) {
      // Front row: face up, playable
      node.card.isFaceUp = true;
      node.card.isPlayable = true;
      node.isSecondRow = false;
    } else if (node.row === secondRowIdx) {
      // Second row: face up but darkened, not playable yet
      node.card.isFaceUp = true;
      node.card.isPlayable = false;
      node.isSecondRow = true;
    } else {
      // Back rows: face down
      node.card.isFaceUp = false;
      node.card.isPlayable = false;
      node.isSecondRow = false;
    }
  }
  
  return pyramid;
}

// Legacy function for backwards compatibility
function createPyramids(cards: Card[]): PyramidNode[][] {
  // Return empty array - we now use createBrickPyramid
  return [[], [], []];
}

// Initialize a new game
export function initGame(level: number = 1, seed?: number): GameState {
  const gameSeed = seed ?? Math.floor(Math.random() * 1000000);
  const deck = generateDeck();
  const shuffled = shuffleDeck(deck, gameSeed);
  
  // First 45 cards go to the pyramid
  const pyramidCards = shuffled.slice(0, TOTAL_PYRAMID_CARDS);
  const pyramid = createBrickPyramid(pyramidCards);
  
  // Next card goes to discard pile (face up)
  const discardCard = shuffled[TOTAL_PYRAMID_CARDS];
  discardCard.isFaceUp = true;
  
  // Remaining cards are the draw pile (52 - 45 - 1 = 6 cards)
  const drawPile = shuffled.slice(TOTAL_PYRAMID_CARDS + 1);
  
  // Calculate time based on level
  const totalTime = Math.max(30, BASE_TIME - (level - 1) * TIME_DECREASE_PER_LEVEL);
  
  return {
    pyramid,
    pyramids: [[], [], []], // Deprecated, kept for compatibility
    drawPile,
    discardPile: [discardCard],
    bonusSlot1: { card: null, isActive: false },
    bonusSlot2: { card: null, isActive: false },
    bonusSlot1ActivationCount: 0,
    bonusSlot2ActivationCount: 0,
    gameSeed,
    score: 0,
    combo: 0,
    maxCombo: 0,
    level,
    timeRemaining: totalTime,
    totalTime,
    towersCleared: 0,
    phase: 'playing',
    cardsRemaining: TOTAL_PYRAMID_CARDS
  };
}

// Initialize a new game with a specific seed (for multiplayer)
export function initGameWithSeed(level: number, seed: number): GameState {
  return initGame(level, seed);
}

// Get all playable cards from pyramid
export function getPlayableCards(gameState: GameState): Card[] {
  const playable: Card[] = [];
  
  for (const node of gameState.pyramid) {
    if (node.card && node.card.isPlayable) {
      playable.push(node.card);
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
  
  // Find the card in pyramid
  for (const node of gameState.pyramid) {
    if (node.card && node.card.id === cardId) {
      if (!node.card.isPlayable) return false;
      return canPlayCard(node.card.value, discardTop.value);
    }
  }
  
  return false;
}

// Play a card from the pyramid
export function playCard(gameState: GameState, cardId: string): GameState {
  if (!canPlay(gameState, cardId)) {
    return gameState; // Invalid move
  }
  
  const newState = { ...gameState };
  newState.pyramid = gameState.pyramid.map(node => ({ ...node }));
  newState.discardPile = [...gameState.discardPile];
  
  let playedCard: Card | null = null;
  
  // Find and remove the card from pyramid
  for (let nodeIdx = 0; nodeIdx < newState.pyramid.length; nodeIdx++) {
    const node = newState.pyramid[nodeIdx];
    if (node.card && node.card.id === cardId) {
      playedCard = { ...node.card };
      newState.pyramid[nodeIdx] = { ...node, card: null };
      break;
    }
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
  
  // Update playability and visibility of other cards
  newState.pyramid = updateBrickPlayability(newState.pyramid);
  
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
  
  // Check and activate bonus slots based on combo - generate a card automatically
  if (newState.combo >= BONUS_SLOT_1_COMBO && !newState.bonusSlot1.isActive) {
    const bonusCard = generateBonusCard(newState.gameSeed, 1, newState.bonusSlot1ActivationCount);
    newState.bonusSlot1 = { card: bonusCard, isActive: true };
    newState.bonusSlot1ActivationCount++;
  }
  if (newState.combo >= BONUS_SLOT_2_COMBO && !newState.bonusSlot2.isActive) {
    const bonusCard = generateBonusCard(newState.gameSeed, 2, newState.bonusSlot2ActivationCount);
    newState.bonusSlot2 = { card: bonusCard, isActive: true };
    newState.bonusSlot2ActivationCount++;
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
  
  // Reset combo and deactivate bonus slots
  // Increment activation counters if slots were active (ensures next combo gets a new card)
  newState.combo = 0;
  if (newState.bonusSlot1.isActive) {
    newState.bonusSlot1ActivationCount++;
  }
  if (newState.bonusSlot2.isActive) {
    newState.bonusSlot2ActivationCount++;
  }
  newState.bonusSlot1 = { card: null, isActive: false };
  newState.bonusSlot2 = { card: null, isActive: false };
  
  return newState;
}

// Check if a card can be played on a bonus slot
export function canPlayOnBonusSlot(gameState: GameState, cardId: string, slotNumber: 1 | 2): boolean {
  const slot = slotNumber === 1 ? gameState.bonusSlot1 : gameState.bonusSlot2;
  if (!slot.isActive || !slot.card) return false;
  
  // Find the card in pyramid
  let cardToPlay: Card | null = null;
  for (const node of gameState.pyramid) {
    if (node.card && node.card.id === cardId && node.card.isPlayable) {
      cardToPlay = node.card;
      break;
    }
  }
  
  if (!cardToPlay) return false;
  
  // Check +1/-1 rule against the bonus slot's card
  return canPlayCard(cardToPlay.value, slot.card.value);
}

// Play a card onto a bonus slot
export function playCardOnBonusSlot(gameState: GameState, cardId: string, slotNumber: 1 | 2): GameState {
  if (!canPlayOnBonusSlot(gameState, cardId, slotNumber)) {
    return gameState;
  }
  
  const newState = { ...gameState };
  newState.pyramid = gameState.pyramid.map(node => ({ ...node }));
  
  let playedCard: Card | null = null;
  
  // Find and remove the card from pyramid
  for (let nodeIdx = 0; nodeIdx < newState.pyramid.length; nodeIdx++) {
    const node = newState.pyramid[nodeIdx];
    if (node.card && node.card.id === cardId) {
      playedCard = { ...node.card };
      newState.pyramid[nodeIdx] = { ...node, card: null };
      break;
    }
  }
  
  if (!playedCard) return gameState;
  
  // Place card on bonus slot (replaces the existing card)
  playedCard.isFaceUp = true;
  if (slotNumber === 1) {
    // Add old bonus slot card to discard pile before replacing
    if (newState.bonusSlot1.card) {
      newState.discardPile = [...gameState.discardPile, newState.bonusSlot1.card];
    }
    newState.bonusSlot1 = { card: playedCard, isActive: true };
  } else {
    // Add old bonus slot card to discard pile before replacing
    if (newState.bonusSlot2.card) {
      newState.discardPile = [...gameState.discardPile, newState.bonusSlot2.card];
    }
    newState.bonusSlot2 = { card: playedCard, isActive: true };
  }
  
  // Increase combo
  newState.combo++;
  newState.maxCombo = Math.max(newState.maxCombo, newState.combo);
  
  // Calculate score for this play
  const points = BASE_POINTS * newState.combo;
  newState.score += points;
  
  // Update cards remaining
  newState.cardsRemaining--;
  
  // Update playability of other cards
  newState.pyramid = updateBrickPlayability(newState.pyramid);
  
  // Check for win condition
  if (newState.cardsRemaining === 0) {
    newState.phase = 'won';
    if (newState.drawPile.length > 0) {
      newState.score += PERFECT_BONUS;
    }
    newState.score += newState.timeRemaining * TIME_BONUS_MULTIPLIER;
  }
  
  // Check and activate bonus slots based on combo - generate a card automatically
  if (newState.combo >= BONUS_SLOT_1_COMBO && !newState.bonusSlot1.isActive) {
    const bonusCard = generateBonusCard(newState.gameSeed, 1, newState.bonusSlot1ActivationCount);
    newState.bonusSlot1 = { card: bonusCard, isActive: true };
    newState.bonusSlot1ActivationCount++;
  }
  if (newState.combo >= BONUS_SLOT_2_COMBO && !newState.bonusSlot2.isActive) {
    const bonusCard = generateBonusCard(newState.gameSeed, 2, newState.bonusSlot2ActivationCount);
    newState.bonusSlot2 = { card: bonusCard, isActive: true };
    newState.bonusSlot2ActivationCount++;
  }
  
  return newState;
}

// Update playability and visibility for brick pyramid after a card is removed
function updateBrickPlayability(pyramid: PyramidNode[]): PyramidNode[] {
  const numRows = PYRAMID_ROWS.length;
  
  // First pass: determine coverage status for all cards
  const coverageInfo = pyramid.map(node => {
    if (!node.card) return { node, isCovered: false, hasCard: false };
    
    const isCovered = node.coveredBy.some(coverId => {
      return pyramid.some(n => n.card && n.card.id === coverId);
    });
    
    return { node, isCovered, hasCard: true };
  });
  
  // Find the current front row - the highest row number that has uncovered cards
  const uncoveredRows = coverageInfo
    .filter(info => info.hasCard && !info.isCovered)
    .map(info => info.node.row);
  
  const frontRowIdx = uncoveredRows.length > 0 ? Math.max(...uncoveredRows) : numRows - 1;
  const secondRowIdx = frontRowIdx - 1;
  
  // Second pass: update each node's visibility based on its position and coverage
  return pyramid.map((node, idx) => {
    if (!node.card) return node;
    
    const info = coverageInfo[idx];
    
    // Cards that are still covered keep their current state
    // (Don't change visibility for covered cards)
    if (info.isCovered) {
      // Still covered - keep face down, not playable
      // But if it's in the second row position, it should stay visible but darkened
      if (node.row === secondRowIdx) {
        return {
          ...node,
          isSecondRow: true,
          card: {
            ...node.card,
            isFaceUp: true,
            isPlayable: false
          }
        };
      }
      // Other covered cards stay face down
      return {
        ...node,
        isSecondRow: false,
        card: {
          ...node.card,
          isFaceUp: false,
          isPlayable: false
        }
      };
    }
    
    // Card is uncovered - determine its visibility based on row position
    if (node.row === frontRowIdx) {
      // Front row: face up, playable
      return {
        ...node,
        isSecondRow: false,
        card: {
          ...node.card,
          isFaceUp: true,
          isPlayable: true
        }
      };
    } else if (node.row === secondRowIdx) {
      // Second row: face up but darkened, not playable
      return {
        ...node,
        isSecondRow: true,
        card: {
          ...node.card,
          isFaceUp: true,
          isPlayable: false
        }
      };
    } else {
      // Other uncovered rows behind second row - stay face down until promoted
      return {
        ...node,
        isSecondRow: false,
        card: {
          ...node.card,
          isFaceUp: false,
          isPlayable: false
        }
      };
    }
  });
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
