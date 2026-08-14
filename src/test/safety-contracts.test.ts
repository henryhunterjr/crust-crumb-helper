import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSkoolyDmReviewUrl } from '@/lib/skoolLinks';

describe('review-before-send safety contracts', () => {
  it('creates an exact-recipient Skooly review handoff', () => {
    expect(getSkoolyDmReviewUrl('Jane Baker')).toBe(
      'https://skoo.ly/dashboard/dm#krusty=review&member=Jane%20Baker',
    );
  });

  it('never synthesizes a send action in extension v2', () => {
    const source = readFileSync(resolve(process.cwd(), 'extension/content.js'), 'utf8');
    expect(source).not.toContain('pressEnter(');
    expect(source).not.toContain("data-krusty=\"send\"");
    expect(source).toContain('Nothing was sent');
  });

  it('restores admin-only access after the legacy public policy', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260813000100_restore_admin_security_and_skooly_events.sql'),
      'utf8',
    );
    expect(migration).toContain("DROP POLICY IF EXISTS %I ON public.%I', 'DEV public full access'");
    expect(migration).toContain('TO authenticated');
    expect(migration).toContain('REVOKE ALL ON TABLE public.members');
  });
});
