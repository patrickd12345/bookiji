# Bookiji Brand Guidelines

> "Book any service, anywhere. Guaranteed." - Our Promise

## Core Brand Elements

### Primary Gradient
Our signature gradient flows from blue to purple, representing trust and innovation:
```css
background: linear-gradient(to right, #2563eb, #9333ea); /* from-blue-600 to-purple-600 */
```

### Usage Patterns

1. **Primary Brand Elements**
   - Logo text
   - Main headings (with transparent text)
   - Call-to-action buttons
   - Feature highlights

2. **UI Components**
   - Modal headers
   - Selection indicators
   - Progress elements
   - Interactive elements hover states

3. **Animation**
   - Subtle transitions
   - Loading states
   - Interactive feedback

## Implementation Examples

### Text Gradient
```tsx
className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
```

### Button Gradient
```tsx
className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
```

### Interactive Element
```tsx
className="hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white transition-all"
```

## Typography

- **Primary Font**: Inter
- **Usage**: Clean, modern, highly readable
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## Color Palette

### Primary Colors
- Blue (`#2563eb`) - Trust, Reliability
- Purple (`#9333ea`) - Innovation, Creativity

### Supporting Colors
- Background: Pure white (`#ffffff`)
- Text: Rich black (`#111827`)
- Muted Text: Gray (`#6B7280`)
- Success: Green (`#10B981`)
- Warning: Yellow (`#F59E0B`)
- Error: Red (`#EF4444`)

## Design Principles

1. **Clean & Professional**
   - Ample white space
   - Clear hierarchy
   - Minimal decoration

2. **Subtle Motion**
   - Smooth transitions
   - Purposeful animations
   - Response to user interaction

3. **Consistent Interaction**
   - Clear hover states
   - Visible focus indicators
   - Predictable patterns

## Component Guidelines

### Buttons
- Gradient background for primary actions
- Solid color for secondary actions
- Ghost style for tertiary actions
- Consistent padding and border radius

### Cards
- Subtle shadows
- Rounded corners
- Optional hover lift effect
- Clean internal spacing

### Forms
- Clear labels
- Visible focus states
- Helpful validation messages
- Consistent spacing

### Modals
- Gradient headers
- Centered content
- Clear close action
- Smooth enter/exit animations

## Voice & Tone

- Professional yet approachable
- Clear and concise
- Empowering and confident
- Solution-focused

## AI Assistant Character

Our AI assistant is represented by 🧙‍♂️ (Unicode: U+1F9D9), a wise and friendly wizard character. This choice reflects:

- **Wisdom**: The traditional wizard represents deep knowledge and expertise
- **Approachability**: The friendly appearance makes users comfortable seeking help
- **Magic**: Suggests the ability to make complex tasks simple
- **Trust**: The distinguished appearance conveys reliability and experience

### Usage Guidelines
- Use the wizard emoji when the AI is introducing itself
- Maintain consistency across all AI interactions
- Pair with our signature blue-to-purple gradient in UI elements
- Keep the tone wise but friendly, never intimidating

---

> Note: This is a living document. As Bookiji evolves, we'll update these guidelines to reflect our growing brand identity. 