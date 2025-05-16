import { createUUID } from "./UUID.ts"
import type { UUID } from "crypto"
import { Socket } from 'socket.io'

class User {
    userName: string
    id: UUID
    socket: Socket | null
    roomName: string

    constructor(userName: string, id: UUID | null, socket: Socket | null, roomName: string | null) {
        this.userName = userName
        this.id = id ? id : createUUID()
        this.socket = socket
        this.roomName = roomName || 'lobby'
    }

    isUser() {
        return true
    }
}


export default User