import { Server } from 'socket.io'
import { DiceRoll } from '@dice-roller/rpg-dice-roller'
import { GameValueManager, testImportStr } from './src/GameValueManager.ts'
import ServerManager from './src/ServerManager.ts'

const io: Server = new Server({
    cors: {
        origin: "http://localhost:5173"
    }
})
const port: number = parseInt(process.env.PORT || '3000')

const manager: GameValueManager = new GameValueManager()
manager.importJSON(testImportStr)

const serverManager = new ServerManager(io)

io.on('connection', (socket) => {
    console.log('a user connected')

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
            const parsedMsg: string = handleMessage(msg, user.userName)
            const destRoom = serverManager.getUserRoom(user.userName)
            destRoom?.postToRoom(parsedMsg)
            if (msg === 'resetBoard()') {


                const tileToCoord = (tileX: number, tileY: number): Array<number> => {
                    // Tile grid configuration (match these to your client-side setup)
                    const TILE_WIDTH = 12;
                    const TILE_HEIGHT = 6;
                    const ORIGIN_X = 85;  // X coordinate for tile (1,1)
                    const ORIGIN_Y = 72;  // Y coordinate for tile (1,1)

                    // Convert to isometric screen coordinates
                    const screenX = ORIGIN_X + (tileX - 1) * TILE_WIDTH - (tileY - 1) * TILE_WIDTH;
                    const screenY = ORIGIN_Y - (tileX - 1) * TILE_HEIGHT - (tileY - 1) * TILE_HEIGHT;

                    return [screenX, screenY];
                };

                const createGameObjectByTile = (tileX: number, tileY: number): void => {
                    const coords = tileToCoord(tileX, tileY)
                    destRoom?.createGameObject(undefined, coords[0], coords[1])
                }

                createGameObjectByTile(1, 1)
                createGameObjectByTile(2, 1)
                createGameObjectByTile(3, 1)
                createGameObjectByTile(4, 1)
                createGameObjectByTile(5, 1)
                createGameObjectByTile(6, 1)
                createGameObjectByTile(7, 1)
                createGameObjectByTile(8, 1)

                createGameObjectByTile(1, 2)
                createGameObjectByTile(2, 2)
                createGameObjectByTile(3, 2)
                createGameObjectByTile(4, 2)
                createGameObjectByTile(5, 2)
                createGameObjectByTile(6, 2)
                createGameObjectByTile(7, 2)
                createGameObjectByTile(8, 2)

                createGameObjectByTile(1, 7)
                createGameObjectByTile(2, 7)
                createGameObjectByTile(3, 7)
                createGameObjectByTile(4, 7)
                createGameObjectByTile(5, 7)
                createGameObjectByTile(6, 7)
                createGameObjectByTile(7, 7)
                createGameObjectByTile(8, 7)

                createGameObjectByTile(1, 8)
                createGameObjectByTile(2, 8)
                createGameObjectByTile(3, 8)
                createGameObjectByTile(4, 8)
                createGameObjectByTile(5, 8)
                createGameObjectByTile(6, 8)
                createGameObjectByTile(7, 8)
                createGameObjectByTile(8, 8)

                destRoom?.sendBoardState('all')
            }

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
            return `Invalid roll: ${error}`
        }
    }

    return msg
}

const notationString = (input: string, gvm: GameValueManager, userName: string): string => {
    // Regex to find all # followed by word characters (ie #DEX)
    const tokenRegex = /#(\w+)/g

    const result = input.replace(tokenRegex, (match, gvName) => {
        const gv = gvm.getGameValueEntryByName(gvName, userName).gameValue
        if (gv === undefined) {
            throw new Error(`Invalid string: Stat '${gvName}' not found in game value manager`)
        }

        return gv.invoke().toString()
    })

    return result.slice(3)
}

try {
    io.listen(port)
    console.log(`Server listening on PORT:${port}`)
} catch (error) {
    console.log(error)
}