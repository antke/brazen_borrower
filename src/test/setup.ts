import { cleanup } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, vi } from "vitest"

// next/image needs the Next server to optimise; a plain img is enough in jsdom.
vi.mock("next/image", () => ({ default: (props: object) => createElement("img", props) }))
// Clerk's buttons only wrap the kit's own button; tests drive sign-in state through the Convex mock.
vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: unknown }) => children,
  SignOutButton: ({ children }: { children: unknown }) => children,
}))

declare global {
  var __UI_SDK_STRICT__: boolean | undefined
}
globalThis.__UI_SDK_STRICT__ = true

// jsdom gaps ui-sdk popups need; assigned, not ??=, since jsdom has partial versions of some.
HTMLElement.prototype.showPopover = function () {}
HTMLElement.prototype.hidePopover = function () {}
Element.prototype.getAnimations = () => []
Element.prototype.scrollIntoView = function () {}
Element.prototype.checkVisibility = () => true
Element.prototype.getClientRects = () => [] as unknown as DOMRectList
document.elementFromPoint = () => null
document.elementsFromPoint = () => []
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
document.head.append(
  Object.assign(document.createElement("style"), {
    textContent: "[popover] { display: block !important }",
  })
)

afterEach(cleanup)
