import { describe, expect, it } from 'vitest';
import { countCodePoints, detectScriptLanguage, safeHttpsUrl } from '../../src/components/chatbot/text.js';

describe('countCodePoints', () => {
  it('counts Tamil letters, emoji and astral letters as one each', () => {
    expect(countCodePoints('ப'.repeat(500))).toBe(500);
    expect(countCodePoints('😀😀')).toBe(2);
    expect('𝐀'.repeat(3).length).toBe(6);
    expect(countCodePoints('𝐀'.repeat(3))).toBe(3);
  });
  it('handles empty and missing input', () => {
    expect(countCodePoints('')).toBe(0);
    expect(countCodePoints(null)).toBe(0);
    expect(countCodePoints(undefined)).toBe(0);
  });
});

describe('detectScriptLanguage', () => {
  it('Tamil script is ta', () => expect(detectScriptLanguage('கிளினிக் நேரம் என்ன')).toBe('ta'));
  it('English is en', () => expect(detectScriptLanguage('what are the clinic hours')).toBe('en'));
  it('romanised Tamil is en, like the server', () => expect(detectScriptLanguage('clinic neram enna')).toBe('en'));
  it('a Tamil sentence with an English drug name is ta', () => expect(detectScriptLanguage('பாராசிட்டமால் paracetamol எதற்கு பயன்படுகிறது')).toBe('ta'));
  it('empty, digits and emoji default to en', () => {
    for (const v of ['', '123 ???', '😀', null]) expect(detectScriptLanguage(v)).toBe('en');
  });
});

describe('safeHttpsUrl', () => {
  it('accepts plain https', () => expect(safeHttpsUrl('https://www.who.int/x?y=1')).toBe('https://www.who.int/x?y=1'));
  it.each(['javascript:alert(1)', 'http://who.int', 'data:text/html,x', 'ftp://who.int', 'https://user:pw@who.int', '//who.int', 'who.int', '', null, 5, 'https://' + 'a'.repeat(3000)])(
    'rejects %s', (v) => expect(safeHttpsUrl(v)).toBeNull());
});