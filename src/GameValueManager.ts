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


// The implementation of this import works for now given that I'm just importing the test data which I know conforms 
// correctly, but as it is its basically backwards. The updated implementation should have typeguards and type checking 
// of the import data before it attempts to import, and only then seal the data with the category to import. User
// imports are way donw the line though.

type GVImportStatic = {
    'type': 'static',
    'baseVal': number,
    'name': string,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type GVImportScalar = {
    'type': 'scalar',
    'min': number,
    'max': number,
    'baseVal': number,
    'name': string,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type GVImportCalc = {
    'type': 'calc',
    'operation': string,
    'values': Array<string>,
    'baseVal': number,
    'name': string,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}
type GVImportDie = {
    'type': 'die',
    'sides': number,
    'quantity': number,
    'baseVal': number,
    'name': string,
    'owner'?: string,
    'effects'?: Effects,
    'tags'?: Array<string>
}

type EffectImport = {
    'type': 'effect',
    'name': string,
    'values': Invocations,
    'operation': Operation,
    'targetTags': Array<string>,
    'negateBase': boolean
}

type GVImport = GVImportStatic | GVImportScalar | GVImportCalc | GVImportDie | EffectImport

class GameValueManager {
    private _idDictionary: IDDictionary
    private _nameLookup: NameLookup
    private _valueOwners: ValueOwners
    private _effectDictionary: EffectDictionary
    private _reservedDictionary: Set<string>

    constructor(
        idDictionary: IDDictionary = {},
        nameLookup: NameLookup = {},
        valueOwners: ValueOwners = {},
        effectDictionary: EffectDictionary = {}) {
        this._idDictionary = idDictionary
        this._nameLookup = nameLookup
        this._valueOwners = valueOwners
        this._effectDictionary = effectDictionary
        this._reservedDictionary = new Set([DEF_OWNER])
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

    get reservedDictionary(): Set<string> {
        return this._reservedDictionary
    }

    isReserved(string: string): boolean {
        return this._reservedDictionary.has(string)
    }

    add(addition: GameValue | Effect, owner?: string): boolean {
        if (this.isReserved(addition.name)) {
            console.warn(`\'${addition.name}\' cannot be added as it is a reserved string`)
            return false
        }
        if (owner && this.isReserved(owner)) {
            console.warn(`\'${owner}\' cannot be an owner as it is a reserved string`)
            return false
        }

        const additionClass: string = addition.constructor.name
        const parentClass: string = Object.getPrototypeOf(addition.constructor).name
        const additionMethod: string = parentClass === 'GameValue' ? 'GameValue' : additionClass
        switch (additionMethod) {
            case 'GameValue':
                this.addGameValue(addition as GameValue, owner)
                break
            case 'Effect':
                this.addEffect(addition as Effect)
                break
            default:
                return false
                break
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
        const sheet: Record<string, string> = {}
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
        const data: Record<string, Array<GVImport>> = JSON.parse(dataStr)

        Object.keys(data).forEach((categoryKey: string) => {
            const arrGameValues: Array<GVImport> = data[categoryKey].map(dataEntry => {
                return { ...dataEntry, 'type': categoryKey } as GVImport
            })
            this.createGameValues(arrGameValues)
        })
        return true
    }

    createGameValues(dataArr: Array<GVImport>): boolean {
        for (let i = 0; i < dataArr.length; i++) {
            const dataEntry = dataArr[i]

            try {
                switch (dataEntry.type) {
                    case 'static':
                        this.createGVStatic(dataEntry)
                        break;
                    case 'scalar':
                        this.createGVScalar(dataEntry)
                        break;
                    case 'calc':
                        this.createGVCalc(dataEntry)
                        break;
                    case 'die':
                        this.createGVDie(dataEntry)
                        break;
                    case 'effect':
                        this.createEffect(dataEntry)
                        break;

                    default:
                        throw console.warn(`GV import has no type ${JSON.stringify(dataEntry)}`)
                        break;
                }
            } catch (error) {
                throw console.warn(`Could not import static value ${JSON.stringify(dataEntry)}:\n\n${error}`)
            }
        }

        return true
    }

    createGVStatic(dataEntry: GVImportStatic): boolean {
        const { baseVal, name, owner, effects, tags } = dataEntry
        const gv: GameValue = new GameValue(baseVal, name, effects, tags)
        this.add(gv, owner)

        return true
    }


    createGVScalar(dataEntry: GVImportScalar): boolean {
        const { baseVal, name, owner, min, max, effects, tags } = dataEntry
        const gv: Scalar = new Scalar(baseVal, name, min, max, effects, tags)
        this.add(gv, owner)

        return true
    }

    createGVCalc(dataEntry: GVImportCalc): boolean {
        const { baseVal, name, owner, operation, values, effects, tags } = dataEntry
        const lookupValues: Array<GameValue> = values.map(name => {
            const gvEntry = this.getGameValueEntryByName(name, owner)
            return gvEntry.gameValue
        })
        const gv: Calc = new Calc(baseVal, name, lookupValues, operation, effects, tags)
        this.add(gv, owner)

        return true
    }

    createGVDie(dataEntry: GVImportDie): boolean {
        const { baseVal, name, owner, sides, quantity, effects, tags } = dataEntry
        const gv: Die = new Die(baseVal, name, sides, quantity, effects, tags)
        this.add(gv, owner)

        return true
    }

    createEffect(dataEntry: EffectImport): boolean {
        const { name, values, operation, targetTags, negateBase } = dataEntry
        const effect: Effect = new Effect(name, values, operation, targetTags, negateBase)
        this.add(effect)

        return true
    }
}

//Example JSON

const testImportStr: string = JSON.stringify(gvmTestImport)

export { GameValueManager, testImportStr }