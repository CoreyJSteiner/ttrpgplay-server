import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server, Socket } from 'socket.io'
import crypto from 'crypto'
import { DiceRoll } from '@dice-roller/rpg-dice-roller'
import { GameValue } from './lib/GameValues.ts'
import { Sheet } from './lib/Sheet.ts'
// import type { Sheet } from './lib/GameValues.ts'

const app = express()
app.use(express.static("public"));
const server = http.createServer(app);
const io = new Server(server)
const port = process.env.PORT || 'PORT NOT SET'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type UUID = string

const userSockets: Record<UUID, Socket> = {}
const userNames: Record<UUID, string> = {}
const userRooms: Record<UUID, string> = {}

app.get('/', (req, res) => {
    res.sendFile(__dirname + 'public/index.html')
})

io.on('connection', (socket) => {
    console.log('a user connected')
    const userID: UUID = createUUID()
    userSockets[userID] = socket

    socket.on('username set', (username) => {
        userNames[userID] = username
    })

    socket.on('room set', (room) => {
        const roomname = room || "main"
        userRooms[userID] = roomname
        socket.join(roomname)
    })

    socket.on('chat message', (msg) => {
        handleMessage(msg, userID)
    })
})

function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}

const testCharSheet: Sheet = new Sheet()
testCharSheet.configTest()
const testCharSheet1: object = testCharSheet.getSheetOutput()

function handleMessage(msg: string, userID): void {
    if (msg.slice(0, 2) === "/c") {
        io.to(userRooms[userID]).emit('character sheet display', testCharSheet1)
        return
    }

    let messageLine: string = `${userNames[userID]}: ${parseMessage(msg)}`
    io.to(userRooms[userID]).emit('chat message', messageLine)
    console.log(messageLine);
}

function parseMessage(msg: string): DiceRoll | string {
    console.log(msg.slice(0, 2))
    if (msg.slice(0, 3) === "/r ") {
        try {
            const subMsg = subTokens(msg, testCharSheet1)
            const roll = new DiceRoll(subMsg.slice(3))
            return roll
        } catch (error) {
            return 'Invalid roll'
        }
    }

    return msg
}

function subTokens(input: string, charSheet: object): string {
    // Regex to find all # followed by word characters (like #DEX)
    const tokenRegex = /#(\w+)/g;

    // Replace each match
    const result = input.replace(tokenRegex, (match, charSheetKey) => {
        const value = charSheet[charSheetKey];
        if (value === undefined) {
            throw new Error(`Invalid string: Stat '${charSheetKey}' not found in object`);
        }
        return value.toString();
    });

    return result;
}

server.listen(port, () => {
    console.log(`Server listening on PORT:${port}`)
})