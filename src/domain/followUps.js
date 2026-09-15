const normalize = value => String(value || '').trim().toLowerCase();

export const normalizeEmail = value => {
  const email = normalize(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
};

const values = value => (Array.isArray(value) ? value : [value]).map(normalize).filter(Boolean);

export const selectFollowUpRecipients = (companies = [], filters = {}) => {
  const companyIds = new Set(values(filters.companyIds));
  const sectors = new Set(values(filters.sectors));
  const provinces = new Set(values(filters.provinces));
  const hasSegment = sectors.size > 0 || provinces.size > 0;
  const byEmail = new Map();

  companies.forEach(company => {
    const explicitlySelected = companyIds.has(normalize(company.id));
    const sectorMatches = sectors.size === 0 || sectors.has(normalize(company.sector || company.sectorName));
    const provinceMatches = provinces.size === 0 || provinces.has(normalize(company.provincia || company.province));
    if (!explicitlySelected && !(hasSegment && sectorMatches && provinceMatches)) return;

    const emails = Array.isArray(company.email) ? company.email : [company.email];
    emails.forEach(value => {
      const email = normalizeEmail(value);
      if (email && !byEmail.has(email)) byEmail.set(email, { ...company, email });
    });
  });

  return [...byEmail.values()];
};
