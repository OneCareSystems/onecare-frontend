import axios from "axios";
import { API_BASE_URL } from "./config.js";

// Public requests deliberately bypass the authenticated staff API client.
const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
const doctorsPath = import.meta.env.VITE_PUBLIC_DOCTORS_PATH || "/doctors";
const bookingPath =
  import.meta.env.VITE_PUBLIC_BOOKINGS_PATH || "/public/appointments";

const DOCTORS_TTL_MS = 60_000;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

// Short-lived cache so returning to the landing page doesn't refetch instantly.
// Only successful responses are cached, so the "Try again" button always retries.
let doctorsCache = { at: 0, data: null };

export function clearPublicDoctorsCache() {
  doctorsCache = { at: 0, data: null };
}

function unwrap(payload) {
  return payload?.data ?? payload;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDoctor(d) {
  const rawId = d?.id ?? d?.doctorId;
  const name =
    text(d?.name) ||
    text(d?.fullName) ||
    [d?.firstName, d?.lastName].map(text).filter(Boolean).join(" ");

  return {
    id: rawId != null ? String(rawId) : "",
    name,
    hours: text(d?.workingHours) || text(d?.hours),
    // Used by the HomePage specialty filter chips and doctor cards.
    specialty: text(d?.specialty) || text(d?.specialization),
    photoUrl: text(d?.photoUrl) || text(d?.imageUrl) || text(d?.avatarUrl),
  };
}

export async function getPublicDoctors(signal) {
  if (doctorsCache.data && Date.now() - doctorsCache.at < DOCTORS_TTL_MS) {
    return doctorsCache.data;
  }

  const response = await publicClient.get(doctorsPath, { signal });
  const payload = unwrap(response.data);
  const raw = Array.isArray(payload) ? payload : payload?.content;
  if (!Array.isArray(raw)) throw new Error("Unexpected doctors response");

  const doctors = raw
    .map(normalizeDoctor)
    .filter((d) => d.id && d.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  doctorsCache = { at: Date.now(), data: doctors };
  return doctors;
}

export async function getAvailableSlots(doctorId, date, signal) {
  const response = await publicClient.get(
    `/doctors/${encodeURIComponent(doctorId)}/available-slots`,
    { params: { date }, signal },
  );
  const raw = unwrap(response.data);
  if (!Array.isArray(raw)) throw new Error("Unexpected slots response");

  const slots = raw
    .map((s) =>
      typeof s === "string" ? s : (s?.time ?? s?.startTime ?? s?.slotTime),
    )
    .filter((s) => typeof s === "string" && TIME_PATTERN.test(s));

  // De-duplicate and keep chronological order for the slot picker.
  return [...new Set(slots)].sort();
}

export async function submitPublicBooking(body) {
  const response = await publicClient.post(bookingPath, body);
  const data = unwrap(response.data);
  if (!data || Array.isArray(data) || typeof data !== "object")
    throw new Error("Unexpected booking response");

  // A new booking changes availability, so drop any cached doctor data.
  clearPublicDoctorsCache();
  return data;
}

export function statusOf(error) {
  return error?.response?.status;
}
