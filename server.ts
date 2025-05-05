import path from 'path'
import { fileURLToPath } from 'url'
import { Server, Socket } from 'socket.io'
import crypto from 'crypto'
import { DiceRoll } from '@dice-roller/rpg-dice-roller'
import { GameValueManager, testImportStr } from './lib/GameValueManager.ts'

const io: Server = new Server({
    cors: {
        origin: "http://localhost:5173"
    }
})
const port: number = parseInt(process.env.PORT || '3000')
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

const manager: GameValueManager = new GameValueManager()
manager.importJSON(testImportStr)

type UUID = string

const userSockets: Record<UUID, Socket> = {}
const userNames: Record<UUID, string> = {}
const userRooms: Record<UUID, string> = {}

io.on('connection', (socket) => {
    console.log('a user connected')
    const userID: UUID = createUUID()
    userSockets[userID] = socket

    socket.on('username set', (username) => {
        console.log('user: ' + username)
        userNames[userID] = username
    })

    socket.on('room set', (room) => {
        console.log('room: ' + room)
        const roomname = room || "main"
        userRooms[userID] = roomname
        socket.join(roomname)
    })

    socket.on('chat-clientOrigin', (msg) => {
        handleMessage(msg, userID)
    })
})

function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}

function handleMessage(msg: string, userID: string): void {
    if (msg.slice(0, 2) === "/c") {
        const sheet: object = manager.outputSheet(userNames[userID])
        io.to(userRooms[userID]).emit('character sheet display', sheet)
        return
    }

    let messageLine: string = `${userNames[userID]}: ${parseMessage(msg, userID)}`
    io.to(userRooms[userID]).emit('chat-serverOrigin', messageLine)
}

function parseMessage(msg: string, userID: string): DiceRoll | string {
    console.log(msg.slice(0, 2))
    if (msg.slice(0, 3) === "/r ") {
        try {
            const notation: string = notationString(msg, manager, userID)
            const roll: DiceRoll = new DiceRoll(notation)
            const result: string = roll.output.slice(roll.notation.length)

            return msg.slice(3) + result
        } catch (error) {
            return 'Invalid roll'
        }
    }

    return msg
}

function notationString(input: string, gvm: GameValueManager, userID: string, display?: boolean): string {
    // Regex to find all # followed by word characters (like #DEX)
    const tokenRegex = /#(\w+)/g

    // Replace each match
    const result = input.replace(tokenRegex, (match, gvName) => {
        const gv = gvm.getGameValueEntryByName(gvName, userNames[userID]).gameValue;
        if (gv === undefined) {
            throw new Error(`Invalid string: Stat '${gvName}' not found in game value manager`)
        }

        return gv.invoke().toString()
    });

    return result.slice(3)
}

try {
    io.listen(port)
    console.log(`Server listening on PORT:${port}`)
} catch (error) {
    console.log(error)
}