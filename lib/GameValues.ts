import { DiceRoll } from "@dice-roller/rpg-dice-roller"

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
        return `${this.invoke()}`
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
        return `${this.invoke()} [ ${this._min} | ${this._max} ]`
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

type Operation =
    '+' |
    '-' |
    '*' |
    '/'

class Calc extends GameValue {
    private _valueA: GameValue
    private _valueB: GameValue
    private _operation: Operation

    constructor(
        baseValue: number,
        name: string,
        owner: string,
        valueA: GameValue,
        valueB: GameValue,
        operation: Operation,
        effects?: Effects) {
        super(baseValue, name, owner, effects)
        this._valueA = valueA
        this._valueB = valueB
        this._operation = operation
    }

    get valueA(): GameValue {
        return this._valueA
    }

    get valueB(): GameValue {
        return this._valueB
    }

    get operation(): Operation {
        return this._operation
    }

    get display(): string {
        return `${this.invoke()} [ ${this._valueA} ${this._operation} ${this._valueB}]`
    }

    invoke(useEffects: boolean = true, promptEffects: boolean = false): number {
        const valueA = this._valueA.invoke(useEffects, promptEffects)
        const valueB = this._valueA.invoke(useEffects, promptEffects)

        switch (this._operation) {
            case '+':
                this.setValue(valueA + valueB)
                break;
            case '-':
                this.setValue(valueA - valueB)
                break;
            case '*':
                this.setValue(valueA * valueB)
                break;
            case '/':
                this.setValue(valueA / valueB)
                break;
            default:
                throw new Error(`Invalid Calc operation on ${this.display}`);
                break;
        }

        return super.invoke(useEffects, promptEffects)
    }
}

class Die extends GameValue {
    private _sides: number
    private _quantity: number

    constructor(baseValue: number, name: string, owner: string, sides: number, quantity: number, effects?: Effects) {
        super(baseValue, name, owner, effects)
        this._sides = sides
        this._quantity = quantity
    }

    get sides(): number {
        return this._sides
    }

    get quantity(): number {
        return this._quantity
    }

    get display(): string {
        return `${this._quantity}d${this._sides}`
    }

    invoke(useEffects: boolean = true, promptEffects: boolean = false): number {
        const roll = new DiceRoll(`${this._quantity}d${this._sides}`).total
        this.setValue(roll)
        return super.invoke(useEffects, promptEffects)
    }
}

// Example 5e

// const level = new Scalar(0, "Level", "ADMIN", 0, 20)

export { GameValue, Scalar, Calc, Die }