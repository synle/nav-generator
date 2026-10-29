import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  getFocusableNavLinks,
  initTvMode,
  setTvMode,
  TV_MODE_CHANGE_EVENT,
  TV_MODE_ESCAPE_MAX_GAP_MS,
  TV_MODE_ESCAPE_PRESS_COUNT,
  TV_MODE_STORAGE_KEY,
} from "../tv-mode.js";
import { TvModeToggle } from "../tv-mode-toggle.jsx";

let stopMode;

/**
 * Sends distinct Escape keydowns through the browser's real event path.
 * @param {number} count - Number of physical presses to simulate.
 * @returns {void}
 */
function pressEscape(count) {
  for (let index = 0; index < count; index += 1) {
    fireEvent.keyDown(document, { key: "Escape" });
  }
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-tv-mode");
  window.history.replaceState(null, "", "/");
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  stopMode?.();
  stopMode = undefined;
  document.documentElement.removeAttribute("data-tv-mode");
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("TV/touch preference initialization", () => {
  it("keeps shortcut settings together with the requested defaults", () => {
    expect(TV_MODE_STORAGE_KEY).toBe("navTvMode");
    expect(TV_MODE_ESCAPE_PRESS_COUNT).toBe(10);
    expect(TV_MODE_ESCAPE_MAX_GAP_MS).toBe(2000);
  });

  it.each([
    [null, false],
    ["false", false],
    ["true", true],
    ["1", false],
    ["TRUE", false],
    ["", false],
    ["{broken}", false],
  ])("restores only the literal enabled value (%s)", (saved, expected) => {
    if (saved !== null) localStorage.setItem("navTvMode", saved);
    stopMode = initTvMode();
    expect(document.documentElement.hasAttribute("data-tv-mode")).toBe(expected);
    expect(localStorage.getItem("navTvMode")).toBe(String(expected));
  });

  it.each(["?tv", "?touch", "?other=1&tv#section", "?touch=1", "?tv&touch"])(
    "enables and persists from the host page URL %s despite a saved off preference",
    (url) => {
      localStorage.setItem("navTvMode", "false");
      window.history.replaceState(null, "", `/${url}`);
      const href = window.location.href;
      stopMode = initTvMode();
      expect(document.documentElement).toHaveAttribute("data-tv-mode");
      expect(localStorage.getItem("navTvMode")).toBe("true");
      expect(window.location.href).toBe(href);
    },
  );

  it.each(["?television", "?TV", "?q=touch", "#?tv"])(
    "does not enable from partial names, values, or fragments (%s)",
    (url) => {
      window.history.replaceState(null, "", `/${url}`);
      stopMode = initTvMode();
      expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
      expect(localStorage.getItem("navTvMode")).toBe("false");
    },
  );

  /** Verifies the emitted preference payload alongside its applied and persisted state. */
  it("notifies controls with the applied and saved state", async () => {
    const change = new Promise((resolve) =>
      document.addEventListener(TV_MODE_CHANGE_EVENT, resolve, { once: true }),
    );
    setTvMode(true);
    expect((await change).detail).toMatchInlineSnapshot(`
      {
        "enabled": true,
      }
    `);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("true");
  });

  it("restores both toggled states through a fresh initialization", () => {
    setTvMode(true);
    document.documentElement.removeAttribute("data-tv-mode");
    stopMode = initTvMode();
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    setTvMode(false);
    stopMode();
    stopMode = initTvMode();
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
  });

  it("allows toggling off during a URL-enabled session and re-enables on reload", () => {
    window.history.replaceState(null, "", "/?tv");
    stopMode = initTvMode();
    pressEscape(10);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
    stopMode();
    stopMode = initTvMode();
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("true");
  });

  it("keeps URL activation and keyboard toggles usable when storage is denied", () => {
    const error = new DOMException("Storage unavailable", "SecurityError");
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw error;
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw error;
    });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.history.replaceState(null, "", "/?touch");
    stopMode = initTvMode();
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    pressEscape(10);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(warning).toHaveBeenCalledWith("Unable to read TV/touch mode preference.", error);
    expect(warning).toHaveBeenCalledWith("Unable to save TV/touch mode preference.", error);
  });

  it("does not mask unexpected storage read failures", () => {
    const error = new TypeError("Unexpected read failure");
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw error;
    });
    expect(() => initTvMode()).toThrow(error);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
  });

  it("does not mask unexpected storage write failures", () => {
    const error = new TypeError("Unexpected write failure");
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw error;
    });
    expect(() => setTvMode(true)).toThrow(error);
  });
});

