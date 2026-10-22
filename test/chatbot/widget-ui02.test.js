// UI-02: suggested-question chips in English and Tamil.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHIPS } from '../../src/components/chatbot/chips.js';
import { STRINGS } from '../../src/components/chatbot/il8n.js';
import { flush, mount, reply, response } from './helpers.js';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe('chips', () => {
  it('shows every English and every Tamil chip as a real button, each group marked with its language', () => {
    const w = mount();
    const en = w.$$('.chip-group[lang="en"] button.chip');
    const ta = w.$$('.chip-group[lang="ta"] button.chip');
    expect(en.map((b) => b.textContent)).toEqual(DEFAULT_CHIPS.en.map((c) => c.label));
    expect(ta.map((b) => b.textContent)).toEqual(DEFAULT_CHIPS.ta.map((c) => c.label));
    expect(en[0].textContent).toBe('Clinic hours');
    for (const b of [...en, ...ta]) expect(b.getAttribute('type')).toBe('button');
    expect(ta.every((b) => b.getAttribute('lang') === 'ta')).toBe(true);
  });

  it('the chips panel is open for a new conversation and folds after the first question', async () => {
    const w = mount();
    expect(w.$('.chips').open).toBe(true);
    expect(w.$('.chips summary').textContent).toBe(STRINGS.en.chipsLabel);
    w.type('hello there');
    w.submit();
    await flush();
    expect(w.$('.chips').open).toBe(false);
  });

  it('clicking a chip sends its QUERY (not its label) and shows it as the patient message', async () => {
    const fetchImpl = vi.fn(async () => response(200, reply({ type: 'CLINIC_FACT', message: 'Mon 09:00-17:00' })));
    const w = mount({ fetchImpl });
    w.$('.chip[data-chip="hours"][lang="en"]').click();
    await flush();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ query: 'What are the clinic hours?' });
    expect(w.texts().slice(1)).toEqual(['What are the clinic hours?', 'Mon 09:00-17:00']);
  });

  it('a Tamil chip sends the Tamil question and the conversation continues in Tamil', async () => {
    const fetchImpl = vi.fn(async () => response(200, reply({ language: 'TA', type: 'CLINIC_FACT', message: 'திங்கள் 09:00-17:00' })));
    const w = mount({ fetchImpl });
    w.$('.chip[data-chip="hours"][lang="ta"]').click();
    await flush();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).query).toBe(DEFAULT_CHIPS.ta[0].query);
    expect(w.messages()[1].getAttribute('lang')).toBe('ta');
    expect(w.send.textContent).toBe(STRINGS.ta.send);
  });

  it('chips are disabled while a reply is loading and enabled again afterwards', async () => {
    let release;
    const fetchImpl = vi.fn(() => new Promise((resolve) => { release = () => resolve(response(200, reply())); }));
    const w = mount({ fetchImpl });
    w.$('.chip').click();
    await flush();
    expect(w.$$('.chip').every((b) => b.disabled)).toBe(true);
    w.$('.chip').click();                                   // a second click while loading must not send again
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    release();
    await flush();
    expect(w.$$('.chip').every((b) => !b.disabled)).toBe(true);
  });

  it('the chips can be replaced from the portal, and invalid entries are ignored', () => {
    const w = mount();
    w.widget.chips = {
      en: [{ id: 'a', label: 'Parking', query: 'Is there parking?' }, { label: '', query: 'x' }, { label: 'No query' }, null],
      ta: [{ id: 'a', label: 'வாகன நிறுத்தம்', query: 'வாகன நிறுத்தம் உள்ளதா?' }],
    };
    expect(w.$$('.chip').map((b) => b.textContent)).toEqual(['Parking', 'வாகன நிறுத்தம்']);
  });

  it('with no chips at all the chips area is hidden', () => {
    const w = mount();
    w.widget.chips = { en: [], ta: [] };
    expect(w.$('.chips').hidden).toBe(true);
  });
});