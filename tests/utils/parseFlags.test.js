const { parseFlags } = require('../../src/utils/parseFlags');

describe('parseFlags - extracción de flags', () => {
  test('devuelve args sin cambios y flags vacío cuando no hay flags', () => {
    const { args, flags } = parseFlags(['nav:pl:rock']);
    expect(args).toEqual(['nav:pl:rock']);
    expect(flags.size).toBe(0);
  });

  test('elimina --shuffle de los args y lo agrega a flags', () => {
    const { args, flags } = parseFlags(['nav:pl:rock', '--shuffle']);
    expect(args).toEqual(['nav:pl:rock']);
    expect(flags.has('shuffle')).toBe(true);
  });

  test('funciona con --shuffle al inicio de los args', () => {
    const { args, flags } = parseFlags(['--shuffle', 'nav:pl:rock']);
    expect(args).toEqual(['nav:pl:rock']);
    expect(flags.has('shuffle')).toBe(true);
  });

  test('funciona con --shuffle en medio de los args', () => {
    const { args, flags } = parseFlags(['nav:pl:', '--shuffle', 'mi playlist']);
    expect(args).toEqual(['nav:pl:', 'mi playlist']);
    expect(flags.has('shuffle')).toBe(true);
  });

  test('soporta múltiples flags al mismo tiempo', () => {
    const { args, flags } = parseFlags(['nav:pl:rock', '--shuffle', '--loop']);
    expect(args).toEqual(['nav:pl:rock']);
    expect(flags.has('shuffle')).toBe(true);
    expect(flags.has('loop')).toBe(true);
  });

  test('normaliza flags a minúsculas', () => {
    const { args, flags } = parseFlags(['query', '--SHUFFLE', '--Loop']);
    expect(flags.has('shuffle')).toBe(true);
    expect(flags.has('loop')).toBe(true);
  });

  test('no modifica el array original de args', () => {
    const original = ['nav:pl:rock', '--shuffle'];
    parseFlags(original);
    expect(original).toEqual(['nav:pl:rock', '--shuffle']);
  });

  test('devuelve un Set (sin flags duplicados)', () => {
    const { flags } = parseFlags(['--shuffle', '--shuffle']);
    expect(flags.size).toBe(1);
    expect(flags.has('shuffle')).toBe(true);
  });

  test('no incluye en flags tokens que no comienzan con --', () => {
    const { args, flags } = parseFlags(['-v', 'nav:pl:rock']);
    expect(args).toEqual(['-v', 'nav:pl:rock']);
    expect(flags.size).toBe(0);
  });

  test('maneja array vacío sin errores', () => {
    const { args, flags } = parseFlags([]);
    expect(args).toEqual([]);
    expect(flags.size).toBe(0);
  });

  test('args solo con flags resulta en array limpio vacío', () => {
    const { args, flags } = parseFlags(['--shuffle', '--loop']);
    expect(args).toEqual([]);
    expect(flags.size).toBe(2);
  });
});
