-- Quick Response Library table for storing saved responses
CREATE TABLE public.quick_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  trigger_phrases TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed for single-user tool (no authentication)
-- Table is accessible via anon key which is fine for personal use

-- Create index for faster category filtering
CREATE INDEX idx_quick_responses_category ON public.quick_responses(category);

-- Create GIN index for faster trigger_phrases array search
CREATE INDEX idx_quick_responses_trigger_phrases ON public.quick_responses USING GIN(trigger_phrases);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quick_responses_updated_at
  BEFORE UPDATE ON public.quick_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert starter content
INSERT INTO public.quick_responses (title, trigger_phrases, content, category) VALUES
  ('Starter Smells Like Alcohol/Acetone', 
   ARRAY['alcohol', 'acetone', 'nail polish', 'smells weird', 'strong smell'], 
   E'Don''t worry - that acetone/alcohol smell just means your starter is hungry! It''s completely normal and happens when the yeast has eaten through all the available food.\n\nHere''s what to do:\n1. Give it a good feeding (1:5:5 ratio if you can - 1 part starter, 5 parts flour, 5 parts water)\n2. Keep it in a warmer spot (75-80°F is ideal)\n3. Feed it twice a day until the smell mellows out\n\nYour starter isn''t ruined. It''s just telling you it''s extra hungry. A few consistent feedings and it''ll be back to that sweet, slightly tangy smell we love.', 
   'Sourdough Starter'),
  
  ('Bulk Fermentation - How to Tell When Done', 
   ARRAY['bulk fermentation', 'when done', 'how long', 'risen enough', 'doubled'], 
   E'Forget the clock - watch the dough! Here''s what I look for:\n\n✅ Volume increased 50-75% (not necessarily doubled)\n✅ Dome-shaped top, not flat\n✅ Jiggly when you shake the container\n✅ You can see bubbles on the sides and top\n✅ Feels airy and less dense when you do a stretch\n\nThe "poke test" works great too: wet your finger, poke the dough about 1/2 inch deep. If it springs back slowly but not all the way, you''re ready for shaping.\n\nTemperature matters more than time. At 75°F it might take 4-5 hours. At 68°F you might need 8+ hours. Trust your eyes, not the timer.', 
   'Techniques'),
  
  ('What Flour Should I Use?', 
   ARRAY['flour', 'best flour', 'which flour', 'bread flour', 'all purpose'], 
   E'Start simple - you don''t need fancy flour to make great bread!\n\n**For beginners:**\nKing Arthur Bread Flour is my go-to recommendation. Consistent protein content, widely available, forgiving to work with.\n\n**Budget-friendly:**\nCostco bread flour works surprisingly well. Great for practice bakes.\n\n**Level up:**\nOnce you''re comfortable, try:\n- Central Milling Artisan Baker''s Craft (amazing flavor)\n- Cairnspring Mills (if you can get it)\n- Any local mill flour for unique flavors\n\n**Quick tip:** Whatever you use, consistency matters more than brand. Stick with one flour until you really know how it behaves, then experiment.', 
   'Ingredients'),
  
  ('Do I Need a Dutch Oven?', 
   ARRAY['dutch oven', 'need dutch oven', 'what pot', 'baking vessel', 'le creuset', 'lodge'], 
   E'A Dutch oven makes things easier, but it''s not the only way!\n\n**Why it helps:**\nTraps steam during the first part of baking = better oven spring and that crackly crust we love.\n\n**Budget options:**\n- Lodge 5qt combo cooker (~$40) - my personal favorite\n- Any heavy pot with a lid that can handle 500°F\n- Even a cheap roasting pan flipped upside down works\n\n**No Dutch oven? Try:**\n- Bake on a pizza stone with a metal bowl over the loaf\n- Use a sheet pan on the rack above to trap steam\n- Spray water in the oven + ice cubes in a pan\n\nPerfection not required - plenty of amazing bread gets made without expensive equipment!', 
   'Equipment'),
  
  ('My Bread is Too Dense', 
   ARRAY['dense', 'heavy', 'not rising', 'gummy', 'tight crumb'], 
   E'Dense bread is usually one of these culprits:\n\n**1. Underproofed (most common)**\nDid it feel tight and spring back fast when you poked it? Needs more time. Be patient!\n\n**2. Weak starter**\nWhen did you last feed it? Is it doubling within 4-6 hours at room temp? If not, it needs some TLC before your next bake.\n\n**3. Not enough steam**\nDense bread with a pale, thick crust = steam issue. Make sure that Dutch oven lid is on tight, or add more steam.\n\n**4. Too much flour**\nIf your dough felt stiff and hard to stretch, you probably added too much flour. Wetter doughs = more open crumb.\n\n**5. Cut too soon**\nI know it''s hard, but wait at least an hour before cutting! The crumb is still setting.\n\nPost a crumb shot and I''ll help you diagnose it!', 
   'Troubleshooting'),
  
  ('How Do I Store Sourdough?', 
   ARRAY['store', 'storage', 'keep fresh', 'how long', 'freeze'], 
   E'Sourdough actually keeps better than regular bread - here''s how:\n\n**First 1-2 days:**\nCut side down on a cutting board, or in a bread bag/paper bag. NOT plastic (makes crust soft) and NOT the fridge (dries it out faster).\n\n**Days 2-4:**\nPaper bag at room temp, or wrapped in a tea towel.\n\n**Longer storage:**\nFREEZE IT! Best way to keep bread fresh.\n- Slice first for easy grab-and-go\n- Wrap tight in plastic or use freezer bags\n- Toast from frozen - tastes fresh baked\n\n**Revival trick:**\nStale loaf? Run it under water for a second, then bake at 350°F for 10-15 minutes. Crackly crust comes right back.\n\nNever refrigerate unless it''s sandwich bread!', 
   'Getting Started'),
  
  ('Equipment Recommendations', 
   ARRAY['equipment', 'tools', 'what to buy', 'recommendations', 'shopping list'], 
   E'**Essential (start here):**\n- Kitchen scale ($15-25) - non-negotiable!\n- Dutch oven or combo cooker\n- Bench scraper ($5)\n- Lame or sharp razor blade\n\n**Nice to have:**\n- Banneton/proofing basket\n- Danish dough whisk\n- Pullman loaf pan\n- Bread lame with replaceable blades\n\n**Don''t need (yet):**\n- Expensive stand mixer\n- Bread machine\n- Professional stone deck oven 😄\n\n**My Amazon favorites list:**\n[Link to affiliate recommendations]\n\nSeriously though - a $15 scale and your existing cookware can make incredible bread. Don''t let "I don''t have the right equipment" stop you from starting!', 
   'Affiliate Recommendations');