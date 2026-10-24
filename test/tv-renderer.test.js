// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, it, expect, vi } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import { compile } from "sass";
import path from "node:path";
import { setTvMode } from "../tv-mode.js";

let style;
let schema;
let navigation;
let first;
let second;
let controls;
const originalDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };

/** Mounts the real application once; individual tests reset mode, focus, and link state. */
beforeAll(async () => {
  // Vitest stubs inline stylesheet imports, so install the compiled production CSS explicitly.
  style = document.createElement("style");
  style.textContent = compile(path.resolve(__dirname, "../index.scss")).css;
  schema = document.createElement("script");
  schema.type = "schema";
  schema.textContent = `! Dedicated startup
@ 📺
?tv
# Ordinary section
Ordinary link | https://example.com/ordinary
TV link |tv| https://example.com/tv
TV relative |tv| /relative
TV empty |tv|
`;
  // Expose exact inline-schema bytes to the application’s browser read path.
  Object.defineProperty(schema, "innerText", { value: schema.textContent });
  document.body.appendChild(schema);
  document.head.appendChild(style);
  localStorage.setItem("navTvMode", "true");
  await act(async () => {
    await import("../index.jsx");
  });
  navigation = document.querySelector("#fav");
  expect(navigation).toHaveAttribute("data-tv-schema");
  [first, second] = navigation.querySelectorAll(":scope > [data-tv-link]");
});

/** Supplies explicit layout geometry because jsdom does not render link rectangles. */
beforeEach(() => {
  controls = document.createElement("div");
  document.body.appendChild(controls);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  act(() => setTvMode(false));
  fireEvent.input(document.querySelector("#search"), { target: { value: "" } });
  vi.spyOn(first, "getClientRects").mockImplementation(() =>
    first.classList.contains("hidden") ? [] : [new DOMRect(0, 0, 200, 100)],
  );
  vi.spyOn(second, "getClientRects").mockImplementation(() =>
    second.classList.contains("hidden") ? [] : [new DOMRect(0, 120, 200, 100)],
  );
  vi.spyOn(first, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100));
  vi.spyOn(second, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 120, 200, 100));
  act(() => setTvMode(true));
  document.activeElement?.blur();
});

/** Restores each test's mode, DOM mutations, and layout stubs without remounting global handlers. */
afterEach(() => {
  controls.remove();
  first.classList.remove("hidden");
  second.classList.remove("hidden");
  first.removeAttribute("tabindex");
  act(() => setTvMode(false));
  vi.restoreAllMocks();
});

/** Restores the browser document and dialogs after exercising the real entry point. */
afterAll(() => {
  style.remove();
  schema.remove();
  document.getElementById("app-root")?.remove();
  document.documentElement.removeAttribute("data-tv-mode");
  Object.assign(window, originalDialogs);
  localStorage.clear();
});

it("applies the dedicated TV schema marker on the first real application render", () => {
  expect(navigation).toHaveAttribute("data-tv-schema");
  expect(document.documentElement).toHaveAttribute("data-tv-mode");
  expect(document.title).toBe("Dedicated startup");
  expect(document.querySelector("#pageFavIcon")).toHaveAttribute("data-fav-icon", "📺");
  expect(navigation.querySelector(".title")).toBeVisible();
  expect(navigation.querySelector(".header")).not.toBeVisible();
  expect(navigation.querySelector(".link:not([data-tv-link])")).not.toBeVisible();
  expect(first).toHaveAttribute("href", "https://example.com/tv");
  expect(navigation.querySelectorAll(":scope > [data-tv-link]")).toHaveLength(2);
  expect(navigation.querySelector(".action-bar")).not.toBeVisible();
});

it("removes search and its keyboard shortcut in TV mode and restores search in normal mode", () => {
  expect(document.querySelector("#searchForm")).toBeNull();
  fireEvent.keyDown(document.body, { key: "/" });
  expect(document.body).toHaveFocus();
  act(() => setTvMode(false));
  const search = document.querySelector("#search");
  expect(search).toBeVisible();
  fireEvent.keyDown(document.body, { key: "/" });
  expect(search).toHaveFocus();
});

