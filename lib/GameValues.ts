import { DiceRoll } from "@dice-roller/rpg-dice-roller"
import crypto from "crypto"
const randomUUID = crypto.randomUUID
type UUID = crypto.UUID

const SELF_EFFECT: string = 'SELF'

type Operation = string
type Invocations = Record<string, number>
type Tags = Set<string>

class Effect {
    name: string
    values: Invocations
    operation: Operation
    targetTags?: Tags
    negateBase?: boolean

    constructor(
        name: string,
        values: Invocations,
        operation: Operation,
        targetTags?: Array<string>,
        negateBase?: boolean) {
        this.name = name
        this.values = values
        this.operation = operation
        this.targetTags = new Set(targetTags)
        this.negateBase = negateBase
    }
}


type Effects = Array<Effect>

type InvokeOptions = {
    useEffects?: boolean,
    effects?: Effects
    log?: boolean
}

const InvokeDefault: InvokeOptions = {
    useEffects: true,
    log: false
}

const InitInvokeDefault: InvokeOptions = {
    useEffects: false,
    log: false
}

class GameValue {
    private _name: string
    private _baseValue: number
    // private _effects: Effects
    private _effectiveValue: number
    private _id: UUID
    private _tags: Set<string>

    constructor(baseValue: number, name: string, effects?: Effects, tags?: Array<string>) {
        this._name = name
        this._baseValue = baseValue
        this._effectiveValue = this._baseValue
        this._id = randomUUID()
        this._tags = new Set(tags)
    }

    get name(): string {
        return this._name
    }

    get baseValue(): number {
        return this._baseValue
    }

    get id(): UUID {
        return this._id
    }

    get display(): string {
        return `${this.name}: ${this._baseValue}`
    }

    get displaySimple(): string {
        return `${this._baseValue}${this._effectiveValue !== this._baseValue ? '*' : ''}`
    }

    get tags(): Tags {
        return this._tags
    }

    get gameValue(): boolean {
        return true
    }

    static isGameValue(value: any): boolean {
        if (value.gameValue) {
            return true
        }

        return false
    }

    invoke(invokeOptions: InvokeOptions = InvokeDefault): number {
        const { useEffects, log, effects } = invokeOptions
        let invocationValue = this._baseValue
        let effectMod = 0
        let baseOverride = false

        if (useEffects && effects) {
            effects.forEach(effect => {
                const tags: Tags | undefined = effect.targetTags
                if (tags && this.hasTag(tags)) {
                    effectMod += this.valueEffect(effect)
                }
                if (effect.negateBase) {
                    baseOverride = true
                }
            })

            invocationValue += effectMod
            if (baseOverride) invocationValue -= this._baseValue
        }

        if (log) console.log(this.display)

        this._effectiveValue = invocationValue
        return this._effectiveValue
    }

    setValue(value: number): number {
        this._baseValue = value

        return value
    }

    hasTag(tag: string | Tags | undefined): boolean {
        if (tag === undefined) return false
        let hasTag = false
        let inputType = tag.constructor.name

        if (inputType === 'string') {
            this._tags.has(tag as string)
        } else if (inputType === 'Set') {
            this._tags.forEach(gvTag => {
                const inputTags = tag as Tags

                if (inputTags.has(gvTag)) hasTag = true
            })
        }

        return hasTag
    }

    valueEffect(effect: Effect): number {
        const { values, operation } = effect
        values[SELF_EFFECT] = this.invoke({ useEffects: false })

        let valueEffect = performOperation(values, operation)
        return valueEffect
    }
}

class Scalar extends GameValue {
    private _min: number
    private _max: number

    constructor(baseValue: number, name: string, min: number, max: number, effects?: Effects, tags?: Array<string>) {
        super(baseValue, name, effects, tags)
        this._min = min
        this._max = max
    }

    get min(): number {
        return this._min
    }

    get max(): number {
        return this._max
    }

    get display(): string {
        return `${this.name}: ${this.baseValue} < ${this._min} | ${this._max} >`
    }

    setValue(value: number): number {
        if (value >= this._min && value <= this._max) {
            return super.setValue(value)
        } else {
            throw new Error(`Value '${value}' does not conform to Scalar threshold (${this.min} - ${this.max})`)
        }
    }

