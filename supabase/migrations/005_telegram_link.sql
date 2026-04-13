-- Vinculación Telegram ↔ usuario
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_user_profiles_tg ON user_profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS telegram_link_codes (
    code        VARCHAR(8) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);
CREATE INDEX idx_link_codes_expires ON telegram_link_codes(expires_at);
