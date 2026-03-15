
BEGIN;

-- 17. Advanced Scoring Techniques (5 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Advanced Scoring Techniques')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Sourdough Scoring Mastery: First Cut to Bread Art', 1, ARRAY['scoring','mastery','introduction']::text[]),
  ('Module 1: Scoring Fundamentals', 2, ARRAY['scoring','fundamentals','basics']::text[]),
  ('Module 2: Intermediate Techniques', 3, ARRAY['scoring','intermediate']::text[]),
  ('Module 3: Decorative Scoring', 4, ARRAY['scoring','decorative','bread art']::text[]),
  ('Scoring Tutorial', 5, ARRAY['scoring','tutorial','practice']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 18. The Art of the Braid: Challah Braiding Masterclass (7 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Art of the Braid: Challah Braiding Masterclass')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Royal 6 Challah', 1, ARRAY['challah','6 strand','braiding']::text[]),
  ('Challah Twist', 2, ARRAY['challah','twist','braiding']::text[]),
  ('Challah Garden', 3, ARRAY['challah','garden','decorative']::text[]),
  ('Festive 6 Strand Challah', 4, ARRAY['challah','6 strand','festive']::text[]),
  ('How to braid a three strand Challah', 5, ARRAY['challah','3 strand','braiding']::text[]),
  ('How to Braid a 6 Strand Challah', 6, ARRAY['challah','6 strand','braiding']::text[]),
  ('How to Braid a Two Strand Challah', 7, ARRAY['challah','2 strand','braiding']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 19. Natural Leavening with Yeast Water (10 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'Natural Leavening with Yeast Water')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('The Yeast Water Method', 1, ARRAY['yeast water','method','introduction']::text[]),
  ('WELCOME TO THE YEAST WATER ADVENTURE Module 1', 2, ARRAY['yeast water','welcome','module 1']::text[]),
  ('MODULE 2: Choosing the Right Fruit', 3, ARRAY['yeast water','fruit','selection']::text[]),
  ('HOW TO KEEP YOUR YEAST WATER ALIVE Module 3', 4, ARRAY['yeast water','maintenance','care']::text[]),
  ('Keeping yeast water happy', 5, ARRAY['yeast water','maintenance','tips']::text[]),
  ('Module 4 Is Live: Your First Yeast Water Loaf', 6, ARRAY['yeast water','first loaf','baking']::text[]),
  ('Your First Yeast Water Loaf', 7, ARRAY['yeast water','first loaf','recipe']::text[]),
  ('You''ve Watched Module 4 Take the Quiz', 8, ARRAY['yeast water','quiz','module 4']::text[]),
  ('What''s Your Yeast Water Readiness Score?', 9, ARRAY['yeast water','readiness','assessment']::text[]),
  ('Module 5 Troubleshooting & Signs of Readiness', 10, ARRAY['yeast water','troubleshooting','readiness']::text[])
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
  ('Valentine''s Zebra Bread: Full Walkthrough', 1, ARRAY['zebra bread','valentines','bake along']::text[]),
  ('Recap Valentine''s Zebra Bread Bake-Along', 2, ARRAY['zebra bread','recap','valentines']::text[]),
  ('How to Make a Two-Tone Star Bread', 3, ARRAY['star bread','two-tone','shaping']::text[]),
  ('Stop Making Boring Star Bread', 4, ARRAY['star bread','technique','creativity']::text[]),
  ('Why Japanese Milk Bread Stays Soft for Days', 5, ARRAY['japanese milk bread','tangzhong','softness']::text[]),
  ('The Softest Bread You''ll Ever Make at Home', 6, ARRAY['soft bread','enriched','technique']::text[]),
  ('The Secret Technique Ligurian Focaccia', 7, ARRAY['focaccia','ligurian','olive oil','technique']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 22. From Oven to Market (8 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'From Oven to Market: Build Your Bread Business')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('The Foundation Every Baker Skips', 1, ARRAY['business','foundation','planning']::text[]),
  ('Module 4 Understanding True Cost', 2, ARRAY['pricing','cost','business']::text[]),
  ('M-4 The Pricing Lesson That Changed Everything', 3, ARRAY['pricing','lesson','business']::text[]),
  ('Module 5: Mastery of Brand & Presentation', 4, ARRAY['branding','presentation','business']::text[]),
  ('M-5 Your Digital Storefront: Sales While You Sleep', 5, ARRAY['digital storefront','online sales','business']::text[]),
  ('M-5 Digital Storefront: Landing Page Worksheet', 6, ARRAY['landing page','worksheet','business']::text[]),
  ('Module 3: Market Logistics From Oven to Market', 7, ARRAY['logistics','market','business']::text[]),
  ('From Oven to Market Website Intake Form', 8, ARRAY['website','intake form','business']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 23. January Fresh Start Challenge (7 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'January Fresh Start Challenge')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Welcome to the January Fresh Start Challenge', 1, ARRAY['challenge','welcome','introduction']::text[]),
  ('Starter Reset Get your starter active again', 2, ARRAY['starter reset','revival','maintenance']::text[]),
  ('Week 2 Weekday Breads & Buns', 3, ARRAY['weekday breads','buns','quick']::text[]),
  ('Week 3: Baguettes & Babka', 4, ARRAY['baguettes','babka','shaping']::text[]),
  ('Week 4: Seeded Sandwich Loaf', 5, ARRAY['sandwich loaf','seeds','baking']::text[]),
  ('Essential Tools for Success', 6, ARRAY['tools','equipment','essentials']::text[]),
  ('Temperature: The Invisible Ingredient', 7, ARRAY['temperature','fermentation','science']::text[])
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
  ('Shaping a Batard: The Letter Fold Method', 1, ARRAY['batard','shaping','letter fold']::text[]),
  ('The Poke Test: Know When Your Dough Is Ready', 2, ARRAY['poke test','proofing','readiness']::text[]),
  ('Adding Inclusions: Folding In Cheese During Bulk', 3, ARRAY['inclusions','cheese','bulk fermentation']::text[]),
  ('The Coil Fold: Handling High Hydration Dough', 4, ARRAY['coil fold','high hydration','technique']::text[]),
  ('Fermentolyse, Salt Addition, and the Rubaud Method', 5, ARRAY['fermentolyse','salt','rubaud method']::text[]),
  ('Countertop Coil Fold: Enriched Dough Panettone', 6, ARRAY['coil fold','panettone','enriched dough']::text[]),
  ('How to Make Tangzhong (25g Flour + 75ml Milk)', 7, ARRAY['tangzhong','technique','milk bread']::text[]),
  ('How to Slice a Boule for Sandwich Bread', 8, ARRAY['boule','slicing','sandwich bread']::text[]),
  ('Hand Kneading Enriched Dough to Windowpane', 9, ARRAY['kneading','enriched dough','windowpane']::text[]),
  ('Fermentolyse: The Rest That Does the Work for You', 10, ARRAY['fermentolyse','autolyse','rest']::text[]),
  ('Dimpling In Salt After Fermentolyse', 11, ARRAY['salt','fermentolyse','technique']::text[]),
  ('Shaping & Scoring Hoagie Rolls (Baguette Method)', 12, ARRAY['hoagie rolls','shaping','scoring','baguette']::text[]),
  ('Your Dough Is Proofing How to Know When It''s Ready', 13, ARRAY['proofing','readiness','timing']::text[]),
  ('Adding Inclusions After the First Coil Fold', 14, ARRAY['inclusions','coil fold','technique']::text[]),
  ('Babka Tutorial', 15, ARRAY['babka','shaping','enriched dough']::text[]),
  ('Banh Mi Scoring Technique The Right Way', 16, ARRAY['banh mi','scoring','technique']::text[]),
  ('The Poke Test How to Know Your Dough', 17, ARRAY['poke test','proofing','dough reading']::text[]),
  ('Banh Mi / Baguette Shaping Technique', 18, ARRAY['banh mi','baguette','shaping']::text[]),
  ('Reading Your Dough: How Bubbles Tell The Story', 19, ARRAY['dough reading','bubbles','fermentation']::text[]),
  ('Stop Over-Handling Your Dough My Simple Shape', 20, ARRAY['shaping','gentle handling','technique']::text[]),
  ('How to make a Tangzhong', 21, ARRAY['tangzhong','technique','milk bread']::text[])
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
  ('The Executioner''s Loaf: The Upside-Down History of Rye', 1, ARRAY['rye','history','culture']::text[]),
  ('Did Bread Cause the Salem Witch Trials?', 2, ARRAY['salem','ergot','history','rye']::text[]),
  ('Meet Your Host: Rachel Parker', 3, ARRAY['introduction','rachel parker','host']::text[]),
  ('What Your Starter Is Trying to Tell You', 4, ARRAY['starter','troubleshooting','reading signs']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 31. The Saturday Bake-Along Vault (6 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'The Saturday Bake-Along Vault')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('Three ways to leaven one bread', 1, ARRAY['leavening','methods','comparison']::text[]),
  ('Saturday''s Bake-Along: Savory Star Bread', 2, ARRAY['star bread','savory','bake along']::text[]),
  ('Why Japanese Milk Bread Stays Soft for Days', 3, ARRAY['japanese milk bread','tangzhong','science']::text[]),
  ('Japanese Milk Bread Shaping', 4, ARRAY['japanese milk bread','shaping','technique']::text[]),
  ('Japanese Milk Bread Science of Starch', 5, ARRAY['japanese milk bread','starch','science']::text[]),
  ('Japanese Milk Bread Shaping (second entry)', 6, ARRAY['japanese milk bread','shaping','technique']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

-- 32. We Just Want to See You Bake Better Bread (4 modules)
WITH r AS (SELECT id FROM classroom_resources WHERE title = 'We Just Want to See You Bake Better Bread')
INSERT INTO course_modules (resource_id, title, sort_order, topics)
SELECT r.id, t.title, t.sort_order, t.topics FROM r, (VALUES
  ('What a Jewish German Baker Taught Me at 22', 1, ARRAY['story','mentorship','origin']::text[]),
  ('This isn''t a pitch. It''s a recipe.', 2, ARRAY['introduction','philosophy','welcome']::text[]),
  ('Join the Academy and Stop Making Boring Star Bread', 3, ARRAY['star bread','invitation','community']::text[]),
  ('This Week''s Bake: Henry''s Big Gooey Cinnamon Rolls', 4, ARRAY['cinnamon rolls','recipe','bake']::text[])
) AS t(title, sort_order, topics)
ON CONFLICT (resource_id, title) DO NOTHING;

COMMIT;
