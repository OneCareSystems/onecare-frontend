/**
 * Save an in-memory Blob as a browser download.
 *
 * Shared by the clinic/pharmacy report exports (the backend streams the file
 * for `format=csv|pdf`); the audit trail builds its CSV inline and uses the
 * same object-URL flow.
 */
export default function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
