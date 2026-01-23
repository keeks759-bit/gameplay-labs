-- ============================================
-- SEED DATA FOR TESTING
-- ============================================
-- Run this AFTER schema.sql
-- Inserts sample categories and videos for development

-- Insert categories
INSERT INTO categories (name) VALUES
  ('Valorant'),
  ('Counter-Strike 2'),
  ('Fortnite'),
  ('Apex Legends'),
  ('Call of Duty')
ON CONFLICT (name) DO NOTHING;

-- Insert sample videos
-- NOTE: Replace 'placeholder-playback-id-1' with actual Cloudflare Stream playback IDs
-- For now, use placeholder values to test the display

INSERT INTO videos (title, category_id, playback_id, thumbnail_url, vote_count, hidden) VALUES
  (
    'Insane 1v5 Clutch',
    (SELECT id FROM categories WHERE name = 'Valorant'),
    'placeholder-playback-id-1',
    'https://via.placeholder.com/640x360?text=Valorant+Clip',
    42,
    FALSE
  ),
  (
    'Ace Round Highlights',
    (SELECT id FROM categories WHERE name = 'Counter-Strike 2'),
    'placeholder-playback-id-2',
    'https://via.placeholder.com/640x360?text=CS2+Clip',
    38,
    FALSE
  ),
  (
    'Victory Royale Final Kill',
    (SELECT id FROM categories WHERE name = 'Fortnite'),
    'placeholder-playback-id-3',
    'https://via.placeholder.com/640x360?text=Fortnite+Clip',
    29,
    FALSE
  ),
  (
    'Squad Wipe in Final Circle',
    (SELECT id FROM categories WHERE name = 'Apex Legends'),
    'placeholder-playback-id-4',
    'https://via.placeholder.com/640x360?text=Apex+Clip',
    51,
    FALSE
  ),
  (
    '360 No Scope Montage',
    (SELECT id FROM categories WHERE name = 'Call of Duty'),
    'placeholder-playback-id-5',
    'https://via.placeholder.com/640x360?text=COD+Clip',
    33,
    FALSE
  ),
  (
    'Perfect Smoke Execute',
    (SELECT id FROM categories WHERE name = 'Valorant'),
    'placeholder-playback-id-6',
    'https://via.placeholder.com/640x360?text=Valorant+Clip',
    27,
    FALSE
  ),
  (
    'Clutch or Kick Moment',
    (SELECT id FROM categories WHERE name = 'Counter-Strike 2'),
    'placeholder-playback-id-7',
    'https://via.placeholder.com/640x360?text=CS2+Clip',
    45,
    FALSE
  ),
  (
    'Building Masterclass',
    (SELECT id FROM categories WHERE name = 'Fortnite'),
    'placeholder-playback-id-8',
    'https://via.placeholder.com/640x360?text=Fortnite+Clip',
    19,
    FALSE
  )
ON CONFLICT DO NOTHING;
