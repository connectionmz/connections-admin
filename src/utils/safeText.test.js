import { containsMarkup, safeFileSegment, safePlainText } from './safeText';

test('remove payloads HTML sem executar ou preservar atributos', () => {
  expect(safePlainText('Francisco Gonsalves<img src=x onerror=alert(\'XSS\')>')).toBe('Francisco Gonsalves');
  expect(containsMarkup('<img src=x>')).toBe(true);
});

test('gera segmentos seguros para nomes de ficheiros', () => {
  expect(safeFileSegment('../Empresa <script>alert(1)</script>')).toBe('Empresa');
});
