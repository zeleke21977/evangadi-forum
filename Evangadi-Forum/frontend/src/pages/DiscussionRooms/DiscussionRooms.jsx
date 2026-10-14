import { useState } from "react";

import {
  ArrowRight,
  Hash,
  MessageSquarePlus,
  Pencil,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

import { useConfirm } from "../../contexts/ConfirmContext.jsx";

import { useMessages } from "../../contexts/MessageContext.jsx";

import { discussionService } from "../../services/discussion/discussion.service.js";

import MessageThread from "../../components/MessageThread/MessageThread.jsx";

import styles from "./DiscussionRooms.module.css";

export default function DiscussionRooms() {
  const { user } = useAuth();

  const confirm = useConfirm();

  const { rooms, loading, error: listError, refresh } = useMessages();

  // Keep only the id, so the open room always reflects the latest list
  // (a rename shows immediately, and a deleted room closes by itself).
  const [activeId, setActiveId] = useState(null);

  const active = rooms.find((room) => Number(room.id) === Number(activeId));

  // The room being edited, or null when the form creates a new room.
  const [editingRoom, setEditingRoom] = useState(null);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const filteredRooms = rooms.filter((room) =>
    `${room.name} ${room.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const closeForm = () => {
    setShowForm(false);

    setEditingRoom(null);

    setName("");

    setDescription("");
  };

  const openCreate = () => {
    setEditingRoom(null);

    setName("");

    setDescription("");

    setError("");

    setShowForm(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);

    setName(room.name);

    setDescription(room.description || "");

    setError("");

    // On small screens the form lives in the room list, so leave the thread.
    if (window.matchMedia("(max-width: 800px)").matches) setActiveId(null);

    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();

    if (busy || !name.trim()) return;

    setBusy(true);

    setError("");

    try {
      if (editingRoom) {
        await discussionService.update(
          editingRoom.id,
          name.trim(),
          description.trim(),
        );

        await refresh();
      } else {
        const created = await discussionService.create(
          name.trim(),
          description.trim(),
        );

        await refresh();

        setActiveId(created.data.id);
      }

      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeRoom = async (room) => {
    const accepted = await confirm({
      title: "Delete this room?",
      message: `"${room.name}" and all of its messages and attachments will be permanently deleted for every member. This cannot be undone.`,
      confirmLabel: "Delete room",
    });

    if (!accepted) return;

    setBusy(true);

    setError("");

    try {
      await discussionService.remove(room.id);

      if (Number(activeId) === Number(room.id)) setActiveId(null);

      if (editingRoom && Number(editingRoom.id) === Number(room.id))
        closeForm();

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isOwner = (room) => Number(room.userId) === Number(user?.id);

  // Only the member who created a room can edit or delete it.
  const roomActions = (room) =>
    isOwner(room)
      ? [
          {
            key: "edit",
            label: "Edit room",
            icon: Pencil,
            onClick: () => openEdit(room),
          },
          {
            key: "delete",
            label: "Delete room",
            icon: Trash2,
            danger: true,
            onClick: () => removeRoom(room),
          },
        ]
      : [];

  return (
    <div className={styles.page}>
      {(error || listError) && (
        <p className={styles.error} role="alert">
          {error || listError}
        </p>
      )}

      <div className={`${styles.grid} ${active ? styles.showChat : ""}`}>
        <aside className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h1>Discussion rooms</h1>
              <small>{rooms.length} rooms</small>
            </div>
            <button
              type="button"
              className={styles.addButton}
              aria-label="New room"
              onClick={openCreate}
            >
              <MessageSquarePlus size={18} />
            </button>
          </div>

          <div className={styles.search}>
            <Search size={15} />
            <input
              aria-label="Search discussion rooms"
              placeholder="Find a room…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <p className={styles.empty} role="status">
              Loading rooms…
            </p>
          ) : (
            rooms.length === 0 && (
              <p className={styles.empty}>
                No rooms yet. Create the first one.
              </p>
            )
          )}

          <div className={styles.list}>
            {filteredRooms.map((room) => (
              <button
                type="button"
                key={room.id}
                aria-pressed={active?.id === room.id}
                className={`${styles.item} ${active?.id === room.id ? styles.active : ""}`}
                onClick={() => setActiveId(room.id)}
              >
                <span className={styles.avatar}>
                  <Hash size={19} />
                </span>
                <span className={styles.itemCopy}>
                  <strong>{room.name}</strong>
                  <span>
                    {room.lastMessage ||
                      room.description ||
                      `Created by ${room.firstName} ${room.lastName}`}
                  </span>
                </span>
                {Number(room.unreadCount) > 0 && (
                  <span
                    className={styles.badge}
                    aria-label={`${room.unreadCount} unread messages`}
                  >
                    {Number(room.unreadCount) > 99 ? "99+" : room.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {!loading && rooms.length > 0 && filteredRooms.length === 0 && (
            <p className={styles.empty}>No rooms match your search.</p>
          )}

          {showForm ? (
            <form onSubmit={save} className={styles.form}>
              <div className={styles.panelHeading}>
                <h2>{editingRoom ? "Edit room" : "Create a room"}</h2>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Close room form"
                  onClick={closeForm}
                >
                  <X size={16} />
                </button>
              </div>

              <label htmlFor="room-name">Room name</label>
              <input
                id="room-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                placeholder="e.g. React study group"
              />

              <label htmlFor="room-description">Description (optional)</label>
              <textarea
                id="room-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="What will you discuss?"
              />

              <div className={styles.formButtons}>
                <button
                  disabled={busy || !name.trim()}
                  className={styles.primary}
                >
                  {editingRoom ? (
                    <Pencil size={14} />
                  ) : (
                    <MessageSquarePlus size={14} />
                  )}
                  {editingRoom
                    ? busy
                      ? "Saving…"
                      : "Save changes"
                    : busy
                      ? "Creating…"
                      : "Create room"}
                </button>

                {editingRoom && (
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={busy}
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <button
              type="button"
              className={styles.newRoom}
              onClick={openCreate}
            >
              <MessageSquarePlus size={16} /> Create a room{" "}
              <ArrowRight size={14} />
            </button>
          )}
        </aside>

        {active ? (
          <MessageThread
            key={active.id}
            id={active.id}
            title={active.name}
            description={active.description}
            kind="discussion"
            onBack={() => setActiveId(null)}
            service={discussionService}
            actions={roomActions(active)}
          />
        ) : (
          <section className={styles.placeholder}>
            <span className={styles.placeholderIcon}>
              <UsersRound size={34} />
            </span>
            <span className={styles.kicker}>Ideas grow here</span>
            <h2>Find your next conversation</h2>
            <p>
              Choose a room to share what you’re learning, ask for a fresh
              perspective, or help someone move forward.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={openCreate}
            >
              <MessageSquarePlus size={15} /> Create a discussion room
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
