# Discussion rooms and private chat

## Setup

If discussion rooms, private chat and unread badges already work, run `backend/db/migrations/005_chat_attachments_and_delete.sql` and then `backend/db/migrations/006_room_edit_and_chat_state.sql` once each against your existing database. Migration 005 adds attachment fields, a deletion flag and a per-user hidden-message table. Migration 006 adds the room `edited_at` column and the `conversation_state` table used by chat hide and delete. Your existing messages remain available as text messages.

For an older database missing the chat features, apply migrations 003, 004, 005 and 006 in that order. For a new database, `backend/db/schema.sql` includes everything. Do not run the full schema against an existing database because its original sections drop tables. Keep any schema adjustments you previously made for your database.

Start the backend and frontend using their existing setup and `npm run dev` commands. No new environment variables are required.

Run `npm install` in the backend folder when applying the updated package and lock files. The local `vendor/native-domexception` adapter uses Node's built-in DOMException (Node 18 or newer) and replaces the deprecated transitive package through an npm override. Keep the vendor folder when copying or deploying the backend.

## How to use

- Sign in and select Discussion Rooms in the sidebar. Create a room with a name and optional description, then send messages. Every signed-in member can read and post in every room.
- Select Private Chat, choose a member, and open a conversation. Starting another chat with the same member opens the existing conversation.
- Use Delete on a message to choose Delete for me, which hides it only from your view. For your own messages, Delete for everyone also appears. That option replaces the message with a deleted-message notice for everyone and removes its stored attachment.
- Choose Image or File to attach a file up to 25 MB. Add an optional caption and send. Shared images appear in the message; selecting an image opens it full size. File cards download on click.
- Choose Voice, allow microphone access, record, and select Stop. Play the preview, then send it or remove it. Cancel recording discards it. Recording requires HTTPS or localhost and a browser that supports MediaRecorder; microphone permission must be granted.
- Use Edit on your own messages to change text or an attachment caption.
- Messages, room and conversation lists and sidebar badges update live through Socket.IO.
- Edit room and Delete room appear in the room header for the member who created the room. Edit opens the room form with the current name and description. Delete asks for confirmation and permanently removes the room, all of its messages and their stored attachments for every member.
- Hide chat and Delete chat appear in the private chat header. Hide chat moves the conversation into the collapsible Hidden chats section of the list. Nothing is deleted and the other member is not told. Hidden chats stay hidden until you choose Unhide chat, and their unread messages are not added to the sidebar badge. Opening the member from Start a new chat also unhides the conversation.
- Delete chat removes the conversation from your list and clears its history from your view only. The other member keeps their copy. If they send a new message, the chat comes back for you showing only the new messages. When both members have deleted a conversation, its messages and stored attachments are removed from the server.
- Blue badges show unread messages from other members beside each room or conversation and in the sidebar. Opening a thread marks the displayed messages as read. Read status is saved in the database per user and stays saved after signing out. Older messages count as unread until you open their thread once.
- Room and conversation lists have search, message previews, and neutral text colors. Messages have date separators and timestamps. Use Enter to send or Shift + Enter to add a new line.
- Deleting a message, question, answer, or PDF opens a styled confirmation dialog. Keep it, the close button, or Escape cancels the action. The dialog traps keyboard focus and initially focuses Keep it.

## Code guide

Room edit and delete are `PUT /api/discussion/rooms/:id` and `DELETE /api/discussion/rooms/:id`; the server checks that the caller created the room. Chat hide is `PUT /api/chat/conversations/:id/hidden` with `{ "hidden": true | false }` and chat delete is `DELETE /api/chat/conversations/:id`. Per-member state lives in the `conversation_state` table.

Both features follow the existing route, validation, controller, service, and SQL pattern. `discussion` and `chat` folders contain the backend files and frontend API services. `DiscussionRooms.jsx` and `PrivateChat.jsx` handle selecting rooms or conversations. The shared `MessageThread.jsx` handles messages and the composer. `MessageAttachment.jsx` displays attachments, and `VoiceRecorder.jsx` handles the browser microphone.

`MessageContext.jsx` supplies the shared unread counts and refreshes both lists. `ConfirmContext.jsx` supplies the shared confirmation dialog. These use existing React and browser features and require no new packages.

The backend uses the forum's existing token authentication and error handler. Private chat checks conversation membership before reading messages, uploading files or downloading attachments. The server checks message ownership before editing or deleting for everyone. Delete for me changes only the requesting user's view. Hidden and deleted messages are excluded from unread counts.

Attachment bytes are stored in `backend/uploads/chat`, which is created automatically. Downloads go through authenticated API routes. Keep this folder when moving or backing up the application; include it alongside the database backup. `chat.upload.js` uses the existing Multer package and Node file helpers, with a 25 MB upload limit.

The implementation uses text messages, common images, voice recordings and downloadable files. Styling uses the existing design tokens, including orange action buttons, dark mode and mobile layouts.
