import { useState, useMemo } from 'react';
import { Upload, Search, ArrowUpDown, UserPlus, RefreshCw } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MemberStatsBar } from '@/components/members/MemberStatsBar';
import { MemberFilterTabs } from '@/components/members/MemberFilterTabs';
import { MemberCard } from '@/components/members/MemberCard';
import { ImportMembersDialog } from '@/components/members/ImportMembersDialog';
import { GeneratedDMDialog } from '@/components/members/GeneratedDMDialog';
import { MemberDetailDialog } from '@/components/members/MemberDetailDialog';
import { BulkActionsBar } from '@/components/members/BulkActionsBar';
import { BulkDMQueueDialog } from '@/components/members/BulkDMQueueDialog';
import { AddMemberDialog } from '@/components/members/AddMemberDialog';
import { useMembers } from '@/hooks/useMembers';
import { Member, MemberFilter, MemberSortField, MemberImportRow, OutreachType } from '@/types/member';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Members() {
  const { 
    members, 
    isLoading,
    isFetching,
    refetch,
    stats, 
    importMembers, 
    updateMember, 
    markOutreachSent,
    markOutreachResponded,
    addMember
  } = useMembers();

  // UI state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MemberFilter>('all');
  const [sortField, setSortField] = useState<MemberSortField>('join_date');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // DM generation state
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [generatedDM, setGeneratedDM] = useState('');
  const [isGeneratingDM, setIsGeneratingDM] = useState(false);
  const [matchedResources, setMatchedResources] = useState<string[]>([]);
  const [matchedRecipes, setMatchedRecipes] = useState<string[]>([]);
  const [outreachType, setOutreachType] = useState<OutreachType>('resource_recommendation');
  const [customTopic, setCustomTopic] = useState('');

  // Member detail state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  // Bulk DM state
  const [bulkDMDialogOpen, setBulkDMDialogOpen] = useState(false);
  const [bulkOutreachType, setBulkOutreachType] = useState<OutreachType>('resource_recommendation');

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Apply filter
    switch (activeFilter) {
      case 'never_engaged':
        result = result.filter(m => m.engagement_status === 'never_engaged');
        break;
      case 'at_risk':
        result = result.filter(m => m.engagement_status === 'at_risk');
        break;
      case 'inactive':
        result = result.filter(m => m.engagement_status === 'inactive');
        break;
      case 'needs_outreach':
        result = result.filter(m => 
          ['never_engaged', 'at_risk', 'inactive'].includes(m.engagement_status) && 
          !m.outreach_sent
        );
        break;
      case 'has_goals':
        result = result.filter(m => m.application_answer && m.application_answer.trim().length > 0);
        break;
      case 'no_goals':
        result = result.filter(m => !m.application_answer || m.application_answer.trim().length === 0);
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.skool_name.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.application_answer?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sortField) {
        case 'join_date':
          return (b.join_date || '').localeCompare(a.join_date || '');
        case 'last_active':
          return (b.last_active || '').localeCompare(a.last_active || '');
        case 'engagement_status':
          const statusOrder = { never_engaged: 0, at_risk: 1, inactive: 2, unknown: 3, active: 4 };
          return statusOrder[a.engagement_status] - statusOrder[b.engagement_status];
        default:
          return 0;
      }
    });

    return result;
  }, [members, activeFilter, searchQuery, sortField]);

  const filterCounts = useMemo(() => ({
    all: members.length,
    never_engaged: members.filter(m => m.engagement_status === 'never_engaged').length,
    at_risk: members.filter(m => m.engagement_status === 'at_risk').length,
    inactive: members.filter(m => m.engagement_status === 'inactive').length,
    needs_outreach: members.filter(m => 
      ['never_engaged', 'at_risk', 'inactive'].includes(m.engagement_status) && 
      !m.outreach_sent
    ).length,
    has_goals: members.filter(m => m.application_answer && m.application_answer.trim().length > 0).length,
    no_goals: members.filter(m => !m.application_answer || m.application_answer.trim().length === 0).length,
  }), [members]);

  const handleImport = async (rows: MemberImportRow[]) => {
    try {
      const imported = await importMembers.mutateAsync(rows);
      
      // Calculate import summary
      const summary = imported.reduce((acc, m) => {
        acc[m.engagement_status] = (acc[m.engagement_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const summaryParts = [];
      if (summary.never_engaged) summaryParts.push(`${summary.never_engaged} never engaged`);
      if (summary.at_risk) summaryParts.push(`${summary.at_risk} at risk`);
      if (summary.inactive) summaryParts.push(`${summary.inactive} inactive`);

      // Check for missing application answers
      const withoutGoals = imported.filter(m => !m.application_answer || m.application_answer.trim().length === 0).length;
      
      toast.success(
        `Imported ${imported.length} members. ${summaryParts.join(', ')}.`
      );
      
      if (withoutGoals > 0) {
        toast.warning(`${withoutGoals} members have no learning goals. Personalized outreach will be limited.`);
      }
      
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import members');
    }
  };

  const handleAddMember = async (memberData: {
    skool_name: string;
    skool_username?: string;
    application_answer?: string;
    join_date?: string;
    email?: string;
  }) => {
    try {
      await addMember.mutateAsync(memberData);
      toast.success(`Added ${memberData.skool_name} to members`);
      setAddMemberDialogOpen(false);
    } catch (error) {
      console.error('Add member error:', error);
      toast.error('Failed to add member');
    }
  };

  const generateDM = async (member: Member, type: OutreachType = outreachType, topic?: string) => {
    setSelectedMember(member);
    setDmDialogOpen(true);
    setIsGeneratingDM(true);
    setGeneratedDM('');
    setMatchedResources([]);
    setMatchedRecipes([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-dm', {
        body: { 
          member, 
          outreach_type: type,
          custom_topic: topic || customTopic
        }
      });

      if (error) throw error;
      setGeneratedDM(data.message);
      setMatchedResources(data.matched_resources || []);
      setMatchedRecipes(data.matched_recipes || []);
    } catch (error) {
      console.error('Error generating DM:', error);
      toast.error('Failed to generate DM');
    } finally {
      setIsGeneratingDM(false);
    }
  };

  const handleRegenerateDM = (type: OutreachType, topic?: string) => {
    if (selectedMember) {
      setOutreachType(type);
      if (topic !== undefined) {
        setCustomTopic(topic);
      }
      generateDM(selectedMember, type, topic);
    }
  };

  const handleMarkSent = (memberId: string) => {
    markOutreachSent.mutate(memberId);
    toast.success('Marked as sent');
  };

  const handleToggleSelect = (memberId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleOpenDetail = (member: Member) => {
    setDetailMember(member);
    setDetailDialogOpen(true);
  };

  const handleUpdateMember = (updates: Partial<Member>) => {
    if (detailMember) {
      updateMember.mutate({ id: detailMember.id, updates });
    }
  };

  const handleMarkResponded = () => {
    if (detailMember) {
      markOutreachResponded.mutate(detailMember.id);
    }
  };

  const handleBulkGenerateDMs = (type: OutreachType) => {
    setBulkOutreachType(type);
    setBulkDMDialogOpen(true);
  };

  const selectedMembers = members.filter(m => selectedIds.has(m.id));
  const allVisibleSelected = filteredMembers.length > 0 && 
    filteredMembers.every(m => selectedIds.has(m.id));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Member Engagement</h1>
            <p className="text-muted-foreground">
              Track and re-engage your community members
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh member data"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            <Button onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Members
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <MemberStatsBar stats={stats} />

        {/* Filters and search */}
        <div className="flex flex-col md:flex-row gap-4 my-6">
          <MemberFilterTabs 
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
          />
          
          <div className="flex gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            
            <Select value={sortField} onValueChange={(v) => setSortField(v as MemberSortField)}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="join_date">Join Date</SelectItem>
                <SelectItem value="last_active">Last Active</SelectItem>
                <SelectItem value="engagement_status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Select all checkbox */}
        {filteredMembers.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={handleSelectAllVisible}
            />
            <span className="text-sm text-muted-foreground">
              Select all visible ({filteredMembers.length})
            </span>
          </div>
        )}

        {/* Member list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {members.length === 0 
                ? 'No members imported yet. Import a CSV or add a member to get started.'
                : 'No members match the current filters.'}
            </p>
            {members.length === 0 && (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setAddMemberDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
                <Button onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Members
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isSelected={selectedIds.has(member.id)}
                onSelect={(selected) => handleToggleSelect(member.id, selected)}
                onGenerateDM={() => generateDM(member)}
                isGenerating={isGeneratingDM && selectedMember?.id === member.id}
                onClick={() => handleOpenDetail(member)}
                onUpdateUsername={async (username) => {
                  await updateMember.mutateAsync({ id: member.id, updates: { skool_username: username } });
                  toast.success('Skool username saved');
                }}
              />
            ))}
          </div>
        )}

        {/* Bulk actions bar */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onBulkGenerateDMs={handleBulkGenerateDMs}
          isGenerating={false}
        />

        {/* Dialogs */}
        <ImportMembersDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImport}
          isImporting={importMembers.isPending}
        />

        <AddMemberDialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          onAdd={handleAddMember}
          isAdding={addMember.isPending}
        />

        <GeneratedDMDialog
          open={dmDialogOpen}
          onOpenChange={setDmDialogOpen}
          member={selectedMember}
          message={generatedDM}
          isGenerating={isGeneratingDM}
          onRegenerate={handleRegenerateDM}
          onMarkSent={() => selectedMember && handleMarkSent(selectedMember.id)}
          matchedResources={matchedResources}
          matchedRecipes={matchedRecipes}
          outreachType={outreachType}
          onOutreachTypeChange={setOutreachType}
          customTopic={customTopic}
          onCustomTopicChange={setCustomTopic}
        />

        <MemberDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          member={detailMember}
          onUpdate={handleUpdateMember}
          onMarkResponded={handleMarkResponded}
        />

        <BulkDMQueueDialog
          open={bulkDMDialogOpen}
          onOpenChange={setBulkDMDialogOpen}
          members={selectedMembers}
          onMarkSent={handleMarkSent}
          outreachType={bulkOutreachType}
        />
      </main>

      <Footer />
    </div>
  );
}
