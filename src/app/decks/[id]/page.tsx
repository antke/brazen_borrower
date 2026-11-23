import { Suspense } from "react"
import { DeckBuilderPage } from "@/kits/keyframery/decks"

// The id ("new" for a new deck) is only known per request, so it's read inside Suspense (cacheComponents),
// and the page renders per request: the shell reads the URL, which a prerendered shell can't know.
export const instant = false

async function Builder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DeckBuilderPage id={id} />
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Builder params={params} />
    </Suspense>
  )
}
