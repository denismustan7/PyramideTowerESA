import type { Card, CardValue, Suit, GameState, PyramidNode, ScoreBreakdown, BonusSlotState } from '@shared/schema';
import { 
  canPlayCard, 
  CARD_VALUES, 
  BASE_POINTS, 
  TOWER_BONUS, 
  PERFECT_BONUS, 
  DECK_BONUS_PER_CARD,
  INVALID_MOVE_PENALTY,
  TIME_BONUS_MULTIPLIER,
  BASE_TIME,
  TIME_DECREASE_START_ROUND,
  TIME_DECREASE_PER_LEVEL,
  BONUS_SLOT_1_COMBO,
  BONUS_SLOT_2_COMBO,
  TOWER_ROWS,
  CARDS_PER_TOWER,
  NUM_TOWERS,
  TOTAL_TABLEAU_CARDS,
  DRAW_PILE_SIZE,
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

// Create the tri-peaks tower structure (3 separate small towers)
// Each tower has 4 rows: 1, 2, 3, 4 cards = 10 cards per tower
// Total: 30 cards across all towers
//
// Layout for each tower (brick pattern):
// Row 0 (back/top):    1 card  (peak)
// Row 1:               2 cards
// Row 2:               3 cards
// Row 3 (front/bottom): 4 cards
//
// Coverage: A card at (row, col) is covered by cards at (row+1, col) and (row+1, col+1)
// Individual unlocking: Card becomes playable when ALL its covering cards are removed

function createTriPeaksTowers(cards: Card[]): { pyramid: PyramidNode[], towers: PyramidNode[][] } {
  const towers: PyramidNode[][] = [[], [], []];
  const pyramid: PyramidNode[] = [];
  let cardIndex = 0;
  const numRows = TOWER_ROWS.length; // 4 rows
  
  // Create each tower
  for (let towerIdx = 0; towerIdx < NUM_TOWERS; towerIdx++) {
    for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
      const cardsInRow = TOWER_ROWS[rowIdx];
      for (let col = 0; col < cardsInRow; col++) {
        const node: PyramidNode = {
          card: cards[cardIndex++],
          tower: towerIdx,
          row: rowIdx,
          col,
          coveredBy: [],
          isDimmed: false
        };
        towers[towerIdx].push(node);
        pyramid.push(node);
      }
    }
  }
  
  // Set up coverage relationships within each tower
  // A card at (row, col) is covered by two cards in the next row: (row+1, col) and (row+1, col+1)
  for (let towerIdx = 0; towerIdx < NUM_TOWERS; towerIdx++) {
    const tower = towers[towerIdx];
    
    for (const node of tower) {
      if (node.row < numRows - 1) {
        // Find cards in the next row that cover this card
        const coveringCards = tower.filter(n => 
          n.row === node.row + 1 && 
          (n.col === node.col || n.col === node.col + 1) &&
          n.card
        );
        
        node.coveredBy = coveringCards.map(n => n.card!.id);
      }
    }
  }
  
  // Set initial visibility using depth-based system
  // Helper to check if a card ID exists in pyramid
  const cardExists = (cardId: string): boolean => {
    return pyramid.some(n => n.card && n.card.id === cardId);
  };
  
  // Helper to check if a node is covered
  const isNodeCovered = (node: PyramidNode): boolean => {
    return node.coveredBy.some(coverId => cardExists(coverId));
  };
  
  // Helper to get depth (0 = uncovered, 1 = one layer back, etc.)
  const getDepth = (node: PyramidNode): number => {
    if (!isNodeCovered(node)) return 0;
    
    let maxCoverDepth = 0;
    for (const coverId of node.coveredBy) {
      const coverNode = pyramid.find(n => n.card && n.card.id === coverId);
      if (coverNode) {
        const coverDepth = getDepth(coverNode);
        maxCoverDepth = Math.max(maxCoverDepth, coverDepth);
      }
    }
    return maxCoverDepth + 1;
  };
  
  for (const node of pyramid) {
    if (!node.card) continue;
    
    const depth = getDepth(node);
    
    if (depth === 0) {
      // Uncovered: playable
      node.card.isFaceUp = true;
      node.card.isPlayable = true;
      node.isDimmed = false;
    } else if (depth === 1) {
      // One layer back: preview (face up, dimmed)
      node.card.isFaceUp = true;
      node.card.isPlayable = false;
      node.isDimmed = true;
    } else {
      // Two or more layers back: face down
      node.card.isFaceUp = false;
      node.card.isPlayable = false;
      node.isDimmed = false;
    }
  }
  
  return { pyramid, towers };
}

