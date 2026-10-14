let ioInstance = null;

// Called once, from initSocket() when the server starts.
export const setIO = io => {
    ioInstance = io;
};

// Any service can call this to push a live event, e.g.:
//   getIO().to(userRoom(userId)).emit("notification:new", payload)
export const getIO = () => {
    if (!ioInstance) {
        throw new Error("Socket.io has not been initialized yet");
    }
    return ioInstance;
};

// Every connected user joins a private room named after their own user id,
// so we can target (or exclude) exactly one user without the server having
// to track which socket connection belongs to which user itself.
export const userRoom = userId => `user:${userId}`;

// Live updates are a bonus on top of the REST API: if a socket emit ever
// fails (server not ready, adapter hiccup) the REST request that triggered it
// must still succeed. Clients re-sync on reconnect, so a missed event is safe.
const safely = fn => {
    try {
        fn();
    } catch (error) {
        console.error("Socket emit failed:", error.message);
    }
};

// Emit to one or more specific users (all of their open tabs/devices).
// Socket.io delivers once per socket even if a socket is in several rooms.
export const emitToUsers = (userIds, event, payload) =>
    safely(() => {
        const rooms = [...new Set(userIds.filter(Boolean))].map(userRoom);
        if (rooms.length) getIO().to(rooms).emit(event, payload);
    });

// Emit to every connected (authenticated) user.
export const emitToAll = (event, payload) =>
    safely(() => getIO().emit(event, payload));
