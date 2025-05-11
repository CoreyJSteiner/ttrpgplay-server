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

function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}

class ServerManager {
    users: Record<string, User>
    rooms: Record<string, ServerRoom>
    userNameById: Record<UUID, string>
    userNameBySocketId: Record<string, string>

    constructor() {
        this.users = {}
        this.rooms = {}
        this.userNameById = {}
        this.userNameBySocketId = {}

        this.createRoom('lobby')
    }

    getUserById(id: string | UUID): User | undefined {
        const userName: string = this.userNameById[id] ? this.userNameById[id] : this.userNameBySocketId[id]
        console.log(id)

        return this.users[userName]
    }

    getUserByName(userName: string): User | undefined {
        return this.users[userName]
    }

    getUserRoom(userName: string): ServerRoom | undefined {
        const roomName: string | undefined = this.getUserByName(userName)?.roomName

        return roomName ? this.rooms[roomName] : undefined
    }

    addUser(userName: string, id: UUID | null, socket: Socket, roomName?: string): boolean {
        const destRoomName: string = roomName ? roomName : 'lobby'

        try {
            this.createUser(userName, id, socket, roomName)
        } catch (e) {
            if (e === errorUserExists) {
                const existingUser = this.users[userName]
                existingUser.socket = socket
                this.changeUserRoom(userName, destRoomName)
            } else {
                return false
            }
        }

        const userId: string = this.users[userName].id
        this.userNameById[userId] = userName
        this.userNameBySocketId[socket.id] = userName

        return true
    }

    addRoom(roomName: string): boolean {
        try {
            this.createRoom(roomName)
        } catch {
            return false
        }

        return true
    }

    createUser(userName: string, id: UUID | null, socket: Socket, roomName?: string): User {
        if (this.userExists(userName)) {
            throw errorUserExists
        }

        const newUser: User = new User(userName, id, socket, roomName || 'lobby')
        this.users[userName] = newUser

        return newUser
    }

    createRoom(roomName: string): ServerRoom {
        if (this.roomExists(roomName)) {
            throw Error(`A room named '${roomName}' already exists`)
        }

        const newRoom: ServerRoom = new ServerRoom(roomName)
        this.rooms[roomName] = newRoom

        return newRoom
    }

    userExists(userName: string): boolean {
        if (this.users[userName]) return true
        return false
    }

    roomExists(roomName: string): boolean {
        if (this.rooms[roomName]) return true
        return false
    }

    changeUserRoom(userName: string, destRoomNameInput: string) {
        const user: User = this.users[userName]
        const destRoomName: string = this.generativeJoin(destRoomNameInput).name
        const newRoom: ServerRoom = this.rooms[destRoomName]

        if (user.roomName) {
            this.rooms[user.roomName].leave(userName)
        }
        newRoom.join(user)
    }

    generativeJoin(roomNameInput: string): ServerRoom {
        const roomName: string = roomNameInput ? roomNameInput : 'lobby'
        const room: ServerRoom = this.roomExists(roomName) ? this.rooms[roomName] : this.createRoom(roomName)
        return room
    }
}

class ServerRoom {
    name: string
    userList: Record<string, User>
    messages: Array<string>

    constructor(roomName: string) {
        this.name = roomName
        this.userList = {}
        this.messages = []
    }

    addToHistory(msg: string) {
        this.messages.push(msg)
    }

    postToRoom(msg) {
        io.in(this.name).emit('chat-serverOrigin', msg)
        this.addToHistory(msg)
    }

    sendHistory(recipient: string | 'all') {
        if (recipient === 'all') {
            io.in(this.name).emit('chat-refresh', this.messages)
        }

        if (this.userList[recipient]) {
            const user = this.userList[recipient]
            user.socket?.emit('chat-refresh', this.messages)
        }
    }

    join(user: User) {
        this.userList[user.userName] = user
        user.roomName = this.name
        user.socket?.join(this.name)
        user.socket?.emit('chat-join-callback', { userName: user.userName, roomName: user.roomName })
    }

    leave(userInput: string | User) {
        let userName: string = ''
        if (typeof userInput !== 'string' && userInput?.isUser()) {
            userName = userInput.userName
        } else {
            userName = userInput as string
        }
        const user: User = this.userList[userName]
        if (user) {
            user.socket?.leave(this.name)
            user.roomName = 'none'
            delete this.userList[userName]
        }
    }
}

class User {
    userName: string
    id: UUID
    socket: Socket | null
    roomName: string

    constructor(userName: string, id: string | null, socket: Socket | null, roomName: string | null) {
        this.userName = userName
        this.id = id ? id : createUUID()
        this.socket = socket
        this.roomName = roomName || 'lobby'
    }

    isUser() {
        return true
    }
}

type UUID = string

// const userSockets: Record<UUID, Socket> = {}
// const userNames: Record<UUID, string> = {}
// const userRooms: Record<UUID, string> = {}
// const userIds: Record<string, UUID> = {}
// const serverRooms: Record<string, ServerRoom> = {}

const errorUserExists: Error = new Error(`A user named that already exists`)

const serverManager = new ServerManager()

io.on('connection', (socket) => {
    console.log('a user connected')
    // const userID: UUID = createUUID()
    // const user = new User(userID)
    // userSockets[userID] = socket

    socket.on('username set', (userName) => {
        serverManager.addUser(userName, null, socket)
        console.log('user created: ' + userName)
    })

    socket.on('room set', (roomName) => {
        const user = serverManager.getUserById(socket.id)
        if (!user) return
        serverManager.changeUserRoom(user.userName, roomName)
        console.log(`${user.userName} joined ${roomName}`)
    })

    socket.on('chat-reqRefresh', (userName) => {
        const room = serverManager.getUserRoom(userName)
        room?.sendHistory(userName)
    })

    socket.on('chat-clientOrigin', (msg) => {
        const user = serverManager.getUserById(socket.id)
        console.log(user)

        if (user) {
            console.log('sup')
            const parsedMsg: string = handleMessage(msg, user.userName)
            serverManager.getUserRoom(user.userName)?.postToRoom(parsedMsg)
        }
    })
})

const handleMessage = (msg: string, userName: string): string => {
    console.log(msg)
    if (msg.slice(0, 2) === "/c") {
        const sheetStr: string = JSON.stringify(manager.outputSheet(userName))
        return sheetStr
    }

    return `${userName}: ${parseMessage(msg, userName)}`
}

const parseMessage = (msg: string, userName: string): DiceRoll | string => {
    console.log(msg.slice(0, 2))
    if (msg.slice(0, 3) === "/r ") {
        try {
            const notation: string = notationString(msg, manager, userName)
            const roll: DiceRoll = new DiceRoll(notation)
            const result: string = roll.output.slice(roll.notation.length)

            return msg.slice(3) + result
        } catch (error) {
            return 'Invalid roll'
        }
    }

    return msg
}

const notationString = (input: string, gvm: GameValueManager, userName: string, display?: boolean): string => {
    // Regex to find all # followed by word characters (like #DEX)
    const tokenRegex = /#(\w+)/g

    // Replace each match
    const result = input.replace(tokenRegex, (match, gvName) => {
        const gv = gvm.getGameValueEntryByName(gvName, userName).gameValue;
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