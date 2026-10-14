import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors/index.js";
import { emitToUsers } from "../../../utils/socket/io.js";
import {
  saveAttachment,
  removeAttachment,
  attachmentPath,
} from "../config/chat.upload.js";

export const listUsers = (userId) =>
  safeExecute(
    `
  SELECT user_id AS id, first_name AS firstName, last_name AS lastName
  FROM users WHERE user_id <> ? ORDER BY first_name, last_name`,
    [userId],
  );

export const listConversations = (userId) =>
  safeExecute(
    `
  SELECT c.conversation_id AS id, u.user_id AS userId,
    u.first_name AS firstName, u.last_name AS lastName,
    COALESCE(cs.is_hidden, 0) AS hidden,
    (SELECT COUNT(*) FROM private_messages m WHERE m.conversation_id = c.conversation_id
      AND m.user_id <> ? AND m.message_id > GREATEST(COALESCE(s.last_message_id, 0), COALESCE(cs.cleared_before, 0))
      AND m.deleted_for_everyone = 0
      AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.user_id = ? AND h.target_type = 'chat' AND h.message_id = m.message_id)) AS unreadCount,
    (SELECT CASE WHEN p.deleted_for_everyone = 1 THEN 'Message deleted'
      WHEN p.content <> '' THEN p.content WHEN p.message_type = 'image' THEN 'Photo'
      WHEN p.message_type = 'voice' THEN 'Voice message' ELSE 'File' END
      FROM private_messages p WHERE p.conversation_id = c.conversation_id
      AND p.message_id > COALESCE(cs.cleared_before, 0)
      AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.user_id = ? AND h.target_type = 'chat' AND h.message_id = p.message_id)
      ORDER BY p.message_id DESC LIMIT 1) AS lastMessage
  FROM private_conversations c
  JOIN users u ON u.user_id = IF(c.user_one = ?, c.user_two, c.user_one)
  LEFT JOIN message_read_state s ON s.target_type = 'chat' AND s.target_id = c.conversation_id AND s.user_id = ?
  LEFT JOIN conversation_state cs ON cs.conversation_id = c.conversation_id AND cs.user_id = ?
  WHERE (c.user_one = ? OR c.user_two = ?) AND COALESCE(cs.is_deleted, 0) = 0
  ORDER BY c.conversation_id DESC`,
    [userId, userId, userId, userId, userId, userId, userId, userId],
  );

export const createConversation = async (userId, otherId) => {
  if (Number(userId) === Number(otherId))
    throw new BadRequestError("Choose another member.");
  const users = await safeExecute(
    "SELECT user_id FROM users WHERE user_id = ?",
    [otherId],
  );
  if (!users.length) throw new NotFoundError("Member not found.");
  // Always store the smaller ID first so two users have only one conversation.
  const first = Math.min(userId, otherId);
  const second = Math.max(userId, otherId);
  await safeExecute(
    "INSERT IGNORE INTO private_conversations (user_one, user_two) VALUES (?, ?)",
    [first, second],
  );
  const rows = await safeExecute(
    "SELECT conversation_id AS id FROM private_conversations WHERE user_one = ? AND user_two = ?",
    [first, second],
  );
  // Opening a chat on purpose brings it back if this member had hidden or deleted it.
  await safeExecute(
    "UPDATE conversation_state SET is_hidden = 0, is_deleted = 0 WHERE user_id = ? AND conversation_id = ?",
    [userId, rows[0].id],
  );
  return rows[0];
};

export const checkMember = async (conversationId, userId) => {
  const rows = await safeExecute(
    `SELECT conversation_id FROM private_conversations
    WHERE conversation_id = ? AND (user_one = ? OR user_two = ?)`,
    [conversationId, userId, userId],
  );
  if (!rows.length)
    throw new ForbiddenError("You do not have access to this conversation.");
};

// Messages up to this id were cleared by "Delete chat" for this member.
const clearedBefore = async (conversationId, userId) => {
  const rows = await safeExecute(
    "SELECT cleared_before FROM conversation_state WHERE user_id = ? AND conversation_id = ?",
    [userId, conversationId],
  );
  return Number(rows[0]?.cleared_before || 0);
};

// A new message brings a deleted chat back for both members. It then shows only
// the messages sent after that member cleared it. Hidden chats stay hidden.
const reviveConversation = (conversationId) =>
  safeExecute(
    "UPDATE conversation_state SET is_deleted = 0 WHERE conversation_id = ?",
    [conversationId],
  );

