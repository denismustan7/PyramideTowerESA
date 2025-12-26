# Design Guidelines: Magic Tower Multiplayer Game

## Design Approach
**Game-Focused UI System** inspired by modern casual multiplayer games (Among Us, Fall Guys, party games) with clear information hierarchy and playful aesthetics. Prioritizes readability, quick comprehension, and competitive energy.

---

## Typography
- **Primary Font**: Inter or Roboto (clean, readable at small sizes)
- **Display Font**: Fredoka or Poppins Bold (playful, game-like for scores and headers)
- **Sizes**: 
  - Player names/scores: text-2xl to text-3xl (bold)
  - Game stats/combo: text-lg
  - Card numbers: text-4xl to text-6xl (ultra bold)
  - UI labels: text-sm

---

## Layout System
**Spacing**: Use Tailwind units of 2, 4, 6, and 8 consistently (p-4, gap-6, m-8)

### Game Screen Layout (2-4 Player Grid)
- **2 Players**: Split-screen vertical (50/50)
- **3-4 Players**: 2x2 grid layout
- Each player occupies equal screen real estate
- Central overlays for round transitions/results

### Player Field Components (per player area)
1. **Header Bar**: Player name, current score, combo indicator
2. **Card Tower Area**: Vertical stack showing current tower (center focus)
3. **Action Cards**: Row of +1/-1 cards below tower (5-7 cards visible)
4. **Timer Bar**: Full-width green bar at bottom of player field

---

## Core Components

### Game Cards
- **Shape**: Rounded rectangles (rounded-2xl), 3:4 aspect ratio
- **Card States**: Default, highlighted (selected), disabled (grayed)
- **Number Display**: Centered, bold, large (text-5xl)
- **Card Types**: Differentiate +1 and -1 with subtle icon indicators

### Timer Bar
- Full-width progress bar (h-3)
- Green fill (animate width from 100% to 0%)
- Pulse animation when <10 seconds remaining
- No numerical display

### Combo System
- Floating badge above player field
- Shows combo count (e.g., "x3 COMBO!")
- Animate on combo increase with scale/bounce effect
- Fades after 2 seconds of inactivity

### Elimination State
- Dim/grayscale the entire player field (opacity-50)
- Large skull icon overlay (text-8xl) centered
- "SPECTATING" label below skull
- Maintain visibility of other players' boards

### Leaderboard Overlay
- Modal centered on screen (max-w-2xl)
- Header: "TOP 10 CHAMPIONS"
- List items: Rank medal, player name, high score
- Podium styling for top 3 (gold/silver/bronze accents)

### Multiplayer Lobby
- Center card (max-w-md) on blurred game board background
- Room code display prominently
- Player list with ready status indicators
- "Invite Friends" share button
- "Start Game" button (disabled until 2+ players)

---

## Game States & Screens

1. **Main Menu**: Large "PLAY" button, leaderboard access, rules
2. **Lobby**: Waiting room with player list and invite system
3. **Active Game**: 2-4 player grid view
4. **Round Transition**: Overlay showing round number and elimination warnings
5. **Game Over**: Final scores, winner celebration, play again option

---

## Animations
- **Card Selection**: Subtle scale (1.05) and lift shadow
- **Combo Triggers**: Quick pulse/bounce
- **Elimination**: Fade to grayscale with skull slide-in
- **Timer**: Smooth width transition, urgent pulse at low time
- **Round Transitions**: Slide-in overlays

---

## Images
No hero images required. Use iconography:
- Skull icon for eliminated players (Font Awesome or Heroicons)
- Trophy/medal icons for leaderboard rankings
- +/- symbols for action cards
- Crown icon for current leader during gameplay

---

## Accessibility
- High contrast between card numbers and backgrounds
- Color is not the only differentiator (use symbols + color)
- Large touch targets for cards (min 80px height)
- Clear focus states for keyboard navigation

---

## Key Design Principles
1. **Clarity First**: Players must instantly understand game state
2. **Competitive Energy**: Visual feedback celebrates achievements
3. **Fair Visibility**: All active players get equal screen space
4. **Responsive Flow**: Scales from 2-4 players elegantly