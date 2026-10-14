import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { setIO, userRoom } from "../utils/socket/io.js";
import { allowedOrigins } from "../utils/cors.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

// Attaches Socket.io to the same HTTP server Express uses (see index.js).
// Reuses the exact JWT the REST API already issues on login — no separate
// auth system, no new tokens, no new secrets.
export const initSocket = httpServer => {
    const io = new Server(httpServer, {
        cors: { origin: allowedOrigins() },
        // Detect dead connections quickly so clients reconnect and re-sync.
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    // socket.io-client connects with: io(url, { auth: { token } })
    // This runs once per connection attempt, before "connection" fires.
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Authentication required"));

            const payload = jwt.verify(token, JWT_SECRET);
            socket.userId = payload.id;
            next();
        } catch (error) {
            next(new Error("Authentication invalid"));
        }
    });

    io.on("connection", socket => {
        socket.join(userRoom(socket.userId));
    });

    setIO(io);
    return io;
};
