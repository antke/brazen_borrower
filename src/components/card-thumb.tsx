import Image from "next/image"

export function CardThumb({ src, size = 40 }: { src: string; size?: number }) {
  // Card art is 744×1039; alt is empty because the card's name is always printed next to it.
  return <Image src={src} alt="" width={size} height={Math.round((size * 1039) / 744)} className="rounded-sm" />
}
