# Desktop

## Overview

`packages/desktop` is a thin Electron shell. It has **no UI of its own** — it loads the web app from `packages/web` and exposes native capabilities via an IPC bridge.

## Architecture

```
packages/desktop/
  electron/
    main.ts              Electron main process (window, IPC handlers)
    preload.ts           contextBridge: exposes typed API to renderer as window.electronAPI
    electron-env.d.ts    Environment type declarations
  vite.config.ts         Builds main + preload only (no renderer)
  electron-builder.json5 Packaging config
```

In **dev**, the main process loads `http://localhost:5173` (the web dev server).
In **production**, it loads the built web app copied into `web-dist/`.

## Adding a Native Feature

Three steps: IPC handler → preload exposure → web type + usage.

### 1. Add IPC handler in `electron/main.ts`

```ts
import { ipcMain, shell } from "electron";

ipcMain.handle("shell:openExternal", async (_, url: string) => {
  await shell.openExternal(url);
});
```

### 2. Expose in `electron/preload.ts`

```ts
contextBridge.exposeInMainWorld("electronAPI", {
  // ... existing APIs
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
});
```

### 3. Add type in `packages/web/src/lib/desktop.ts`

```ts
export interface ElectronAPI {
  // ... existing types
  openExternal: (url: string) => Promise<void>;
}
```

### 4. Use in web components

```tsx
import { useDesktop } from "../hooks/use-desktop";

function ExternalLink({ url, children }) {
  const desktop = useDesktop();

  const handleClick = (e) => {
    if (desktop) {
      e.preventDefault();
      desktop.openExternal(url);
    }
  };

  return <a href={url} onClick={handleClick} target="_blank">{children}</a>;
}
```

## Available IPC APIs

Already wired in the template:

| API | Description |
|---|---|
| `showOpenDialog(opts)` | Native file open dialog |
| `showSaveDialog(opts)` | Native file save dialog |
| `readFile(path)` | Read file from disk |
| `writeFile(path, data)` | Write file to disk |
| `showNotification(title, body)` | System notification |
| `minimize()` | Minimize window |
| `maximize()` | Toggle maximize/unmaximize |
| `close()` | Close window |
| `onDeepLink(cb)` | Listen for deep link events |

## Common Native Features to Add

- **Auto-update:** Use `electron-updater` in main process, expose update status via IPC.
- **System tray:** Create `Tray` in main.ts, show/hide window on click.
- **Global shortcuts:** Register with `globalShortcut.register()` in main.ts.
- **Menu bar:** Build native menus with `Menu.buildFromTemplate()`.
- **Deep links:** Register protocol in main.ts, emit `deep-link` event to renderer.

## Building for Distribution

```bash
cd packages/desktop
bun run build       # Builds electron + packages with electron-builder
```

Configure `electron-builder.json5` for app name, icons, and platform targets (DMG, NSIS, AppImage).

## Running

```bash
# Requires web dev server to be running first
cd packages/web && bun dev &
cd packages/desktop && bun dev
```

Or from root: `turbo dev` starts both.
