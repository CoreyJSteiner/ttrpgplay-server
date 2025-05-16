import User from "./User.ts"
import { Server } from 'socket.io'

class ServerRoom {
    name: string
    userList: Record<string, User>
    messages: Array<string>
    socketIoServer: Server

    constructor(roomName: string, socketIoServer: Server) {
        this.name = roomName
        this.userList = {}
        this.messages = []
        this.socketIoServer = socketIoServer
    }

    addToHistory(msg: string) {
        this.messages.push(msg)
    }

    postToRoom(msg: string) {
        this.socketIoServer.in(this.name).emit('chat-serverOrigin', msg)
        this.addToHistory(msg)
    }

    sendHistory(recipient: string | 'all') {
        if (recipient === 'all') {
            this.socketIoServer.in(this.name).emit('chat-refresh', this.messages)
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

export default ServerRoom