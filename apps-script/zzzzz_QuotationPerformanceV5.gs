// Quotation Performance V5 — fast bootstrap path for the GitHub Pages quotation app.
// Keeps the existing approval API untouched; only adds a combined bootstrap + catalog call
// and a short-lived server-side catalog cache to avoid repeated Google Sheets reads.

const QUOTATION_PERFORMANCE_V5 = Object.freeze({
  VERSION: '2026.09.07-fastpath-v1',
  CATALOG_TTL_SECONDS: 90,
  CATALOG_CACHE_PREFIX: 'QPERF:CATALOG:'
});

function quotationPerformanceCatalog_(session) {
  const role = String(session && session.role || 'REGIONAL_MANAGER').toUpperCase();
  const key = QUOTATION_PERFORMANCE_V5.CATALOG_CACHE_PREFIX + role;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length) return parsed;
    } catch (error) {}
  }

  const result = quotationApprovalCatalog_(session);
  try {
    const json = JSON.stringify(result);
    // CacheService has a per-value size limit; silently skip caching if the catalog grows too large.
    if (json.length < 90000) cache.put(key, json, QUOTATION_PERFORMANCE_V5.CATALOG_TTL_SECONDS);
  } catch (error) {}
  return result;
}

function quotationPerformanceBootstrap_(token) {
  const session = quotationApprovalSession_(token);
  const catalog = quotationPerformanceCatalog_(session);
  return {
    ok: true,
    login_id: session.login_id,
    display_name: session.display_name,
    role: session.role,
    region: session.region,
    session_expires_at: session.expires_at,
    backend_version: String(QUOTATION_APPROVAL.VERSION || '') + '+FAST',
    performance_version: QUOTATION_PERFORMANCE_V5.VERSION,
    user: {
      login_id: session.login_id,
      display_name: session.display_name,
      role: session.role,
      region: session.region
    },
    catalog: catalog
  };
}

// Late-bound shared router override. All existing actions continue through the authoritative
// approval router; only bootstrapFast takes the optimized single-request path.
function apiSessionQuotationShared(token, action, payload) {
  if (String(action || '') === 'bootstrapFast') return quotationPerformanceBootstrap_(token);
  return apiSessionQuotationApproval(token, action, payload || {});
}
