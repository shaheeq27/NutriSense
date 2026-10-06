# NutriSense: Figma File Structure & Developer Handoff

Organise the Figma file so it mirrors the product domains in code. Each page maps to a frontend feature module and a backend service, so designers, developers and reviewers all use the same vocabulary.

## Page order

| # | Figma page | Contents | Code counterpart |
|---|---|---|---|
| 00 | **Cover** | Project name, tagline, status, owners, last updated | — |
| 01 | **Brand** | Logo (main, horizontal, app icon, light/dark, monochrome), clear space and minimum size, wordmark "Nutri" + "Sense", tagline lock-up *Nutrition That Makes Sense.*, voice and tone | `components/brand/Logo`, `public/brand/` |
| 02 | **Design System** | Color, type, spacing, radius and elevation variables; components (Button, Card, Chip, Input, Field, Tabs, Ring, ProgressBar, Badge, Sheet, Toast, EmptyState, Skeleton); icons; feedback states | `src/app/globals.css` tokens, `components/ui/*` |
| 03 | **Authentication** | Login, register, errors, loading | `features/auth`, `app/(auth)` · API `auth_service` |
| 04 | **Onboarding** | Goal, body metrics, activity, food style, allergies, "You're all set" | `features/onboarding` · `user_service`, `nutrition_service` (targets) |
| 05 | **Food Analysis** | Search, natural-language input, scan/camera, identified, result with servings, estimate state, no-match | `features/food-analysis` · `food_service`, `scan_service`, `nutrition_service` |
| 06 | **BMI** | Calculator, result per WHO category, healthy range | `features/bmi` · `bmi_service` |
| 07 | **Dashboard** | Goals → today's plan → logged food → nutrition → progress → insights | `features/dashboard` · `tracking_service`, `recommendation_service` |
| 08 | **Meal Planning** | 3-day strip + locked day, plan cards, swap sheet, add-to-plan, meal detail | `features/meal-planning` · `meal_planning_service` |
| 09 | **Nutrition Tracking** | Today summary, macro rings, per-slot logs, log sheet, delete/undo | `features/tracking` · `tracking_service` |
| 10 | **Progress** | 7d / 30d / 90d charts, streak, adherence, insights | `features/progress` · `progress_service` |
| 11 | **Profile** | Profile, targets, preferences, theme, sign-out | `features/profile` · `user_service` |
| 12 | **Mobile** | 390 px versions of key flows, bottom tab bar, sheets | `components/layout/MobileNav` |
| 13 | **Prototype** | Connected flows: guest search → result → sign up → onboarding → dashboard → plan → log | — |
| 14 | **Developer Handoff** | Token table, component specs, API ↔ screen map, states checklist, redlines | `docs/`, `types/`, API `/docs` |

Keep 🗃️ **Archive** and 🧪 **Explorations** pages at the bottom, outside the numbered sequence.

## Variables (Design System → Developer Handoff)

Use variable collections with **Light** and **Dark** modes. The names match the CSS custom properties in code.

| Variable | Light | Role |
|---|---|---|
| `color/primary` | `#1B5E20` | Deep green: primary actions, wordmark "Nutri" |
| `color/secondary` | `#4CAF50` | Fresh green: success, progress |
| `color/accent` | `#FF8F3D` | Warm orange: highlights, "Sense" |
| `color/accent-tomato` | `#EF5350` | Gradient start, alerts |
| `color/accent-gold` | `#FBC02D` | Sparing highlights |
| `color/bg` | `#FFF8EC` | Cream background |
| `color/text` | charcoal | Body text |
| `font/display` · `font/body` · `font/mono` · `font/brand` | Fraunces · Nunito Sans · DM Mono · Poppins | |

Green is an accent color, not the dominant one. Most of each surface should be cream, paper or beige.

## Frame and component naming

- Frames: `Domain / Screen / State` → `Meal Planning / Plan / Day locked`
- Components: same names as the code → `Button`, `Card`, `EmptyState`. Variants match props → `variant=primary|secondary|ghost`, `size=md|lg`.
- Every screen frame covers **Default, Loading, Empty, Error** (and **Estimate** for food results).

## Handoff checklist (per screen)

- [ ] Uses only Design System components and variables
- [ ] All states designed (default, loading, empty, error)
- [ ] Mobile (390) and desktop (1440) frames
- [ ] API endpoint(s) annotated, e.g. `GET /api/v1/meal-plans?start=`
- [ ] Business rules annotated, e.g. "plan window = today + 2 days", "log today only"
- [ ] Copy final; accessibility notes (labels, focus order, contrast)
