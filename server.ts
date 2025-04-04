import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
app.use(express.static("public"));
const server = http.createServer(app);
const port = process.env.PORT || 'PORT NOT SET'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
    res.sendFile(__dirname + 'public/index.html')
})

server.listen(port, () => {
    console.log(`Server listening on PORT:${port}`)
})