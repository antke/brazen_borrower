import type { ComponentType } from "react"
import { DeckBuilderPage, DecksPage } from "@/kits/keyframery/decks"
import { LoansPage } from "@/kits/keyframery/loans-page"
import { MePage } from "@/kits/keyframery/me-page"
import { PoolPage } from "@/kits/keyframery/pool-page"

type Pages = {
  LoansPage: ComponentType
  PoolPage: ComponentType
  MePage: ComponentType
  DecksPage: ComponentType
  DeckBuilderPage: ComponentType<{ id: string }>
}

/** The app's pages, run through the shared tests. */
export const kitPages: Record<string, Pages> = {
  keyframery: { LoansPage, PoolPage, MePage, DecksPage, DeckBuilderPage },
}

export const kitCases = Object.entries(kitPages)
