import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export function canvasPagesToPdfBlob(canvases: HTMLCanvasElement[]): Blob {
  const encoder = new TextEncoder();
  const encode = (value: string) => encoder.encode(value);
  const join = (parts: Uint8Array[]) => {
    const size = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    parts.forEach(part => { output.set(part, offset); offset += part.length; });
    return output;
  };
  const objects: Uint8Array[] = [];
  const add = (parts: Uint8Array[]) => { objects.push(join(parts)); return objects.length; };
  const pageIds = canvases.map((_, index) => 3 + index * 3);
  add([encode("<< /Type /Catalog /Pages 2 0 R >>")]);
  add([encode("<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + canvases.length + " >>")]);
  canvases.forEach((canvas, index) => {
    const imageBytes = Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]), char => char.charCodeAt(0));
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    add([encode("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 " + imageId + " 0 R >> >> /Contents " + contentId + " 0 R >>")]);
    const stream = encode("q 595 0 0 842 0 0 cm /Im0 Do Q");
    add([encode("<< /Length " + stream.length + " >>\nstream\n"), stream, encode("\nendstream")]);
    add([encode("<< /Type /XObject /Subtype /Image /Width " + canvas.width + " /Height " + canvas.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + imageBytes.length + " >>\nstream\n"), imageBytes, encode("\nendstream")]);
  });
  const parts: Uint8Array[] = [encode("%PDF-1.4\n% SleepX\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const wrapped = join([encode((index + 1) + " 0 obj\n"), object, encode("\nendobj\n")]);
    parts.push(wrapped);
    length += wrapped.length;
  });
  const xrefOffset = length;
  let xref = "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index++) xref += String(offsets[index]).padStart(10, "0") + " 00000 n \n";
  xref += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  parts.push(encode(xref));
  const bytes = join(parts);
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/pdf" });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the PDF file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("Could not encode the PDF file."));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export async function downloadPdfBlob(blob: Blob, filename: string): Promise<void> {
  const safeName = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  const file = new File([blob], safeName, { type: "application/pdf" });
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Native Android: write the PDF to the app cache, then open Android's
  // native share sheet so the user can save it to Downloads or Drive.
  if (Capacitor.isNativePlatform()) {
    try {
      const saved = await Filesystem.writeFile({
        path: safeName,
        data: await blobToBase64(blob),
        directory: Directory.Cache,
        recursive: true,
      });
      await Share.share({
        title: safeName,
        url: saved.uri,
        dialogTitle: "Save or share SleepX PDF",
      });
      return;
    } catch (error) {
      // Closing the Android share sheet is a normal user action.
      if (isAbortError(error)) return;
      console.error("Native PDF save/share failed; trying browser fallback.", error);
    }
  }

  // Android Chrome/WebView: do not invoke showSaveFilePicker. It can reject
  // with AbortError in embedded browsers and prevents the download fallback.
  if (isAndroid && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: safeName });
      return;
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("Web Share PDF failed; trying download fallback.", error);
    }
  }

  // Desktop browsers: use the native file picker when available.
  if (!isAndroid) {
    type SaveHandle = {
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    };
    type SavePickerWindow = Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<SaveHandle>;
    };
    const savePicker = (window as SavePickerWindow).showSaveFilePicker;
    if (savePicker) {
      try {
        const handle = await savePicker.call(window, {
          suggestedName: safeName,
          types: [{ description: "PDF document", accept: { "application/pdf": [".pdf"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        // A cancelled picker must not surface as an app error.
        if (isAbortError(error)) return;
        console.error("File picker failed; trying browser download fallback.", error);
      }
    }
  }

  // Standard browser fallback.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.rel = "noopener";
  link.style.position = "fixed";
  link.style.left = "-10000px";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}
