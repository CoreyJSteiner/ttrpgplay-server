import { DiceRoll } from "@dice-roller/rpg-dice-roller"

const LOG_EVAL = false

type EffectProperty = 'Temp' | 'Default'

interface Effect {
    value: number,
    prop: EffectProperty
}

type Effects = Array<Effect>

class GameValue {
    private _name: string
    private _baseValue: number
    private _owner: string
    private _effects: Effects

    constructor(baseValue: number, name: string, owner: string, effects?: Effects) {
        this._name = name || ""
        this._owner = owner || ""
        this._baseValue = baseValue
        this._effects = effects || []
    }

    get name(): string {
        return this._name
    }

    get baseValue(): number {
        return this._baseValue
    }

    get owner(): string {
        return this._owner
    }

    get effects(): Effects {
        return this._effects
    }

    get display(): string {
        return `${this.name}: ${this._baseValue}`
    }

    invoke(useEffects: boolean = true, promptEffects: boolean = false): number {
        let effectMod = 0

        if (useEffects) {
            for (let i = 0; i < this._effects.length; i++) {
                const effect = this._effects[i]
                if (effect.prop === 'Temp' && !promptEffects) {
                    // await prompt owner(s) input
                    // if not in effect remove and continue to next iteration
                }

                effectMod += effect.value
            }
        }


        return this._baseValue + effectMod
    }

    setValue(value: number): number {
        this._baseValue = value

        return value
    }

    isOwner(owner: string): boolean {
        if (owner === this._owner) return true
        return false
    }
}

class Scalar extends GameValue {
    private _min: number
    private _max: number

    constructor(baseValue: number, name: string, owner: string, min: number, max: number, effects?: Effects) {
        super(baseValue, name, owner, effects)
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
            throw new Error(`Value '${value}' does not conform to Scalar threshold (${this.min} - ${this.max})`);
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

type Operation = string

class Calc extends GameValue {
    private _values: Array<GameValue>
    private _operation: Operation

    constructor(
        baseValue: number,
        name: string,
        owner: string,
        values: Array<GameValue>,
        operation: Operation,
        effects?: Effects) {
        super(baseValue, name, owner, effects)
        this._values = values
        this._operation = operation

        //Initialize baseValue
        this.setValue(this.invoke(false, false))
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

    invoke(useEffects: boolean = true, promptEffects: boolean = false): number {
        const invocations: Record<string, number> = this._values.reduce((acc, gv) => {
            acc[gv.name] = gv.invoke()
            return acc
        }, {})

        switch (this._operation) {
            case '+':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc + cur))
                break;
            case '-':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc - cur))
                break;
            case '*':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc * cur))
                break;
            case '/':
                this.setValue(Object.values(invocations).reduce((acc, cur) => acc / cur))
                break;
            default:
                this.setValue(this.strEval(invocations, LOG_EVAL))
                break;
        }

        return super.invoke(useEffects, promptEffects)
    }

    private strEval(invocations: Record<string, number>, log?: boolean): number {
        const usedNames: Set<string> = new Set<string>()
        let evalStr: string = ''

        let replacePos: Array<number> = []
        let replacing: boolean = false
        for (let i = 0; i < this._operation.length; i++) {
            const curLetter = this._operation[i];
            if (replacing) {
                if (replacePos.length === 0) {
                    replacePos.push(i)
                }
                if (curLetter === ' ' || curLetter === ')') {
                    replacePos.push(i)
                }
                if (i + 1 === this._operation.length) {
                    replacePos.push(this._operation.length)
                }
            } else if (curLetter === '#') {
                replacing = true
            } else {
                evalStr += curLetter
            }

            if (replacePos.length === 2) {
                const key = this._operation.slice(replacePos[0], replacePos[1])
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

        if (log) {
            console.log('<-' + evalStr + '->')
        }

        return new DiceRoll(evalStr).total
    }
}

class Die extends GameValue {
    private _sides: number
    private _quantity: number

    constructor(baseValue: number, name: string, owner: string, sides: number, quantity: number, effects?: Effects) {
        super(baseValue, name, owner, effects)
        this._sides = sides
        this._quantity = quantity

        //Initialize baseValue
        this.setValue(this.invoke(false, false))
    }

    get sides(): number {
        return this._sides
    }

    get quantity(): number {
        return this._quantity
    }

    get display(): string {
        return `${this.name}: ${this.invoke()} <${this._quantity}d${this._sides}>`
    }

    invoke(useEffects: boolean = true, promptEffects: boolean = false): number {
        const roll = new DiceRoll(`${this._quantity}d${this._sides}`).total
        this.setValue(roll)
        return super.invoke(useEffects, promptEffects)
    }
}

// Example 5e

const baseAC = new GameValue(10, 'BASE_AC', 'ADMIN')
const dex = new Scalar(14, 'ABS_DEX', 'PLAYER', 1, 20)
const dexMod = new Calc(0, 'AMOD_DEX', 'ADMIN', [dex], 'floor(#ABS_DEX - 10) / 2')

const AC = new Calc(0, 'AC', 'ADMIN', [dexMod, baseAC], '#AMOD_DEX + #BASE_AC + 0')
console.log(AC.display)

const lance = new Die(0, 'LANCE', 'ADMIN', 12, 1)
const lvl = new Scalar(1, 'LVL', 'ADMIN', 1, 20)
const prof = new Calc(0, 'PROF', 'ADMIN', [lvl], '1 + ceil(#LVL / 4)')
const d20Roll = new Die(0, 'D20', 'ADMIN', 20, 1)

const atkRoll = new Calc(0, 'ATK', 'ADMIN', [dexMod, prof, d20Roll], '#AMOD_DEX + #PROF + #D20')
console.log(atkRoll.display)

const damage = new Calc(0, 'DMG', 'ADMIN', [dexMod, lance], '#AMOD_DEX + #LANCE')
console.log(damage.display)

export { GameValue, Scalar, Calc, Die }