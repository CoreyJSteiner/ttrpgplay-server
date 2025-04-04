import express from 'express'
import http from 'http'

const app = express()
const server = http.createServer(app);
const port = process.env.PORT || 'PORT NOT SET'

app.get('/', (req, res) => {
    res.sendfile('Hello World!')
})

server.listen(port, () => {
    console.log(`Server listening on PORT:${port}`)
})