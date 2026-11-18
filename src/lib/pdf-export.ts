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

export async function downloadPdfBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "application/pdf" });

  // Android WebViews often ignore the HTML download attribute. Use the native
  // share sheet first when file sharing is supported, so the user can save to Files/Drive.
  if (/Android/i.test(navigator.userAgent) && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      // A user-cancelled share is intentional; don't unexpectedly start a download.
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      // Continue to the browser save options if the share sheet is unavailable.
    }
  }

  // Prefer the browser's native Save dialog where it is available.
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
        suggestedName: filename,
        types: [{ description: "PDF document", accept: { "application/pdf": [".pdf"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      // Respect cancellation; otherwise fall through to a standard browser download.
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  // Standard Chrome/desktop browser fallback.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.position = "fixed";
  link.style.left = "-10000px";
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Keep the URL alive long enough for Android browsers and WebViews to consume it.
  window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}
