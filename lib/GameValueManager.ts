import { GameValue, Scalar, Calc, Die } from "./GameValues.ts"
import { Sheet } from "./Sheet.ts"
import crypto from "crypto"
type UUID = crypto.UUID

const DEF_OWNER: string = '0'
type GameValueEntry = {
    owner: string,
    gameValue: GameValue
}
type IDDictionary = Record<UUID, GameValueEntry>
type ValuesOwned = Set<UUID>
type ValueOwners = Record<string, ValuesOwned>
type NameDictionary = Record<string, UUID>

type GVImportStatic = {
    'baseVal': number,
    'name': string,
    'owner'?: string
}
type GVImportScalar = {
    'baseVal': number,
    'name': string,
    'min': number,
    'max': number,
    'owner'?: string
}
type GVImportCalc = {
    'baseVal': number,
    'name': string,
    'operation': string,
    'values': Array<string>,
    'owner'?: string
}
type GVImportDie = {
    'baseVal': number,
    'name': string,
    'sides': number,
    'quantity': number,
    'owner'?: string
}

class GameValueManager {
    private _idLookup: IDDictionary
    private _nameLookup: NameDictionary
    private _valueOwners: ValueOwners

    constructor(idLookup: IDDictionary = {}, nameLookup: NameDictionary = {}, valueOwners: ValueOwners = {}) {
        this._idLookup = idLookup
        this._nameLookup = nameLookup
        this._valueOwners = valueOwners
    }

    get idLookup(): IDDictionary {
        return this._idLookup
    }

    get nameLookup(): NameDictionary {
        return this._nameLookup
    }

    add(gameValue: GameValue, owner?: string): boolean {
        const gvOwner = owner || DEF_OWNER

        this._idLookup[gameValue.id] = {
            owner: gvOwner,
            gameValue: gameValue
        }

        this._nameLookup[gameValue.name] = gameValue.id

        if (!this._valueOwners[gvOwner]) this.createOwner(gvOwner)
        this._valueOwners[gvOwner].add(gameValue.id)

        return true
    }

    remove(id: UUID): boolean {
        const gvEntry = this._idLookup[id]

        this._valueOwners[gvEntry.owner].delete(id)
        delete this._nameLookup[gvEntry.gameValue.name]
        delete this._idLookup[id]

        return true
    }

    outputSheet(): object {
        const sheet: object = {}

        Object.keys(this._idLookup).forEach(id => {
            const gv: GameValue = this._idLookup[id].gameValue
            sheet[gv.name] = gv.displaySimple
        })
        return sheet
    }

    invokeById(id: UUID): number {
        const gvEntry = this.getGameValueEntryById(id)
        if (!gvEntry) console.warn(`No Game Value found with id: ${id}`)
        return gvEntry.gameValue.invoke()
    }

    getGameValueEntryById(id: UUID): GameValueEntry {
        return this._idLookup[id]
    }

    getIdByName(name: string): UUID {
        const id = this._nameLookup[name]
        if (!id) console.warn(`No Game Value found with name: ${name}`)
        return this._nameLookup[name]
    }

    getGameValueEntryByName(name: string): GameValueEntry {
        const id: UUID = this.getIdByName(name)
        return this.getGameValueEntryById(id)
    }

    createOwner(owner: string): boolean {
        this._valueOwners[owner] = new Set()

        return true
    }

    importJSON(dataStr: string): boolean {
        const data: JSON = JSON.parse(dataStr)

        if (data['static']) this.createGVStatics(data['static'])
        if (data['scalar']) this.createGVScalars(data['scalar'])
        if (data['die']) this.createGVDice(data['die'])
        if (data['calc']) this.createGVCalcs(data['calc'])
        return true
    }

    createGVStatics(dataArr: Array<GVImportStatic>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const d = dataArr[i];

            try {
                const { baseVal, name, owner } = d
                const gv: GameValue = new GameValue(baseVal, name)
                this.add(gv, owner)
            } catch (error) {
                throw console.warn(`Could not import static value ${JSON.stringify(d)}:\n\n${error}`)
            }
        }

        return true
    }


    createGVScalars(dataArr: Array<GVImportScalar>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const d = dataArr[i];

            try {
                const { baseVal, name, owner, min, max } = d
                const gv: Scalar = new Scalar(baseVal, name, min, max)
                this.add(gv, owner)
            } catch (error) {
                throw console.warn(`Could not import scalar value ${JSON.stringify(d)}:\n\n${error}`)
            }
        }

        return true
    }

    createGVCalcs(dataArr: Array<GVImportCalc>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const d = dataArr[i];

            try {
                const { baseVal, name, owner, operation, values } = d
                const lookupValues: Array<GameValue> = values.map(name => {
                    const gvEntry = this.getGameValueEntryByName(name)
                    return gvEntry.gameValue
                })
                console.dir(lookupValues, { depth: null })
                const gv: Calc = new Calc(baseVal, name, lookupValues, operation)
                this.add(gv, owner)
            } catch (error) {
                throw console.warn(`Could not import calc value ${JSON.stringify(d)}:\n\n${error}`)
            }
        }

        return true
    }

    createGVDice(dataArr: Array<GVImportDie>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const d = dataArr[i];

            try {
                const { baseVal, name, owner, sides, quantity } = d
                const gv: Die = new Die(baseVal, name, sides, quantity)
                this.add(gv, owner)
            } catch (error) {
                throw console.warn(`Could not import die value ${JSON.stringify(d)}:\n\n${error}`)
            }
        }

        return true
    }
}

//Example JSON

const importTemplate: string = JSON.stringify({
    'static': [
        {
            'baseVal': 10,
            'name': 'BaseAC'
        },
        {
            'baseVal': 3,
            'owner': 'P1',
            'name': 'DexMod'
        }
    ],
    'scalar': [
        {
            'baseVal': 3,
            'owner': 'P1',
            'name': 'PlayerLevel',
            'min': 1, 'max': 20
        }
    ],
    'calc': [
        {
            'baseVal': 1,
            'owner': 'P1',
            'name': 'AC',
            'values': [
                'BaseAC',
                'DexMod',
                'D20'
            ],
            'operation': '#BaseAC + #DexMod'
        },
        {
            'baseVal': 1,
            'owner': 'P1',
            'name': 'ATK',
            'values': [
                'DexMod',
                'D20'
            ],
            'operation': '#D20 + #DexMod'
        }
    ],
    'die': [
        {
            'baseVal': 1,
            'name': 'D20',
            'sides': 20,
            'quantity': 1
        }
    ]
})

export { GameValueManager, importTemplate }

//Test

// const gvm: GameValueManager = new GameValueManager()
// gvm.importJSON(importTemplate)
// console.dir(gvm, { depth: null })
// const acId: UUID = gvm.getIdByName('AC')
// console.log(gvm.invokeById(acId))
// console.log(gvm.invokeById(acId))