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

// Difficulty types for random round variation
type RoundDifficulty = 'easy' | 'normal' | 'hard';

// Get difficulty level from seed (deterministic so all players get same difficulty)
function getDifficultyFromSeed(seed: number): RoundDifficulty {
  const difficultyRoll = (seed * 7919) % 100; // Prime number for better distribution
  if (difficultyRoll < 25) return 'easy';      // 25% chance
  if (difficultyRoll < 70) return 'normal';    // 45% chance
  return 'hard';                                // 30% chance
}

// Get value index for a card (0-12, where 0=A, 12=K)
function getCardValueIndex(card: Card): number {
  return CARD_VALUES.indexOf(card.value);
}

// Check if two cards are adjacent in value (can be played consecutively)
function areCardsAdjacent(card1: Card, card2: Card): boolean {
  const idx1 = getCardValueIndex(card1);
  const idx2 = getCardValueIndex(card2);
  const diff = Math.abs(idx1 - idx2);
  return diff === 1 || diff === 12; // Adjacent or A-K wrap
}

// Adjust deck based on difficulty - modifies card arrangement after shuffle
function adjustDeckForDifficulty(deck: Card[], seed: number, difficulty: RoundDifficulty): Card[] {
  if (difficulty === 'normal') {
    return deck; // No adjustment for normal difficulty
  }
  
  const adjusted = [...deck];
  const random = seededRandom(seed ^ 0xDEADBEEF); // Different seed for adjustments
  
  // Cards 0-29 go to pyramid (bottom row is indices 6-9, 16-19, 26-29 for each tower)
  // Bottom row = playable cards at start
  const bottomRowIndices = [6, 7, 8, 9, 16, 17, 18, 19, 26, 27, 28, 29]; // 12 cards
  const otherPyramidIndices: number[] = [];
  for (let i = 0; i < 30; i++) {
    if (!bottomRowIndices.includes(i)) {
      otherPyramidIndices.push(i);
    }
  }
  
  if (difficulty === 'easy') {
    // EASY: Try to place cards that form sequences in the bottom row
    // Find pairs of adjacent cards and put them in bottom row
    const pyramidCards = adjusted.slice(0, 30);
    const usedIndices = new Set<number>();
    
    // Find all adjacent pairs
    for (let i = 0; i < pyramidCards.length; i++) {
      if (usedIndices.has(i)) continue;
      
      for (let j = i + 1; j < pyramidCards.length; j++) {
        if (usedIndices.has(j)) continue;
        
        if (areCardsAdjacent(pyramidCards[i], pyramidCards[j])) {
          // Check if we can put both in bottom row
          const availableBottomSlots = bottomRowIndices.filter(idx => !usedIndices.has(idx));
          const availableOtherSlots = otherPyramidIndices.filter(idx => !usedIndices.has(idx));
          
          if (availableBottomSlots.length >= 2) {
            // Swap these cards into bottom row
            const currentPosI = i;
            const currentPosJ = j;
            const targetPosI = availableBottomSlots[0];
            const targetPosJ = availableBottomSlots[1];
            
            if (currentPosI !== targetPosI && !usedIndices.has(targetPosI)) {
              [adjusted[currentPosI], adjusted[targetPosI]] = [adjusted[targetPosI], adjusted[currentPosI]];
            }
            if (currentPosJ !== targetPosJ && !usedIndices.has(targetPosJ)) {
              [adjusted[currentPosJ], adjusted[targetPosJ]] = [adjusted[targetPosJ], adjusted[currentPosJ]];
            }
            
            usedIndices.add(targetPosI);
            usedIndices.add(targetPosJ);
            
            // Only do a few swaps to keep some randomness
            if (usedIndices.size >= 6) break;
          }
        }
      }
      if (usedIndices.size >= 6) break;
    }
  } else if (difficulty === 'hard') {
    // HARD: Spread out adjacent cards - move sequences away from bottom row
    const pyramidCards = adjusted.slice(0, 30);
    let swapCount = 0;
    const maxSwaps = 8;
    
    // For each card in bottom row, check if it has an adjacent card also in bottom row
    for (let i = 0; i < bottomRowIndices.length && swapCount < maxSwaps; i++) {
      const idx1 = bottomRowIndices[i];
      const card1 = adjusted[idx1];
      
      for (let j = i + 1; j < bottomRowIndices.length && swapCount < maxSwaps; j++) {
        const idx2 = bottomRowIndices[j];
        const card2 = adjusted[idx2];
        
        if (areCardsAdjacent(card1, card2)) {
          // Move one of them to a non-bottom position
          const targetIdx = otherPyramidIndices[Math.floor(random() * otherPyramidIndices.length)];
          [adjusted[idx2], adjusted[targetIdx]] = [adjusted[targetIdx], adjusted[idx2]];
          swapCount++;
          break; // Only need to break one pair per card
        }
      }
    }
    
    // Also check if discard card (index 30) has many matches in bottom row
    // If so, swap some bottom row cards to make it harder
    const discardCard = adjusted[30];
    let matchesInBottom = 0;
    for (const idx of bottomRowIndices) {
      if (areCardsAdjacent(adjusted[idx], discardCard)) {
        matchesInBottom++;
      }
    }
    
    // If too many matches, swap some away
    if (matchesInBottom > 3 && swapCount < maxSwaps) {
      for (const idx of bottomRowIndices) {
        if (areCardsAdjacent(adjusted[idx], discardCard) && swapCount < maxSwaps) {
          const targetIdx = otherPyramidIndices[Math.floor(random() * otherPyramidIndices.length)];
          [adjusted[idx], adjusted[targetIdx]] = [adjusted[targetIdx], adjusted[idx]];
          swapCount++;
          if (swapCount >= 3) break; // Don't remove all matches
        }
      }
    }
  }
  
  return adjusted;
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
  
  // Apply random difficulty adjustment based on seed
  const difficulty = getDifficultyFromSeed(gameSeed);
  const adjustedDeck = adjustDeckForDifficulty(shuffled, gameSeed, difficulty);
  
  // Log difficulty for debugging (can be removed later)
  console.log(`[Game] Round difficulty: ${difficulty}`);
  
  // First 30 cards go to the three towers
  const tableauCards = adjustedDeck.slice(0, TOTAL_TABLEAU_CARDS);
  const { pyramid, towers } = createTriPeaksTowers(tableauCards);
  
  // Next card goes to discard pile (face up)
  const discardCard = adjustedDeck[TOTAL_TABLEAU_CARDS];
  discardCard.isFaceUp = true;
  
  // Remaining 21 cards are the draw pile (52 - 30 - 1 = 21 cards)
  const drawPile = adjustedDeck.slice(TOTAL_TABLEAU_CARDS + 1);
  
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

// Get the difficulty level for a given seed (for UI display)
export function getRoundDifficulty(seed: number): 'easy' | 'normal' | 'hard' {
  return getDifficultyFromSeed(seed);
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
  
  // Find the card in pyramid first
  let foundCard: Card | undefined;
  let foundIndex = -1;
  for (let i = 0; i < gameState.pyramid.length; i++) {
    if (gameState.pyramid[i].card?.id === cardId) {
      foundCard = gameState.pyramid[i].card!;
      foundIndex = i;
      break;
    }
  }
  
  if (!foundCard || foundIndex === -1) return gameState;
  
  
  // Create played card copy
  const playedCard: Card = { ...foundCard, isFaceUp: true };
  
  // Create new pyramid without the played card
  const newPyramid = gameState.pyramid.map((node, idx) => 
    idx === foundIndex ? { ...node, card: null } : { ...node }
  );
  
  // Create new discard pile with played card
  const newDiscardPile = [...gameState.discardPile, playedCard];
  
  // FREEZE bonus slots - create completely independent copies
  const frozenSlot1: BonusSlotState = {
    isActive: gameState.bonusSlot1.isActive,
    card: gameState.bonusSlot1.card ? {
      id: gameState.bonusSlot1.card.id,
      suit: gameState.bonusSlot1.card.suit,
      value: gameState.bonusSlot1.card.value,
      isFaceUp: gameState.bonusSlot1.card.isFaceUp,
      isPlayable: gameState.bonusSlot1.card.isPlayable
    } : null
  };
  
  const frozenSlot2: BonusSlotState = {
    isActive: gameState.bonusSlot2.isActive,
    card: gameState.bonusSlot2.card ? {
      id: gameState.bonusSlot2.card.id,
      suit: gameState.bonusSlot2.card.suit,
      value: gameState.bonusSlot2.card.value,
      isFaceUp: gameState.bonusSlot2.card.isFaceUp,
      isPlayable: gameState.bonusSlot2.card.isPlayable
    } : null
  };
  
  
  // Update combo
  const newCombo = gameState.combo + 1;
  const newMaxCombo = Math.max(gameState.maxCombo, newCombo);
  const points = BASE_POINTS * newCombo;
  
  // Update pyramid playability
  const updatedPyramid = updateTriPeaksPlayability(newPyramid);
  const updatedTowers = rebuildTowersFromPyramid(updatedPyramid);
  
  // Check for win
  const newCardsRemaining = gameState.cardsRemaining - 1;
  let newPhase = gameState.phase;
  let newScore = gameState.score + points;
  
  if (newCardsRemaining === 0) {
    newPhase = 'won';
    if (gameState.drawPile.length > 0) {
      newScore += gameState.drawPile.length * DECK_BONUS_PER_CARD;
    }
    newScore += gameState.timeRemaining * TIME_BONUS_MULTIPLIER;
  }
  
  // Build the new state with frozen slots
  const newState: GameState = {
    ...gameState,
    pyramid: updatedPyramid,
    towers: updatedTowers,
    discardPile: newDiscardPile,
    bonusSlot1: frozenSlot1,
    bonusSlot2: frozenSlot2,
    combo: newCombo,
    maxCombo: newMaxCombo,
    score: newScore,
    cardsRemaining: newCardsRemaining,
    phase: newPhase
  };
  
  // Check and activate bonus slots based on combo - draw card from deck
  // Only activate if not already active and draw pile has cards
  if (newState.combo >= BONUS_SLOT_1_COMBO && !newState.bonusSlot1.isActive && newState.drawPile.length > 0) {
    newState.drawPile = [...newState.drawPile];
    const bonusCard = { ...newState.drawPile.pop()! };
    bonusCard.isFaceUp = true;
    bonusCard.isPlayable = false;
    newState.bonusSlot1 = { card: bonusCard, isActive: true };
    newState.bonusSlot1ActivationCount++;
  }
  if (newState.combo >= BONUS_SLOT_2_COMBO && !newState.bonusSlot2.isActive && newState.drawPile.length > 0) {
    newState.drawPile = [...newState.drawPile];
    const bonusCard = { ...newState.drawPile.pop()! };
    bonusCard.isFaceUp = true;
    bonusCard.isPlayable = false;
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
  
  // Find the card in the pyramid first
  let foundCard: Card | undefined;
  let foundIndex = -1;
  for (let i = 0; i < gameState.pyramid.length; i++) {
    if (gameState.pyramid[i].card?.id === cardId) {
      foundCard = gameState.pyramid[i].card!;
      foundIndex = i;
      break;
    }
  }
  
  if (!foundCard || foundIndex === -1) {
    return gameState;
  }
  
  // Create played card copy
  const playedCard: Card = { ...foundCard, isFaceUp: true };
  
  // Create new pyramid without the played card
  const newPyramid = gameState.pyramid.map((node, idx) => 
    idx === foundIndex ? { ...node, card: null } : { ...node }
  );
  
  // Preserve the OTHER slot exactly as-is (completely frozen)
  const preservedSlot1: BonusSlotState = slotNumber === 1 
    ? { card: playedCard, isActive: true }  // Replace slot 1 with played card
    : { 
        isActive: gameState.bonusSlot1.isActive,
        card: gameState.bonusSlot1.card ? {
          id: gameState.bonusSlot1.card.id,
          suit: gameState.bonusSlot1.card.suit,
          value: gameState.bonusSlot1.card.value,
          isFaceUp: gameState.bonusSlot1.card.isFaceUp,
          isPlayable: gameState.bonusSlot1.card.isPlayable
        } : null
      };  // Keep slot 1 frozen
  
  const preservedSlot2: BonusSlotState = slotNumber === 2 
    ? { card: playedCard, isActive: true }  // Replace slot 2 with played card
    : {
        isActive: gameState.bonusSlot2.isActive,
        card: gameState.bonusSlot2.card ? {
          id: gameState.bonusSlot2.card.id,
          suit: gameState.bonusSlot2.card.suit,
          value: gameState.bonusSlot2.card.value,
          isFaceUp: gameState.bonusSlot2.card.isFaceUp,
          isPlayable: gameState.bonusSlot2.card.isPlayable
        } : null
      };  // Keep slot 2 frozen
  
  // Keep discard pile unchanged - old bonus slot card just disappears
  const newDiscardPile = [...gameState.discardPile];
  
  // Update combo
  const newCombo = gameState.combo + 1;
  const newMaxCombo = Math.max(gameState.maxCombo, newCombo);
  const points = BASE_POINTS * newCombo;
  
  // Update pyramid playability
  const updatedPyramid = updateTriPeaksPlayability(newPyramid);
  const updatedTowers = rebuildTowersFromPyramid(updatedPyramid);
  
  // Check for win
  const newCardsRemaining = gameState.cardsRemaining - 1;
  let newPhase = gameState.phase;
  let newScore = gameState.score + points;
  
  if (newCardsRemaining === 0) {
    newPhase = 'won';
    if (gameState.drawPile.length > 0) {
      newScore += gameState.drawPile.length * DECK_BONUS_PER_CARD;
    }
    newScore += gameState.timeRemaining * TIME_BONUS_MULTIPLIER;
  }
  
  // Build new state - ONLY the target slot gets modified, other slot stays frozen
  const newState: GameState = {
    ...gameState,
    pyramid: updatedPyramid,
    towers: updatedTowers,
    discardPile: newDiscardPile,
    bonusSlot1: preservedSlot1,
    bonusSlot2: preservedSlot2,
    combo: newCombo,
    maxCombo: newMaxCombo,
    score: newScore,
    cardsRemaining: newCardsRemaining,
    phase: newPhase
  };
  
  // Activate bonus slots ONLY if they're not already active and draw pile has cards
  // This should never change an already-active slot's card
  if (newState.combo >= BONUS_SLOT_1_COMBO && !newState.bonusSlot1.isActive && newState.drawPile.length > 0) {
    newState.drawPile = [...newState.drawPile];
    const bonusCard = { ...newState.drawPile.pop()! };
    bonusCard.isFaceUp = true;
    bonusCard.isPlayable = false;
    newState.bonusSlot1 = { card: bonusCard, isActive: true };
    newState.bonusSlot1ActivationCount++;
  }
  if (newState.combo >= BONUS_SLOT_2_COMBO && !newState.bonusSlot2.isActive && newState.drawPile.length > 0) {
    newState.drawPile = [...newState.drawPile];
    const bonusCard = { ...newState.drawPile.pop()! };
    bonusCard.isFaceUp = true;
    bonusCard.isPlayable = false;
    newState.bonusSlot2 = { card: bonusCard, isActive: true };
    newState.bonusSlot2ActivationCount++;
  }
  
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
