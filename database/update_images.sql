-- =====================================================
-- LocalConnect Image Update Script
-- =====================================================
-- Purpose: Update all vendor logos and menu item images
-- with curated, working Unsplash URLs
-- Run: mysql -u root -p < database/update_images.sql
-- =====================================================

USE localconnect_db;

-- =====================================================
-- PART 1: UPDATE VENDOR LOGOS
-- =====================================================

-- Ninny's Delicacies - Traditional Nigerian food
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'
WHERE business_name = 'Ninny\'s Delicacies';

-- Arewa Kitchen - Northern Nigerian cuisine
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'
WHERE business_name = 'Arewa Kitchen';

-- Suya Paradise - Grilled meats
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'
WHERE business_name = 'Suya Paradise';

-- Kano Food Hub - Local food hub
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
WHERE business_name = 'Kano Food Hub';

-- Royal Tuwo Palace - Traditional tuwo
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'
WHERE business_name = 'Royal Tuwo Palace';

-- Mama Khadija's Kitchen - Home cooking
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1556910096-6f5e72536c6a?w=400'
WHERE business_name = 'Mama Khadija\'s Kitchen';

-- The Miyan Spot - Soups and stews
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
WHERE business_name = 'The Miyan Spot';

-- Sultan's Feast - Royal cuisine
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400'
WHERE business_name = 'Sultan\'s Feast';

-- Zainab's Rice & More - Rice dishes
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400'
WHERE business_name = 'Zainab\'s Rice & More';

-- Bakin Kasuwa Eats - Market street food
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'
WHERE business_name = 'Bakin Kasuwa Eats';

-- =====================================================
-- PART 2: UPDATE MENU ITEM IMAGES BY CATEGORY
-- =====================================================

-- ----- TUWO & SWALLOW DISHES -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400'
WHERE name LIKE '%Tuwon Shinkafa%' AND name LIKE '%Miyan Kuka%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400'
WHERE name LIKE '%Tuwon Masara%' AND name LIKE '%Miyan Taushe%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
WHERE name LIKE '%Semo%' AND name LIKE '%Miyan Karkashi%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400'
WHERE name LIKE '%Eba%' AND name LIKE '%Miyan Kubewa%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400'
WHERE name LIKE '%Amala%' AND name LIKE '%Gbegiri%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
WHERE name LIKE '%Tuwon Shinkafa%' AND name LIKE '%Miyan Wake%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400'
WHERE name LIKE '%Taliya%';

-- Generic tuwo/swallow fallback
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400'
WHERE (name LIKE '%Tuwo%' OR name LIKE '%Tuwon%') AND image_url IS NULL;

-- ----- RICE DISHES -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
WHERE name LIKE '%Jollof Rice%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400'
WHERE name LIKE '%Fried Rice%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'
WHERE name LIKE '%Rice and Beans%' OR name LIKE '%Rice & Beans%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400'
WHERE name LIKE '%Mandi%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400'
WHERE name LIKE '%Biryani%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400'
WHERE name LIKE '%Garau Garau%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400'
WHERE name LIKE '%White Rice%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400'
WHERE name LIKE '%Coconut Rice%';

-- Generic rice fallback
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400'
WHERE name LIKE '%Rice%' AND image_url IS NULL;

-- ----- MEATS & GRILLS -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'
WHERE name LIKE '%Suya%' AND name NOT LIKE '%Paradise%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1607623488023-0331c0b71c97?w=400'
WHERE name LIKE '%Kilishi%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'
WHERE name LIKE '%Balangu%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1580959375944-1587a354aefe?w=400'
WHERE name LIKE '%Dambu Nama%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
WHERE name LIKE '%Pepper Soup%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400'
WHERE name LIKE '%Grilled Chicken%' OR name LIKE '%Chicken Grill%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400'
WHERE name LIKE '%Grilled Fish%' OR name LIKE '%Fish Grill%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'
WHERE name LIKE '%Grilled Meat%' OR name LIKE '%Meat Grill%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400'
WHERE name LIKE '%Goat%' OR name LIKE '%Mutton%';

