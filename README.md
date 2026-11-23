# Brazen Borrower

Tracks who lent which Riftbound cards to whom, and the cards friends offer to lend.
Next.js 16, Convex, and UI SDK for every control. Card data comes from RiftHunt's bulk export, synced daily.

## Run it

```sh
pnpm exec convex dev   # pushes backend changes to the shared cloud deployment (key in .env.local)
pnpm dev               # http://localhost:3333
pnpm test
```

## Layout

- `convex/`: the backend.
- `src/core/`: hooks, rules, card search, and `labels.ts`, the accessible names every control uses.
- `src/kits/keyframery/`: the interface. `ui/` is vendored from Keyframery's shadcn registry and kept as published.
- `src/app/`: the root layout, `globals.css` (Tailwind and the Keyframery theme) and one-line routes.
- `src/proxy.ts`: runs Clerk on every request.

Lint enforces the boundaries: `src/core` can't import the kit, and nothing but UI SDK provides behaviour.

