import React from "react";
import { setTvMode, TV_MODE_CHANGE_EVENT } from "./tv-mode.js";

/**
 * Subscribes a control or search view to the persistent TV/touch preference.
 * @returns {boolean} Current mode, updated after URL initialization or controller changes.
 */
export function useTvMode() {
  const [enabled, setEnabled] = React.useState(() =>
    document.documentElement.hasAttribute("data-tv-mode"),
  );

  React.useLayoutEffect(() => {
    /**
     * Reflects preference changes made outside this Settings control.
     * @param {CustomEvent<{enabled: boolean}>} event - The controller's mode update.
     * @returns {void}
     */
    function handleModeChange(event) {
      setEnabled(event.detail.enabled);
    }
    document.addEventListener(TV_MODE_CHANGE_EVENT, handleModeChange);
    return () => document.removeEventListener(TV_MODE_CHANGE_EVENT, handleModeChange);
  }, []);

  return enabled;
}

/**
 * Settings entry point that persists mode changes through the shared controller.
 * @returns {JSX.Element} Toggle exposing the current mode through aria-pressed.
 */
export function TvModeToggle() {
  const enabled = useTvMode();
  return (
    <button type="button" aria-pressed={enabled} onClick={() => setTvMode(!enabled)}>
      TV / Touch Mode: {enabled ? "On" : "Off"}
    </button>
  );
}
