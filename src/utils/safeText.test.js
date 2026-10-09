import { containsMarkup, safeFileSegment, safeMultilineText, safePlainText } from './safeText';

test('remove payloads HTML sem executar ou preservar atributos', () => {
  expect(safePlainText('Francisco Gonsalves<img src=x onerror=alert(\'XSS\')>')).toBe('Francisco Gonsalves');
  expect(containsMarkup('<img src=x>')).toBe(true);
});

test('gera segmentos seguros para nomes de ficheiros', () => {
  expect(safeFileSegment('../Empresa <script>alert(1)</script>')).toBe('Empresa');
});

test('mantém quebras de linha no texto multilinha', () => {
  expect(safeMultilineText('Olá <b>Acme</b>,\r\n\r\n\r\n\r\nLinha  2<script>x</script>\n')).toBe('Olá Acme ,\n\nLinha 2');
});
