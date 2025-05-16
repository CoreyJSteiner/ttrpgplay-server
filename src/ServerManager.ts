import ServerRoom from "./ServerRoom.ts"
import User from "./User.ts"
import { errorUserExists } from "./Errors.ts"
import type { UUID } from "crypto"
import { isUUID } from "./UUID.ts"
import { Socket, Server } from "socket.io"

class ServerManager {
    users: Record<string, User>
    rooms: Record<string, ServerRoom>
    userNameById: Record<UUID, string>
    userNameBySocketId: Record<string, string>
    socketIoServer: Server

    constructor(socketIoServer: Server) {
        this.users = {}
        this.rooms = {}
        this.userNameById = {}
        this.userNameBySocketId = {}
        this.socketIoServer = socketIoServer

        this.createRoom('lobby')
    }

    getUserById(id: string | UUID): User | undefined {
        const userName: string = isUUID(id) ? this.userNameById[id] : this.userNameBySocketId[id]
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

        const userId: UUID = this.users[userName].id
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

        const newRoom: ServerRoom = new ServerRoom(roomName, this.socketIoServer)
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

export default ServerManager