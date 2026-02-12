import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Copy, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOutreachMessages } from '@/hooks/useOutreachMessages';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  welcome_message: 'Welcome',
  resource_recommendation: 'Resources',
  feedback_request: 'Feedback',
  custom: 'Custom',
};

const statusLabels: Record<string, string> = {
  generated: 'Generated',
  sent: 'Sent',
  replied: 'Replied',
};

const statusStyles: Record<string, string> = {
  generated: 'bg-accent text-accent-foreground',
  sent: 'bg-primary/15 text-primary border-primary/30',
  replied: 'bg-[hsl(142,76%,36%)]/15 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30',
};

export default function OutreachLog() {
  const { messages, isLoading } = useOutreachMessages();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (debouncedSearch && !m.member_name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (typeFilter !== 'all' && m.message_type !== typeFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      return true;
    });
  }, [messages, debouncedSearch, typeFilter, statusFilter]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Message copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const logStats = useMemo(() => ({
    total: messages.length,
    generated: messages.filter(m => m.status === 'generated').length,
    sent: messages.filter(m => m.status === 'sent').length,
    replied: messages.filter(m => m.status === 'replied').length,
  }), [messages]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container py-6 px-4 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Outreach Log</h1>
          <p className="text-muted-foreground">
            Track all generated messages across all members
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Messages</p>
            <p className="text-2xl font-bold">{logStats.total}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Generated</p>
            <p className="text-2xl font-bold">{logStats.generated}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Sent</p>
            <p className="text-2xl font-bold">{logStats.sent}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Replied</p>
            <p className="text-2xl font-bold">{logStats.replied}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by member name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Message Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="welcome_message">Welcome</SelectItem>
              <SelectItem value="resource_recommendation">Resources</SelectItem>
              <SelectItem value="feedback_request">Feedback</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading messages...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {messages.length === 0 
              ? 'No messages generated yet. Generate DMs from the Members page to see them here.'
              : 'No messages match your filters.'}
          </div>
        ) : (
        <>
          <div className="space-y-3">
            {paginatedMessages.map((msg) => (
              <Card key={msg.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold">{msg.member_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[msg.message_type] || msg.message_type}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${statusStyles[msg.status] || ''}`}>
                        {statusLabels[msg.status] || msg.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {format(parseISO(msg.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {msg.message_text}
                    </p>
                    {msg.sent_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Sent: {format(parseISO(msg.sent_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleCopy(msg.id, msg.message_text)}
                  >
                    {copiedId === msg.id ? (
                      <><CheckCircle className="h-4 w-4 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
        )}
      </main>

      <Footer />
    </div>
  );
}
