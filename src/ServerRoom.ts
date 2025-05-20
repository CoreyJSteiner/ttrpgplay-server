import User from "./User.ts"
import { Server } from 'socket.io'
import type { UUID } from 'crypto'
import { tileToCoord } from "./Utils.ts"

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

    clearGameObjects(): void {
        this.gameObjects = {}
    }

    createGameObject(id: UUID = crypto.randomUUID(), x: number = 0, y: number = 0): GameObject {
        return this.gameObjects[id] = new GameObject(id, x, y)
    }

    createGameObjectByTile(tileX: number, tileY: number): void {
        const coords = tileToCoord(tileX, tileY)
        this.createGameObject(undefined, coords[0], coords[1])
    }

    newGame(): void {
        this.clearGameObjects()
        const positions: Array<Array<number>> = [
            [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
            [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2],
            [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
            [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8],
        ]

        positions.forEach(pos => {
            const coords = tileToCoord(pos[0], pos[1])
            this.createGameObject(undefined, coords[0], coords[1])
        })
        this.sendBoardState('all')
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

    sendBoardState(recipient: string | 'all'): void {
        if (recipient === 'all') {
            this.socketIoServer.in(this.name).emit('board-refresh', this.gameObjects)
            console.log('board state refresh all')
        }

        if (this.userList[recipient]) {
            const user = this.userList[recipient]
            user.socket?.emit('board-refresh', this.gameObjects)
        }
    }

    join(user: User): void {
        this.userList[user.userName] = user
        user.roomName = this.name
        user.socket?.join(this.name)
        user.socket?.emit('chat-join-callback', { userName: user.userName, roomName: user.roomName })
        this.sendBoardState(user.userName)
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