# Magic Tower - Design Guidelines

## Theme: Dark Fantasy & Magic
A mystical, premium aesthetic with elegant gold accents and magical cyan highlights.

## Color Palette

### Primary Colors
- **Background**: Deep night blue to black (#050505 to #0A0E14)
- **Card Surface**: Pure white/ivory for card faces
- **Card Back**: Dark blue (#0B1D3C) with gold border

### Accent Colors
- **Gold (Primary Accent)**: #D4AF37 - Used for borders, score numbers, UI elements, with metallic sheen effect
- **Cyan/Ice Blue (Secondary Accent)**: #00F5FF - Used for particle effects, timer bar, card glow on removal
- **Ruby Red (Status/Error)**: #C21807 - Used for errors, time running out warnings

### UI Colors
- **Text Primary**: White (#FFFFFF) or Gold (#D4AF37)
- **Text Secondary**: Light gray (#9CA3AF)
- **Text Muted**: Medium gray (#6B7280)

## Typography
- **Score Numbers**: Extra large, bold, gold color with slight glow
- **Card Values**: Very large, bold, easy to read at a glance
  - Black for Spades/Clubs
  - Red (#DC2626) for Hearts/Diamonds
- **UI Text**: Clean sans-serif, medium weight

## Card Design

### Front (Face Up)
- Background: Pure white or light ivory (#FFFDF5)
- Border: Thin gold outline
- Values: Extra large, bold, positioned top-left and bottom-right
- Suit symbol: Large, centered

### Back (Face Down)
- Background: Dark blue (#0B1D3C)
- Border: Gold frame
- Center: Stylized tower or mystical symbol in gold
- Slight texture/pattern

### Card States
- **Playable**: Full brightness, subtle gold glow
- **Locked/Covered**: Dimmed (opacity 50%), grayed out
- **Selected**: Bright cyan glow outline
- **Matched**: Cyan particle burst on removal

## Layout (Portrait Mobile)

### Top Zone (Score & Status)
- Score display with gold numbers
- Level indicator
- Timer bar (horizontal, glowing cyan/green, shrinks left to right)
- Rank badge

### Middle Zone (Pyramids)
- Three overlapping card pyramids
- Cards arranged in traditional tri-peaks pattern
- Pyramids bases overlap slightly for mobile width
- Sufficient spacing for touch targets

### Bottom Zone (Actions)
- Left: Draw pile (face-down stack)
- Center: Discard pile (current card, face-up)
- Right: Optional wildcard/power-up button
- All within thumb reach

## Animations

### Card Movements
- Play card: Smooth 200ms flight to discard pile
- Draw card: 150ms flip and move
- Invalid move: Quick shake (100ms) with red flash

### Feedback Effects
- Combo indicator: Glowing pulse, intensity increases with combo
- Score increment: Pop animation with brief glow
- Tower clear: Burst of golden particles
- Time low (<10s): Timer pulses red

### Transitions
- Game start: Cards deal out with stagger
- Game over: Fade to overlay with score reveal

## Spacing
- Small: 4px (gap between stacked cards)
- Medium: 8-12px (general UI spacing)
- Large: 16-24px (section separation)

## Touch Targets
- Minimum 44x44px for all interactive elements
- Cards slightly larger for easy selection
- Adequate spacing to prevent mis-taps