// Tell both members (every open tab) that something changed in this
// conversation. No message content is sent: clients re-fetch through the
// normal authenticated REST endpoints, so privacy rules (hidden messages,
// membership checks) are still enforced in exactly one place.
const notifyConversation = async (conversationId, action, messageId) => {
  // Never let a live-update problem fail (or roll back) the actual request.
  try {
    const members = await safeExecute(
      "SELECT user_one, user_two FROM private_conversations WHERE conversation_id = ?",
      [conversationId],
    );
    if (!members.length) return;
    emitToUsers([members[0].user_one, members[0].user_two], "chat:update", {
      conversationId: Number(conversationId),
      messageId: messageId ? Number(messageId) : undefined,
      action,
    });
  } catch (error) {
    console.error("Chat notify failed:", error.message);
  }
};

export const listMessages = async (conversationId, userId) => {
  await checkMember(conversationId, userId);
  const cleared = await clearedBefore(conversationId, userId);
  return safeExecute(
    `
    SELECT m.message_id AS id, m.content, m.user_id AS userId,
      m.created_at AS createdAt, m.edited_at AS editedAt,
      m.message_type AS messageType, m.attachment_name AS attachmentName,
      m.attachment_size AS attachmentSize, m.duration_seconds AS durationSeconds,
      m.deleted_for_everyone AS deletedForEveryone,
      u.first_name AS firstName, u.last_name AS lastName
    FROM private_messages m JOIN users u ON u.user_id = m.user_id
    WHERE m.conversation_id = ? AND m.message_id > ?
      AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.user_id = ? AND h.target_type = 'chat' AND h.message_id = m.message_id)
    ORDER BY m.message_id ASC`,
    [conversationId, cleared, userId],
  );
};

export const sendMessage = async (conversationId, userId, content) => {
  await checkMember(conversationId, userId);
  const result = await safeExecute(
    "INSERT INTO private_messages (conversation_id, user_id, content) VALUES (?, ?, ?)",
    [conversationId, userId, content.trim()],
  );
  await reviveConversation(conversationId);
  await notifyConversation(conversationId, "new", result.insertId);
  return { id: result.insertId };
};

const getMessage = async (conversationId, messageId, userId) => {
  await checkMember(conversationId, userId);
  const cleared = await clearedBefore(conversationId, userId);
  const rows = await safeExecute(
    `SELECT m.* FROM private_messages m WHERE m.conversation_id = ? AND m.message_id = ? AND m.message_id > ?
    AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.user_id = ? AND h.target_type = 'chat' AND h.message_id = m.message_id)`,
    [conversationId, messageId, cleared, userId],
  );
  if (!rows.length) throw new NotFoundError("Message not found.");
  return rows[0];
};

export const editMessage = async (
  conversationId,
  messageId,
  userId,
  content,
) => {
  const message = await getMessage(conversationId, messageId, userId);
  if (Number(message.user_id) !== Number(userId))
    throw new ForbiddenError("You can only change your own messages.");
  if (message.deleted_for_everyone)
    throw new BadRequestError("This message was deleted.");
  if (message.message_type === "text" && !content.trim())
    throw new BadRequestError("Message cannot be empty.");
  await safeExecute(
    "UPDATE private_messages SET content = ?, edited_at = NOW() WHERE message_id = ?",
    [content.trim(), messageId],
  );
  await notifyConversation(conversationId, "edit", messageId);
};

export const deleteMessage = async (
  conversationId,
  messageId,
  userId,
  scope = "me",
) => {
  const message = await getMessage(conversationId, messageId, userId);
  if (scope === "me") {
    await safeExecute(
      "INSERT IGNORE INTO message_hidden (user_id, target_type, message_id) VALUES (?, 'chat', ?)",
      [userId, messageId],
    );
    // Hiding only affects this user (their other tabs/devices).
    emitToUsers([userId], "chat:update", {
      conversationId: Number(conversationId),
      messageId: Number(messageId),
      action: "hide",
    });
  } else if (scope === "everyone") {
    if (Number(message.user_id) !== Number(userId))
      throw new ForbiddenError(
        "You can only delete your own messages for everyone.",
      );
    await safeExecute(
      `UPDATE private_messages SET deleted_for_everyone = 1, content = '', message_type = 'text',
      attachment_path = NULL, attachment_name = NULL, attachment_mime = NULL, attachment_size = NULL, duration_seconds = NULL
      WHERE message_id = ?`,
      [messageId],
    );
    await removeAttachment(message.attachment_path);
    await notifyConversation(conversationId, "delete", messageId);
  } else throw new BadRequestError("Choose a valid delete option.");
};

