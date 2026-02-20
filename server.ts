import { createServer } from "http"
import { handler } from "./build/handler.js"
import { handleUpgrade } from "./src/lib/server/websocket.ts"

const PORT = parseInt(process.env.PORT || "3000", 10)

const server = createServer((req, res) => {
  handler(req, res)
})

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`)

  if (url.pathname.startsWith("/ws/chat/")) {
    handleUpgrade(request, socket, head)
  } else {
    socket.destroy()
  }
})

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

// Graceful shutdown — close the socket so the port is freed immediately
function shutdown() {
  console.log("Shutting down...")
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000)
}
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
