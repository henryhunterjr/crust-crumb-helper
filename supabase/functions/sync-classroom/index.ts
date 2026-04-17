import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function findBestMatch(scrapedTitle: string, dbResources: any[]): any | null {
  const normalized = normalizeTitle(scrapedTitle);

  // Exact match first
  for (const r of dbResources) {
    if (normalizeTitle(r.title) === normalized) return r;
  }

  // Partial match (one contains the other)
  for (const r of dbResources) {
    const dbNorm = normalizeTitle(r.title);
    if (dbNorm.includes(normalized) || normalized.includes(dbNorm)) return r;
  }

  return null;
}

// Parse scraped markdown into individual course entries
function parseCoursesFromMarkdown(markdown: string): { title: string; description: string }[] {
  const sections = markdown.split('\n0%\n');
  const courses: { title: string; description: string }[] = [];

  for (const section of sections) {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l);
    let title = '';
    let description = '';
    let pastImage = false;

    for (const line of lines) {
      if (line.startsWith('![')) { pastImage = true; continue; }
      if (!pastImage) continue;
      // Skip metadata lines
      if (/^Unlock at Level \d+$/.test(line) || line === 'Private Course') continue;
      if (!title) {
        title = line.replace(/^"|"$/g, '').replace(/\\\|/g, '|');
        continue;
      }
      // Skip external links and navigational text
      if (line.startsWith('http') || line.startsWith('Follow ') || line.startsWith('Previous') || line.startsWith('Next') || /^\d+-\d+ of \d+$/.test(line)) continue;
      if (line.startsWith('Press space') || line.startsWith('When dragging') || line.startsWith('Some screen') || line.startsWith('To pick up') || line.startsWith('While dragging') || line === 'StripeM-Inner') continue;
      description += (description ? ' ' : '') + line;
    }

    if (title && title.length > 2) {
      courses.push({ title, description: description.slice(0, 500) });
    }
  }

  return courses;
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const targetUrl = body.url || 'https://www.skool.com/crust-crumb-academy-7621/classroom';

    console.log('Syncing classroom from:', targetUrl);

    // Step 1: Map classroom URLs to discover individual course pages
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        search: 'classroom',
        limit: 500,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapResponse.json();
    const classroomUrls = (mapData.links || []).filter((link: string) =>
      link.includes('/classroom/') && link !== targetUrl
    );

    console.log(`Map discovered ${classroomUrls.length} classroom URLs`);

    // Step 2: Scrape main classroom page for course titles and descriptions
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

    // Step 3: Parse courses from the scraped markdown
    const scrapedCourses = parseCoursesFromMarkdown(markdown);
    console.log(`Parsed ${scrapedCourses.length} courses from classroom page`);

    // Step 4: For each discovered classroom URL, scrape to identify which course it belongs to
    const urlToTitle: Record<string, string> = {};
    for (const courseUrl of classroomUrls.slice(0, 15)) {
      try {
        const courseRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: courseUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const courseData = await courseRes.json();
        const courseMarkdown = courseData.data?.markdown || courseData.markdown || '';

        // Extract title from first heading or first meaningful line
        const titleMatch = courseMarkdown.match(/^#\s+(.+)/m);
        if (titleMatch) {
          urlToTitle[courseUrl] = titleMatch[1].trim();
        } else {
          const firstLine = courseMarkdown.split('\n').find((l: string) => l.trim().length > 3);
          if (firstLine) urlToTitle[courseUrl] = firstLine.trim();
        }

        console.log(`Course URL ${courseUrl} -> "${urlToTitle[courseUrl] || 'unknown'}"`);
      } catch (e) {
        console.error(`Failed to scrape ${courseUrl}:`, e);
      }
    }

    // Step 5: Fetch existing DB records
    const { data: dbResources, error: dbError } = await supabase.from('classroom_resources').select('*');
    if (dbError) {
      console.error('Failed to fetch resources:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch existing resources' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Match scraped courses to DB records and build updates
    const now = new Date().toISOString();
    const updates: { id: string; title: string; changes: Record<string, any> }[] = [];
    const matched = new Set<string>();

    for (const scraped of scrapedCourses) {
      const match = findBestMatch(scraped.title, dbResources || []);
      if (!match || matched.has(match.id)) continue;
      matched.add(match.id);

      const changes: Record<string, any> = { last_synced_at: now };

      // Update description if scraped one is more detailed
      if (scraped.description && (!match.description || scraped.description.length > (match.description?.length || 0))) {
        changes.description = scraped.description;
      }

      // Check if any discovered URL matches this course by title
      if (!match.url) {
        for (const [url, urlTitle] of Object.entries(urlToTitle)) {
          const urlNorm = normalizeTitle(urlTitle);
          const scrapedNorm = normalizeTitle(scraped.title);
          if (urlNorm.includes(scrapedNorm) || scrapedNorm.includes(urlNorm)) {
            changes.url = url;
            console.log(`Matched URL for "${match.title}": ${url}`);
            break;
          }
        }
      }

      updates.push({ id: match.id, title: match.title, changes });
    }

    // Step 7: Apply updates to database
    let updated = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from('classroom_resources')
        .update(u.changes)
        .eq('id', u.id);
      if (!error) {
        updated++;
      } else {
        console.error(`Failed to update "${u.title}":`, error);
      }
    }

    console.log(`Updated ${updated} of ${updates.length} matched resources`);

    return new Response(
      JSON.stringify({
        success: true,
        courses_scraped: scrapedCourses.length,
        courses_matched: updates.length,
        courses_updated: updated,
        classroom_urls_discovered: classroomUrls.length,
        url_matches_found: Object.keys(urlToTitle).length,
        synced_at: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing classroom:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to sync' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
