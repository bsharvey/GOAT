// Preload script — runs in renderer context with node access
// Expose safe APIs here via contextBridge if needed

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("goat", {
  platform: process.platform,
  version: process.env.npm_package_version || "1.0.0",
  isElectron: true,
});
