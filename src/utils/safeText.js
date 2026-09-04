const decodeBasicEntities = value => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'");

export const safePlainText = (value, maxLength = 500) => decodeBasicEntities(String(value ?? ''))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  // Remove caracteres de controlo que não têm representação visual válida.
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

export const containsMarkup = value => /<\s*\/?\s*[a-z][^>]*>/i.test(String(value ?? ''));

export const safeFileSegment = value => safePlainText(value, 100)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9_-]+/gi, '_')
  .replace(/^_+|_+$/g, '') || 'ficheiro';
