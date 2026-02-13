import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ClassroomResourcesSection } from '@/components/settings/ClassroomResourcesSection';
import { RecipePantrySection } from '@/components/settings/RecipePantrySection';
import { DMTemplatesSection } from '@/components/settings/DMTemplatesSection';
import { InterestMappingsSection } from '@/components/settings/InterestMappingsSection';
import { OutreachRulesSection } from '@/components/settings/OutreachRulesSection';
import { AIPersonalitySection } from '@/components/settings/AIPersonalitySection';

export default function Settings() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-6 px-4 space-y-6 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage AI voice, outreach rules, interest mappings, resources, recipes, and templates</p>
        </div>

        <AIPersonalitySection />
        <OutreachRulesSection />
        <InterestMappingsSection />
        <DMTemplatesSection />
        <ClassroomResourcesSection />
        <RecipePantrySection />
      </main>

      <Footer />
    </div>
  );
}
