import { UUID } from "crypto"
import { GameValue } from "./GameValues"

type GameValueDictionary = Record<UUID, GameValue>

class GameValueManager {
    private _dictionary: GameValueDictionary

    constructor(dictionary: GameValueDictionary = {}) {
        this._dictionary = dictionary
    }

    get dictionary(): GameValueDictionary {
        return this._dictionary
    }

    add(gameValue: GameValue): UUID {
        const id = crypto.randomUUID()

        if (this._dictionary[id]) return this.add(gameValue)
        this._dictionary[id] = gameValue

        return id
    }

    remove(id: UUID): boolean {
        delete this._dictionary[id]

        return true
    }

    getid(id: UUID): GameValue {
        return this._dictionary[id]
    }
}

export { GameValueManager }