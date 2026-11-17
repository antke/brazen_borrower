# Riftbound card pool

Tracks who lent which Riftbound cards to whom, and the cards friends offer to lend.
Next.js 16, Convex, and UI SDK for every control. Card data comes from RiftHunt's bulk export, synced daily.

## Run it

```sh
pnpm exec convex dev   # local backend, no account needed
pnpm dev               # http://localhost:3333
pnpm test              # every test runs against every kit
```

## Layout

- `convex/`: the backend.
- `src/core/`: everything kits share: hooks, rules, card search, and `labels.ts`, the accessible names every kit must use.
- `src/kits/<kit>/`: one complete interface. `ui/` is vendored from the kit's shadcn registry and kept as published.
- `src/app/(<kit>)/`: that kit's root layout and one-line routes under `/<kit>/…`.
- `src/proxy.ts`: serves the kit chosen by the `kit` cookie at the shared URLs (`/pool` → `/keyframery/pool`).

Lint enforces the boundaries: `src/core` can't import a kit, a kit can't import another kit, and nothing but UI SDK provides behaviour.

## Adding a kit

1. Add its name to `kits` in `src/core/kit.ts` and in `eslint.config.mjs`.
2. Skip its folder in the matcher in `src/proxy.ts`.
3. Build `src/kits/<kit>/` and `src/app/(<kit>)/<kit>/` with the same three pages, using `labels` for every control.
4. List its pages in `src/test/kit/kits.ts`; the shared tests then run against it.
