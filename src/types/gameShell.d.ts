// Ambient type for the Electron desktop-shell bridge (see app/preload.cjs).
// Optional at runtime: it exists only inside the Electron shell, so the web build feature-detects
// it (`window.gameShell?.…`). Typed here so game/UI code can call it without `any`.
export {};

declare global {
  interface GameShell {
    /** App version string (from package.json). */
    readonly version: string;
    /** Current fullscreen state (cached, synchronous). */
    isFullscreen(): boolean;
    /** Set fullscreen on/off; resolves to the resulting state. */
    setFullscreen(on: boolean): Promise<boolean>;
    /** Toggle fullscreen; resolves to the new state. */
    toggleFullscreen(): Promise<boolean>;
    /** Quit the desktop app. */
    quit(): Promise<void>;
  }

  interface Window {
    /** Present only inside the Electron desktop shell; undefined in a plain browser. */
    gameShell?: GameShell;
  }
}
