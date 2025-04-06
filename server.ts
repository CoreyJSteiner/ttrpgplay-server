import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server, Socket } from 'socket.io'
import crypto from 'crypto'
import { DiceRoll } from '@dice-roller/rpg-dice-roller'

const app = express()
app.use(express.static("public"));
const server = http.createServer(app);
const io = new Server(server)
const port = process.env.PORT || 'PORT NOT SET'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type UUID = string

const userSockets: Record<UUID, Socket> = {}
const usernames: Record<UUID, string> = {}

app.get('/', (req, res) => {
    res.sendFile(__dirname + 'public/index.html')
})

io.on('connection', (socket) => {
    console.log('a user connected')
    const userID: UUID = createUUID()
    userSockets[userID] = socket

    socket.on('username set', (username) => {
        usernames[userID] = username
    })

    socket.on('chat message', (msg) => {
        let messageLine: string = `${usernames[userID]}: ${parseMessage(msg)}`
        io.emit('chat message', messageLine)
        console.log(messageLine);
    })
})

function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}

function parseMessage(message: string): DiceRoll | string {
    console.log(message.slice(0, 2))
    if (message.slice(0, 3) === "/r ") {
        try {
            const roll = new DiceRoll(message.slice(3))
            return roll
        } catch (error) {
            return 'Invalid roll'
        }

    }

    return message
}

server.listen(port, () => {
    console.log(`Server listening on PORT:${port}`)
})