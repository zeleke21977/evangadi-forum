import { useEffect, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  MessageCircle,
  Search,
  Trash2,
} from "lucide-react";

import { useConfirm } from "../../contexts/ConfirmContext.jsx";

import { useMessages } from "../../contexts/MessageContext.jsx";

import { chatService } from "../../services/chat/chat.service.js";

import MessageThread from "../../components/MessageThread/MessageThread.jsx";

import styles from "../DiscussionRooms/DiscussionRooms.module.css";

export default function PrivateChat() {
  const [users, setUsers] = useState([]);

  const { conversations, loading, error: listError, refresh } = useMessages();

  const confirm = useConfirm();

  // Keep only the id, so the open chat always reflects the latest list.
  const [activeId, setActiveId] = useState(null);

  const active = conversations.find(
    (chat) => Number(chat.id) === Number(activeId),
  );

  const [showHidden, setShowHidden] = useState(false);

  const [notice, setNotice] = useState("");

  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");

  const filteredChats = conversations.filter((chat) =>
    `${chat.firstName} ${chat.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Hidden chats stay out of the main list until the member unhides them.
  const visibleChats = filteredChats.filter((chat) => !Number(chat.hidden));

  const hiddenChats = filteredChats.filter((chat) => Number(chat.hidden));

  const hiddenCount = conversations.filter((chat) =>
    Number(chat.hidden),
  ).length;

  const hiddenUnread = conversations.reduce(
    (count, chat) =>
      Number(chat.hidden) ? count + Number(chat.unreadCount || 0) : count,
    0,
  );

  const visibleCount = conversations.length - hiddenCount;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const members = await chatService.listUsers();

        if (!cancelled) {
          setUsers(members.data || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const start = async (userId) => {
    if (busy || !userId) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const created = await chatService.create(Number(userId));

      await refresh();

      setActiveId(created.data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleHidden = async (chat) => {
    const hide = !Number(chat.hidden);

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await chatService.setHidden(chat.id, hide);

      if (hide) {
        setActiveId(null);
        setNotice(
          `Chat with ${chat.firstName} ${chat.lastName} is hidden. Find it under Hidden chats.`,
        );
      }

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeChat = async (chat) => {
    const accepted = await confirm({
      title: "Delete this chat?",
      message: `The conversation with ${chat.firstName} ${chat.lastName} is removed from your list and its history is cleared from your view. ${chat.firstName} keeps their own copy. If they send a new message, the chat comes back with only the new messages.`,
      confirmLabel: "Delete chat",
    });

    if (!accepted) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await chatService.removeConversation(chat.id);

      setActiveId(null);

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const chatActions = (chat) => [
    {
      key: "hide",
      label: Number(chat.hidden) ? "Unhide chat" : "Hide chat",
      icon: Number(chat.hidden) ? Eye : EyeOff,
      onClick: () => toggleHidden(chat),
    },
    {
      key: "delete",
      label: "Delete chat",
      icon: Trash2,
      danger: true,
      onClick: () => removeChat(chat),
    },
  ];

  const renderChat = (chat) => (
    <button
      type="button"
      key={chat.id}
      aria-pressed={active?.id === chat.id}
      className={`${styles.item} ${active?.id === chat.id ? styles.active : ""}`}
      onClick={() => {
        setNotice("");
        setActiveId(chat.id);
      }}
    >
      <span className={styles.avatar}>
        {`${chat.firstName?.[0] || ""}${chat.lastName?.[0] || ""}`.toUpperCase()}
      </span>
      <span className={styles.itemCopy}>
        <strong>
          {chat.firstName} {chat.lastName}
        </strong>
        <span>{chat.lastMessage || "Say hello to start chatting"}</span>
      </span>
      {Number(chat.unreadCount) > 0 && (
        <span
          className={styles.badge}
          aria-label={`${chat.unreadCount} unread messages`}
        >
          {Number(chat.unreadCount) > 99 ? "99+" : chat.unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className={styles.page}>
      {(error || listError) && (
        <p className={styles.error} role="alert">
          {error || listError}
        </p>
      )}

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <div
        className={`${styles.grid} ${styles.private} ${active ? styles.showChat : ""}`}
      >
        <aside className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h1>Chats</h1>
              <small>{visibleCount} conversations</small>
            </div>
            <MessageCircle size={21} />
          </div>

          <div className={styles.search}>
            <Search size={15} />
            <input
              aria-label="Search conversations"
              placeholder="Find a conversation…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <p className={styles.empty} role="status">
              Loading conversations…
            </p>
          ) : (
            conversations.length === 0 && (
              <p className={styles.empty}>No conversations yet.</p>
            )
          )}

          <div className={styles.list}>{visibleChats.map(renderChat)}</div>

          {!loading &&
            visibleChats.length === 0 &&
            filteredChats.length === 0 &&
            conversations.length > 0 && (
              <p className={styles.empty}>
                No conversations match your search.
              </p>
            )}

          {hiddenCount > 0 && (
            <>
              <button
                type="button"
                className={styles.sectionToggle}
                aria-expanded={showHidden}
                onClick={() => setShowHidden((value) => !value)}
              >
                <span>
                  {showHidden ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <EyeOff size={14} /> Hidden chats ({hiddenCount})
                </span>
                {hiddenUnread > 0 && (
                  <span
                    className={styles.badge}
                    aria-label={`${hiddenUnread} unread messages in hidden chats`}
                  >
                    {hiddenUnread > 99 ? "99+" : hiddenUnread}
                  </span>
                )}
              </button>

              {showHidden && (
                <div className={styles.list}>
                  {hiddenChats.length === 0 ? (
                    <p className={styles.empty}>No hidden chats match.</p>
                  ) : (
                    hiddenChats.map(renderChat)
                  )}
                </div>
              )}
            </>
          )}

          <div className={styles.form}>
            <h2>Start a new chat</h2>

            {users
              .filter((member) =>
                `${member.firstName} ${member.lastName}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((member) => (
                <button
                  type="button"
                  key={member.id}
                  className={styles.item}
                  disabled={busy}
                  onClick={() => start(member.id)}
                >
                  <span className={styles.avatar}>
                    {`${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase()}
                  </span>
                  <span className={styles.itemCopy}>
                    <strong>
                      {member.firstName} {member.lastName}
                    </strong>
                    <span>Private conversation</span>
                  </span>
                </button>
              ))}
          </div>
        </aside>

        {active ? (
          <MessageThread
            key={active.id}
            id={active.id}
            title={`${active.firstName} ${active.lastName}`}
            kind="chat"
            onBack={() => setActiveId(null)}
            service={chatService}
            actions={chatActions(active)}
          />
        ) : (
          <section className={styles.placeholder}>
            <span className={styles.placeholderIcon}>
              <MessageCircle size={34} />
            </span>
            <span className={styles.kicker}>
              A conversation starts with hello
            </span>
            <h2>Make a connection</h2>
            <p>
              Select a conversation or choose a member from the list. Your
              messages are accessible to the two participants through the forum.
            </p>
            <span className={styles.privacyTag}>
              <LockKeyhole size={14} /> Your own conversation space
            </span>
          </section>
        )}
      </div>
    </div>
  );
}