    setSum(value: number | Array<number>, strict: boolean = false): number {
        let modValue = 0

        if (typeof value === 'number') {
            modValue = value
        } else if (Array.isArray(value)) {
            modValue = value.reduce((sum, current) => sum + current, 0)
        }

        if (!strict) {
            if (modValue + this.baseValue > this._max) {
                modValue = this._max
            } else if (modValue + this.baseValue < this._min) {
                modValue = this._min
            }
        }

        return this.setValue(modValue + this.baseValue)
    }

    setThreshold(min: number | null, max: number | null): void {
        this._min = min ? min : this._min
        this._max = max ? max : this._max
    }
}

class Calc extends GameValue {
    private _values: Array<GameValue>
    private _operation: Operation

    constructor(
        baseValue: number,
        name: string,
        values: Array<GameValue>,
        operation: Operation,
        effects?: Effects,
        tags?: Array<string>) {
        super(baseValue, name, effects, tags)
        this._values = values
        this._operation = operation

        this.setValue(this.invoke(InitInvokeDefault))
    }

    get values(): Array<GameValue> {
        return this._values
    }

    get valuesStr(): Array<string> {
        return this._values.map(val => val.display)
    }

    get operation(): Operation {
        return this._operation
    }

    get display(): string {
        return `${this.name}: ${this.baseValue} = \{${this._operation}\} [${this.valuesStr.join(', ')}]`
    }

    invoke(invokeOptions: InvokeOptions = InvokeDefault): number {
        const invocations: Invocations = this._values.reduce((acc, gv) => {
            acc[gv.name] = gv.invoke(invokeOptions)
            return acc
        }, {})

        switch (this._operation) {
            case '+':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc + cur))
                break
            case '-':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc - cur))
                break
            case '*':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc * cur))
                break
            case '/':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc / cur))
                break
            default:
                this.setValue(this.callOperation(invocations))
                break
        }

        return super.invoke(invokeOptions)
    }

    private callOperation(invocations: Invocations): number {
        return performOperation(invocations, this._operation)
    }
}

class Die extends GameValue {
    private _sides: number
    private _quantity: number

    constructor(baseValue: number, name: string, sides: number, quantity: number, effects?: Effects, tags?: Array<string>) {
        super(baseValue, name, effects, tags)
        this._sides = sides
        this._quantity = quantity

        //Initialize baseValue
        this.setValue(this.invoke(InitInvokeDefault))
    }

    get sides(): number {
        return this._sides
    }

    get quantity(): number {
        return this._quantity
    }

    get display(): string {
        return `${this.name}: ${this.baseValue} <${this._quantity}d${this._sides}>`
    }

    invoke(invokeOptions: InvokeOptions = InvokeDefault): number {
        const { useEffects, log } = invokeOptions
        const roll = new DiceRoll(`${this._quantity}d${this._sides}`).total
        this.setValue(roll)

        return super.invoke(invokeOptions)
    }
}

function performOperation(invocations: Invocations, operation: Operation): number {
    const usedNames: Set<string> = new Set<string>()
    let evalStr: string = ''

    let replacePos: Array<number> = []
    let replacing: boolean = false
    for (let i = 0; i < operation.length; i++) {
        const curLetter = operation[i]
        if (replacing) {
            if (replacePos.length === 0) {
                replacePos.push(i)
            }
            if (curLetter === ' ' || curLetter === ')') {
                replacePos.push(i)
            }
            if (i + 1 === operation.length) {
                replacePos.push(operation.length)
            }
        } else if (curLetter === '#') {
            replacing = true
        } else {
            evalStr += curLetter
        }

        if (replacePos.length === 2) {
            const key = operation.slice(replacePos[0], replacePos[1])
            if (invocations[key]) {
                evalStr += invocations[key]
                if (curLetter === ' ' || curLetter === ')') evalStr += curLetter
                replacePos = []
                replacing = false
            } else {
                throw new Error(`Could not find invocation '${key}'`)
            }
        }
    }

    return new DiceRoll(evalStr).total
}

export { GameValue, Scalar, Calc, Die, Effect }
export type { Effects, Invocations, Tags, Operation }