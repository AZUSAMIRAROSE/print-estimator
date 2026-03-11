interface SaveFilter {
  name: string;
  extensions: string[];
}

interface SaveOptions {
  defaultPath: string;
  filters: SaveFilter[];
}

function ensureExtension(path: string, extensions: string[]): string {
  if (!extensions.length) return path;
  const hasExt = extensions.some((ext) => path.toLowerCase().endsWith(`.${ext.toLowerCase()}`));
  return hasExt ? path : `${path}.${extensions[0]}`;
}

function triggerBrowserDownload(filename: string, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

async function tryTauriSaveFile(options: SaveOptions): Promise<string | null> {
  const [{ save }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
  ]);
  const path = await save({
    filters: options.filters,
    defaultPath: options.defaultPath,
  });
  if (!path) return null;

  const normalized = Array.isArray(path) ? path[0] : path;
  const ext = options.filters[0]?.extensions ?? [];
  return ensureExtension(normalized, ext);
}

export async function saveTextFilePortable(options: SaveOptions, content: string): Promise<string | null> {
  try {
    const [targetPath, { writeTextFile }] = await Promise.all([
      tryTauriSaveFile(options),
      import("@tauri-apps/plugin-fs"),
    ]);

    if (!targetPath) return null;
    await writeTextFile(targetPath, content);
    return targetPath;
  } catch {
    const filename = ensureExtension(options.defaultPath, options.filters[0]?.extensions ?? []);
    return triggerBrowserDownload(filename, new Blob([content], { type: "text/plain;charset=utf-8" }));
  }
}

export async function saveBinaryFilePortable(options: SaveOptions, data: Uint8Array, mimeType: string): Promise<string | null> {
  try {
    const [targetPath, { writeFile }] = await Promise.all([
      tryTauriSaveFile(options),
      import("@tauri-apps/plugin-fs"),
    ]);

    if (!targetPath) return null;
    await writeFile(targetPath, data);
    return targetPath;
  } catch {
    const filename = ensureExtension(options.defaultPath, options.filters[0]?.extensions ?? []);
    return triggerBrowserDownload(filename, new Blob([data], { type: mimeType }));
  }
}
