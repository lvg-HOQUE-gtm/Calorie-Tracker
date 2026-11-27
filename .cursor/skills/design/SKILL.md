---
name: design
description: Apply Ahaar FitBite design rules when building or changing UI. Use for screens, layout, styling, forms, empty/loading/error states, and any visual work in src/screens or src/components.
---

# Ahaar design

Build Ahaar UI by composing the app's existing React Native primitives and
semantic design tokens. Do not introduce shadcn/ui, Tailwind, CSS variables,
or another component library.

## Start with project context

Before changing UI:

1. Read `src/theme/index.ts` for colors, radii, spacing, typography, and shadows.
2. Read `src/components/index.ts` and the relevant component implementations.
3. Read the surrounding screen to match its layout, naming, and interaction patterns.

Reuse what exists before writing custom markup:

| Need | Existing primitive |
| --- | --- |
| Button or action | `PrimaryButton` |
| Card or elevated surface | `GlassCard` |
| Empty state | `EmptyState` |
| Blocking progress | `LoadingOverlay` |
| Bottom navigation | `BottomTabBar` |
| Meal list content | `LogListItem`, `MealThumbnail` |
| Numeric stepper | `PortionStepper` |
| Nutrition display | `MacroCard`, `MacroBar`, `CalorieRing`, `WeeklyColumnChart` |

## Composition rules

- Compose existing primitives instead of recreating them.
- Use built-in `PrimaryButton` variants (`primary`, `secondary`, `dark`,
  `outline`, `ghost`, `danger`) before adding custom button styles.
- Keep new shared components focused and only extract them when they are reused
  or materially simplify a screen.
- Keep screens mobile-first for a 390-point-wide viewport and readable on Expo web.
- Use `StyleSheet` with flex rows or columns and `gap` for related elements.
- Use `SafeAreaView` and preserve clearance for the floating bottom tab bar.

## Semantic styling

- Import and use `colors`, `radii`, `spacing`, `typography`, and `shadow` from
  `src/theme`.
- Never paste raw brand hex values into screens or create one-off greens.
- Use semantic feedback colors: `success`, `warning`, and `danger`.
- Use existing macro colors for protein, carbs, fat, and fiber.
- Prefer theme typography and spacing before adding one-off values.

## Forms and interactions

- Pair each `TextInput` with a visible label or an `accessibilityLabel`.
- Use theme tokens for text, placeholder, border, focus, and validation colors.
- Group related fields visually and show actionable validation text with
  `colors.danger`.
- Give every `Pressable` an accessibility role and label when its purpose is
  not explicit text.
- Keep destructive actions behind confirmation and use the `danger` button variant.
- Do not add a form library unless the task requires one.

## States

Every data-driven screen must cover:

- Loading: use the existing loading primitive or `ActivityIndicator` with
  `colors.primaryGreen`.
- Empty: use `EmptyState` with real, useful copy and an action when appropriate.
- Error: show concise recovery-oriented text using `colors.danger`.
- Disabled or pending actions: disable duplicate submission and expose the
  state through the existing component API.

## Icons

- Use `Ionicons` from `@expo/vector-icons`.
- Match existing header and tab icon sizing, normally 18–22 points.
- Do not add a second icon package.

## Final check

Before finishing UI work, verify that it:

- Reuses existing components and theme tokens.
- Works at mobile width and remains readable on Expo web.
- Has loading, empty, error, and disabled states where applicable.
- Has accessible labels for icon-only controls.
- Introduces no unnecessary dependency, abstraction, or duplicate primitive.
