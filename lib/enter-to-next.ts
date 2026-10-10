import type { KeyboardEvent } from "react";

// Fields Enter moves between: text inputs, selects, checkboxes, and any
// element marked data-enter-target (e.g. the product picker button).
const FIELDS = [
  "input:not([type=hidden]):not([type=file]):not([disabled]):not([readonly])",
  "select:not([disabled])",
  "[data-enter-target]:not([disabled])",
].join(",");

/**
 * onKeyDown handler for a form: Enter moves focus to the next field instead
 * of submitting. Leaves Enter alone in textareas, on buttons (so they still
 * click), and inside the product search popup (Enter picks a product there).
 * On the last field it does nothing — saving stays an explicit button press.
 */
export function enterToNextField(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.nativeEvent.isComposing) return;

  const target = e.target as HTMLElement;
  if (target.closest("[cmdk-root]")) return;
  if (target.tagName === "TEXTAREA") return;
  if (target.tagName === "BUTTON" && !target.hasAttribute("data-enter-target")) return;
  // a picker with nothing chosen yet: let Enter open it
  if (target.getAttribute("data-enter-target") === "open") return;
  if (!target.matches(FIELDS)) return;

  e.preventDefault();
  const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FIELDS)).filter(
    (el) => el.offsetParent !== null // skip hidden sections (e.g. guarantors on a direct sale)
  );
  const next = fields[fields.indexOf(target) + 1];
  if (!next) return;
  next.focus();
  if (next instanceof HTMLInputElement && ["text", "search", "tel", "email", ""].includes(next.type)) next.select();
}
