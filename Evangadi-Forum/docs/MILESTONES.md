# Milestones and task detail

This page lists what each milestone delivered and where the detailed task notes are. Only Milestone 2 had its own task file in the project. Everything else is listed as work delivered after Milestone 2, taken from the code, the migrations and the change notes.

## Milestone 2 — AI search and coaching

Detailed notes: [tasks/milestone-2-task-status.md](tasks/milestone-2-task-status.md)

| Task | Endpoint | What it does | Status |
| --- | --- | --- | --- |
| T-11 Semantic search | `GET /api/questions/search` | Validates `query`, `k`, `threshold`. Embeds the query with Gemini, compares it with ready question vectors by cosine similarity, filters by threshold and returns the top `k`. | Implemented |
| T-11 Find similar questions | `GET /api/questions/:questionHash/similar` | Resolves the source question's embedding, compares it with all other ready vectors, excludes the source question and returns the top matches. | Implemented |
| T-17 AI draft coach | `POST /api/questions/draft-coach` | Sends a draft question to Gemini and returns `feedback`, `suggestions` and `tips`. | Implemented |

Setup for these endpoints needs `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL` and `GEMINI_TEXT_MODEL` in `backend/.env`. All three require a Bearer token.

## Work delivered after Milestone 2

| Feature | Main endpoints | Database migration | Notes |
| --- | --- | --- | --- |
| Sign-in with Google, password reset | `POST /api/auth/google`, `/forgot-password`, `/reset-password` | `001_add_google_auth.sql` | Needs `GOOGLE_CLIENT_ID` and the `EMAIL_*` values. |
| Profile, saved questions, answer likes | `GET/PUT /api/profile`, `PUT /api/questions/:hash/saved`, `PUT /api/answers/:id/like` | `002_social_profile_features.sql` | |
| Answer fit check | `POST /api/questions/:hash/answer-fit` | none | Uses the Gemini text model. |
| PDF documents (RAG): upload, search, ask | `/api/rag/documents` and sub-routes | in `schema.sql` | PDFs are stored in `uploads/rag`. |
| Notifications | `/api/notifications` | in `schema.sql` | Live through Socket.IO. |
| Discussion rooms | `/api/discussion/rooms` | `003_discussion_and_chat.sql` | |
| Private chat | `/api/chat/conversations` | `003_discussion_and_chat.sql` | |
| Unread badges | `POST .../read` on rooms and conversations | `004_message_read_state.sql` | |
| Attachments, voice messages, delete for me / for everyone | `.../attachments`, `DELETE .../messages/:id?scope=` | `005_chat_attachments_and_delete.sql` | Files stored in `uploads/chat`. |
| Room edit and delete (creator only) | `PUT/DELETE /api/discussion/rooms/:id` | `006_room_edit_and_chat_state.sql` | Delete removes messages and attachment files for everyone. |
| Private chat hide and delete (per member) | `PUT /api/chat/conversations/:id/hidden`, `DELETE /api/chat/conversations/:id` | `006_room_edit_and_chat_state.sql` | Hidden chats go to a Hidden chats section. Delete clears history for that member only. |
| Live updates | Socket.IO | none | Replaced all polling. |
| Deployment hardening | `/health` and server settings | none | See [DEPLOYMENT.md](DEPLOYMENT.md). |

Detailed notes: [tasks/discussion-rooms-and-private-chat.md](tasks/discussion-rooms-and-private-chat.md) and [tasks/final-cleanup-and-hardening.md](tasks/final-cleanup-and-hardening.md).

## Other milestones

No task file for Milestone 1 or Milestone 3 was included in the project. If your course has them, add a section here and put its task file in `tasks/`.
