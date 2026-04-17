import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'urls array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size
    const batch = urls.slice(0, 50);
    const results: Array<{
      url: string;
      is_healthy: boolean;
      status_code: number | null;
      error_message: string | null;
      redirect_url: string | null;
    }> = [];

    for (const url of batch) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'CrustCrumb-URLChecker/1.0',
          },
        });
        clearTimeout(timeout);

        // If HEAD fails, try GET (some servers don't support HEAD)
        if (response.status === 405 || response.status === 403) {
          const getResponse = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
            redirect: 'follow',
            headers: {
              'User-Agent': 'CrustCrumb-URLChecker/1.0',
            },
          });
          // Consume body
          await getResponse.text();

          results.push({
            url,
            is_healthy: getResponse.ok,
            status_code: getResponse.status,
            error_message: getResponse.ok ? null : `HTTP ${getResponse.status}`,
            redirect_url: getResponse.redirected ? getResponse.url : null,
          });
        } else {
          results.push({
            url,
            is_healthy: response.ok,
            status_code: response.status,
            error_message: response.ok ? null : `HTTP ${response.status}`,
            redirect_url: response.redirected ? response.url : null,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          url,
          is_healthy: false,
          status_code: null,
          error_message: errorMessage.includes('abort') ? 'Timeout (10s)' : errorMessage,
          redirect_url: null,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying URLs:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to verify URLs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
