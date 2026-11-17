/** Every interface kit. Each has its own root layout under src/app/(<kit>)/<kit>/, chosen by the kit cookie. */
export const kits = ["keyframery"] as const
export type Kit = (typeof kits)[number]

export const defaultKit: Kit = "keyframery"
export const kitCookie = "kit"

export const readKit = (value: string | undefined): Kit =>
  kits.find((kit) => kit === value) ?? defaultKit
