// Shared CORS configuration for all edge functions
// Restricts access to known application domains only

const ALLOWED_ORIGINS = [
  'https://crust-crumb-helper.lovable.app',
  'https://id-preview--6392866a-c322-4459-97b2-6e085274a327.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin === o) || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Static headers using the primary published domain (for backward compat)
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://crust-crumb-helper.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
