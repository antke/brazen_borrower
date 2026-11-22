import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { dismissInstall, install, useInstallMode } from "./install"

function phone({ standalone = false, ua = "Mozilla/5.0 (Linux; Android 15)" } = {}) {
  window.matchMedia = ((query: string) => ({
    matches: query === "(pointer: coarse)" || (standalone && query === "(display-mode: standalone)"),
  })) as typeof window.matchMedia
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua)
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

test("Android: offers the browser's prompt once it arrives, and drops it after use", async () => {
  phone()
  const { result } = renderHook(useInstallMode)
  expect(result.current).toBe("none")

  const prompt = vi.fn(async () => {})
  act(() => void window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve() })))
  expect(result.current).toBe("prompt")

  await act(install)
  expect(prompt).toHaveBeenCalledOnce()
  expect(result.current).toBe("none")
})

test("iOS gets instructions; installed or dismissed gets nothing", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"
  phone({ ua: iphone })
  expect(renderHook(useInstallMode).result.current).toBe("ios")

  phone({ ua: iphone, standalone: true })
  expect(renderHook(useInstallMode).result.current).toBe("none")

  phone({ ua: iphone })
  dismissInstall()
  expect(renderHook(useInstallMode).result.current).toBe("none")
})
