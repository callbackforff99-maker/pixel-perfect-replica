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
  // Android's native share sheet is a reliable fallback in app WebViews that do not
  // implement the HTML download attribute. The user can choose Files/Drive to save it.
  if (/Android/i.test(navigator.userAgent)) {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.position = "fixed";
  link.style.left = "-10000px";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the URL alive briefly so Android browsers and WebViews can finish handling it.
  window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}
