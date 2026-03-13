-- Seed 99 recipes into the recipes table
-- Safe to re-run: uses ON CONFLICT (title) DO NOTHING

-- Add unique constraint on title if it doesn't exist (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_title_unique'
  ) THEN
    ALTER TABLE recipes ADD CONSTRAINT recipes_title_unique UNIQUE (title);
  END IF;
END $$;

INSERT INTO recipes (title, description, category, skill_level, keywords, url, uses_discard, related_course)
VALUES
  (
    'Bakery Style Blueberry Scones',
    'Buttery, tender scones studded with fresh blueberries — just like your favorite bakery.',
    'Pastry',
    'intermediate',
    ARRAY['scones', 'blueberry', 'bakery', 'breakfast', 'pastry'],
    'https://pantry.bakinggreatbread.com/recipes/bakery-style-blueberry-scones',
    false,
    NULL
  ),
  (
    'Bakery Style Hot Dog Buns',
    'Soft, pillowy hot dog buns that outshine anything store-bought.',
    'Yeasted',
    'intermediate',
    ARRAY['hot dog buns', 'rolls', 'soft bread', 'bakery'],
    'https://pantry.bakinggreatbread.com/recipes/bakery-style-hot-dog-buns',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Beetroot Star Bread',
    'A stunning naturally-colored star bread with earthy beet flavor and show-stopping presentation.',
    'Yeasted',
    'advanced',
    ARRAY['star bread', 'beetroot', 'decorative', 'showstopper', 'natural color'],
    'https://pantry.bakinggreatbread.com/recipes/beetroot-star-bread',
    false,
    NULL
  ),
  (
    'Blueberry Puff Pastry Hand Pies',
    'Flaky, golden hand pies bursting with sweet blueberry filling.',
    'Pastry',
    'intermediate',
    ARRAY['hand pies', 'blueberry', 'puff pastry', 'dessert', 'portable'],
    'https://pantry.bakinggreatbread.com/recipes/blueberry-puff-pastry-hand-pies',
    false,
    NULL
  ),
  (
    'Brioche Hamburger Buns',
    'Rich, buttery brioche buns that elevate any burger to gourmet status.',
    'Enriched',
    'intermediate',
    ARRAY['brioche', 'hamburger buns', 'enriched', 'butter', 'grilling'],
    'https://pantry.bakinggreatbread.com/recipes/brioche-hamburger-buns',
    false,
    NULL
  ),
  (
    'Classic Banana Bread',
    'Moist, tender banana bread — a timeless quick bread that never disappoints.',
    'Quick Breads',
    'beginner',
    ARRAY['banana bread', 'quick bread', 'breakfast', 'snack', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/classic-banana-bread',
    false,
    NULL
  ),
  (
    'Classic Brioche Bread',
    'The quintessential French enriched bread — rich with butter and eggs.',
    'Enriched',
    'intermediate',
    ARRAY['brioche', 'french', 'enriched', 'butter', 'eggs'],
    'https://pantry.bakinggreatbread.com/recipes/classic-brioche-bread',
    false,
    NULL
  ),
  (
    'Classic French Batard',
    'A shorter, wider cousin of the baguette with a beautiful open crumb and crispy crust.',
    'Yeasted',
    'intermediate',
    ARRAY['batard', 'french bread', 'artisan', 'crusty', 'lean dough'],
    'https://pantry.bakinggreatbread.com/recipes/classic-french-batard',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Classic Neapolitan Pizza Dough',
    'Authentic Neapolitan-style pizza dough for blistered, chewy, wood-fired-style pies.',
    'Flatbread',
    'intermediate',
    ARRAY['pizza', 'neapolitan', 'italian', 'dough', 'flatbread'],
    'https://pantry.bakinggreatbread.com/recipes/classic-neapolitan-pizza-dough',
    false,
    NULL
  ),
  (
    'Classic New York Style Bagels',
    'Chewy, malty bagels boiled and baked the traditional New York way.',
    'Yeasted',
    'intermediate',
    ARRAY['bagels', 'new york', 'boiled', 'chewy', 'breakfast'],
    'https://pantry.bakinggreatbread.com/recipes/classic-new-york-style-bagels',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Classic Poolish Baguette',
    'A true French baguette built on a poolish pre-ferment for deep flavor and open crumb.',
    'Yeasted',
    'advanced',
    ARRAY['baguette', 'poolish', 'french', 'pre-ferment', 'artisan', 'crusty'],
    'https://pantry.bakinggreatbread.com/recipes/classic-poolish-baguette',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Classic Soft Breadsticks',
    'Pillowy soft breadsticks brushed with garlic butter — perfect alongside any meal.',
    'Yeasted',
    'beginner',
    ARRAY['breadsticks', 'soft', 'garlic butter', 'side dish', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/classic-soft-breadsticks',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Classic Soft Pretzels',
    'Chewy, salty soft pretzels with a deep golden crust from a baking soda bath.',
    'Yeasted',
    'intermediate',
    ARRAY['pretzels', 'soft pretzels', 'snack', 'chewy', 'salty'],
    'https://pantry.bakinggreatbread.com/recipes/classic-soft-pretzels',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Classic White Sandwich Bread',
    'A reliable, soft white sandwich loaf — the foundation every baker should master.',
    'Yeasted',
    'beginner',
    ARRAY['sandwich bread', 'white bread', 'basic', 'everyday', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/classic-white-sandwich-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Classic Yeasted Doughnuts',
    'Light, fluffy yeasted doughnuts fried to golden perfection and glazed or sugared.',
    'Pastry',
    'intermediate',
    ARRAY['doughnuts', 'fried', 'glazed', 'yeasted', 'breakfast', 'treat'],
    'https://pantry.bakinggreatbread.com/recipes/classic-yeasted-doughnuts',
    false,
    NULL
  ),
  (
    'Country Sourdough Levain',
    'A rustic country-style sourdough with a mix of whole grain and white flour for complex flavor.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'levain', 'country bread', 'rustic', 'whole grain', 'artisan'],
    'https://pantry.bakinggreatbread.com/recipes/country-sourdough-levain',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Cranberry Walnut Sourdough',
    'A hearty sourdough studded with tart cranberries and crunchy walnuts — perfect for the holidays or any day.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'cranberry', 'walnut', 'fruit bread', 'artisan'],
    'https://pantry.bakinggreatbread.com/recipes/cranberry-walnut-sourdough',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Danish Pastry',
    'Flaky, laminated Danish pastry dough — a labor of love with stunning results.',
    'Pastry',
    'advanced',
    ARRAY['danish', 'pastry', 'laminated', 'flaky', 'butter', 'breakfast'],
    'https://pantry.bakinggreatbread.com/recipes/danish-pastry',
    false,
    NULL
  ),
  (
    'Danish Rye Bread',
    'Dense, dark Scandinavian-style rye bread packed with seeds and whole grains.',
    'Yeasted',
    'intermediate',
    ARRAY['rye', 'danish', 'scandinavian', 'seeds', 'whole grain', 'dense'],
    'https://pantry.bakinggreatbread.com/recipes/danish-rye-bread',
    false,
    NULL
  ),
  (
    'Easter Bunny Bread',
    'An adorable bunny-shaped bread that makes Easter morning extra special.',
    'Holiday',
    'intermediate',
    ARRAY['easter', 'holiday', 'shaped bread', 'bunny', 'festive', 'kids'],
    'https://pantry.bakinggreatbread.com/recipes/easter-bunny-bread',
    false,
    NULL
  ),
  (
    'Easy Rosemary Focaccia',
    'Olive oil-rich, dimpled focaccia topped with fragrant rosemary and flaky salt.',
    'Flatbread',
    'beginner',
    ARRAY['focaccia', 'rosemary', 'olive oil', 'italian', 'easy', 'flatbread'],
    'https://pantry.bakinggreatbread.com/recipes/easy-rosemary-focaccia',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Everything Bagel Sourdough',
    'Sourdough bread loaded with everything bagel seasoning for a savory, crunchy crust.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'everything bagel', 'seasoning', 'savory', 'artisan'],
    'https://pantry.bakinggreatbread.com/recipes/everything-bagel-sourdough',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Fast 2 Hour No Knead Bread',
    'A speedy no-knead loaf that delivers crusty artisan bread in just two hours.',
    'Yeasted',
    'beginner',
    ARRAY['no-knead', 'fast', 'easy', 'beginner', 'crusty', 'artisan'],
    'https://pantry.bakinggreatbread.com/recipes/fast-2-hour-no-knead-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'First Sourdough Loaf',
    'Your very first sourdough — a gentle, step-by-step recipe designed for new sourdough bakers.',
    'Sourdough',
    'beginner',
    ARRAY['sourdough', 'beginner', 'first loaf', 'starter', 'learning'],
    'https://pantry.bakinggreatbread.com/recipes/first-sourdough-loaf',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'First Yeast Water Loaf',
    'An introduction to baking with yeast water — a wild yeast alternative to sourdough starter.',
    'Yeasted',
    'beginner',
    ARRAY['yeast water', 'wild yeast', 'beginner', 'first loaf', 'natural fermentation'],
    'https://pantry.bakinggreatbread.com/recipes/first-yeast-water-loaf',
    false,
    NULL
  ),
  (
    'Foolproof Pita Bread',
    'Soft, puffy pita bread that puffs up perfectly every time — easier than you think.',
    'Flatbread',
    'beginner',
    ARRAY['pita', 'flatbread', 'foolproof', 'pocket bread', 'middle eastern', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/foolproof-pita-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Foolproof Sourdough Loaf',
    'A reliable sourdough recipe engineered for consistent success every single bake.',
    'Sourdough',
    'beginner',
    ARRAY['sourdough', 'foolproof', 'reliable', 'beginner', 'consistent'],
    'https://pantry.bakinggreatbread.com/recipes/foolproof-sourdough-loaf',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Fudgy Sourdough Discard Brownies',
    'Rich, fudgy brownies made with sourdough discard for extra depth and tang.',
    'Discard',
    'beginner',
    ARRAY['discard', 'brownies', 'chocolate', 'dessert', 'sourdough discard'],
    'https://pantry.bakinggreatbread.com/recipes/fudgy-sourdough-discard-brownies',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Gluten Free Artisan Boule',
    'A crusty, rustic boule made entirely gluten-free without sacrificing texture or flavor.',
    'Gluten-Free',
    'intermediate',
    ARRAY['gluten-free', 'boule', 'artisan', 'crusty', 'allergen-friendly'],
    'https://pantry.bakinggreatbread.com/recipes/gluten-free-artisan-boule',
    false,
    NULL
  ),
  (
    'Gluten Free Focaccia',
    'Olive oil-rich focaccia adapted for gluten-free flours — crispy outside, soft inside.',
    'Gluten-Free',
    'intermediate',
    ARRAY['gluten-free', 'focaccia', 'flatbread', 'olive oil', 'allergen-friendly'],
    'https://pantry.bakinggreatbread.com/recipes/gluten-free-focaccia',
    false,
    NULL
  ),
  (
    'Gluten Free High Protein Bread',
    'A nutrient-dense gluten-free loaf boosted with extra protein for a satisfying slice.',
    'Gluten-Free',
    'intermediate',
    ARRAY['gluten-free', 'high protein', 'healthy', 'sandwich bread', 'allergen-friendly'],
    'https://pantry.bakinggreatbread.com/recipes/gluten-free-high-protein-bread',
    false,
    NULL
  ),
  (
    'Gluten Free Sandwich Bread',
    'Soft, sliceable gluten-free sandwich bread for everyday use.',
    'Gluten-Free',
    'intermediate',
    ARRAY['gluten-free', 'sandwich bread', 'everyday', 'sliceable', 'allergen-friendly'],
    'https://pantry.bakinggreatbread.com/recipes/gluten-free-sandwich-bread',
    false,
    NULL
  ),
  (
    'Gluten Free Sourdough Bread',
    'True sourdough fermentation in a gluten-free loaf — tangy flavor without the gluten.',
    'Gluten-Free',
    'intermediate',
    ARRAY['gluten-free', 'sourdough', 'fermentation', 'tangy', 'allergen-friendly'],
    'https://pantry.bakinggreatbread.com/recipes/gluten-free-sourdough-bread',
    false,
    NULL
  ),
  (
    'Henry''s Big Gooey Cinnamon Rolls',
    'Oversized, ooey-gooey cinnamon rolls with cream cheese frosting — Henry''s signature recipe.',
    'Enriched',
    'intermediate',
    ARRAY['cinnamon rolls', 'enriched', 'cream cheese frosting', 'gooey', 'brunch'],
    'https://pantry.bakinggreatbread.com/recipes/henrys-big-gooey-cinnamon-rolls',
    false,
    NULL
  ),
  (
    'Henry''s Blueberry Cinnamon Rolls',
    'A fruity twist on the classic cinnamon roll with a blueberry swirl.',
    'Enriched',
    'intermediate',
    ARRAY['cinnamon rolls', 'blueberry', 'enriched', 'brunch', 'fruit'],
    'https://pantry.bakinggreatbread.com/recipes/henrys-blueberry-cinnamon-rolls',
    false,
    NULL
  ),
  (
    'Henry''s Blueberry Muffin Bread',
    'All the comfort of blueberry muffins baked into an easy quick bread loaf.',
    'Quick Breads',
    'beginner',
    ARRAY['blueberry', 'muffin bread', 'quick bread', 'breakfast', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/henrys-blueberry-muffin-bread',
    false,
    NULL
  ),
  (
    'Henry''s Crusty White Bread',
    'A straightforward crusty white bread with a crackly crust and soft interior.',
    'Yeasted',
    'beginner',
    ARRAY['white bread', 'crusty', 'basic', 'everyday', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/henrys-crusty-white-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Henry''s Market Day White',
    'A market-ready white bread designed for bakers selling at farmers markets.',
    'Yeasted',
    'intermediate',
    ARRAY['market day', 'white bread', 'selling', 'farmers market', 'batch baking'],
    'https://pantry.bakinggreatbread.com/recipes/henrys-market-day-white',
    false,
    'From Oven to Market'
  ),
  (
    'Henry''s Savory Star Bread',
    'A dramatic pull-apart star bread filled with savory herbs and cheese.',
    'Yeasted',
    'advanced',
    ARRAY['star bread', 'savory', 'herbs', 'cheese', 'showstopper', 'pull-apart'],
    'https://pantry.bakinggreatbread.com/recipes/henrys-savory-star-bread',
    false,
    NULL
  ),
  (
    'Hoagie Rolls (Sourdough)',
    'Chewy sourdough hoagie rolls perfect for loaded sandwiches and subs.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'hoagie', 'rolls', 'sandwich', 'sub rolls'],
    'https://pantry.bakinggreatbread.com/recipes/hoagie-rolls-sourdough',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Hoagie Rolls (Yeasted)',
    'Soft, chewy yeasted hoagie rolls for the ultimate sandwich experience.',
    'Yeasted',
    'intermediate',
    ARRAY['hoagie', 'rolls', 'sandwich', 'sub rolls', 'yeasted'],
    'https://pantry.bakinggreatbread.com/recipes/hoagie-rolls-yeasted',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Holiday Chocolate Babka',
    'A rich, swirled chocolate babka — a holiday showstopper with deep chocolate flavor.',
    'Holiday',
    'advanced',
    ARRAY['babka', 'chocolate', 'holiday', 'enriched', 'swirled', 'showstopper'],
    'https://pantry.bakinggreatbread.com/recipes/holiday-chocolate-babka',
    false,
    NULL
  ),
  (
    'Hot Cross Buns',
    'Spiced, fruited buns with a signature cross — an Easter tradition.',
    'Holiday',
    'intermediate',
    ARRAY['hot cross buns', 'easter', 'spiced', 'holiday', 'fruit', 'tradition'],
    'https://pantry.bakinggreatbread.com/recipes/hot-cross-buns',
    false,
    NULL
  ),
  (
    'Irish Soda Bread',
    'A rustic, no-yeast quick bread with a tender crumb and buttermilk tang.',
    'Quick Breads',
    'beginner',
    ARRAY['soda bread', 'irish', 'quick bread', 'no yeast', 'buttermilk', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/irish-soda-bread',
    false,
    NULL
  ),
  (
    'Jalapeño Cheddar Cornbread',
    'Moist cornbread with spicy jalapeño and sharp cheddar for a savory kick.',
    'Quick Breads',
    'beginner',
    ARRAY['cornbread', 'jalapeño', 'cheddar', 'savory', 'spicy', 'quick bread'],
    'https://pantry.bakinggreatbread.com/recipes/jalapeno-cheddar-cornbread',
    false,
    NULL
  ),
  (
    'Jalapeño Cheddar Sandwich Loaf',
    'A yeasted sandwich loaf loaded with jalapeño and cheddar for bold sandwiches.',
    'Yeasted',
    'intermediate',
    ARRAY['jalapeño', 'cheddar', 'sandwich bread', 'savory', 'spicy'],
    'https://pantry.bakinggreatbread.com/recipes/jalapeno-cheddar-sandwich-loaf',
    false,
    NULL
  ),
  (
    'Jalapeño Cheddar Sourdough',
    'A tangy sourdough loaded with spicy jalapeños and melty cheddar cheese.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'jalapeño', 'cheddar', 'savory', 'spicy', 'cheese'],
    'https://pantry.bakinggreatbread.com/recipes/jalapeno-cheddar-sourdough',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Japanese Milk Bread',
    'Impossibly soft and fluffy milk bread using the tangzhong method for cloud-like texture.',
    'Enriched',
    'advanced',
    ARRAY['milk bread', 'japanese', 'tangzhong', 'soft', 'fluffy', 'enriched'],
    'https://pantry.bakinggreatbread.com/recipes/japanese-milk-bread',
    false,
    NULL
  ),
  (
    'Kids Can Bake: Bread in a Bag',
    'A fun, mess-free bread recipe kids can mix right in a zip-lock bag.',
    'Yeasted',
    'beginner',
    ARRAY['kids', 'beginner', 'fun', 'easy', 'family', 'educational'],
    'https://pantry.bakinggreatbread.com/recipes/kids-can-bake-bread-in-a-bag',
    false,
    NULL
  ),
  (
    'Kids Can Bake: Personal Pan Pizza',
    'Kid-sized pizzas they can top and bake themselves — a perfect family activity.',
    'Flatbread',
    'beginner',
    ARRAY['kids', 'pizza', 'fun', 'easy', 'family', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/kids-can-bake-personal-pan-pizza',
    false,
    NULL
  ),
  (
    'Kids Can Bake: Soft Pretzels',
    'A kid-friendly pretzel recipe with simple steps for little hands.',
    'Yeasted',
    'beginner',
    ARRAY['kids', 'pretzels', 'fun', 'easy', 'family', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/kids-can-bake-soft-pretzels',
    false,
    NULL
  ),
  (
    'Kids Can Bake: Sourdough Discard Pancakes',
    'Fluffy pancakes made with sourdough discard — a fun way for kids to use leftovers.',
    'Discard',
    'beginner',
    ARRAY['kids', 'discard', 'pancakes', 'breakfast', 'sourdough discard', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/kids-can-bake-sourdough-discard-pancakes',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'King Cake',
    'A festive Mardi Gras king cake with colorful icing and a hidden surprise inside.',
    'Holiday',
    'intermediate',
    ARRAY['king cake', 'mardi gras', 'holiday', 'festive', 'cinnamon', 'tradition'],
    'https://pantry.bakinggreatbread.com/recipes/king-cake',
    false,
    NULL
  ),
  (
    'Lemon Blueberry Quick Bread',
    'A bright, citrusy quick bread dotted with blueberries — no yeast required.',
    'Quick Breads',
    'beginner',
    ARRAY['quick bread', 'lemon', 'blueberry', 'citrus', 'easy', 'no yeast'],
    'https://pantry.bakinggreatbread.com/recipes/lemon-blueberry-quick-bread',
    false,
    NULL
  ),
  (
    'Ligurian Style Focaccia',
    'An airy, olive oil-soaked focaccia inspired by the Ligurian coast of Italy.',
    'Flatbread',
    'intermediate',
    ARRAY['focaccia', 'ligurian', 'italian', 'olive oil', 'flatbread', 'artisan'],
    'https://pantry.bakinggreatbread.com/recipes/ligurian-style-focaccia',
    false,
    NULL
  ),
  (
    'Mandarin Holiday Muffins',
    'Festive muffins featuring bright mandarin orange flavor — perfect for holiday gifting.',
    'Holiday',
    'beginner',
    ARRAY['muffins', 'mandarin', 'holiday', 'orange', 'festive', 'gifting'],
    'https://pantry.bakinggreatbread.com/recipes/mandarin-holiday-muffins',
    false,
    NULL
  ),
  (
    'Naan Bread',
    'Soft, pillowy naan baked or griddled — a staple flatbread for curries and dips.',
    'Flatbread',
    'beginner',
    ARRAY['naan', 'flatbread', 'indian', 'griddled', 'soft', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/naan-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'New York Style Pizza Dough',
    'A chewy, foldable pizza dough modeled after classic New York slices.',
    'Flatbread',
    'intermediate',
    ARRAY['pizza', 'new york', 'dough', 'chewy', 'flatbread'],
    'https://pantry.bakinggreatbread.com/recipes/new-york-style-pizza-dough',
    false,
    NULL
  ),
  (
    'No Gap Cinnamon Swirl Bread',
    'A yeasted cinnamon swirl loaf engineered to eliminate the dreaded gap between dough and swirl.',
    'Enriched',
    'intermediate',
    ARRAY['cinnamon swirl', 'sandwich bread', 'no gap', 'breakfast', 'enriched'],
    'https://pantry.bakinggreatbread.com/recipes/no-gap-cinnamon-swirl-bread',
    false,
    NULL
  ),
  (
    'Overnight French Bread',
    'A cold-fermented French bread with deep flavor developed during an overnight rest.',
    'Yeasted',
    'intermediate',
    ARRAY['french bread', 'overnight', 'cold ferment', 'crusty', 'lean dough'],
    'https://pantry.bakinggreatbread.com/recipes/overnight-french-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Overnight Sourdough English Muffins',
    'Nooks-and-crannies English muffins with sourdough tang, prepped the night before.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'english muffins', 'overnight', 'breakfast', 'nooks and crannies'],
    'https://pantry.bakinggreatbread.com/recipes/overnight-sourdough-english-muffins',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Pumpkin Shaped Bread',
    'A festive pumpkin-shaped bread roll perfect for fall gatherings and holiday tables.',
    'Holiday',
    'intermediate',
    ARRAY['pumpkin', 'shaped bread', 'holiday', 'fall', 'festive', 'decorative'],
    'https://pantry.bakinggreatbread.com/recipes/pumpkin-shaped-bread',
    false,
    NULL
  ),
  (
    'Pumpkin Spice Bread',
    'A warmly spiced pumpkin quick bread that fills the kitchen with fall aromas.',
    'Quick Breads',
    'beginner',
    ARRAY['pumpkin', 'spice', 'quick bread', 'fall', 'seasonal', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/pumpkin-spice-bread',
    false,
    NULL
  ),
  (
    'Quick Ciabatta',
    'A same-day ciabatta with big holes and a chewy crust — faster than traditional methods.',
    'Yeasted',
    'beginner',
    ARRAY['ciabatta', 'quick', 'italian', 'open crumb', 'chewy', 'same-day'],
    'https://pantry.bakinggreatbread.com/recipes/quick-ciabatta',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Quick Yeasted Garlic Knots',
    'Buttery, garlicky knots of dough — ready fast and always a crowd-pleaser.',
    'Yeasted',
    'beginner',
    ARRAY['garlic knots', 'quick', 'garlic butter', 'appetizer', 'easy', 'beginner'],
    'https://pantry.bakinggreatbread.com/recipes/quick-yeasted-garlic-knots',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Rosemary Dinner Rolls',
    'Soft, fragrant dinner rolls infused with fresh rosemary — a holiday table staple.',
    'Yeasted',
    'intermediate',
    ARRAY['dinner rolls', 'rosemary', 'soft', 'holiday', 'side dish'],
    'https://pantry.bakinggreatbread.com/recipes/rosemary-dinner-rolls',
    false,
    NULL
  ),
  (
    'Rosemary Garlic Parmesan Loaf',
    'A savory yeasted loaf packed with rosemary, roasted garlic, and Parmesan.',
    'Yeasted',
    'intermediate',
    ARRAY['rosemary', 'garlic', 'parmesan', 'savory', 'artisan'],
    'https://pantry.bakinggreatbread.com/recipes/rosemary-garlic-parmesan-loaf',
    false,
    NULL
  ),
  (
    'Sandwich Bread (Pre-Ferment)',
    'A soft sandwich bread with enhanced flavor from a pre-ferment (poolish or biga).',
    'Yeasted',
    'intermediate',
    ARRAY['sandwich bread', 'pre-ferment', 'poolish', 'biga', 'everyday'],
    'https://pantry.bakinggreatbread.com/recipes/sandwich-bread-pre-ferment',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Sandwich Bread (Sponge)',
    'A tender sandwich loaf built on a sponge method for extra-soft texture.',
    'Yeasted',
    'intermediate',
    ARRAY['sandwich bread', 'sponge method', 'soft', 'everyday', 'tender'],
    'https://pantry.bakinggreatbread.com/recipes/sandwich-bread-sponge',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Self Rising Naan',
    'Ultra-easy naan made with self-rising flour — no yeast, no wait, ready in minutes.',
    'Flatbread',
    'beginner',
    ARRAY['naan', 'self-rising', 'no yeast', 'quick', 'flatbread', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/self-rising-naan',
    false,
    NULL
  ),
  (
    'Sourdough Baguettes',
    'Crusty, naturally-leavened baguettes with a complex sourdough flavor and open crumb.',
    'Sourdough',
    'advanced',
    ARRAY['sourdough', 'baguette', 'crusty', 'artisan', 'french', 'advanced'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-baguettes',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Bread Bowls',
    'Sturdy sourdough bowls perfect for holding chowder, stew, or dip.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'bread bowls', 'soup', 'chowder', 'sturdy'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-bread-bowls',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Breadsticks',
    'Crispy or soft sourdough breadsticks — a great way to use active starter.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'breadsticks', 'side dish', 'snack', 'starter'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-breadsticks',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Chocolate Babka',
    'A rich chocolate babka with sourdough tang adding depth to the swirled layers.',
    'Sourdough',
    'advanced',
    ARRAY['sourdough', 'babka', 'chocolate', 'enriched', 'swirled', 'advanced'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-chocolate-babka',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Banana Bread',
    'Moist banana bread enriched with sourdough discard for extra depth and tenderness.',
    'Discard',
    'beginner',
    ARRAY['discard', 'banana bread', 'sourdough discard', 'quick bread', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-banana-bread',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Crackers',
    'Thin, crispy crackers made from sourdough discard — a zero-waste snack.',
    'Discard',
    'beginner',
    ARRAY['discard', 'crackers', 'sourdough discard', 'snack', 'zero waste', 'crispy'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-crackers',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Irish Soda Bread',
    'A quick soda bread made richer and tangier with sourdough discard.',
    'Discard',
    'beginner',
    ARRAY['discard', 'soda bread', 'irish', 'sourdough discard', 'quick bread', 'no yeast'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-irish-soda-bread',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Naan',
    'Soft, bubbly naan flatbread using sourdough discard for subtle tang.',
    'Discard',
    'beginner',
    ARRAY['discard', 'naan', 'flatbread', 'sourdough discard', 'indian', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-naan',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Pancakes',
    'Fluffy, tangy pancakes that put your sourdough discard to delicious use.',
    'Discard',
    'beginner',
    ARRAY['discard', 'pancakes', 'breakfast', 'sourdough discard', 'fluffy', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-pancakes',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Thumbprint Cookies',
    'Buttery thumbprint cookies with a sourdough twist — perfect for cookie swaps.',
    'Discard',
    'beginner',
    ARRAY['discard', 'cookies', 'thumbprint', 'sourdough discard', 'dessert', 'baking'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-thumbprint-cookies',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Discard Waffles',
    'Crispy-edged waffles with tender interiors — the best use of your morning discard.',
    'Discard',
    'beginner',
    ARRAY['discard', 'waffles', 'breakfast', 'sourdough discard', 'crispy', 'easy'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-discard-waffles',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Hot Cross Buns',
    'Spiced sourdough hot cross buns — a naturally-leavened take on the Easter classic.',
    'Holiday',
    'intermediate',
    ARRAY['sourdough', 'hot cross buns', 'easter', 'holiday', 'spiced', 'tradition'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-hot-cross-buns',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Japanese Milk Bread',
    'Ultra-soft sourdough milk bread combining tangzhong technique with natural leavening.',
    'Sourdough',
    'advanced',
    ARRAY['sourdough', 'milk bread', 'japanese', 'tangzhong', 'soft', 'enriched'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-japanese-milk-bread',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Neapolitan Pizza Dough',
    'Authentic Neapolitan pizza dough naturally leavened with sourdough starter.',
    'Flatbread',
    'intermediate',
    ARRAY['sourdough', 'pizza', 'neapolitan', 'italian', 'flatbread', 'naturally leavened'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-neapolitan-pizza-dough',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough New York Style Bagels',
    'Chewy, malty sourdough bagels boiled and baked for authentic New York flavor.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'bagels', 'new york', 'boiled', 'chewy', 'breakfast'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-new-york-style-bagels',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Pizza Dough',
    'A versatile sourdough pizza dough for crispy, flavorful homemade pies.',
    'Flatbread',
    'intermediate',
    ARRAY['sourdough', 'pizza', 'dough', 'flatbread', 'homemade'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-pizza-dough',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Pumpkin Spice Waffles',
    'Fall-spiced waffles with sourdough discard for a seasonal breakfast treat.',
    'Discard',
    'beginner',
    ARRAY['discard', 'waffles', 'pumpkin spice', 'fall', 'breakfast', 'sourdough discard'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-pumpkin-spice-waffles',
    true,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Savory Star Bread',
    'A spectacular pull-apart sourdough star bread filled with savory herbs and cheese.',
    'Sourdough',
    'advanced',
    ARRAY['sourdough', 'star bread', 'savory', 'pull-apart', 'showstopper', 'advanced'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-savory-star-bread',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Skillet Cornbread',
    'A tangy sourdough cornbread baked in a cast iron skillet for a crispy crust.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'cornbread', 'skillet', 'cast iron', 'savory', 'southern'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-skillet-cornbread',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Soft Pretzels',
    'Chewy sourdough pretzels with a deep brown crust and satisfying chew.',
    'Sourdough',
    'intermediate',
    ARRAY['sourdough', 'pretzels', 'soft pretzels', 'chewy', 'snack'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-soft-pretzels',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Sourdough Starter From Scratch',
    'A complete guide to creating your own sourdough starter from flour and water.',
    'Sourdough',
    'beginner',
    ARRAY['sourdough', 'starter', 'from scratch', 'beginner', 'wild yeast', 'fermentation'],
    'https://pantry.bakinggreatbread.com/recipes/sourdough-starter-from-scratch',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Southern Skillet Cornbread',
    'A traditional Southern cornbread baked in a screaming-hot cast iron skillet.',
    'Quick Breads',
    'beginner',
    ARRAY['cornbread', 'southern', 'skillet', 'cast iron', 'quick bread', 'traditional'],
    'https://pantry.bakinggreatbread.com/recipes/southern-skillet-cornbread',
    false,
    NULL
  ),
  (
    'Special Round Challah',
    'A beautiful round challah traditionally baked for Rosh Hashanah and special occasions.',
    'Enriched',
    'intermediate',
    ARRAY['challah', 'round', 'jewish', 'enriched', 'holiday', 'eggs'],
    'https://pantry.bakinggreatbread.com/recipes/special-round-challah',
    false,
    NULL
  ),
  (
    'Tangzhong Sourdough Sandwich Bread',
    'A pillowy sourdough sandwich bread using the tangzhong water roux for extraordinary softness.',
    'Sourdough',
    'advanced',
    ARRAY['sourdough', 'tangzhong', 'sandwich bread', 'soft', 'water roux', 'advanced'],
    'https://pantry.bakinggreatbread.com/recipes/tangzhong-sourdough-sandwich-bread',
    false,
    'Sourdough Fundamentals'
  ),
  (
    'Valentine''s Zebra Bread',
    'A festive, striped bread colored with cocoa and beet — a Valentine''s Day showstopper.',
    'Holiday',
    'intermediate',
    ARRAY['valentine', 'zebra bread', 'holiday', 'cocoa', 'festive', 'decorative'],
    'https://pantry.bakinggreatbread.com/recipes/valentines-zebra-bread',
    false,
    NULL
  ),
  (
    'Vietnamese Bánh Mì Baguette',
    'A light, airy baguette with a thin shattering crust — the foundation of great bánh mì.',
    'Yeasted',
    'advanced',
    ARRAY['bánh mì', 'baguette', 'vietnamese', 'crusty', 'light', 'sandwich'],
    'https://pantry.bakinggreatbread.com/recipes/vietnamese-banh-mi-baguette',
    false,
    NULL
  ),
  (
    'White Whole Wheat Sandwich Bread',
    'A wholesome sandwich bread made with white whole wheat flour for milder whole grain flavor.',
    'Yeasted',
    'intermediate',
    ARRAY['whole wheat', 'sandwich bread', 'healthy', 'whole grain', 'everyday'],
    'https://pantry.bakinggreatbread.com/recipes/white-whole-wheat-sandwich-bread',
    false,
    'Baker''s Fundamentals'
  ),
  (
    'Whole Wheat Honey Milk Bread',
    'A soft, lightly sweet milk bread made with whole wheat flour and honey.',
    'Enriched',
    'intermediate',
    ARRAY['whole wheat', 'milk bread', 'honey', 'soft', 'enriched', 'healthy'],
    'https://pantry.bakinggreatbread.com/recipes/whole-wheat-honey-milk-bread',
    false,
    NULL
  ),
  (
    'Whole Wheat Pullman Loaf',
    'A straight-sided whole wheat Pullman loaf perfect for uniform sandwich slices.',
    'Yeasted',
    'intermediate',
    ARRAY['pullman', 'whole wheat', 'sandwich bread', 'pan bread', 'uniform slices'],
    'https://pantry.bakinggreatbread.com/recipes/whole-wheat-pullman-loaf',
    false,
    'Baker''s Fundamentals'
  )
ON CONFLICT (title) DO NOTHING;