describe("global Escape sequence", () => {
  beforeEach(() => {
    stopMode = initTvMode();
  });

  it("toggles only on the tenth press and resets for another ten", () => {
    pressEscape(9);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("true");
    pressEscape(9);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    pressEscape(1);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
  });

  it("counts a press exactly 2000 ms after the preceding press", () => {
    pressEscape(9);
    vi.advanceTimersByTime(2000);
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
  });

  it("restarts at one after a gap longer than 2000 ms", () => {
    pressEscape(9);
    vi.advanceTimersByTime(2001);
    pressEscape(1);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
    pressEscape(8);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
  });

  it("uses the gap between presses, not a two-second total sequence deadline", () => {
    pressEscape(8);
    vi.advanceTimersByTime(2000);
    pressEscape(1);
    vi.advanceTimersByTime(2000);
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
  });

  it.each([
    { key: "a" },
    { key: "Escape", altKey: true },
    { key: "Escape", ctrlKey: true },
    { key: "Escape", metaKey: true },
    { key: "Escape", shiftKey: true },
    { key: "Escape", isComposing: true },
  ])("resets an interrupted streak for %j", (event) => {
    pressEscape(9);
    fireEvent.keyDown(document, event);
    pressEscape(9);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
  });

  it("ignores auto-repeat without consuming the Escape event", () => {
    pressEscape(9);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
  });

  it("resets when the window loses focus", () => {
    pressEscape(9);
    fireEvent(window, new Event("blur"));
    pressEscape(9);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    pressEscape(1);
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
  });

  it("captures presses inside inputs even if their existing handler stops propagation", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      input.value = "cleared by existing handler";
    });
    pressEscape(9);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(input.value).toBe("cleared by existing handler");
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    input.remove();
  });

  it("removes its shortcut listener on teardown", () => {
    stopMode();
    pressEscape(10);
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
  });
});

/**
 * Renders independent navigation links with explicit geometry because Happy DOM has no layout.
 * @returns {Object} The rendered links and React Testing Library lifecycle handles.
 */
function renderNavLinks() {
  const view = render(
    React.createElement(
      "div",
      { id: "fav" },
      <a className="link" href="https://example.com/first">
        First
      </a>,
      <a className="link" href="https://example.com/second">
        Second
      </a>,
    ),
  );
  const first = screen.getByRole("link", { name: "First" });
  const second = screen.getByRole("link", { name: "Second" });
  vi.spyOn(first, "getClientRects").mockReturnValue([new DOMRect(0, 0, 200, 100)]);
  vi.spyOn(second, "getClientRects").mockReturnValue([new DOMRect(220, 0, 200, 100)]);
  return { ...view, first, second };
}

