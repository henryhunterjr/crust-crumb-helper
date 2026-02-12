import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWeeklyGoals, WeeklyGoal } from '@/hooks/useWeeklyGoals';
import { toast } from 'sonner';

export function WeeklyGoalsWidget() {
  const { goals, upsertGoal } = useWeeklyGoals();
  const [addOpen, setAddOpen] = useState(false);
  const [newGoalType, setNewGoalType] = useState('welcome');
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('50');

  const handleAdd = async () => {
    if (!newGoalLabel.trim()) return;
    try {
      await upsertGoal.mutateAsync({
        goal_type: newGoalType,
        goal_label: newGoalLabel.trim(),
        target_count: parseInt(newGoalTarget) || 50,
      });
      toast.success('Goal added');
      setAddOpen(false);
      setNewGoalLabel('');
      setNewGoalTarget('50');
    } catch {
      toast.error('Failed to add goal');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-4 w-4" />
          This Week's Targets
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Goal
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No goals set for this week. Click "Add Goal" to get started.
          </p>
        ) : (
          goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Weekly Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newGoalType} onValueChange={setNewGoalType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">Welcome Members</SelectItem>
                <SelectItem value="reengage">Re-engage Inactive</SelectItem>
                <SelectItem value="respond">Respond to Questions</SelectItem>
                <SelectItem value="content">Complete Content</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Goal description"
              value={newGoalLabel}
              onChange={(e) => setNewGoalLabel(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Target count"
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newGoalLabel.trim()}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GoalRow({ goal }: { goal: WeeklyGoal }) {
  const pct = goal.target_count > 0 ? Math.round((goal.current_count / goal.target_count) * 100) : 0;
  const isComplete = goal.current_count >= goal.target_count;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">
          {isComplete ? '✅' : '☐'} {goal.goal_label}
        </span>
        <span className="text-xs text-muted-foreground">
          {goal.current_count}/{goal.target_count}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={pct} className="flex-1 h-2" />
        <span className="text-xs font-medium w-10 text-right">{pct}%</span>
      </div>
    </div>
  );
}
