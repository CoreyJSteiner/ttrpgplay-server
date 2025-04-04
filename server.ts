import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'

const app = express()
app.use(express.static("public"));
const server = http.createServer(app);
const io = new Server(server)
const port = process.env.PORT || 'PORT NOT SET'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
    res.sendFile(__dirname + 'public/index.html')
})

io.on('connection', (socket) => {
    console.log('a user connected')
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg)
        console.log('message: ' + msg);
    });

})

io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' });

server.listen(port, () => {
    console.log(`Server listening on PORT:${port}`)
})