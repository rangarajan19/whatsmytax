# whatsmytax — Project Instructions

## Figma Design
- File: `4wRbSWhOMvaZ57zQpMV1dn` (Tax — Zoho)
- Page link: https://www.figma.com/design/4wRbSWhOMvaZ57zQpMV1dn/Tax---Zoho?node-id=0-1

## Design Rules
- **Do not add anything that is not in the Figma design.** If you want to introduce an element, interaction, or behaviour that isn't explicitly shown in the design, ask the user first before implementing it.
- **Only use shadcn/ui components.** Do not introduce any other component libraries.
- **After every feature, take screenshots at three viewports before sharing for review:**
  - Desktop: 1280px wide
  - Tablet: 768px wide
  - Mobile: 390px wide

## Branch Strategy
- All work happens on the `preview` branch first.
- **Never push to `main` without explicitly asking the user first.**
- After pushing to `preview`, share the Vercel preview URL for approval.
- Only push to `main` (live site) after the user confirms they are happy with the preview.

## Tech Stack
- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS v4
- shadcn/ui (Sheet component for DeductionsDrawer)
- Inter font via Google Fonts

## Design Tokens
- Background / accent: `#c7ff0c` (lime)
- Primary text / border: `#003f31` (dark green)
- Font: Inter
