import axios from "axios";
import { API_BASE_URL } from "./config.js";

// Public requests deliberately bypass the authenticated staff API client.
const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
const doctorsPath = import.meta.env.VITE_PUBLIC_DOCTORS_PATH || "/doctors";
const bookingPath = import.meta.env.VITE_PUBLIC_BOOKINGS_PATH || "/appointments/public";

function unwrap(payload) { return payload?.data ?? payload; }
export async function getPublicDoctors(signal) {
  const response = await publicClient.get(doctorsPath, { signal });
  const raw = unwrap(response.data);
  if (!Array.isArray(raw)) throw new Error("Unexpected doctors response");
  return raw.map(d => ({ id: String(d.id ?? d.doctorId), name: d.name ?? d.fullName ?? '', hours: d.workingHours ?? d.hours ?? '' })).filter(d => d.id && d.name);
}
export async function getAvailableSlots(doctorId, date, signal) {
  const response = await publicClient.get(`/doctors/${encodeURIComponent(doctorId)}/available-slots`, { params: { date }, signal });
  const raw = unwrap(response.data);
  if (!Array.isArray(raw)) throw new Error("Unexpected slots response");
  return raw.map(s => typeof s === 'string' ? s : (s.time ?? s.startTime ?? s.slotTime)).filter(Boolean);
}
export async function submitPublicBooking(body) {
  const response = await publicClient.post(bookingPath, body);
  const data = unwrap(response.data);
  if (!data || typeof data !== 'object') throw new Error("Unexpected booking response");
  return data;
}
export function statusOf(error) { return error?.response?.status; }
