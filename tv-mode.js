/** Persistent, per-origin display preference; only the literal "true" enables it. */
export const TV_MODE_STORAGE_KEY = "navTvMode";
/** Number of distinct Escape presses required to toggle TV/touch mode. */
export const TV_MODE_ESCAPE_PRESS_COUNT = 10;
/** Maximum interval between consecutive Escape presses, in milliseconds. */
export const TV_MODE_ESCAPE_MAX_GAP_MS = 2000;
/** Document event emitted when the display preference changes. */
export const TV_MODE_CHANGE_EVENT = "NavGenTvModeChange";

/**
 * Selects visible, enabled navigation links for initial focus and arrow navigation.
 * Layout rectangles exclude links inside hidden tab panels or search results.
 * @param {ParentNode} container - Navigation root to search.
 * @returns {HTMLElement[]} Focusable links in DOM order, without changing focus.
 */
export function getFocusableNavLinks(container) {
  return Array.from(
    container.querySelectorAll(".link:not(.hidden):not(:disabled):not([tabindex='-1'])"),
  ).filter(
    (link) => link.getClientRects().length > 0 && getComputedStyle(link).visibility !== "hidden",
  );
}

/**
 * Applies and persists TV/touch mode, notifying mounted controls of the new state.
 * Storage denial leaves the current page usable and logs the original exception.
 * @param {boolean} enabled - Whether to enlarge navigation and controls.
 * @returns {void}
 * @throws {Error} Rethrows unexpected, non-DOM storage failures.
 */
export function setTvMode(enabled) {
  document.documentElement.toggleAttribute("data-tv-mode", enabled);
  try {
    localStorage.setItem(TV_MODE_STORAGE_KEY, String(enabled));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn("Unable to save TV/touch mode preference.", error);
  }
  document.dispatchEvent(new CustomEvent(TV_MODE_CHANGE_EVENT, { detail: { enabled } }));
}

/**
 * Initializes the host page preference before rendering and installs its global shortcut.
 * URL flags enable on every load, but do not lock subsequent toggles in that session.
 * Existing key handlers remain active, including those inside inputs and dialogs.
 * Focuses the first visible navigation link once it renders, without stealing later focus.
 * @returns {Function} Cleanup that removes listeners and disconnects pending focus observation.
 * @throws {Error} Rethrows unexpected, non-DOM storage failures.
 */
export function initTvMode() {
  const params = new URLSearchParams(window.location.search);
  let enabled = false;
  try {
    enabled = localStorage.getItem(TV_MODE_STORAGE_KEY) === "true";
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn("Unable to read TV/touch mode preference.", error);
  }
  setTvMode(params.has("tv") || params.has("touch") || enabled);

  let escapeCount = 0;
  let lastEscapeAt = 0;
  const focusObserver = new MutationObserver(focusFirstNavLink);

  /** Focuses the first rendered link once, then stops watching DOM changes. */
  function focusFirstNavLink() {
    const container = document.querySelector("#fav");
    if (!container) return;
    const [firstLink] = getFocusableNavLinks(container);
    if (!firstLink) return;
    focusObserver.disconnect();
    firstLink.focus();
  }

  /** Starts or cancels initial focus when the display preference changes. */
  function handleModeChange() {
    focusObserver.disconnect();
    if (!document.documentElement.hasAttribute("data-tv-mode")) return;
    focusObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "style"],
    });
    focusFirstNavLink();
  }

  /** Resets an interrupted Escape streak without changing the display preference. */
  function resetEscapeStreak() {
    escapeCount = 0;
    lastEscapeAt = 0;
  }

  /**
   * Counts discrete, unmodified Escape presses without consuming keyboard events.
   * @param {KeyboardEvent} event - The captured keydown event.
   * @returns {void}
   */
  function handleKeyDown(event) {
    if (
      event.key !== "Escape" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing
    ) {
      resetEscapeStreak();
      return;
    }
    if (event.repeat) return;

    const now = Date.now();
    if (now - lastEscapeAt > TV_MODE_ESCAPE_MAX_GAP_MS) escapeCount = 0;
    lastEscapeAt = now;
    escapeCount += 1;
    if (escapeCount < TV_MODE_ESCAPE_PRESS_COUNT) return;

    resetEscapeStreak();
    setTvMode(!document.documentElement.hasAttribute("data-tv-mode"));
  }

  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("blur", resetEscapeStreak);
  document.addEventListener(TV_MODE_CHANGE_EVENT, handleModeChange);
  handleModeChange();
  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("blur", resetEscapeStreak);
    document.removeEventListener(TV_MODE_CHANGE_EVENT, handleModeChange);
    focusObserver.disconnect();
  };
}
