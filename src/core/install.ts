"use client"

/* Whether to offer installing the app, shared by every kit. Chromium browsers hand us their install
   prompt (`beforeinstallprompt`) to show on our own button; iOS has no such event, so there we can
   only explain Share → Add to Home Screen. Nothing is offered once installed, on a desktop pointer,
   or after the visitor dismissed the offer. */

import { useSyncExternalStore } from "react"

type InstallPromptEvent = Event & { prompt(): Promise<unknown>; userChoice: Promise<unknown> }

/** "prompt": the browser's own install dialog is ready. "ios": tell them to use Share. "none": offer nothing. */
export type InstallMode = "prompt" | "ios" | "none"

const KEY = "install-dismissed"
let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

// shortcut: listens from when this module loads, so a prompt fired before hydration is missed until the next visit; move to an inline <head> script if that shows up.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault() // keep Chrome's mini-infobar away; our banner offers it instead
    deferred = event as InstallPromptEvent
    emit()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    emit()
  })
}

function dismissed() {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

function mode(): InstallMode {
  const media = (query: string) => window.matchMedia?.(query).matches ?? false
  const installed = media("(display-mode: standalone)") || (navigator as { standalone?: boolean }).standalone === true
  if (installed || !media("(pointer: coarse)") || dismissed()) return "none"
  if (deferred) return "prompt"
  // iPadOS reports itself as a Mac; the touch screen gives it away.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  return ios ? "ios" : "none"
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether and how to offer installing the app. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, mode, () => "none")
}

/** Opens the browser's install dialog. The offer goes away whatever they answer: Chrome won't reuse a prompt. */
export async function install() {
  const event = deferred
  deferred = null
  await event?.prompt()
  emit()
}

/** Remembers that the visitor doesn't want the offer. It doesn't re-render, so the banner can play its exit. */
export function dismissInstall() {
  try {
    localStorage.setItem(KEY, "1")
  } catch {
    // Private windows can refuse storage; the offer comes back next visit.
  }
}
