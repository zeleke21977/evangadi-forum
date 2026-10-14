# Database migrations

For a database created from `schema.sql`, the profile, saved question, and answer like tables already exist.

For an existing database, apply `002_social_profile_features.sql` once before starting the updated application. The migration adds the profile image column and creates the two social feature tables.

For an existing database that already has migrations 003 to 005, apply `006_room_edit_and_chat_state.sql` once. It adds the room `edited_at` column and the `conversation_state` table used by private chat hide and delete.
