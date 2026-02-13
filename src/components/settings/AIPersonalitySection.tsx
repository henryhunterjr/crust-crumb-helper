import { useState, useEffect } from 'react';
import { Bot, Loader2, X, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAISettings } from '@/hooks/useAISettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AIPersonalitySection() {
  const { settings, isLoading, saveSettings } = useAISettings();

  const [tone, setTone] = useState('');
  const [avoidedWords, setAvoidedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [useContractions, setUseContractions] = useState(true);
  const [noEmDashes, setNoEmDashes] = useState(true);
  const [varySentences, setVarySentences] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [emojiLimit, setEmojiLimit] = useState('2');
  const [endEncouragement, setEndEncouragement] = useState(true);
  const [personalStory, setPersonalStory] = useState(false);
  const [dmSignoff, setDmSignoff] = useState('');
  const [emailSignoff, setEmailSignoff] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [myName, setMyName] = useState('');
  const [myRole, setMyRole] = useState('');
  const [teachingStyle, setTeachingStyle] = useState('');
  const [aboutMe, setAboutMe] = useState('');

  const [previewText, setPreviewText] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (!isLoading && settings) {
      setTone(settings.tone_description);
      setAvoidedWords(settings.avoided_words.split(', ').filter(Boolean));
      setUseContractions(settings.use_contractions === 'true');
      setNoEmDashes(settings.no_em_dashes === 'true');
      setVarySentences(settings.vary_sentences === 'true');
      setIncludeEmoji(settings.include_emoji === 'true');
      setEmojiLimit(settings.emoji_limit);
      setEndEncouragement(settings.end_with_encouragement === 'true');
      setPersonalStory(settings.include_personal_story === 'true');
      setDmSignoff(settings.dm_signoff);
      setEmailSignoff(settings.email_signoff);
      setCommunityName(settings.community_name);
      setMyName(settings.my_name);
      setMyRole(settings.my_role);
      setTeachingStyle(settings.teaching_style);
      setAboutMe(settings.about_me);
    }
  }, [settings, isLoading]);

  const handleSave = () => {
    saveSettings.mutate({
      tone_description: tone,
      avoided_words: avoidedWords.join(', '),
      use_contractions: String(useContractions),
      no_em_dashes: String(noEmDashes),
      vary_sentences: String(varySentences),
      include_emoji: String(includeEmoji),
      emoji_limit: emojiLimit,
      end_with_encouragement: String(endEncouragement),
      include_personal_story: String(personalStory),
      dm_signoff: dmSignoff,
      email_signoff: emailSignoff,
      community_name: communityName,
      my_name: myName,
      my_role: myRole,
      teaching_style: teachingStyle,
      about_me: aboutMe,
    });
  };

  const handleAddWord = () => {
    if (newWord.trim() && !avoidedWords.includes(newWord.trim())) {
      setAvoidedWords([...avoidedWords, newWord.trim()]);
      setNewWord('');
    }
  };

  const handleRemoveWord = (word: string) => {
    setAvoidedWords(avoidedWords.filter(w => w !== word));
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewText('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-dm', {
        body: {
          member_name: 'Sam',
          message_type: 'welcome_message',
          application_answer: 'I want to improve my sourdough shaping and learn about scoring techniques',
          tags: ['sourdough', 'shaping'],
        },
      });
      if (error) throw error;
      setPreviewText(data.message || 'No preview generated');
    } catch (err: any) {
      toast.error('Preview failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>AI Voice & Personality</CardTitle>
              <CardDescription>Configure how the AI writes content in your voice</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Preview Sample DM
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tone */}
        <div className="space-y-2">
          <Label className="font-medium">Writing Tone</Label>
          <Textarea value={tone} onChange={e => setTone(e.target.value)} className="min-h-[80px]" />
        </div>

        {/* Avoided Words */}
        <div className="space-y-2">
          <Label className="font-medium">Words & Phrases to Avoid</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {avoidedWords.map(word => (
              <Badge key={word} variant="secondary" className="text-xs gap-1 pr-1">
                {word}
                <button onClick={() => handleRemoveWord(word)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Add word or phrase"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWord(); } }}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleAddWord}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Formatting Rules */}
        <div className="space-y-3">
          <Label className="font-medium">Formatting Rules</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Use contractions</span>
              <Switch checked={useContractions} onCheckedChange={setUseContractions} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">No em dashes</span>
              <Switch checked={noEmDashes} onCheckedChange={setNoEmDashes} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Vary sentence length</span>
              <Switch checked={varySentences} onCheckedChange={setVarySentences} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Include emoji</span>
              <div className="flex items-center gap-2">
                <Switch checked={includeEmoji} onCheckedChange={setIncludeEmoji} />
                {includeEmoji && (
                  <Input type="number" value={emojiLimit} onChange={e => setEmojiLimit(e.target.value)}
                    className="w-14 h-7 text-xs" min="0" max="5"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">End with encouragement</span>
              <Switch checked={endEncouragement} onCheckedChange={setEndEncouragement} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Include personal stories</span>
              <Switch checked={personalStory} onCheckedChange={setPersonalStory} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Sign-offs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>DM Sign-off</Label>
            <Input value={dmSignoff} onChange={e => setDmSignoff(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email Sign-off</Label>
            <Input value={emailSignoff} onChange={e => setEmailSignoff(e.target.value)} />
          </div>
        </div>

        <Separator />

        {/* Context */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Community Name</Label>
            <Input value={communityName} onChange={e => setCommunityName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>My Name</Label>
            <Input value={myName} onChange={e => setMyName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>My Role</Label>
            <Input value={myRole} onChange={e => setMyRole(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">Teaching Style</Label>
          <Textarea value={teachingStyle} onChange={e => setTeachingStyle(e.target.value)} className="min-h-[60px]" />
        </div>

        <div className="space-y-2">
          <Label className="font-medium">About Me (for AI context)</Label>
          <Textarea value={aboutMe} onChange={e => setAboutMe(e.target.value)} className="min-h-[80px]" />
        </div>

        {/* Preview */}
        {previewText && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="font-medium">Preview: Sample Welcome DM</Label>
              <div className="bg-accent/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {previewText}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
