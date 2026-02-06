const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")

const port = parseInt(process.env.PORT || "3000", 10)
const app = next({ dir: "/data", dev: false })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, "0.0.0.0", () => {
    console.log(`> Docs server ready on port ${port}`)
  })
})
