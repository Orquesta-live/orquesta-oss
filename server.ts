// Custom Next.js server with Socket.io attached
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketIO } from './lib/socket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  initSocketIO(httpServer)

  httpServer.listen(port, () => {
    console.log(`> Orquesta OSS running at http://${hostname}:${port}`)
  })
})
