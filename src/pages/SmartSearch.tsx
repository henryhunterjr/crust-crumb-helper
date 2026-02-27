import { useState, useMemo } from 'react';
import { Search, Copy, RefreshCw, Plus, BookOpen, FileText, ChefHat, MessageSquare, Loader2, Check, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchResult {
  source: string;
  id: string;
  title: string;
  content: string;
  url?: string | null;
  category?: string;
  score: number;
  metadata?: Record<string, any>;
}

interface GroupedResults {
  quick_responses: SearchResult[];
  classroom: SearchResult[];
  recipes: SearchResult[];
}

/** Strip markdown artifacts from AI text */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/—/g, '-')
    .trim();
}

/** Deduplicate results by id */
function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

/** Highlight query terms in text by wrapping matches in <mark> */
function highlightTerms(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const words = query.trim().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark> : part
  );
}

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [composedResponse, setComposedResponse] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editableResponse, setEditableResponse] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults(null);
    setComposedResponse(null);
    setEditableResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: { query: query.trim(), compose_response: true },
      });

      if (error) throw error;

      setResults(data.grouped);
      setTotalResults(data.total_results);
      // Deduplicate grouped results
      if (data.grouped) {
        data.grouped.quick_responses = dedupeResults(data.grouped.quick_responses || []);
        data.grouped.classroom = dedupeResults(data.grouped.classroom || []);
        data.grouped.recipes = dedupeResults(data.grouped.recipes || []);
      }
      setResults(data.grouped);
      setTotalResults(data.total_results);
      if (data.composed_response) {
        const cleaned = stripMarkdown(data.composed_response);
        setComposedResponse(cleaned);
        setEditableResponse(cleaned);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegenerate = async () => {
    if (!query.trim()) return;
    setIsComposing(true);

    try {
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: { query: query.trim(), compose_response: true },
      });

      if (error) throw error;
      if (data.composed_response) {
        const cleaned = stripMarkdown(data.composed_response);
        setComposedResponse(cleaned);
        setEditableResponse(cleaned);
      }
    } catch (err) {
      toast.error('Failed to regenerate');
    } finally {
      setIsComposing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableResponse);
    setCopied(true);
    toast.success('Response copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsQuickResponse = async () => {
    try {
      await supabase.from('quick_responses').insert({
        title: query.trim().slice(0, 80),
        content: editableResponse,
        category: 'Getting Started',
        trigger_phrases: query.trim().split(' ').filter(w => w.length > 3),
      });
      toast.success('Saved as Quick Response!');
    } catch {
      toast.error('Failed to save');
    }
  };

  const sourceIcon = (source: string) => {
    switch (source) {
      case 'quick_response': return <MessageSquare className="h-4 w-4" />;
      case 'classroom': case 'module': return <BookOpen className="h-4 w-4" />;
      case 'recipe': return <ChefHat className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'quick_response': return 'Quick Response';
      case 'classroom': return 'Classroom';
      case 'module': return 'Course Module';
      case 'recipe': return 'Recipe';
      default: return source;
    }
  };

  const hasNoResults = results && totalResults === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container py-6 px-4 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Smart Search</h1>
          <p className="text-muted-foreground">
            Search across all your content sources and get AI-composed responses
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="What's the member asking about? e.g. 'My starter smells like acetone'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 text-base"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()} size="lg">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Search All Sources
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search Results */}
          <div className="space-y-4">
            {isSearching && (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Searching across all sources...
              </div>
            )}

            {hasNoResults && (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No matches found for "{query}"</h3>
                  <p className="text-muted-foreground mb-4">
                    This topic isn't covered in your current quick responses or classroom content.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button variant="outline" onClick={handleRegenerate}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Draft a response from scratch
                    </Button>
                    <Button variant="outline" onClick={handleSaveAsQuickResponse} disabled={!editableResponse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Save as new Quick Response topic
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {results && results.quick_responses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Quick Responses ({results.quick_responses.length})
                </h3>
                <div className="space-y-2">
                  {results.quick_responses.map((r) => (
                    <Card key={r.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{highlightTerms(r.title, query)}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{highlightTerms(r.content, query)}</p>
                            {r.category && <Badge variant="outline" className="text-[10px] mt-2">{r.category}</Badge>}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={async () => {
                              await navigator.clipboard.writeText(r.content);
                              toast.success('Copied!');
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {results && results.classroom.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Classroom Content ({results.classroom.length})
                </h3>
                <div className="space-y-2">
                  {results.classroom.map((r) => (
                    <Card key={r.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {sourceIcon(r.source)}
                              <h4 className="font-medium text-sm">{highlightTerms(r.title, query)}</h4>
                            </div>
                            {r.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{highlightTerms(r.content, query)}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              {r.category && <Badge variant="outline" className="text-[10px]">{r.category}</Badge>}
                              {r.url ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                  URL ✓
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">No URL</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {results && results.recipes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  Recipes ({results.recipes.length})
                </h3>
                <div className="space-y-2">
                  {results.recipes.map((r) => (
                    <Card key={r.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{highlightTerms(r.title, query)}</h4>
                            {r.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{highlightTerms(r.content, query)}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              {r.category && <Badge variant="outline" className="text-[10px]">{r.category}</Badge>}
                              {r.url && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">URL ✓</Badge>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: AI-Composed Response */}
          <div className="lg:sticky lg:top-6 self-start">
            {(composedResponse || isComposing) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    AI-Drafted Response
                    {results && results.quick_responses.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        Based on: {results.quick_responses[0].title}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isComposing ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Composing response...</p>
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={editableResponse}
                        onChange={(e) => setEditableResponse(e.target.value)}
                        className="min-h-[200px] text-sm"
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleCopy} className="gap-2">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied ? 'Copied!' : 'Copy Response'}
                        </Button>
                        <Button variant="outline" onClick={handleRegenerate} disabled={isComposing}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button variant="outline" onClick={handleSaveAsQuickResponse}>
                          <Plus className="h-4 w-4 mr-2" />
                          Save as Template
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {!composedResponse && !isComposing && !isSearching && !results && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Search your content</h3>
                  <p className="text-muted-foreground text-sm">
                    Type a member's question to search quick responses, classroom content, and recipes. 
                    The AI will compose a draft response with verified links.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
