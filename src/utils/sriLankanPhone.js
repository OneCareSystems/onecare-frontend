// Sri Lankan national numbers have nine digits after the country code.
export const normalizeSriLankanPhone = (value) =>
  String(value ?? "").replace(/[\s()-]/g, "");
export const isSriLankanPhone = (value) =>
  /^(?:0|\+94)[1-9]\d{8}$/.test(normalizeSriLankanPhone(value));
