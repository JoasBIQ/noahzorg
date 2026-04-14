-- Voeg last_history_id toe aan gmail_tokens voor Gmail History API polling
ALTER TABLE gmail_tokens
  ADD COLUMN IF NOT EXISTS last_history_id TEXT;
