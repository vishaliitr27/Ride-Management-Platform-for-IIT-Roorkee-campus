import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { setIo } from "./realtime";
import { startScheduler } from "./scheduler";
import { registerSocketHandlers } from "./sockets";

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "*";

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

setIo(io);
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`API + Socket.IO listening on http://localhost:${PORT}`);
  startScheduler();
});
