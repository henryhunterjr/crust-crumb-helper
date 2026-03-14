
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classroom_resources_title_key'
  ) THEN
    ALTER TABLE classroom_resources ADD CONSTRAINT classroom_resources_title_key UNIQUE (title);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_modules_resource_id_title_key'
  ) THEN
    ALTER TABLE course_modules ADD CONSTRAINT course_modules_resource_id_title_key UNIQUE (resource_id, title);
  END IF;
END $$;

INSERT INTO classroom_resources (title, description, category, skill_level, keywords, url) VALUES
('Welcome to the Recipe Pantry',
 'Introduction to the Recipe Pantry – 500+ recipes for home bakers.',
 'Tools & Resources', 'beginner',
 ARRAY['recipe pantry','recipes','tools'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/1a9a7a84'),

('Sourdough Starter 101',
 'Complete guide to creating and maintaining your first sourdough starter from scratch.',
 'Starter Care', 'beginner',
 ARRAY['sourdough','starter','beginner','fermentation'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/5e132945'),

('The Sourdough Starter',
 'Quick-reference resource on sourdough starters.',
 'Starter Care', 'beginner',
 ARRAY['sourdough','starter'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/0f60c91e'),

('Baker''s Fundamentals',
 'Essential techniques every baker should know – washes, shaping, and troubleshooting.',
 'Sourdough Basics', 'beginner',
 ARRAY['fundamentals','shaping','techniques','basics'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/9b84e537'),

('Baker''s Percentage Explained – Stop Guessing',
 'Understand baker''s percentages so you can scale and adapt any recipe with confidence.',
 'Ingredients & Science', 'beginner',
 ARRAY['bakers percentage','math','scaling','ratios'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/f85df54e'),

('Sourdough for the Rest of Us Audio Overview',
 'Audio overview of the book Sourdough for the Rest of Us.',
 'Books & Audiobooks', 'beginner',
 ARRAY['audiobook','sourdough','book'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/90180da8'),

('Mastering Yeasted Breads',
 'Learn yeasted bread techniques with expert guidance and bake-along lessons.',
 'Yeasted Breads', 'intermediate',
 ARRAY['yeasted','white bread','buns','bake along'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/4ed6ba4e'),

('The Flour Course Every Baker Needs',
 'Deep dive into flour types, milling, and how to choose the right flour for every bake.',
 'Ingredients & Science', 'intermediate',
 ARRAY['flour','wheat','whole wheat','ap flour','bread flour'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/f38cd48b'),

('The Baker''s Toolkit',
 'Essential digital tools – Recipe Pantry, Sourdough Companion, Converter, and Glossary.',
 'Tools & Resources', 'beginner',
 ARRAY['tools','recipe pantry','converter','glossary','companion'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/9cd68d58'),

('The Two Techniques That Changed My Bread',
 'Two simple but powerful techniques that will level up your baking immediately.',
 'Shaping & Scoring', 'beginner',
 ARRAY['techniques','shaping','improvement'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/4e8d30e0'),

('The Coil Fold Strength Without Deflating The Dough',
 'Master the coil fold – build dough strength without knocking out gas.',
 'Shaping & Scoring', 'beginner',
 ARRAY['coil fold','technique','dough strength','hydration'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/9abb8a54'),

('Cold Kitchen, Warm Dough',
 'How to manage fermentation and proofing in cold environments.',
 'Ingredients & Science', 'beginner',
 ARRAY['temperature','cold kitchen','fermentation','proofing'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/aaa344d5'),

('Pre-Ferments: The Architecture of Flavor',
 'Explore poolish, biga, pate fermentee, and sponge – the building blocks of great bread flavor.',
 'Ingredients & Science', 'intermediate',
 ARRAY['pre-ferment','poolish','biga','pate fermentee','sponge','flavor'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/87ee00ae'),

('Advanced Scoring Techniques',
 'From fundamentals to decorative bread art – master scoring at every level.',
 'Shaping & Scoring', 'advanced',
 ARRAY['scoring','decorative','bread art','lame','blade'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/a09f5609'),

('The Art of the Braid: Challah Braiding Masterclass',
 'Learn multiple challah braiding techniques from simple twists to 6-strand braids.',
 'Shaping & Scoring', 'intermediate',
 ARRAY['challah','braiding','shaping','enriched dough'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/468eac84'),

('Natural Leavening with Yeast Water',
 'Create and bake with yeast water – a natural leavening alternative to sourdough starter.',
 'Advanced Techniques', 'advanced',
 ARRAY['yeast water','natural leavening','fruit','fermentation'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/9ec441f9'),

('Sourdough Starters: A Living System 101 Podcast',
 'Podcast episode exploring sourdough starters as a living ecosystem.',
 'Starter Care', 'beginner',
 ARRAY['podcast','sourdough','starter','science'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/a7adbcb7'),

('Saturday Bake-Alongs',
 'Weekly live bake-along sessions – follow along and bake together with the community.',
 'Community Events', 'intermediate',
 ARRAY['bake along','live','community','weekly'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/2e29ffa1'),

('From Oven to Market: Build Your Bread Business',
 'Turn your baking into a business – pricing, branding, logistics, and digital storefronts.',
 'Business', 'intermediate',
 ARRAY['business','pricing','branding','market','selling'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/dc406e38'),

('January Fresh Start Challenge',
 'A month-long challenge to reset your starter and build new bread skills.',
 'Challenges', 'intermediate',
 ARRAY['challenge','starter reset','baguettes','babka','sandwich loaf'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/e20af9e0'),

('The Loaf and the Lie: A History of What We Broke',
 'A look at how industrialization changed bread – and why it matters.',
 'Culture & Philosophy', 'beginner',
 ARRAY['history','industrialization','philosophy','culture'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/d657f93d'),

('Thursday Night Lights with Becca Wong',
 'Live community session hosted by Becca Wong.',
 'Community Events', 'beginner',
 ARRAY['live','community','becca wong','event'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/f9fd4b85'),

('Bread Feels Like the Problem (Even When It''s Not)',
 'Reflections on how baking connects to deeper parts of our lives.',
 'Culture & Philosophy', 'beginner',
 ARRAY['philosophy','mindset','reflection','culture'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/1bb3d964'),

('The Goldie by Sour House',
 'Guest feature – why Henry uses The Goldie proofing system by Sour House.',
 'Guest Content', 'beginner',
 ARRAY['goldie','sour house','proofing','equipment','guest'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/2ab85753'),

('Tutorials Under Construction',
 'Short-form tutorial videos covering shaping, scoring, folding, and more.',
 'Shaping & Scoring', 'intermediate',
 ARRAY['tutorials','shaping','scoring','folding','technique'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/4bcb1fd3'),

('This Bread Baking Community Became the #1 Ranked',
 'The story of how Crust & Crumb Academy became the #1 bread baking community on Skool.',
 'Tools & Resources', 'beginner',
 ARRAY['community','skool','number one','story'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/9de13593'),

('Breaking Bread with Rachel Parker',
 'Guest series with Rachel Parker exploring the history and culture of bread.',
 'Guest Content', 'beginner',
 ARRAY['guest','rachel parker','history','rye','culture'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/0df14535'),

('The Saturday Bake-Along Vault',
 'Archive of past Saturday bake-along sessions – revisit and bake at your own pace.',
 'Community Events', 'intermediate',
 ARRAY['bake along','vault','archive','replay'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/21c43210'),

('We Just Want to See You Bake Better Bread',
 'Introductory content showcasing the heart of Crust & Crumb Academy.',
 'Tools & Resources', 'beginner',
 ARRAY['introduction','community','welcome','cinnamon rolls'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/dd14ffee'),

('The Dough You Know',
 'Interactive quiz to test your bread baking knowledge.',
 'Advanced Techniques', 'beginner',
 ARRAY['quiz','knowledge','dough'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/7b74d6e4'),

('Reading Fermentation: The Baker''s Sixth Sense',
 'Learn to read your dough – visual cues, timing, and the science of fermentation.',
 'Ingredients & Science', 'intermediate',
 ARRAY['fermentation','visual cues','bulk fermentation','dough reading'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/41362b70'),

('The Secret to Controlling Flavor in Sourdough',
 'Understand how time, temperature, and hydration control sourdough flavor.',
 'Ingredients & Science', 'intermediate',
 ARRAY['flavor','sourdough','fermentation','temperature','hydration'],
 'https://www.skool.com/crust-crumb-academy-7621/classroom/87ee00ae')

ON CONFLICT (title) DO NOTHING;

COMMIT;