export const sendAttachment = async (
  conversationId,
  userId,
  file,
  { kind = "file", caption = "", duration = 0 } = {},
) => {
  await checkMember(conversationId, userId);
  const attachment = await saveAttachment(file, kind);
  try {
    const result = await safeExecute(
      `INSERT INTO private_messages
      (conversation_id, user_id, content, message_type, attachment_path, attachment_name, attachment_mime, attachment_size, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        userId,
        caption.trim(),
        attachment.type,
        attachment.filename,
        attachment.name,
        attachment.mime,
        attachment.size,
        attachment.type === "voice" ? Number(duration) : null,
      ],
    );
    await reviveConversation(conversationId);
    await notifyConversation(conversationId, "new", result.insertId);
    return { id: result.insertId };
  } catch (error) {
    await removeAttachment(attachment.filename);
    throw error;
  }
};

export const getAttachment = async (conversationId, messageId, userId) => {
  const message = await getMessage(conversationId, messageId, userId);
  if (message.deleted_for_everyone || !message.attachment_path)
    throw new NotFoundError("Attachment not found.");
  return {
    path: attachmentPath(message.attachment_path),
    name: message.attachment_name,
    mime: message.attachment_mime,
  };
};

export const markRead = async (conversationId, userId, lastMessageId) => {
  await checkMember(conversationId, userId);
  const rows = await safeExecute(
    "SELECT MAX(message_id) AS lastId FROM private_messages WHERE conversation_id = ? AND message_id <= ?",
    [conversationId, lastMessageId],
  );
  await safeExecute(
    `INSERT INTO message_read_state (user_id, target_type, target_id, last_message_id)
    VALUES (?, 'chat', ?, ?)
    ON DUPLICATE KEY UPDATE last_message_id = GREATEST(last_message_id, VALUES(last_message_id))`,
    [userId, conversationId, Number(rows[0].lastId || 0)],
  );
  // Keep this user's other tabs/devices in sync (unread badges).
  emitToUsers([userId], "read:update", {
    kind: "chat",
    id: Number(conversationId),
  });
};

const notifySelf = (userId, conversationId, action) =>
  emitToUsers([userId], "chat:update", {
    conversationId: Number(conversationId),
    action,
  });

// Hide or unhide a chat for this member only. Nothing is deleted.
export const setHidden = async (conversationId, userId, hidden) => {
  await checkMember(conversationId, userId);
  await safeExecute(
    `INSERT INTO conversation_state (user_id, conversation_id, is_hidden)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE is_hidden = VALUES(is_hidden)`,
    [userId, conversationId, hidden ? 1 : 0],
  );
  notifySelf(userId, conversationId, "state");
};

// Remove the stored data of a conversation once nobody can see it any more.
const purgeConversation = async (conversationId) => {
  const files = await safeExecute(
    "SELECT attachment_path FROM private_messages WHERE conversation_id = ? AND attachment_path IS NOT NULL",
    [conversationId],
  );
  await safeExecute(
    `DELETE FROM message_hidden WHERE target_type = 'chat'
      AND message_id IN (SELECT message_id FROM private_messages WHERE conversation_id = ?)`,
    [conversationId],
  );
  await safeExecute(
    "DELETE FROM message_read_state WHERE target_type = 'chat' AND target_id = ?",
    [conversationId],
  );
  // Messages and conversation_state rows go with the conversation (ON DELETE CASCADE).
  await safeExecute(
    "DELETE FROM private_conversations WHERE conversation_id = ?",
    [conversationId],
  );
  await Promise.all(files.map((file) => removeAttachment(file.attachment_path)));
};

// "Delete chat" is per member: it clears the history from this member's view and
// removes the chat from their list. The other member keeps their copy. When both
// members have deleted everything, the stored messages and files are removed.
export const deleteConversation = async (conversationId, userId) => {
  const members = await safeExecute(
    `SELECT user_one, user_two FROM private_conversations
    WHERE conversation_id = ? AND (user_one = ? OR user_two = ?)`,
    [conversationId, userId, userId],
  );
  if (!members.length)
    throw new ForbiddenError("You do not have access to this conversation.");
  const otherId =
    Number(members[0].user_one) === Number(userId)
      ? members[0].user_two
      : members[0].user_one;

  const last = await safeExecute(
    "SELECT MAX(message_id) AS lastId FROM private_messages WHERE conversation_id = ?",
    [conversationId],
  );
  const lastId = Number(last[0].lastId || 0);

  await safeExecute(
    `INSERT INTO conversation_state (user_id, conversation_id, is_hidden, is_deleted, cleared_before)
    VALUES (?, ?, 0, 1, ?)
    ON DUPLICATE KEY UPDATE is_hidden = 0, is_deleted = 1,
      cleared_before = GREATEST(cleared_before, VALUES(cleared_before))`,
    [userId, conversationId, lastId],
  );

  const other = await safeExecute(
    "SELECT is_deleted, cleared_before FROM conversation_state WHERE user_id = ? AND conversation_id = ?",
    [otherId, conversationId],
  );
  const otherGone =
    other.length &&
    Number(other[0].is_deleted) === 1 &&
    Number(other[0].cleared_before) >= lastId;

  if (lastId === 0 || otherGone) await purgeConversation(conversationId);
  notifySelf(userId, conversationId, "deleted");
};
