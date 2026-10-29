/** Name particles kept lowercase unless they start the name: "María de la Cruz", "De la Cruz". */
export const NAME_PARTICLES: ReadonlySet<string> = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'da',
  'das',
  'do',
  'dos',
  'van',
  'von',
  'der',
  'di',
]);
