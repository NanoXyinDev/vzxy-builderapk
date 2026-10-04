const STORE_ID = String(process.env.BLOB_STORE_ID || 'store_MM3stWQMbwkbomJ2').trim();

function oidcOptions(extra = {}) {
  const oidcToken = String(process.env.VERCEL_OIDC_TOKEN || '').trim();
  return {
    storeId: STORE_ID,
    ...(oidcToken ? { oidcToken } : {}),
    ...extra
  };
}

function isOidcError(error) {
  const message = String(error?.message || error || '');
  return /OIDC|valid token|Access denied|store.*project|environment/i.test(message);
}

function explainBlobError(error) {
  const message = String(error?.message || error || 'Blob operation failed');
  if (/OIDC is enabled for this project, but not for this token's environment/i.test(message)) {
    return 'Vercel Blob OIDC belum diaktifkan untuk environment deployment ini. Buka Blob Store → Projects → Upgrade to OIDC lalu aktifkan environment yang dipakai deployment.';
  }
  if (/Access denied, please provide a valid token/i.test(message)) {
    return 'Blob menolak kredensial OIDC. Pastikan store terhubung ke project Vercel ini dan statusnya sudah Upgrade to OIDC. BLOB_READ_WRITE_TOKEN tidak diperlukan untuk konfigurasi OIDC.';
  }
  if (/No blob credentials found/i.test(message)) {
    return 'Vercel OIDC credential tidak tersedia pada Function. Deploy ulang dari project Vercel yang terhubung ke Blob Store.';
  }
  return message;
}

module.exports = { STORE_ID, oidcOptions, explainBlobError, isOidcError };
