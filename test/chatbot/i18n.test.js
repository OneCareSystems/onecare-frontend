import { describe, expect, it } from 'vitest';
import { DEFAULT_CHIPS } from '../../src/components/chatbot/chips.js';
import { STRINGS, format } from '../../src/components/chatbot/il8n.js';
import { countCodePoints } from '../../src/components/chatbot/text.js';

const keysOf = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort();
const valuesOf = (o) => Object.values(o).flatMap((v) => (typeof v === 'object' ? valuesOf(v) : [v]));
const hasTamil = (s) => /[\u0B80-\u0BFF]/.test(s);

describe('bilingual copy (UI-03)', () => {
  it('English and Tamil have exactly the same keys, including every error message', () => {
    expect(keysOf(STRINGS.ta)).toEqual(keysOf(STRINGS.en));
    expect(keysOf(STRINGS.en.errors)).toEqual(['badRequest', 'network', 'rateLimit', 'server', 'timeout']);
  });
  it('every Tamil string really is Tamil, and no English string contains Tamil', () => {
    for (const v of valuesOf(STRINGS.ta)) expect(hasTamil(v), v).toBe(true);
    for (const v of valuesOf(STRINGS.en)) expect(hasTamil(v), v).toBe(false);
  });
  it('both languages use the same placeholders', () => {
    const tokens = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
    for (const key of ['cooldown', 'tooLong']) expect(tokens(STRINGS.ta[key])).toBe(tokens(STRINGS.en[key]));
    expect(tokens(STRINGS.ta.errors.rateLimit)).toBe(tokens(STRINGS.en.errors.rateLimit));
  });
  it('no string is empty', () => {
    for (const lang of ['en', 'ta']) for (const v of valuesOf(STRINGS[lang])) expect(v.trim().length).toBeGreaterThan(0);
  });
  it('format() replaces placeholders and leaves unknown ones', () => {
    expect(format('wait {seconds} s', { seconds: 7 })).toBe('wait 7 s');
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('suggested chips (UI-02)', () => {
  it('both languages have the same ids in the same order', () => {
    expect(DEFAULT_CHIPS.ta.map((c) => c.id)).toEqual(DEFAULT_CHIPS.en.map((c) => c.id));
    expect(DEFAULT_CHIPS.en.length).toBeGreaterThanOrEqual(3);
  });
  it('labels and queries are non-empty, short, and in the right script', () => {
    for (const lang of ['en', 'ta']) {
      for (const chip of DEFAULT_CHIPS[lang]) {
        expect(chip.label.trim().length).toBeGreaterThan(0);
        expect(countCodePoints(chip.query)).toBeLessThanOrEqual(200);
        expect(hasTamil(chip.label)).toBe(lang === 'ta');
        expect(hasTamil(chip.query)).toBe(lang === 'ta');
      }
    }
  });
  it('contains the clinic hours chip in both languages, as the ticket asks', () => {
    expect(DEFAULT_CHIPS.en.find((c) => c.id === 'hours').label).toBe('Clinic hours');
    expect(DEFAULT_CHIPS.ta.find((c) => c.id === 'hours')).toBeTruthy();
  });
  it('no chip uses diagnosis, dose or prescription wording', () => {
    const forbidden = /\b(dose|dosage|prescri\w*|diagnos\w*|symptom\w*|medicine|tablet)\b|டோஸ்|மருந்து|நோய்/i;
    for (const lang of ['en', 'ta']) for (const chip of DEFAULT_CHIPS[lang]) expect(forbidden.test(`${chip.label} ${chip.query}`), chip.query).toBe(false);
  });
});