-- ----- SNACKS & BREAKFAST -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1571167530149-c9054c4f1c21?w=400'
WHERE name LIKE '%Masa%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400'
WHERE name LIKE '%Kosai%' OR name LIKE '%Akara%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400'
WHERE name LIKE '%Dan Wake%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=400'
WHERE name LIKE '%Awara%' OR name LIKE '%Tofu%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'
WHERE name LIKE '%Yamarita%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'
WHERE name LIKE '%Gurasa%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400'
WHERE name LIKE '%Wainar Fulawa%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400'
WHERE name LIKE '%Yar Tsala%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'
WHERE name LIKE '%Sinasir%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'
WHERE name LIKE '%Funkaso%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400'
WHERE name LIKE '%Puff Puff%' OR name LIKE '%Puff-Puff%';

-- ----- SOUPS (standalone) -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
WHERE name LIKE '%Miyan Kuka%' AND name NOT LIKE '%Tuwon%' AND name NOT LIKE '%Tuwo%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
WHERE name LIKE '%Miyan Taushe%' AND name NOT LIKE '%Tuwon%' AND name NOT LIKE '%Tuwo%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
WHERE name LIKE '%Miyan Karkashi%' AND name NOT LIKE '%Semo%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
WHERE name LIKE '%Miyan%' AND image_url IS NULL;

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400'
WHERE name LIKE '%Egusi%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400'
WHERE name LIKE '%Ogbono%';

-- ----- DRINKS & BEVERAGES -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'
WHERE name LIKE '%Zobo%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'
WHERE name LIKE '%Kunun Gyada%' OR name LIKE '%Peanut Drink%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1523677011781-c91d1ebb3c78?w=400'
WHERE name LIKE '%Tigernut%' OR name LIKE '%Kunu Aya%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'
WHERE name LIKE '%Koko%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'
WHERE name LIKE '%Kunun Tsamiya%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'
WHERE name LIKE '%Fura da Nono%' OR name LIKE '%Fura%' OR name LIKE '%Nono%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'
WHERE name LIKE '%Kunun%' AND image_url IS NULL;

-- ----- BEANS & LEGUMES -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400'
WHERE name LIKE '%Wake%' OR name LIKE '%Beans%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400'
WHERE name LIKE '%Moi Moi%' OR name LIKE '%Moimoi%';

-- ----- PASTA & NOODLES -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400'
WHERE name LIKE '%Spaghetti%' OR name LIKE '%Pasta%';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400'
WHERE name LIKE '%Indomie%' OR name LIKE '%Noodles%';

-- ----- COMBO PLATES -----

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
WHERE name LIKE '%Combo%' OR name LIKE '%Platter%' OR name LIKE '%Special%';

-- =====================================================
-- PART 3: CATCH-ALL FOR REMAINING NULL IMAGES
-- =====================================================

-- Set a generic food image for any items still without images
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
WHERE image_url IS NULL OR image_url = '';

-- Set a generic logo for any vendors still without logos
UPDATE vendors SET logo_url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'
WHERE logo_url IS NULL OR logo_url = '';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '=== VENDOR LOGOS ===' AS '';
SELECT id, business_name, logo_url FROM vendors ORDER BY business_name;

SELECT '' AS '';
SELECT '=== MENU ITEMS SAMPLE (first 25) ===' AS '';
SELECT id, name, LEFT(image_url, 60) as image_url_preview FROM menu_items ORDER BY name LIMIT 25;

SELECT '' AS '';
SELECT '=== IMAGE COVERAGE STATS ===' AS '';

SELECT
    'Vendors' as table_name,
    COUNT(*) as total,
    SUM(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 ELSE 0 END) as with_images,
    SUM(CASE WHEN logo_url IS NULL OR logo_url = '' THEN 1 ELSE 0 END) as without_images
FROM vendors
UNION ALL
SELECT
    'Menu Items' as table_name,
    COUNT(*) as total,
    SUM(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END) as with_images,
    SUM(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 ELSE 0 END) as without_images
FROM menu_items;

SELECT '' AS '';
SELECT '=== IMAGES UPDATED SUCCESSFULLY ===' AS status;
