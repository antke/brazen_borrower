/* Light or dark, shared by every kit. The choice is a `dark` class on <html>: a visitor's pick is
   remembered in localStorage, and without one the page follows the operating system. */

const KEY = "theme"

/** Inline in <head>, so the page paints in the right theme on the first frame. */
export const themeScript = `(function(){var t;try{t=localStorage.getItem("${KEY}")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")})()`

/** Flips between light and dark and remembers the choice. */
export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark")
  try {
    localStorage.setItem(KEY, dark ? "dark" : "light")
  } catch {
    // Private windows can refuse storage; the flip still applies for this visit.
  }
  const apply = () => document.documentElement.classList.toggle("dark", dark)
  if (document.startViewTransition) document.startViewTransition(apply)
  else apply()
}