// Helper to rebuild towers array from pyramid
function rebuildTowersFromPyramid(pyramid: PyramidNode[]): PyramidNode[][] {
  const towers: PyramidNode[][] = [[], [], []];
  for (const node of pyramid) {
    towers[node.tower].push(node);
  }
  return towers;
}

// Initialize a new game
export function initGame(level: number = 1, seed?: number): GameState {
  const gameSeed = seed ?? Math.floor(Math.random() * 1000000);
  const deck = generateDeck();
  const shuffled = shuffleDeck(deck, gameSeed);
  
  // First 30 cards go to the three towers
  const tableauCards = shuffled.slice(0, TOTAL_TABLEAU_CARDS);
  const { pyramid, towers } = createTriPeaksTowers(tableauCards);
  
  // Next card goes to discard pile (face up)
  const discardCard = shuffled[TOTAL_TABLEAU_CARDS];
  discardCard.isFaceUp = true;
  
  // Remaining 21 cards are the draw pile (52 - 30 - 1 = 21 cards)
  const drawPile = shuffled.slice(TOTAL_TABLEAU_CARDS + 1);
  
  // Calculate time based on level
  // Rounds 1-4: 60 seconds, Round 5+: decreases by 5 seconds per round
  let totalTime = BASE_TIME;
  if (level >= TIME_DECREASE_START_ROUND) {
    const decreaseRounds = level - TIME_DECREASE_START_ROUND + 1;
    totalTime = Math.max(30, BASE_TIME - decreaseRounds * TIME_DECREASE_PER_LEVEL);
  }
  
  return {
    pyramid,
    towers,
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
    cardsRemaining: TOTAL_TABLEAU_CARDS
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
  
  // IMPORTANT: Deep copy both bonus slots to prevent mutation
  newState.bonusSlot1 = { ...gameState.bonusSlot1, card: gameState.bonusSlot1.card ? { ...gameState.bonusSlot1.card } : null };
  newState.bonusSlot2 = { ...gameState.bonusSlot2, card: gameState.bonusSlot2.card ? { ...gameState.bonusSlot2.card } : null };
  
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
  newState.pyramid = updateTriPeaksPlayability(newState.pyramid);
  
  // Sync towers with updated pyramid
  newState.towers = rebuildTowersFromPyramid(newState.pyramid);
  
  // Check for win condition
  if (newState.cardsRemaining === 0) {
    newState.phase = 'won';
    // Deck bonus: 500 points per remaining draw pile card
    if (newState.drawPile.length > 0) {
      newState.score += newState.drawPile.length * DECK_BONUS_PER_CARD;
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
  
  // DEBUG: Log before state changes
  console.log(`[playCardOnBonusSlot] Playing on slot ${slotNumber}`);
  console.log(`[playCardOnBonusSlot] BEFORE - Slot1: ${gameState.bonusSlot1.card?.value}, Slot2: ${gameState.bonusSlot2.card?.value}`);
  
  const newState = { ...gameState };
  newState.pyramid = gameState.pyramid.map(node => ({ ...node }));
  
  // IMPORTANT: Deep copy both bonus slots to prevent mutation of unrelated slot
  newState.bonusSlot1 = { ...gameState.bonusSlot1, card: gameState.bonusSlot1.card ? { ...gameState.bonusSlot1.card } : null };
  newState.bonusSlot2 = { ...gameState.bonusSlot2, card: gameState.bonusSlot2.card ? { ...gameState.bonusSlot2.card } : null };
  
  console.log(`[playCardOnBonusSlot] After deep copy - Slot1: ${newState.bonusSlot1.card?.value}, Slot2: ${newState.bonusSlot2.card?.value}`);
  
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
  newState.pyramid = updateTriPeaksPlayability(newState.pyramid);
  
  // Sync towers with updated pyramid
  newState.towers = rebuildTowersFromPyramid(newState.pyramid);
  
  // Check for win condition
  if (newState.cardsRemaining === 0) {
    newState.phase = 'won';
    // Deck bonus: 500 points per remaining draw pile card
    if (newState.drawPile.length > 0) {
      newState.score += newState.drawPile.length * DECK_BONUS_PER_CARD;
    }
    newState.score += newState.timeRemaining * TIME_BONUS_MULTIPLIER;
  }
  
  // Check and activate bonus slots based on combo - generate a card automatically
  // NOTE: This should NOT change an already-active slot
  if (newState.combo >= BONUS_SLOT_1_COMBO && !newState.bonusSlot1.isActive) {
    console.log(`[playCardOnBonusSlot] Activating slot 1 because combo=${newState.combo} and slot1 is not active`);
    const bonusCard = generateBonusCard(newState.gameSeed, 1, newState.bonusSlot1ActivationCount);
    newState.bonusSlot1 = { card: bonusCard, isActive: true };
    newState.bonusSlot1ActivationCount++;
  }
  if (newState.combo >= BONUS_SLOT_2_COMBO && !newState.bonusSlot2.isActive) {
    console.log(`[playCardOnBonusSlot] Activating slot 2 because combo=${newState.combo} and slot2 is not active`);
    const bonusCard = generateBonusCard(newState.gameSeed, 2, newState.bonusSlot2ActivationCount);
    newState.bonusSlot2 = { card: bonusCard, isActive: true };
    newState.bonusSlot2ActivationCount++;
  }
  
  console.log(`[playCardOnBonusSlot] FINAL - Slot1: ${newState.bonusSlot1.card?.value} (active=${newState.bonusSlot1.isActive}), Slot2: ${newState.bonusSlot2.card?.value} (active=${newState.bonusSlot2.isActive})`);
  
  return newState;
}

// Check if a playable card can fit on ANY available slot (main discard, bonus slot 1, bonus slot 2)
export function canPlayOnAnySlot(gameState: GameState, cardId: string): boolean {
  // Check main discard pile
  if (canPlay(gameState, cardId)) return true;
  
  // Check bonus slot 1
  if (canPlayOnBonusSlot(gameState, cardId, 1)) return true;
  
  // Check bonus slot 2
  if (canPlayOnBonusSlot(gameState, cardId, 2)) return true;
  
  return false;
}

// Check if a card is playable (active/unlocked) in the pyramid
export function isCardPlayable(gameState: GameState, cardId: string): boolean {
  for (const node of gameState.pyramid) {
    if (node.card && node.card.id === cardId) {
      return node.card.isPlayable;
    }
  }
  return false;
}

// Apply penalty for invalid move - only when clicking playable card that doesn't fit any slot
export function applyInvalidMovePenalty(gameState: GameState): GameState {
  const newState = { ...gameState };
  newState.score = Math.max(0, newState.score - INVALID_MOVE_PENALTY);
  return newState;
}

// Update playability for tri-peaks after a card is removed
// Layered visibility: playable cards are bright, next row is dimmed preview, back rows are face down
function updateTriPeaksPlayability(pyramid: PyramidNode[]): PyramidNode[] {
  // Helper to check if a card ID still exists in pyramid
  const cardExists = (cardId: string): boolean => {
    return pyramid.some(n => n.card && n.card.id === cardId);
  };
  
  // Helper to check if a node is covered by any existing cards
  const isNodeCovered = (node: PyramidNode): boolean => {
    return node.coveredBy.some(coverId => cardExists(coverId));
  };
  
  // Helper to get depth from front (0 = uncovered/playable, 1 = one layer back, etc.)
  const getDepth = (node: PyramidNode): number => {
    if (!isNodeCovered(node)) return 0;
    
    // Get max depth of covering cards + 1
    let maxCoverDepth = 0;
    for (const coverId of node.coveredBy) {
      const coverNode = pyramid.find(n => n.card && n.card.id === coverId);
      if (coverNode) {
        const coverDepth = getDepth(coverNode);
        maxCoverDepth = Math.max(maxCoverDepth, coverDepth);
      }
    }
    return maxCoverDepth + 1;
  };
  
  return pyramid.map(node => {
    if (!node.card) return node;
    
    const depth = getDepth(node);
    
    if (depth === 0) {
      // Uncovered: fully visible, playable
      return {
        ...node,
        isDimmed: false,
        card: {
          ...node.card,
          isFaceUp: true,
          isPlayable: true
        }
      };
    } else if (depth === 1) {
      // One layer back: preview mode (face up but dimmed)
      return {
        ...node,
        isDimmed: true,
        card: {
          ...node.card,
          isFaceUp: true,
          isPlayable: false
        }
      };
    } else {
      // Two or more layers back: face down
      return {
        ...node,
        isDimmed: false,
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
