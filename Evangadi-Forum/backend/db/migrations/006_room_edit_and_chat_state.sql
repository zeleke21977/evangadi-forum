-- Apply once to a database that already has migrations 003, 004 and 005.
-- Adds room editing and per-user private chat hide / delete. No data is removed.

-- Set when a room name or description is changed.
ALTER TABLE discussion_rooms
  ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL;

-- One row per user per conversation, created the first time that user hides or
-- deletes the chat. Each person's choice affects only their own view.
--   is_hidden      chat moved out of the main list (Hidden chats section)
--   is_deleted     chat removed from the list; history is cleared for this user
--   cleared_before messages with an id up to this value no longer show for this user
CREATE TABLE IF NOT EXISTS conversation_state (
  user_id INT NOT NULL,
  conversation_id INT NOT NULL,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  cleared_before INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, conversation_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES private_conversations(conversation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
