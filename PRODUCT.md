# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One playgroup of friends who lend each other cards for Riftbound, Riot Games' trading card game. Most lending happens between game nights. The group trusts each other, so anyone can record or change anything.

## Product Purpose

A shared record of who has whose Riftbound cards. People offer copies to a community pool, record loans when cards change hands, and mark loans returned when the cards come back. The app records physical lending. It does not enforce anything.

Success means the group's record matches who actually holds which cards.

## Positioning

A record kept by one group for itself. It is not a marketplace or a trading platform. Pool availability is calculated, never typed in: copies offered minus copies on loans that have not been returned. Cards are picked from the full Riftbound catalogue by name, set or number, with their art, so a record always points at an exact printing.

## Operating Context

- Cards change hands in person. The app records what already happened at the table.
- A card is identified by name, set code and printed number, for example `Name · OGN 007a`. Letter suffixes on numbers matter.
- Card art is 744×1039 and shows next to the card name wherever a card is listed.

## Capabilities and Constraints

Current functionality:

- **Loans** (`/`): record a lender, a borrower and one or more cards, each with 1–99 copies. Each card appears once per loan, and the lender and borrower must be different people. Loans show under "Out now" until someone marks them returned, then move to "Returned".
- **Pool** (`/pool`): an owner offers a number of copies of a card. Setting the number to 0 withdraws the offer. Each row shows copies offered, copies lent out and copies available. The pool can be filtered by card or owner.
- **People** (`/people`): add a person by name (1–40 characters, unique).
- People and loans cannot be edited or deleted yet.
- Nobody signs in. Whether the app stays without accounts is undecided.

Technical constraints:

- Next.js 16 App Router. This version breaks earlier conventions, so read `node_modules/next/dist/docs/` before writing Next code. Convex is the realtime backend and database. UI is built with `@ui-sdk/react` (beta), Tailwind CSS 4 and lucide-react. Tests run on Vitest. The dev server runs on port 3333.
- **One UI kit:** the interface is Keyframery, in `src/kits/keyframery/`, with plain routes and styles in `src/app/`. Hooks, rules and accessible names live in `src/core`. Every component comes from the kit's `ui/` wrappers, and pages must not override their styles. The full rules are in `AGENTS.md`.
- **Agent-operable:** `src/core/providers.tsx` registers ui-sdk agent tools (WebMCP), so agents can operate every control. New controls must stay reachable that way. Any action that needs a person's confirmation must be marked `data-agent-confirm`.
- **Catalogue:** card data comes from RiftHunt's bulk export (`api.rifthunt.com/bulk/cards`). Card art is hosted on Riot's CDN (`cmsassets.rgpub.io`), which is the only remote image host allowed in `next.config.ts`. A cron syncs it daily at 05:00 UTC. RiftHunt asks for at most one bulk download a day and a User-Agent that names the client.

Terminology: Loan, Lender, Borrower, Out now, Mark returned, Returned; Pool (Community pool), Offer, Withdraw, Offered, Lent out, Available; People; Catalogue.

Open decisions:

- Which job leads: lenders getting their cards back, or borrowers finding an available copy. This was asked and left open. Do not assume either until it is decided.
- Product name: Brazen Borrower (confirmed). The repository is `brazen_borrower`.

## Brand Commitments

- **Unofficial fan tool.** It is not affiliated with Riot Games. Do not use official Riot or Riftbound logos or branding. Card data comes from RiftHunt, and the UI must credit RiftHunt. Card art belongs to Riot.

## Evidence on Hand

- Card names, sets, numbers, rarities and art URLs come from the synced RiftHunt catalogue. The art itself loads from Riot's CDN.
- There is no logo, wordmark or other brand asset. `public/` contains only the Next.js starter SVGs.
- Live data is limited to whatever the group has entered. Do not invent example people, loans or usage numbers in shipped UI.

## Product Principles

1. **Built for one group that trusts itself.** Make recording quick and honest instead of adding checks. Assume good faith.
2. **Calculate state; don't ask for it.** Values like availability come from the record of loans and offers, so they cannot drift from the truth.
3. **Every card is an exact printing.** Show a card by its art, name, set and number, never by name alone.
4. **The look lives in the kit.** Visual decisions go into the active kit's components and theme, never into a page. That keeps the app consistent and lets a different kit replace the whole look.
5. **Agents are users too.** Anything a person can do in the UI, an agent can do through the bridge.
