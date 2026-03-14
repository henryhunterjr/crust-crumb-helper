-- =============================================================================
-- Seed: Classroom Resources & Course Modules
-- 32 classroom resources, 148 modules
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add unique constraints (idempotent)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Insert 32 Classroom Resources
-- ---------------------------------------------------------------------------

INSERT INTO classroom_resources (title, description, category, skill_level, keywords, url) VALUES
  -- 1
  ('Welcome to the Recipe Pantry',
   'Introduction to the Recipe Pantry — 500+ recipes for home bakers.',
   'Tools & Resources', 'beginner',
   ARRAY['recipe pantry','recipes','tools'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/1a9a7a84'),

  -- 2
  ('Sourdough Starter 101',
   'Complete guide to creating and maintaining your first sourdough starter from scratch.',
   'Starter Care', 'beginner',
   ARRAY['sourdough','starter','beginner','fermentation'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/5e132945'),

  -- 3
  ('The Sourdough Starter',
   'Quick-reference resource on sourdough starters.',
   'Starter Care', 'beginner',
   ARRAY['sourdough','starter'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/0f60c91e'),

  -- 4
  ('Baker''s Fundamentals',
   'Essential techniques every baker should know — washes, shaping, and troubleshooting.',
   'Sourdough Basics', 'beginner',
   ARRAY['fundamentals','shaping','techniques','basics'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/9b84e537'),

  -- 5
  ('Baker''s Percentage Explained — Stop Guessing',
   'Understand baker''s percentages so you can scale and adapt any recipe with confidence.',
   'Ingredients & Science', 'beginner',
   ARRAY['bakers percentage','math','scaling','ratios'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/f85df54e'),

  -- 6
  ('Sourdough for the Rest of Us Audio Overview',
   'Audio overview of the book Sourdough for the Rest of Us.',
   'Books & Audiobooks', 'beginner',
   ARRAY['audiobook','sourdough','book'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/90180da8'),

  -- 7
  ('Mastering Yeasted Breads',
   'Learn yeasted bread techniques with expert guidance and bake-along lessons.',
   'Yeasted Breads', 'intermediate',
   ARRAY['yeasted','white bread','buns','bake along'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/4ed6ba4e'),

  -- 8
  ('The Flour Course Every Baker Needs',
   'Deep dive into flour types, milling, and how to choose the right flour for every bake.',
   'Ingredients & Science', 'intermediate',
   ARRAY['flour','wheat','whole wheat','ap flour','bread flour'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/f38cd48b'),

  -- 9
  ('The Baker''s Toolkit',
   'Essential digital tools — Recipe Pantry, Sourdough Companion, Converter, and Glossary.',
   'Tools & Resources', 'beginner',
   ARRAY['tools','recipe pantry','converter','glossary','companion'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/9cd68d58'),

  -- 10
  ('The Two Techniques That Changed My Bread',
   'Two simple but powerful techniques that will level up your baking immediately.',
   'Shaping & Scoring', 'beginner',
   ARRAY['techniques','shaping','improvement'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/4e8d30e0'),

  -- 11
  ('The Coil Fold Strength Without Deflating The Dough',
   'Master the coil fold — build dough strength without knocking out the gas.',
   'Shaping & Scoring', 'beginner',
   ARRAY['coil fold','technique','dough strength','hydration'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/9abb8a54'),

  -- 12
  ('Cold Kitchen, Warm Dough',
   'How to manage fermentation and proofing in cold environments.',
   'Ingredients & Science', 'beginner',
   ARRAY['temperature','cold kitchen','fermentation','proofing'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/aaa344d5'),

  -- 13
  ('Pre-Ferments: The Architecture of Flavor',
   'Explore poolish, biga, pate fermentee, and sponge — the building blocks of great bread flavor.',
   'Ingredients & Science', 'intermediate',
   ARRAY['pre-ferment','poolish','biga','pate fermentee','sponge','flavor'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/4541eaf1'),

  -- 14
  ('The Dough You Know',
   'Interactive quiz to test your bread baking knowledge.',
   'Advanced Techniques', 'beginner',
   ARRAY['quiz','knowledge','dough'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/7b74d6e4'),

  -- 15
  ('Reading Fermentation: The Baker''s Sixth Sense',
   'Learn to read your dough — visual cues, timing, and the science of fermentation.',
   'Ingredients & Science', 'intermediate',
   ARRAY['fermentation','visual cues','bulk fermentation','dough reading'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/41362b70'),

  -- 16
  ('The Secret to Controlling Flavor in Sourdough',
   'Understand how time, temperature, and hydration control sourdough flavor.',
   'Ingredients & Science', 'intermediate',
   ARRAY['flavor','sourdough','fermentation','temperature','hydration'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/87ee00ae'),

  -- 17
  ('Advanced Scoring Techniques',
   'From fundamentals to decorative bread art — master scoring at every level.',
   'Shaping & Scoring', 'advanced',
   ARRAY['scoring','decorative','bread art','lame','blade'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/a09f5609'),

  -- 18
  ('The Art of the Braid: Challah Braiding Masterclass',
   'Learn multiple challah braiding techniques from simple twists to 6-strand braids.',
   'Shaping & Scoring', 'intermediate',
   ARRAY['challah','braiding','shaping','enriched dough'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/468eac84'),

  -- 19
  ('Natural Leavening with Yeast Water',
   'Create and bake with yeast water — a natural leavening alternative to sourdough starter.',
   'Advanced Techniques', 'advanced',
   ARRAY['yeast water','natural leavening','fruit','fermentation'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/9ec441f9'),

  -- 20
  ('Sourdough Starters: A Living System 101 Podcast',
   'Podcast episode exploring sourdough starters as a living ecosystem.',
   'Starter Care', 'beginner',
   ARRAY['podcast','sourdough','starter','science'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/a7adbcb7'),

  -- 21
  ('Saturday Bake-Alongs',
   'Weekly live bake-along sessions — follow along and bake together with the community.',
   'Community Events', 'intermediate',
   ARRAY['bake along','live','community','weekly'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/2e29ffa1'),

  -- 22
  ('From Oven to Market: Build Your Bread Business',
   'Turn your baking into a business — pricing, branding, logistics, and digital storefronts.',
   'Business', 'intermediate',
   ARRAY['business','pricing','branding','market','selling'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/dc406e38'),

  -- 23
  ('January Fresh Start Challenge',
   'A month-long challenge to reset your starter and build new bread skills.',
   'Challenges', 'intermediate',
   ARRAY['challenge','starter reset','baguettes','babka','sandwich loaf'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/e20af9e0'),

  -- 24
  ('The Loaf and the Lie: A History of What We Broke',
   'A look at how industrialization changed bread — and why it matters.',
   'Culture & Philosophy', 'beginner',
   ARRAY['history','industrialization','philosophy','culture'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/d657f93d'),

  -- 25
  ('Thursday Night Lights with Becca Wong',
   'Live community session hosted by Becca Wong.',
   'Community Events', 'beginner',
   ARRAY['live','community','becca wong','event'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/f9fd4b85'),

  -- 26
  ('Bread Feels Like the Problem (Even When It''s Not)',
   'Reflections on how baking connects to deeper parts of our lives.',
   'Culture & Philosophy', 'beginner',
   ARRAY['philosophy','mindset','reflection','culture'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/1bb3d964'),

  -- 27
  ('The Goldie by Sour House',
   'Guest feature — why Henry uses The Goldie proofing system by Sour House.',
   'Guest Content', 'beginner',
   ARRAY['goldie','sour house','proofing','equipment','guest'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/2ab85753'),

  -- 28
  ('Tutorials Under Construction',
   'Short-form tutorial videos covering shaping, scoring, folding, and more.',
   'Shaping & Scoring', 'intermediate',
   ARRAY['tutorials','shaping','scoring','folding','technique'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/4bcb1fd3'),

  -- 29
  ('This Bread Baking Community Became the #1 Ranked',
   'The story of how Crust & Crumb Academy became the #1 bread baking community on Skool.',
   'Tools & Resources', 'beginner',
   ARRAY['community','skool','number one','story'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/9de13593'),

  -- 30
  ('Breaking Bread with Rachel Parker',
   'Guest series with Rachel Parker exploring the history and culture of bread.',
   'Guest Content', 'beginner',
   ARRAY['guest','rachel parker','history','rye','culture'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/0df14535'),

  -- 31
  ('The Saturday Bake-Along Vault',
   'Archive of past Saturday bake-along sessions — revisit and bake at your own pace.',
   'Community Events', 'intermediate',
   ARRAY['bake along','vault','archive','replay'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/21c43210'),

  -- 32
  ('We Just Want to See You Bake Better Bread',
   'Introductory content showcasing the heart of Crust & Crumb Academy.',
   'Tools & Resources', 'beginner',
   ARRAY['introduction','community','welcome','cinnamon rolls'],
   'https://www.skool.com/crust-crumb-academy-7621/classroom/dd14ffee')

ON CONFLICT (title) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Insert 148 Course Modules
--    Each block uses a CTE to look up the parent resource_id by title.
-- ---------------------------------------------------------------------------

-- 1. Welcome to the Recipe Pantry (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Welcome to the Recipe Pantry')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Welcome to the Recipe Pantry', 1, ARRAY['recipe pantry','introduction']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 2. Sourdough Starter 101 (15 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Sourdough Starter 101')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Sourdough Starter 101: Capturing Life in a Jar',  1, ARRAY['sourdough','starter','introduction']::text[]),
  ('2. It starts with something simple',                  2, ARRAY['sourdough','starter','beginning']::text[]),
  ('3. Start Here | Sourdough Starter 101',               3, ARRAY['sourdough','starter','start']::text[]),
  ('4. Day 1: Birth of Your Starter',                     4, ARRAY['day 1','starter','creation']::text[]),
  ('5. Day 2: The Waiting Game',                          5, ARRAY['day 2','starter','patience']::text[]),
  ('6. Day 3: Signs of Life',                             6, ARRAY['day 3','starter','activity']::text[]),
  ('7. Days 4-7: Building Strength',                      7, ARRAY['days 4-7','starter','strength']::text[]),
  ('8. Starter Care & Maintenance',                       8, ARRAY['care','maintenance','feeding']::text[]),
  ('9. Is It Ready? The Tests',                           9, ARRAY['float test','readiness','testing']::text[]),
  ('10. Time to Bake',                                   10, ARRAY['baking','first bake']::text[]),
  ('11. Choosing Your First Sourdough Recipe',           11, ARRAY['recipe','first loaf','selection']::text[]),
  ('12. Is My Sourdough Starter Dead?',                  12, ARRAY['troubleshooting','revival','dead starter']::text[]),
  ('13. Pro Tips',                                       13, ARRAY['tips','advanced','pro']::text[]),
  ('14. Troubleshooting',                                14, ARRAY['troubleshooting','problems','fixes']::text[]),
  ('15. And So it Begins',                               15, ARRAY['conclusion','next steps']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 3. The Sourdough Starter (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Sourdough Starter')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('New page', 1, ARRAY['sourdough','starter']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 4. Baker's Fundamentals (3 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Baker''s Fundamentals')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Bread Washes: What to Use and When',                1, ARRAY['bread washes','egg wash','techniques']::text[]),
  ('2. Why Your Cinnamon Swirl Separates & How to Fix It', 2, ARRAY['cinnamon swirl','troubleshooting','enriched']::text[]),
  ('3. How to Shape Japanese Milk Bread',                  3, ARRAY['japanese milk bread','shaping','enriched dough']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 5. Baker's Percentage Explained (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Baker''s Percentage Explained — Stop Guessing')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Stop guessing. Start understanding.', 1, ARRAY['bakers percentage','math','ratios']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 6. Sourdough for the Rest of Us Audio Overview (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Sourdough for the Rest of Us Audio Overview')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Listen to the Overview', 1, ARRAY['audiobook','sourdough','overview']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 7. Mastering Yeasted Breads (5 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Mastering Yeasted Breads')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Yeasted Breads with Chef Dave Palmer',                1, ARRAY['yeasted','chef','guest']::text[]),
  ('2. Bakery Quality Bread with Warm Autolyse',             2, ARRAY['autolyse','bakery quality','technique']::text[]),
  ('3. Minute-for-Minute Bake Along: Homemade White Bread',  3, ARRAY['bake along','white bread','beginner']::text[]),
  ('4. Want big, round, healthy buns?',                      4, ARRAY['buns','shaping','yeasted']::text[]),
  ('5. Yeasted Breads Knowledge Check',                      5, ARRAY['quiz','knowledge check','yeasted']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 8. The Flour Course Every Baker Needs (5 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Flour Course Every Baker Needs')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Course Overview',                          1, ARRAY['flour','overview','introduction']::text[]),
  ('2. Module 1 | How Wheat Becomes Flour',       2, ARRAY['wheat','milling','flour production']::text[]),
  ('3. Module 2 | AP vs Bread vs Cake Flour',     3, ARRAY['ap flour','bread flour','cake flour','comparison']::text[]),
  ('4. Module 3 | Whole Wheat Without the Brick',  4, ARRAY['whole wheat','technique','hydration']::text[]),
  ('5. Module 3 | Podcast',                        5, ARRAY['podcast','whole wheat','flour']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 9. The Baker's Toolkit (4 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Baker''s Toolkit')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. The Recipe Pantry',            1, ARRAY['recipe pantry','tool']::text[]),
  ('2. The Sourdough Companion',      2, ARRAY['sourdough companion','tool']::text[]),
  ('3. Sourdough-Yeast Converter',    3, ARRAY['converter','yeast','sourdough','tool']::text[]),
  ('4. Crust & Crumb Glossary',       4, ARRAY['glossary','definitions','tool']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 10. The Two Techniques That Changed My Bread (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Two Techniques That Changed My Bread')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('The Two Techniques That Changed My Bread', 1, ARRAY['techniques','improvement','shaping']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 11. The Coil Fold Strength Without Deflating The Dough (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Coil Fold Strength Without Deflating The Dough')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('The Coil Fold Strength Without Deflating The Dough', 1, ARRAY['coil fold','technique','dough strength']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 12. Cold Kitchen, Warm Dough (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Cold Kitchen, Warm Dough')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('The Invisible Ingredient: Cold Changes Everything', 1, ARRAY['temperature','cold kitchen','fermentation']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 13. Pre-Ferments: The Architecture of Flavor (5 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Pre-Ferments: The Architecture of Flavor')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Introduction: Why Pre-Ferments Matter',              1, ARRAY['pre-ferment','introduction','flavor']::text[]),
  ('2. Pate Fermentee: The Original Pre-Ferment',           2, ARRAY['pate fermentee','pre-ferment','technique']::text[]),
  ('3. Poolish: The Art of Controlled Fermentation',        3, ARRAY['poolish','pre-ferment','fermentation']::text[]),
  ('4. Biga: Strength, Structure, and Control',             4, ARRAY['biga','pre-ferment','structure']::text[]),
  ('5. Module 4: Sponge: The Flexible Pre-Ferment',         5, ARRAY['sponge','pre-ferment','flexible']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 14. The Dough You Know (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Dough You Know')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Take the Quiz', 1, ARRAY['quiz','knowledge','dough']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 15. Reading Fermentation: The Baker's Sixth Sense (3 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Reading Fermentation: The Baker''s Sixth Sense')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Module 1 | What''s Actually Happening in There',  1, ARRAY['fermentation','science','yeast','bacteria']::text[]),
  ('2. Reading Fermentation Module 1',                   2, ARRAY['fermentation','reading dough']::text[]),
  ('3. Module 2 | The Visual Language of Dough',         3, ARRAY['visual cues','dough reading','fermentation']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 16. The Secret to Controlling Flavor in Sourdough (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Secret to Controlling Flavor in Sourdough')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Watch: The Secret to Controlling Sourdough Flavor', 1, ARRAY['flavor','sourdough','control','temperature']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 17. Advanced Scoring Techniques (5 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Advanced Scoring Techniques')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Sourdough Scoring Mastery: First Cut to Bread Art',  1, ARRAY['scoring','mastery','introduction']::text[]),
  ('2. Module 1: Scoring Fundamentals',                     2, ARRAY['scoring','fundamentals','basics']::text[]),
  ('3. Module 2: Intermediate Techniques',                  3, ARRAY['scoring','intermediate']::text[]),
  ('4. Module 3: Decorative Scoring',                       4, ARRAY['scoring','decorative','bread art']::text[]),
  ('5. Scoring Tutorial',                                   5, ARRAY['scoring','tutorial','practice']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 18. The Art of the Braid: Challah Braiding Masterclass (7 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Art of the Braid: Challah Braiding Masterclass')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Royal 6 Challah',                      1, ARRAY['challah','6 strand','braiding']::text[]),
  ('2. Challah Twist',                         2, ARRAY['challah','twist','braiding']::text[]),
  ('3. Challah Garden',                        3, ARRAY['challah','garden','decorative']::text[]),
  ('4. Festive 6 Strand Challah',              4, ARRAY['challah','6 strand','festive']::text[]),
  ('5. How to braid a three strand Challah',   5, ARRAY['challah','3 strand','braiding']::text[]),
  ('6. How to Braid a 6 Strand Challah',       6, ARRAY['challah','6 strand','braiding']::text[]),
  ('7. How to Braid a Two Strand Challah',     7, ARRAY['challah','2 strand','braiding']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 19. Natural Leavening with Yeast Water (10 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Natural Leavening with Yeast Water')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. The Yeast Water Method',                                  1, ARRAY['yeast water','method','introduction']::text[]),
  ('2. WELCOME TO THE YEAST WATER ADVENTURE Module 1',          2, ARRAY['yeast water','welcome','module 1']::text[]),
  ('3. MODULE 2: Choosing the Right Fruit',                      3, ARRAY['yeast water','fruit','selection']::text[]),
  ('4. HOW TO KEEP YOUR YEAST WATER ALIVE Module 3',            4, ARRAY['yeast water','maintenance','care']::text[]),
  ('5. Keeping yeast water happy',                               5, ARRAY['yeast water','maintenance','tips']::text[]),
  ('6. Module 4 Is Live: Your First Yeast Water Loaf',          6, ARRAY['yeast water','first loaf','baking']::text[]),
  ('7. Your First Yeast Water Loaf',                             7, ARRAY['yeast water','first loaf','recipe']::text[]),
  ('8. You''ve Watched Module 4 Take the Quiz',                  8, ARRAY['yeast water','quiz','module 4']::text[]),
  ('9. What''s Your Yeast Water Readiness Score?',               9, ARRAY['yeast water','readiness','assessment']::text[]),
  ('10. Module 5 Troubleshooting & Signs of Readiness',         10, ARRAY['yeast water','troubleshooting','readiness']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 20. Sourdough Starters: A Living System 101 Podcast (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Sourdough Starters: A Living System 101 Podcast')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Sourdough Starters: A Living System 101', 1, ARRAY['podcast','sourdough','starter','ecosystem']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 21. Saturday Bake-Alongs (7 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Saturday Bake-Alongs')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Valentine''s Zebra Bread: Full Walkthrough',         1, ARRAY['zebra bread','valentines','bake along']::text[]),
  ('2. Recap Valentine''s Zebra Bread Bake-Along',          2, ARRAY['zebra bread','recap','valentines']::text[]),
  ('3. How to Make a Two-Tone Star Bread',                  3, ARRAY['star bread','two-tone','shaping']::text[]),
  ('4. Stop Making Boring Star Bread',                      4, ARRAY['star bread','technique','creativity']::text[]),
  ('5. Why Japanese Milk Bread Stays Soft for Days',        5, ARRAY['japanese milk bread','tangzhong','softness']::text[]),
  ('6. The Softest Bread You''ll Ever Make at Home',        6, ARRAY['soft bread','enriched','technique']::text[]),
  ('7. The Secret Technique Ligurian Focaccia',             7, ARRAY['focaccia','ligurian','olive oil','technique']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 22. From Oven to Market: Build Your Bread Business (8 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'From Oven to Market: Build Your Bread Business')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. The Foundation Every Baker Skips',                       1, ARRAY['business','foundation','planning']::text[]),
  ('2. Module 4 Understanding True Cost',                       2, ARRAY['pricing','cost','business']::text[]),
  ('3. M-4 The Pricing Lesson That Changed Everything',         3, ARRAY['pricing','lesson','business']::text[]),
  ('4. Module 5: Mastery of Brand & Presentation',              4, ARRAY['branding','presentation','business']::text[]),
  ('5. M-5 Your Digital Storefront: Sales While You Sleep',     5, ARRAY['digital storefront','online sales','business']::text[]),
  ('6. M-5 Digital Storefront: Landing Page Worksheet',         6, ARRAY['landing page','worksheet','business']::text[]),
  ('7. Module 3: Market Logistics From Oven to Market',         7, ARRAY['logistics','market','business']::text[]),
  ('8. From Oven to Market Website Intake Form',                8, ARRAY['website','intake form','business']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 23. January Fresh Start Challenge (7 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'January Fresh Start Challenge')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Welcome to the January Fresh Start Challenge',    1, ARRAY['challenge','welcome','introduction']::text[]),
  ('2. Starter Reset Get your starter active again',     2, ARRAY['starter reset','revival','maintenance']::text[]),
  ('3. Week 2 Weekday Breads & Buns',                   3, ARRAY['weekday breads','buns','quick']::text[]),
  ('4. Week 3: Baguettes & Babka',                      4, ARRAY['baguettes','babka','shaping']::text[]),
  ('5. Week 4: Seeded Sandwich Loaf',                   5, ARRAY['sandwich loaf','seeds','baking']::text[]),
  ('6. Essential Tools for Success',                     6, ARRAY['tools','equipment','essentials']::text[]),
  ('7. Temperature: The Invisible Ingredient',           7, ARRAY['temperature','fermentation','science']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 24. The Loaf and the Lie (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Loaf and the Lie: A History of What We Broke')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('The Loaf and the Lie', 1, ARRAY['history','industrialization','bread','culture']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 25. Thursday Night Lights with Becca Wong (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Thursday Night Lights with Becca Wong')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Thursday Night Lights with Becca Wong', 1, ARRAY['live','community','becca wong']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 26. Bread Feels Like the Problem (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Bread Feels Like the Problem (Even When It''s Not)')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Bread Feels Like the Problem (Even When It''s Not)', 1, ARRAY['philosophy','mindset','reflection']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 27. The Goldie by Sour House (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Goldie by Sour House')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Why I Use the Goldie', 1, ARRAY['goldie','proofing','equipment','review']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 28. Tutorials Under Construction (21 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Tutorials Under Construction')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Shaping a Batard: The Letter Fold Method',                    1, ARRAY['batard','shaping','letter fold']::text[]),
  ('2. The Poke Test: Know When Your Dough Is Ready',                2, ARRAY['poke test','proofing','readiness']::text[]),
  ('3. Adding Inclusions: Folding In Cheese During Bulk',            3, ARRAY['inclusions','cheese','bulk fermentation']::text[]),
  ('4. The Coil Fold: Handling High Hydration Dough',                4, ARRAY['coil fold','high hydration','technique']::text[]),
  ('5. Fermentolyse, Salt Addition, and the Rubaud Method',          5, ARRAY['fermentolyse','salt','rubaud method']::text[]),
  ('6. Countertop Coil Fold: Enriched Dough Panettone',             6, ARRAY['coil fold','panettone','enriched dough']::text[]),
  ('7. How to Make Tangzhong (25g Flour + 75ml Milk)',               7, ARRAY['tangzhong','technique','milk bread']::text[]),
  ('8. How to Slice a Boule for Sandwich Bread',                     8, ARRAY['boule','slicing','sandwich bread']::text[]),
  ('9. Hand Kneading Enriched Dough to Windowpane',                  9, ARRAY['kneading','enriched dough','windowpane']::text[]),
  ('10. Fermentolyse: The Rest That Does the Work for You',         10, ARRAY['fermentolyse','autolyse','rest']::text[]),
  ('11. Dimpling In Salt After Fermentolyse',                       11, ARRAY['salt','fermentolyse','technique']::text[]),
  ('12. Shaping & Scoring Hoagie Rolls (Baguette Method)',          12, ARRAY['hoagie rolls','shaping','scoring','baguette']::text[]),
  ('13. Your Dough Is Proofing How to Know When It''s Ready',       13, ARRAY['proofing','readiness','timing']::text[]),
  ('14. Adding Inclusions After the First Coil Fold',               14, ARRAY['inclusions','coil fold','technique']::text[]),
  ('15. Babka Tutorial',                                            15, ARRAY['babka','shaping','enriched dough']::text[]),
  ('16. Banh Mi Scoring Technique The Right Way',                   16, ARRAY['banh mi','scoring','technique']::text[]),
  ('17. The Poke Test How to Know Your Dough',                      17, ARRAY['poke test','proofing','dough reading']::text[]),
  ('18. Banh Mi / Baguette Shaping Technique',                     18, ARRAY['banh mi','baguette','shaping']::text[]),
  ('19. Reading Your Dough: How Bubbles Tell The Story',            19, ARRAY['dough reading','bubbles','fermentation']::text[]),
  ('20. Stop Over-Handling Your Dough My Simple Shape',             20, ARRAY['shaping','gentle handling','technique']::text[]),
  ('21. How to make a Tangzhong',                                   21, ARRAY['tangzhong','technique','milk bread']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 29. This Bread Baking Community Became the #1 Ranked (1 module)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'This Bread Baking Community Became the #1 Ranked')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('This Bread Community Just Became #1 on Skool', 1, ARRAY['community','skool','ranking','story']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 30. Breaking Bread with Rachel Parker (4 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Breaking Bread with Rachel Parker')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. The Executioner''s Loaf: The Upside-Down History of Rye',  1, ARRAY['rye','history','culture']::text[]),
  ('2. Did Bread Cause the Salem Witch Trials?',                  2, ARRAY['salem','ergot','history','rye']::text[]),
  ('3. Meet Your Host: Rachel Parker',                            3, ARRAY['introduction','rachel parker','host']::text[]),
  ('4. What Your Starter Is Trying to Tell You',                  4, ARRAY['starter','troubleshooting','reading signs']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 31. The Saturday Bake-Along Vault (6 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Saturday Bake-Along Vault')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. Three ways to leaven one bread',                  1, ARRAY['leavening','methods','comparison']::text[]),
  ('2. Saturday''s Bake-Along: Savory Star Bread',       2, ARRAY['star bread','savory','bake along']::text[]),
  ('3. Why Japanese Milk Bread Stays Soft for Days',     3, ARRAY['japanese milk bread','tangzhong','science']::text[]),
  ('4. Japanese Milk Bread Shaping',                     4, ARRAY['japanese milk bread','shaping','technique']::text[]),
  ('5. Japanese Milk Bread Science of Starch',           5, ARRAY['japanese milk bread','starch','science']::text[]),
  ('6. Japanese Milk Bread Shaping (second entry)',      6, ARRAY['japanese milk bread','shaping','technique']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 32. We Just Want to See You Bake Better Bread (4 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'We Just Want to See You Bake Better Bread')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('1. What a Jewish German Baker Taught Me at 22',                1, ARRAY['story','mentorship','origin']::text[]),
  ('2. This isn''t a pitch. It''s a recipe.',                      2, ARRAY['introduction','philosophy','welcome']::text[]),
  ('3. Join the Academy and Stop Making Boring Star Bread',        3, ARRAY['star bread','invitation','community']::text[]),
  ('4. This Week''s Bake: Henry''s Big Gooey Cinnamon Rolls',     4, ARRAY['cinnamon rolls','recipe','bake']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

COMMIT;