describe("TV/touch initial link focus", () => {
  it("focuses the first visible link when restoring an enabled preference", () => {
    const { first } = renderNavLinks();
    localStorage.setItem("navTvMode", "true");
    stopMode = initTvMode();
    expect(first).toHaveFocus();
  });

  it("does not move focus in normal mode", () => {
    const { first, second } = renderNavLinks();
    second.focus();
    stopMode = initTvMode();
    expect(first).not.toHaveFocus();
    expect(second).toHaveFocus();
  });

  it("focuses the first link when toggling on after the nav is already rendered", () => {
    const { first } = renderNavLinks();
    stopMode = initTvMode();
    pressEscape(10);
    expect(first).toHaveFocus();
  });

  it("waits for asynchronous schema content before applying initial focus", async () => {
    window.history.replaceState(null, "", "/?tv");
    stopMode = initTvMode();
    const { first } = renderNavLinks();
    await act(async () => {});
    expect(first).toHaveFocus();
  });

  it("waits until a hidden tab panel exposes a focusable link", async () => {
    const { first, second } = renderNavLinks();
    first.classList.add("hidden");
    second.classList.add("hidden");
    window.history.replaceState(null, "", "/?touch");
    stopMode = initTvMode();
    expect(first).not.toHaveFocus();
    await act(async () => first.classList.remove("hidden"));
    expect(first).toHaveFocus();
  });

  it("does not steal focus on later schema or search mutations", async () => {
    const { first, second } = renderNavLinks();
    window.history.replaceState(null, "", "/?tv");
    stopMode = initTvMode();
    expect(first).toHaveFocus();
    second.focus();
    await act(async () => first.classList.add("updated"));
    expect(second).toHaveFocus();
  });

  it("cancels pending initial focus when toggled off", async () => {
    window.history.replaceState(null, "", "/?tv");
    stopMode = initTvMode();
    pressEscape(10);
    const { first, second } = renderNavLinks();
    second.focus();
    await act(async () => {});
    expect(first).not.toHaveFocus();
    expect(second).toHaveFocus();
  });

  it("disconnects pending focus observation on teardown", async () => {
    window.history.replaceState(null, "", "/?tv");
    stopMode = initTvMode();
    stopMode();
    const { first, second } = renderNavLinks();
    second.focus();
    await act(async () => {});
    expect(first).not.toHaveFocus();
    expect(second).toHaveFocus();
  });

  it("excludes hidden, disabled, non-tabbable, and non-rendered links in DOM order", () => {
    const { first, second } = renderNavLinks();
    render(
      <div>
        <a className="link hidden" href="https://example.com/hidden">
          Hidden
        </a>
        <div hidden>
          <a className="link" href="https://example.com/layout-hidden">
            Hidden ancestor
          </a>
        </div>
        <a className="link" tabIndex={-1} href="https://example.com/untabbable">
          Non-tabbable
        </a>
        <button className="link" disabled>
          Disabled
        </button>
        <a className="link" style={{ visibility: "hidden" }} href="https://example.com/invisible">
          Invisible
        </a>
      </div>,
    );
    vi.spyOn(screen.getByText("Hidden ancestor"), "getClientRects").mockReturnValue([]);
    const invisible = screen.getByText("Invisible");
    vi.spyOn(invisible, "getClientRects").mockReturnValue([new DOMRect(0, 120, 200, 100)]);
    expect(getFocusableNavLinks(document)).toEqual([first, second]);
  });
});

describe("Settings display toggle", () => {
  it("exposes and persists both states on tap", () => {
    stopMode = initTvMode();
    render(<TvModeToggle />);
    const button = screen.getByRole("button", { name: "TV / Touch Mode: Off" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveTextContent("TV / Touch Mode: On");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("true");
    fireEvent.click(button);
    expect(button).toHaveTextContent("TV / Touch Mode: Off");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).not.toHaveAttribute("data-tv-mode");
    expect(localStorage.getItem("navTvMode")).toBe("false");
  });

  it("starts enabled after URL initialization and follows keyboard toggles", () => {
    window.history.replaceState(null, "", "/?touch");
    stopMode = initTvMode();
    render(<TvModeToggle />);
    const button = screen.getByRole("button", { name: "TV / Touch Mode: On" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    act(() => pressEscape(10));
    expect(button).toHaveTextContent("TV / Touch Mode: Off");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("can unmount and remount without leaving stale preference state", () => {
    stopMode = initTvMode();
    const { unmount } = render(<TvModeToggle />);
    unmount();
    setTvMode(true);
    render(<TvModeToggle />);
    expect(screen.getByRole("button", { name: "TV / Touch Mode: On" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
