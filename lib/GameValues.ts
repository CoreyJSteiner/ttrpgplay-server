type EffectProperty = 'Temp' | 'Default'


interface Effect {
    value: number,
    prop: EffectProperty
}

type Effects = Array<Effect>

class GameValue {
    name: string
    baseValue: number
    owner: string
    effects: Effects

    constructor(baseValue: number, name?: string, owner?: string, effects?: Effects) {
        this.name = name || ""
        this.owner = owner || ""
        this.baseValue = baseValue
        this.effects = effects || []
    }

    invoke(useEffects: boolean = true, promptEffects: boolean = false): number {
        let effectMod = 0

        if (useEffects) {
            for (let i = 0; i < this.effects.length; i++) {
                const effect = this.effects[i]
                if (effect.prop === 'Temp' && !promptEffects) {
                    // await prompt owner(s) input
                    // if not in effect remove and continue to next iteration
                }

                effectMod += effect.value
            }
        }


        return this.baseValue + effectMod
    }

    setValue(value: number, owner: string): number {
        if (this.isOwner(owner)) {
            this.baseValue = value
        } else {
            throw new Error("Only owners may set value");
        }

        return value
    }

    isOwner(owner: string): boolean {
        if (owner === this.owner) return true
        return false
    }
}

export { GameValue }