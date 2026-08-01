import { toPng } from "html-to-image";
import { save } from "@tauri-apps/plugin-dialog";
import { FileService } from "./FileService";

export class ScreenshotService {
  /**
   * Captures a DOM node as a PNG base64 Data URL.
   */
  static async captureToDataUrl(node: HTMLElement): Promise<string> {
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: 2, // High DPI / Crisp retina quality
    });
  }

  /**
   * Copies the image Data URL to the user's system clipboard.
   */
  static async copyToClipboard(dataUrl: string): Promise<void> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } else {
      throw new Error("Clipboard API not available in this browser context.");
    }
  }

  /**
   * Saves the captured image data URL natively via Tauri file dialog with automatic fallback.
   */
  static async saveImage(dataUrl: string, defaultName: string = "c-shell-snapshot.png"): Promise<boolean> {
    let filePath: string | null = null;
    try {
      filePath = await save({
        defaultPath: defaultName,
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      });
    } catch (e) {
      console.warn("Tauri save dialog error, falling back to browser download:", e);
    }

    if (filePath) {
      await FileService.writeBinaryFile(filePath, dataUrl);
      return true;
    }

    // Fallback if save dialog was not supported
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}
