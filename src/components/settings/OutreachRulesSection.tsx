import { useState } from 'react';
import { Plus, Trash2, Play, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useOutreachRules, OutreachRule } from '@/hooks/useOutreachRules';
import { DeleteItemDialog } from '@/components/settings/DeleteItemDialog';
import { toast } from 'sonner';

const CONDITION_FIELDS = [
  { value: 'days_since_join', label: 'Days since join' },
  { value: 'days_inactive', label: 'Days inactive' },
  { value: 'days_since_outreach', label: 'Days since last outreach' },
  { value: 'post_count', label: 'Post count' },
  { value: 'comment_count', label: 'Comment count' },
];

const ACTION_TYPES = [
  { value: 'generate_dm', label: 'Generate DM → Queue' },
  { value: 'auto_tag', label: 'Auto-tag member' },
  { value: 'flag_review', label: 'Flag for review' },
];

const RULE_TYPES = [
  { value: 'welcome', label: 'Welcome New Members' },
  { value: 'at_risk', label: 'Flag At-Risk Members' },
  { value: 'stalled', label: 'Course Stalled Nudge' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'custom', label: 'Custom Rule' },
];

export function OutreachRulesSection() {
  const { rules, isLoading, addRule, updateRule, deleteRule, toggleRule, evaluateRules } = useOutreachRules();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OutreachRule | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<OutreachRule | null>(null);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('welcome');
  const [conditionField, setConditionField] = useState('days_since_join');
  const [conditionOperator, setConditionOperator] = useState('gte');
  const [conditionValue, setConditionValue] = useState(3);
  const [actionType, setActionType] = useState('generate_dm');
  const [actionValue, setActionValue] = useState('welcome_message');

  const openAdd = () => {
    setEditing(null);
    setRuleName('');
    setRuleType('welcome');
    setConditionField('days_since_join');
    setConditionOperator('gte');
    setConditionValue(3);
    setActionType('generate_dm');
    setActionValue('welcome_message');
    setFormOpen(true);
  };

  const openEdit = (rule: OutreachRule) => {
    setEditing(rule);
    setRuleName(rule.rule_name);
    setRuleType(rule.rule_type);
    setConditionField(rule.condition_field);
    setConditionOperator(rule.condition_operator);
    setConditionValue(rule.condition_value);
    setActionType(rule.action_type);
    setActionValue(rule.action_value || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!ruleName.trim()) {
      toast.error('Rule name is required');
      return;
    }
    const data = {
      rule_name: ruleName,
      rule_type: ruleType,
      condition_field: conditionField,
      condition_operator: conditionOperator,
      condition_value: conditionValue,
      action_type: actionType,
      action_value: actionValue || null,
      is_active: true,
    };
    if (editing) {
      updateRule.mutate({ id: editing.id, ...data });
    } else {
      addRule.mutate(data);
    }
    setFormOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Outreach Rules</CardTitle>
                <CardDescription>
                  Automatically identify members who need outreach and queue messages for review
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => evaluateRules.mutate()} disabled={evaluateRules.isPending}>
                <Play className="h-4 w-4 mr-1" />
                {evaluateRules.isPending ? 'Running...' : 'Run Rules'}
              </Button>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outreach rules configured. Add one to automate member identification.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{rule.rule_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When {CONDITION_FIELDS.find(f => f.value === rule.condition_field)?.label || rule.condition_field}{' '}
                      {rule.condition_operator === 'gte' ? '≥' : rule.condition_operator === 'lte' ? '≤' : '='}{' '}
                      {rule.condition_value} → {ACTION_TYPES.find(a => a.value === rule.action_type)?.label || rule.action_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.is_active} onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })} />
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(rule)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { setDeleting(rule); setDeleteOpen(true); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rule' : 'Create Outreach Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="e.g., Welcome New Members" />
            </div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Condition</Label>
                <Select value={conditionField} onValueChange={setConditionField}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Operator</Label>
                <Select value={conditionOperator} onValueChange={setConditionOperator}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">≥</SelectItem>
                    <SelectItem value="lte">≤</SelectItem>
                    <SelectItem value="eq">=</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Value</Label>
                <Input type="number" value={conditionValue} onChange={e => setConditionValue(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template / Tag</Label>
                <Input value={actionValue} onChange={e => setActionValue(e.target.value)} placeholder="e.g., welcome_message" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'} Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteItemDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={deleting?.rule_name || ''}
        itemType="Outreach Rule"
        onConfirm={async () => {
          if (deleting) {
            await deleteRule.mutateAsync(deleting.id);
            setDeleteOpen(false);
            setDeleting(null);
          }
        }}
        isLoading={deleteRule.isPending}
      />
    </>
  );
}
