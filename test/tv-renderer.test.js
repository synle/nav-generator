// @vitest-environment jsdom
import { it, expect } from "vitest";
import { act } from "@testing-library/react";
import { compile } from "sass";
import path from "node:path";

/**
 * Exercises the real app entry point once in this file's isolated browser document.
 * Synthetic style fixtures cannot catch parent-ref timing during initial React commits.
 */
it("applies the dedicated TV schema marker on the first real application render", async () => {
  // Vitest stubs inline stylesheet imports, so install the compiled production CSS explicitly.
  const style = document.createElement("style");
  style.textContent = compile(path.resolve(__dirname, "../index.scss")).css;
  const schema = document.createElement("script");
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
  expect(schema.innerText).toBe(schema.textContent);
  localStorage.setItem("navTvMode", "true");
  const originalDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };

  try {
    await act(async () => {
      await import("../index.jsx");
    });

    const navigation = document.querySelector("#fav");
    expect(navigation).toHaveAttribute("data-tv-schema");
    expect(document.documentElement).toHaveAttribute("data-tv-mode");
    expect(document.title).toBe("Dedicated startup");
    expect(document.querySelector("#pageFavIcon")).toHaveAttribute("data-fav-icon", "📺");
    expect(navigation.querySelector(".title")).toBeVisible();
    expect(navigation.querySelector(".header")).not.toBeVisible();
    expect(navigation.querySelector(".link:not([data-tv-link])")).not.toBeVisible();
    expect(navigation.querySelector(":scope > [data-tv-link]")).toHaveAttribute(
      "href",
      "https://example.com/tv",
    );
    expect(navigation.querySelectorAll(":scope > [data-tv-link]")).toHaveLength(2);
    expect(navigation.querySelector(".action-bar")).not.toBeVisible();
  } finally {
    style.remove();
    schema.remove();
    document.getElementById("app-root")?.remove();
    document.documentElement.removeAttribute("data-tv-mode");
    Object.assign(window, originalDialogs);
    localStorage.clear();
  }
});
