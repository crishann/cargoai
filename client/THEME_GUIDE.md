# CarGoAI Theme Guide

Use this guide for all future CarGoAI pages so they stay visually consistent with the landing page.

## Reusable Prompt

Create this page in the same visual theme as the current CarGoAI landing page: clean, modern, premium, soft, and easy to scan. Use a bright blue brand direction with smooth rounded corners, gentle shadows, soft gradients, airy spacing, and a polished white/slate content surface. Keep the UI feeling lightweight and trustworthy, not crowded or harsh.

Design rules:
- Use a clean blue palette with white, soft slate, and light blue accents
- Prefer rounded corners around `20px` to `32px`
- Use soft shadows, not heavy dark ones
- Keep sections spacious with strong visual hierarchy
- Make content easy to scan with short headings, calm body text, and clear spacing
- Use cards with subtle borders and soft backgrounds
- Buttons should feel smooth and premium, with rounded full or extra-rounded shapes
- Inputs and panels should look clean, minimal, and welcoming
- Backgrounds should use subtle gradients or light texture, never flat and boring
- Typography should feel modern and readable, with bold headings and soft secondary text
- Keep the overall style professional, friendly, and polished
- Match the same aesthetic direction as the landing page hero, feature cards, and search panel
- Mobile and desktop should both feel balanced and uncluttered

Visual keywords:
- clean
- premium
- modern
- soft edges
- bright blue
- white surfaces
- subtle gradient
- smooth shadows
- easy to scan
- polished SaaS car rental UI

Short version:

Build this page in the same CarGoAI theme as the landing page: bright blue premium UI, soft rounded corners, white card surfaces, subtle gradients, clean spacing, smooth shadows, and an easy-to-scan layout. Keep it modern, polished, minimal, and consistent with the landing page style.

## Theme Tokens

Primary colors from the current UI:
- `--cargo-blue-bright: #2563eb`
- `--cargo-blue-deep: #1e3a8a`
- `--cargo-cream: #f8fafc`
- `--cargo-ink: #0f172a`
- `--cargo-white: #ffffff`
- `--cargo-gray: #8d8d8d`

Usage guidance:
- Use `cargo-blue-bright` for key CTAs and accents
- Use `cargo-blue-deep` for strong actions, headings, and emphasis
- Use `cargo-cream` or white for content surfaces
- Use `cargo-ink` for primary text
- Use slate grays for secondary text and borders

## Layout Style

- Favor generous horizontal padding and vertical breathing room
- Organize content into distinct sections with clear spacing between them
- Prefer clean card-based layouts over dense panels
- Use 1 to 2 primary actions per section
- Make the first screen immediately understandable

## Component Style

Cards:
- Rounded corners: `rounded-[1.75rem]` to `rounded-[2rem]`
- White or very light surfaces
- Light border with subtle shadow

Buttons:
- Rounded full or extra-rounded shapes
- Primary buttons in bright or deep blue
- Secondary buttons with white or slate surfaces and light borders

Inputs:
- Large hit area
- Rounded corners
- Soft gray background or white background with subtle border
- Minimal chrome, clear placeholder text

Modals:
- White surface
- Soft shadow
- Rounded corners
- Calm spacing and low visual noise

## Page Checklist

Before finishing a new page, check:
- Does it feel consistent with the landing page?
- Are the corners soft and polished?
- Is the hierarchy easy to scan in under 5 seconds?
- Are the shadows subtle and clean?
- Are there enough white/cream spaces to avoid clutter?
- Are mobile and desktop layouts both comfortable?

## Reference Files

Use these files as the current source of truth:
- `client/src/pages/Landing.jsx`
- `client/src/index.css`
