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

    setValue(value: number, owner: string): number {
        if (this.isOwner(owner)) {
            this._baseValue = value
        } else {
            throw new Error("Only owners may set value");
        }

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

    setValue(value: number, owner: string): number {
        if (value >= this._min && value <= this._max) {
            return super.setValue(value, owner)
        } else {
            throw new Error(`Value '${value}' does not conform to Scalar threshold (${this.min} - ${this.max})`);
        }
    }

    sum(value: number | Array<number>, owner: string, strict: boolean = false): number {
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

        return this.setValue(modValue + this.baseValue, owner)
    }

    setThreshold(min: number | null, max: number | null): void {
        this._min = min ? min : this._min
        this._max = max ? max : this._max
    }
}

// Example 5e

const level = new Scalar(0, "Level", "ADMIN", 0, 20)

export { GameValue }