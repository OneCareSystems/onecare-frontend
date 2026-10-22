// Simulated backends for the demo page, so every UI state can be seen without any server.
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
});
const json = (status, body, headers = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: (n) => headers[n] ?? null }, json: async () => body });
const isTamil = (s) => /[\u0B80-\u0BFF]/.test(s);

function cannedReply(query) {
  const ta = isTamil(query);
  const q = query.toLowerCase();
  const base = { success: true, data: { language: ta ? 'TA' : 'EN', requestId: '0123456789abcdef', sources: [] } };
  if (/dose|டோஸ்/.test(q) || /எனக்கு.*இருக்கிறதா|do i have/.test(q)) {
    return { ...base, data: { ...base.data, type: 'REFUSAL', message: ta ? 'மன்னிக்கவும், என்னால் மருத்துவ நோயறிதல் அல்லது மருந்துச்சீட்டு வழங்க இயலாது. தயவுசெய்து மருத்துவரை அணுகவும்.' : "I'm sorry, I am unable to provide medical diagnoses or prescriptions. Please consult a doctor." } };
  }
  if (/hours|நேரம்/.test(q)) {
    return { ...base, data: { ...base.data, type: 'CLINIC_FACT', message: ta ? 'எங்கள் கிளினிக் நேரம்: திங்கள் 09:00-17:00; ஞாயிறு: மூடப்பட்டிருக்கும்.' : 'Our clinic hours are: Monday 09:00-17:00; Sunday: closed.' } };
  }
  if (/paracetamol|பாராசிட்டமால்/.test(q)) {
    return { ...base, data: { ...base.data, type: 'ANSWER', message: ta ? 'பாராசிட்டமால் வலி மற்றும் காய்ச்சலைக் குறைக்கப் பயன்படும் மருந்து.' : 'Paracetamol is used to relieve pain and reduce fever.',
      sources: [{ source: 'Clinic guide.pdf' }, { source: 'WHO', url: 'https://www.who.int/' }] } };
  }
  return { ...base, data: { ...base.data, type: 'FALLBACK', message: ta ? 'மன்னிக்கவும், இது குறித்த தகவல் என்னிடம் இல்லை. தயவுசெய்து கிளினிக்கை அல்லது உங்கள் மருத்துவரை நேரடியாகத் தொடர்புகொள்ளவும்.' : "I'm sorry, I don't have information about that. Please ask the clinic or your doctor directly." } };
}

export const MODES = {
  normal: { label: 'Mock: normal (1 s)', fetch: async (url, init) => { await sleep(1000, init.signal); return json(200, cannedReply(JSON.parse(init.body).query)); } },
  slow: { label: 'Mock: slow (14 s, shows the "taking longer" notice)', fetch: async (url, init) => { await sleep(14000, init.signal); return json(200, cannedReply(JSON.parse(init.body).query)); } },
  hang: { label: 'Mock: never answers (timeout)', fetch: (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) },
  server: { label: 'Mock: server error 503', fetch: async (url, init) => { await sleep(600, init.signal); return json(503, { success: false }); } },
  offline: { label: 'Mock: offline (network error)', fetch: async (url, init) => { await sleep(400, init.signal); throw new TypeError('Failed to fetch'); } },
  limited: { label: 'Mock: rate limited (429, 10 s)', fetch: async (url, init) => { await sleep(300, init.signal); return json(429, { success: false }, { 'Retry-After': '10' }); } },
  bad: { label: 'Mock: bad request 400', fetch: async (url, init) => { await sleep(300, init.signal); return json(400, { success: false, message: 'English server text that must not be shown' }); } },
  broken: { label: 'Mock: broken reply (unknown type)', fetch: async (url, init) => { await sleep(300, init.signal); return json(200, { success: true, data: { type: 'HACKED', message: '<b>x</b>' } }); } },
};