it("suspends an existing search filter and result banner while TV mode hides search", () => {
  act(() => setTvMode(false));
  fireEvent.input(document.querySelector("#search"), { target: { value: "no-such-bookmark" } });
  expect(document.querySelector(".search-result-count")).toHaveTextContent("No matches found");
  act(() => setTvMode(true));
  expect(document.querySelector(".search-result-count")).toBeNull();
  expect(first).toBeVisible();
  expect(second).toBeVisible();
});

it.each(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])(
  "focuses the first eligible TV link on %s when the body has focus",
  (key) => {
    expect(document.body).toHaveFocus();
    const allowedDefault = fireEvent.keyDown(document.body, { key });
    expect(first).toHaveFocus();
    expect(allowedDefault).toBe(false);
  },
);

it("recovers from a focused control outside the navigation grid", () => {
  const button = document.createElement("button");
  controls.appendChild(button);
  button.focus();
  fireEvent.keyDown(button, { key: "ArrowDown" });
  expect(first).toHaveFocus();
});

it("skips hidden and non-tabbable links when recovering focus", () => {
  first.setAttribute("tabindex", "-1");
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  expect(second).toHaveFocus();
  second.blur();
  first.removeAttribute("tabindex");
  first.classList.add("hidden");
  fireEvent.keyDown(document.body, { key: "ArrowDown" });
  expect(second).toHaveFocus();
});

it("recovers when the previously focused link is no longer eligible", () => {
  second.focus();
  second.classList.add("hidden");
  fireEvent.keyDown(second, { key: "ArrowLeft" });
  expect(first).toHaveFocus();
});

it("leaves focus and scrolling alone when no eligible links exist", () => {
  first.classList.add("hidden");
  second.classList.add("hidden");
  const allowedDefault = fireEvent.keyDown(document.body, { key: "ArrowDown" });
  expect(document.body).toHaveFocus();
  expect(allowedDefault).toBe(true);
});

it.each([
  ["ArrowRight", "first", "second"],
  ["ArrowLeft", "second", "first"],
  ["ArrowDown", "first", "second"],
  ["ArrowUp", "second", "first"],
])("preserves %s movement between focused links", (key, start, target) => {
  const links = { first, second };
  links[start].focus();
  expect(fireEvent.keyDown(links[start], { key })).toBe(false);
  expect(links[target]).toHaveFocus();
});

it.each(["input", "textarea", "select"])("preserves %s arrow controls", (tag) => {
  const input = document.createElement(tag);
  controls.appendChild(input);
  input.focus();
  expect(fireEvent.keyDown(input, { key: "ArrowDown" })).toBe(true);
  expect(input).toHaveFocus();
});

it("preserves arrows in editable content", () => {
  const editable = document.createElement("div");
  editable.setAttribute("contenteditable", "true");
  editable.tabIndex = 0;
  controls.appendChild(editable);
  editable.focus();
  expect(fireEvent.keyDown(editable, { key: "ArrowRight" })).toBe(true);
  expect(editable).toHaveFocus();
});

it.each(["modal", "dialog"])("does not steal focus while a %s is open", (kind) => {
  const dialog = document.createElement("div");
  dialog.className = kind;
  dialog.setAttribute("role", "dialog");
  const button = document.createElement("button");
  dialog.appendChild(button);
  controls.appendChild(dialog);
  button.focus();
  expect(fireEvent.keyDown(button, { key: "ArrowDown" })).toBe(true);
  expect(button).toHaveFocus();
});

it("ignores already-consumed arrows and unrelated keys", () => {
  const consumed = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    bubbles: true,
    cancelable: true,
  });
  consumed.preventDefault();
  document.body.dispatchEvent(consumed);
  expect(document.body).toHaveFocus();
  fireEvent.keyDown(document.body, { key: "Tab" });
  expect(document.body).toHaveFocus();
});

it("does not recover grid focus outside the navigation in normal mode", () => {
  act(() => setTvMode(false));
  expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(true);
  expect(document.body).toHaveFocus();
  const edit = navigation.querySelector("#edit");
  edit.focus();
  expect(fireEvent.keyDown(edit, { key: "ArrowDown" })).toBe(true);
  expect(edit).toHaveFocus();
});
