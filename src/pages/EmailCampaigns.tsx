import { useState, useMemo } from 'react';
import { Upload, RefreshCw, Mail, Users, UserCheck, UserX, HelpCircle, Plus, FileDown, Send, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImportSubscribersDialog } from '@/components/email/ImportSubscribersDialog';
import { CrossReferenceResults } from '@/components/email/CrossReferenceResults';
import { CampaignList } from '@/components/email/CampaignList';
import { EmailDraftQueue } from '@/components/email/EmailDraftQueue';
import {
  useEmailSubscribers,
  useEmailCampaigns,
} from '@/hooks/useEmailCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EmailCampaigns() {
  const { data: subscribers = [], isLoading: subsLoading } = useEmailSubscribers();
  const { data: campaigns = [], isLoading: campsLoading } = useEmailCampaigns();

  const [importOpen, setImportOpen] = useState(false);
  const [isCrossReferencing, setIsCrossReferencing] = useState(false);
  const [crossRefResults, setCrossRefResults] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Stats
  const stats = useMemo(() => {
    const confirmed = subscribers.filter(s => s.status === 'subscribed').length;
    const skoolMembers = subscribers.filter(s => s.is_skool_member).length;
    const nonMembers = subscribers.filter(s => !s.is_skool_member).length;
    return { total: subscribers.length, confirmed, skoolMembers, nonMembers };
  }, [subscribers]);

  const handleCrossReference = async () => {
    setIsCrossReferencing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cross-reference-emails');
      if (error) throw error;
      setCrossRefResults(data);
      setActiveTab('crossref');
      toast.success(`Cross-reference complete: ${data.matches} matches, ${data.non_members} non-members, ${data.needs_review} need review`);
    } catch (err) {
      console.error(err);
      toast.error('Cross-reference failed');
    } finally {
      setIsCrossReferencing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground">Import subscribers, cross-reference with Skool, and generate email campaigns</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCrossReference} disabled={isCrossReferencing || subscribers.length === 0}>
              {isCrossReferencing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {isCrossReferencing ? 'Analyzing...' : 'Cross-Reference'}
            </Button>
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
        </div>

        {/* Subscriber Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Confirmed</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.confirmed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Also Skool</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.skoolMembers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Non-Members</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.nonMembers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Campaigns</TabsTrigger>
            <TabsTrigger value="crossref">Cross-Reference</TabsTrigger>
            <TabsTrigger value="drafts">Draft Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CampaignList
              campaigns={campaigns}
              subscribers={subscribers}
              onViewDrafts={(id) => { setSelectedCampaignId(id); setActiveTab('drafts'); }}
            />
          </TabsContent>

          <TabsContent value="crossref">
            <CrossReferenceResults
              results={crossRefResults}
              onRunCrossRef={handleCrossReference}
              isLoading={isCrossReferencing}
            />
          </TabsContent>

          <TabsContent value="drafts">
            <EmailDraftQueue
              campaignId={selectedCampaignId}
              campaigns={campaigns}
              onSelectCampaign={setSelectedCampaignId}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ImportSubscribersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <Footer />
    </div>
  );
}
