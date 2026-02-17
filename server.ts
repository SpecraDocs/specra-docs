import { createServer } from "http"
import { handler } from "./build/handler.js"
import { handleUpgrade } from "./src/lib/server/websocket.js"

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
