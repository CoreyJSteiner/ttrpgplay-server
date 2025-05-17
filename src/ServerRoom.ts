import User from "./User.ts"
import { Server } from 'socket.io'
import type { UUID } from 'crypto'

class GameObject {
    id: UUID
    x: number
    y: number

    constructor(id: UUID, x: number, y: number) {
        this.id = id
        this.x = x
        this.y = y
    }
}

class ServerRoom {
    name: string
    userList: Record<string, User>
    messages: Array<string>
    socketIoServer: Server
    gameObjects: Record<string, GameObject>

    constructor(roomName: string, socketIoServer: Server) {
        this.name = roomName
        this.userList = {}
        this.messages = []
        this.socketIoServer = socketIoServer
        this.gameObjects = {}
    }

    createGameObject(id: UUID = crypto.randomUUID(), x: number = 0, y: number = 0): GameObject {
        return this.gameObjects[id] = new GameObject(id, x, y)
    }

    getGameObject(id: UUID): GameObject {
        return this.gameObjects[id]
    }

    addToHistory(msg: string): void {
        this.messages.push(msg)
    }

    postToRoom(msg: string): void {
        this.socketIoServer.in(this.name).emit('chat-serverOrigin', msg)
        this.addToHistory(msg)
    }

    sendHistory(recipient: string | 'all'): void {
        if (recipient === 'all') {
            this.socketIoServer.in(this.name).emit('chat-refresh', this.messages)
        }

        if (this.userList[recipient]) {
            const user = this.userList[recipient]
            user.socket?.emit('chat-refresh', this.messages)
        }
    }

    join(user: User): void {
        this.userList[user.userName] = user
        user.roomName = this.name
        user.socket?.join(this.name)
        user.socket?.emit('chat-join-callback', { userName: user.userName, roomName: user.roomName })
    }

    leave(userInput: string | User): void {
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

export default ServerRoom