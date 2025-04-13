import { GameValue, Scalar, Calc, Die, Effect } from "./GameValues.ts"
import type { Effects, Invocations, Operation } from "./GameValues.ts"
import crypto from "crypto"
import gvmTestImport from '../assets/imports/gvmTestImport.json' with { type: "json" }
type UUID = crypto.UUID

const DEF_OWNER: string = 'public'
type GameValueEntry = {
    owner: string,
    gameValue: GameValue
}
type IDDictionary = Record<UUID, GameValueEntry>
type ValuesOwned = Set<UUID>
type ValueOwners = Record<string, ValuesOwned>
type NameOwnersEntry = Record<string, UUID>
type NameLookup = Record<string, NameOwnersEntry>
type EffectDictionary = Record<string, Effect>

type GVImportStatic = {
    'baseVal': number,
    'name': string,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type GVImportScalar = {
    'baseVal': number,
    'name': string,
    'min': number,
    'max': number,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type GVImportCalc = {
    'baseVal': number,
    'name': string,
    'operation': string,
    'values': Array<string>,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type GVImportDie = {
    'baseVal': number,
    'name': string,
    'sides': number,
    'quantity': number,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type EffectImport = {
    name: string,
    values: Invocations,
    operation: Operation,
    targetTags: Array<string>,
    negateBase: boolean
}

class GameValueManager {
    private _idDictionary: IDDictionary
    private _nameLookup: NameLookup
    private _valueOwners: ValueOwners
    private _effectDictionary: EffectDictionary

    constructor(
        idDictionary: IDDictionary = {},
        nameLookup: NameLookup = {},
        valueOwners: ValueOwners = {},
        effectDictionary: EffectDictionary = {}) {
        this._idDictionary = idDictionary
        this._nameLookup = nameLookup
        this._valueOwners = valueOwners
        this._effectDictionary = effectDictionary
    }

    get idDictionary(): IDDictionary {
        return this._idDictionary
    }

    get nameLookup(): NameLookup {
        return this._nameLookup
    }

    get effectDictionary(): EffectDictionary {
        return this._effectDictionary
    }

    add(addition: GameValue | Effect, owner?: string): boolean {
        const additionClass: string = addition.constructor.name
        const parentClass: string = Object.getPrototypeOf(addition.constructor).name
        const additionMethod: string = parentClass === 'GameValue' ? 'GameValue' : additionClass
        console.log('additionMethod: ' + additionMethod)
        switch (additionMethod) {
            case 'GameValue':
                this.addGameValue(addition as GameValue, owner)
                break;
            case 'Effect':
                console.log('effect!')
                this.addEffect(addition as Effect)
                break;
            default:
                return false
                break;
        }

        return true
    }

    addEffect(effect: Effect) {
        if (this._effectDictionary[effect.name]) {
            console.warn(`The effect name \'${effect.name}\' is already taken`)

            return false
        }

        this._effectDictionary[effect.name] = effect
        return true
    }

    addGameValue(gameValue: GameValue, owner?: string): boolean {
        const gvOwner: string = owner || DEF_OWNER

        this._idDictionary[gameValue.id] = {
            owner: gvOwner,
            gameValue: gameValue
        }

        if (!this._nameLookup[gameValue.name]) {
            this._nameLookup[gameValue.name] = {}
        }

        if (this._nameLookup[gameValue.name][gvOwner]) {
            console.warn(`The name ${gameValue.name} is already taken for owner ${gvOwner}`)
            return false
        }
        this._nameLookup[gameValue.name][gvOwner] = gameValue.id

        if (!this._valueOwners[gvOwner]) this.createOwner(gvOwner)
        this._valueOwners[gvOwner].add(gameValue.id)

        return true
    }

    remove(id: UUID, owner?: string): boolean {
        const gvOwner = owner || DEF_OWNER
        const gvEntry = this._idDictionary[id]

        this._valueOwners[gvEntry.owner].delete(id)
        delete this._nameLookup[gvEntry.gameValue.name][gvOwner]
        delete this._idDictionary[id]

        return true
    }

    outputSheet(owner?: string): object {
        const sheet: object = {}
        const owners: Array<string> = [DEF_OWNER]
        const ids: Array<UUID> = []
        if (owner) {
            owners.push(owner)
        }
        owners.forEach(o => {
            const ownedIds: ValuesOwned = this._valueOwners[o]
            if (ownedIds && ownedIds.size > 0) {
                ownedIds.forEach(id => {
                    ids.push(id)
                })
            }
        })

        ids.forEach(id => {
            const gv: GameValue = this._idDictionary[id].gameValue
            sheet[gv.name] = gv.displaySimple
        })
        return sheet
    }

    invokeById(id: UUID): number {
        const gvEntry: GameValueEntry = this.getGameValueEntryById(id)
        if (!gvEntry) console.warn(`No Game Value found with id: ${id}`)
        return gvEntry.gameValue.invoke()
    }

    getGameValueEntryById(id: UUID): GameValueEntry {
        return this._idDictionary[id]
    }

    getIdByName(name: string, owner: string = DEF_OWNER): UUID {
        const nameEntry: NameOwnersEntry = this._nameLookup[name]
        const id = nameEntry[owner] ? nameEntry[owner] : nameEntry[DEF_OWNER]
        if (!id) console.warn(`No Game Value found with name: ${name} for ${owner}`)
        return id
    }

    getGameValueEntryByName(name: string, owner?: string): GameValueEntry {
        const gvOwner: string = owner || DEF_OWNER
        const id: UUID = this.getIdByName(name, gvOwner)
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
        if (data['effect']) this.createEffects(data['effect'])
        return true
    }

    createGVStatics(dataArr: Array<GVImportStatic>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const d = dataArr[i];

            try {
                const { baseVal, name, owner, effects, tags } = d
                const gv: GameValue = new GameValue(baseVal, name, effects, tags)
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
                const { baseVal, name, owner, min, max, effects, tags } = d
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
                const { baseVal, name, owner, operation, values, effects, tags } = d
                const lookupValues: Array<GameValue> = values.map(name => {
                    const gvEntry = this.getGameValueEntryByName(name, owner)
                    return gvEntry.gameValue
                })
                const gv: Calc = new Calc(baseVal, name, lookupValues, operation, effects, tags)
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
                const { baseVal, name, owner, sides, quantity, effects, tags } = d
                const gv: Die = new Die(baseVal, name, sides, quantity, effects, tags)
                this.add(gv, owner)
            } catch (error) {
                throw console.warn(`Could not import die value ${JSON.stringify(d)}:\n\n${error}`)
            }
        }

        return true
    }

    createEffects(dataArr: Array<EffectImport>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const d = dataArr[i];

            try {
                const { name, values, operation, targetTags, negateBase } = d
                const effect: Effect = new Effect(name, values, operation, targetTags, negateBase)
                this.add(effect)
            } catch (error) {
                throw console.warn(`Could not import effect value ${JSON.stringify(d)}:\n\n${error}`)
            }
        }

        return true
    }
}

//Example JSON

const testImportStr: string = JSON.stringify(gvmTestImport)

export { GameValueManager, testImportStr }

//Test

// const gvm: GameValueManager = new GameValueManager()
// gvm.importJSON(testImportStr)
// console.dir(gvm, { depth: null })
// const acId: UUID = gvm.getIdByName('AC', 'P1')
// console.log(gvm.invokeById(acId))
// console.log(gvm.invokeById(acId))