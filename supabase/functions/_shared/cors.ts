// Shared CORS configuration for all edge functions.
// Restricts Access-Control-Allow-Origin to known application domains,
// reflecting the request origin when it matches.

const ALLOWED_ORIGINS = [
  'https://crust-crumb-helper.lovable.app',
  'https://id-preview--6392866a-c322-4459-97b2-6e085274a327.lovable.app',
  'https://crust-crumb-helper.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const ALLOWED_SUFFIXES = ['.lovable.app', '.lovableproject.com', '.vercel.app'];

const ALLOWED_HEADERS =
  'authorization, x-client-info, apikey, content-type, ' +
  'x-supabase-client-platform, x-supabase-client-platform-version, ' +
  'x-supabase-client-runtime, x-supabase-client-runtime-version';

function pickOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  if (!origin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (ALLOWED_SUFFIXES.some(s => origin.endsWith(s))) return origin;
  return ALLOWED_ORIGINS[0];
}

/**
 * Build CORS headers for a given request. Use this in every Response that
 * your edge function returns so the Access-Control-Allow-Origin reflects
 * the (allowed) caller, not a wildcard.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': pickOrigin(req),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/**
 * Short-circuit OPTIONS preflight requests. Returns a Response when the
 * method is OPTIONS, null otherwise. Call at the top of every handler.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
