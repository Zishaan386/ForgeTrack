# ForgeTrack "Aura" Design System

## Visual Philosophy
Shift from "Terminal Fintech" to **"Premium Futuristic Mobile OS"**.
- **Tactile**: Interactive elements feel physical and responsive.
- **Ambient**: Soft lighting and subtle gradients instead of harsh contrast.
- **Breathable**: High whitespace and soft rounded surfaces.

## Color Palette
| Token | Hex | Description |
| :--- | :--- | :--- |
| `bg-primary` | `#0A0B12` | Core dark background |
| `bg-secondary` | `#11131C` | Secondary sections |
| `bg-card` | `rgba(22, 24, 34, 0.72)` | Glass card surface |
| `accent-primary` | `#D7F14A` | Soft Lime-Yellow |
| `accent-secondary` | `#8B5CF6` | Vibrant Purple |
| `accent-cyan` | `#56E0FF` | Highlight Cyan |

## Typography
- **Display**: Satoshi (Bold, Rounded feel)
- **Body**: Inter (Clean, Breathable)
- **Rules**:
  - Hero: 72px / tracking-tight
  - Section: 34px
  - Card Title: 24px
  - Labels: 10px / tracking-widest / uppercase

## Components

### 1. Aura Cards
- **Radius**: `28px` (var(--radius-xl))
- **Backdrop**: `blur(18px)`
- **Border**: `1px solid rgba(255,255,255,0.06)`
- **Shadow**: `0 10px 30px rgba(0,0,0,0.28)`

### 2. Floating Dock
- **Width/Height**: `52px` buttons
- **Indicators**: Circular active glow
- **Feel**: iOS-inspired glass island

### 3. Stat Tiles
- **Structure**: Icon Bubble -> Oversized Number -> Tiny Label
- **Glow**: Subtle radial gradients on hover
