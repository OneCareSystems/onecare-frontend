const createBookingDocumentId = () => {
  // randomUUID() is only available in secure contexts in some browsers.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  // This ID only correlates the in-memory booking navigation flow; it is not
  // used as a security token, so a lightweight fallback is sufficient.
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const bookingDocumentId = createBookingDocumentId();
