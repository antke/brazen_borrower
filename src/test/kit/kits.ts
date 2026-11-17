import type { ComponentType } from "react"
import type { Kit } from "@/core/kit"
import { LoansPage } from "@/kits/keyframery/loans-page"
import { PeoplePage } from "@/kits/keyframery/people-page"
import { PoolPage } from "@/kits/keyframery/pool-page"

/** Every kit's pages; a kit added to core/kit.ts doesn't compile until it's listed here and passes the shared tests. */
export const kitPages: Record<Kit, { LoansPage: ComponentType; PoolPage: ComponentType; PeoplePage: ComponentType }> = {
  keyframery: { LoansPage, PoolPage, PeoplePage },
}

export const kitCases = Object.entries(kitPages)
