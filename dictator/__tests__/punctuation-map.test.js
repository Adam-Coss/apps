const { PUNCTUATION_MAP } = require('../punctuation-map');

describe('PUNCTUATION_MAP', () => {
  test('contains common punctuation names', () => {
    expect(PUNCTUATION_MAP['.']).toBe('Точка');
    expect(PUNCTUATION_MAP[',']).toBe('Запятая');
    expect(PUNCTUATION_MAP['?']).toBe('Вопросительный знак');
    expect(PUNCTUATION_MAP['!']).toBe('Восклицательный знак');
  });
});
