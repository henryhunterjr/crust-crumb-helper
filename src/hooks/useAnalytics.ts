import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { subDays, format, startOfDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function useOutreachAnalytics(days: number = 30) {
  const { data: messages = [] } = useQuery({
    queryKey: ['outreach-messages-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cutoff = subDays(new Date(), days);
  const prevCutoff = subDays(cutoff, days);

  const stats = useMemo(() => {
    const current = messages.filter(m => new Date(m.created_at) >= cutoff);
    const previous = messages.filter(m => {
      const d = new Date(m.created_at);
      return d >= prevCutoff && d < cutoff;
    });

    const sent = current.filter(m => m.status === 'sent' || m.status === 'replied');
    const prevSent = previous.filter(m => m.status === 'sent' || m.status === 'replied');
    const responded = current.filter(m => (m as any).responded === true);

    return {
      dmsSent: sent.length,
      prevDmsSent: prevSent.length,
      responseRate: sent.length > 0 ? Math.round((responded.length / sent.length) * 100) : 0,
      responded: responded.length,
    };
  }, [messages, cutoff, prevCutoff]);

  // Messages over time (weekly buckets)
  const chartData = useMemo(() => {
    const weeks: Record<string, { dms: number; emails: number }> = {};
    const now = new Date();
    for (let i = Math.ceil(days / 7) - 1; i >= 0; i--) {
      const weekStart = subDays(now, (i + 1) * 7);
      const key = format(weekStart, 'MMM d');
      weeks[key] = { dms: 0, emails: 0 };
    }

    messages.forEach(m => {
      const d = new Date(m.created_at);
      if (d < cutoff) return;
      // Find which bucket
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.floor(diffDays / 7);
      const weekStart = subDays(now, (weekIdx + 1) * 7);
      const key = format(weekStart, 'MMM d');
      if (weeks[key]) {
        weeks[key].dms++;
      }
    });

    return Object.entries(weeks).map(([name, data]) => ({
      name,
      dms: data.dms,
      emails: data.emails,
      total: data.dms + data.emails,
    }));
  }, [messages, cutoff, days]);

  // Template performance
  const templatePerformance = useMemo(() => {
    const templates: Record<string, { sent: number; responded: number; totalDays: number }> = {};
    const current = messages.filter(m => new Date(m.created_at) >= cutoff);

    current.forEach(m => {
      const type = (m as any).template_type || m.message_type || 'custom';
      if (!templates[type]) templates[type] = { sent: 0, responded: 0, totalDays: 0 };
      if (m.status === 'sent' || m.status === 'replied') {
        templates[type].sent++;
        if ((m as any).responded === true) {
          templates[type].responded++;
          if ((m as any).responded_at && m.sent_at) {
            const daysDiff = Math.max(0.1, (new Date((m as any).responded_at).getTime() - new Date(m.sent_at).getTime()) / (1000 * 60 * 60 * 24));
            templates[type].totalDays += daysDiff;
          }
        }
      }
    });

    return Object.entries(templates).map(([template, data]) => ({
      template,
      sent: data.sent,
      responded: data.responded,
      rate: data.sent > 0 ? Math.round((data.responded / data.sent) * 100) : 0,
      avgDays: data.responded > 0 ? Number((data.totalDays / data.responded).toFixed(1)) : null,
    })).sort((a, b) => b.sent - a.sent);
  }, [messages, cutoff]);

  return { stats, chartData, templatePerformance };
}

export function useSegmentSnapshots() {
  const queryClient = useQueryClient();

  const { data: snapshots = [] } = useQuery({
    queryKey: ['segment-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segment_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const takeSnapshot = useMutation({
    mutationFn: async () => {
      // Fetch current member counts by segment
      const { data: members, error } = await supabase
        .from('members')
        .select('engagement_status, message_status');
      if (error) throw error;

      const today = format(new Date(), 'yyyy-MM-dd');
      const segments: Record<string, number> = {
        'Never Engaged': 0,
        'Active': 0,
        'At Risk': 0,
        'Inactive': 0,
        'Needs Welcome': 0,
      };

      members?.forEach(m => {
        const status = m.engagement_status || 'unknown';
        if (status === 'Active') segments['Active']++;
        else if (status === 'At Risk') segments['At Risk']++;
        else if (status === 'Inactive') segments['Inactive']++;
        else segments['Never Engaged']++;

        if (m.message_status === 'not_contacted') segments['Needs Welcome']++;
      });

      const rows = Object.entries(segments).map(([segment_name, member_count]) => ({
        snapshot_date: today,
        segment_name,
        member_count,
      }));

      const { error: insertError } = await supabase
        .from('segment_snapshots')
        .insert(rows);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segment-snapshots'] });
      toast.success('Segment snapshot taken');
    },
  });

  // Group snapshots by date for trend display
  const trends = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    snapshots.forEach(s => {
      if (!byDate[s.snapshot_date]) byDate[s.snapshot_date] = {};
      byDate[s.snapshot_date][s.segment_name] = s.member_count;
    });
    return Object.entries(byDate)
      .map(([date, segments]) => ({ date, ...segments }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [snapshots]);

  return { snapshots, trends, takeSnapshot };
}

export function useRespondedTracking() {
  const queryClient = useQueryClient();

  const updateResponded = useMutation({
    mutationFn: async ({ id, responded }: { id: string; responded: boolean | null }) => {
      const updates: Record<string, unknown> = { responded };
      if (responded === true) {
        updates.responded_at = new Date().toISOString();
      } else {
        updates.responded_at = null;
      }
      const { error } = await supabase
        .from('outreach_messages')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-messages'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-messages-analytics'] });
    },
  });

  return { updateResponded };
}
