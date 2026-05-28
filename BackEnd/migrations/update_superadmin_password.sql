-- Password default: superadmin123
-- Generate baru: go run ./cmd/hashpass [password]

UPDATE users
SET password_hash = '$2a$10$ozdi3GHDM6sUEx6m7Hfw6esx4M/bfgtnAg27uI16OpWn5B2dxVuuC'
WHERE username = 'superadmin';
