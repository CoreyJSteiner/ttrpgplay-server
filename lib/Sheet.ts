import { UUID } from "crypto"
import { GameValue, Scalar, Calc, Die } from "./GameValues.ts"

type Options = Array<string>    //Should this be a GameValue?

type SlotTypes = 'GameValue' | 'Calc' | 'Scalar' | 'Die' | 'Text' | 'Option'
// type SlotControl = 'Admin' | 'Owner' | 'All'
type SlotScope = 'Public' | 'Player' | 'Sheet'
type Slot = {
    type: SlotTypes,
    // control: SlotControl,
    scope: SlotScope
    required: boolean,
    value?: GameValue | Scalar | Calc | Die | string | Options | null | undefined
    // invokeCondition?: string
}

type Grouping = Set<UUID>
type Groupings = Record<string, Grouping>

type SlotDict = Record<string, Slot>
type SheetOptions = {
    slots: SlotDict
    template?: boolean
    // groupings?: Groupings
    // operations: object
    // triggers: object
}


// Sheets should be responsible for creating thier values in the GVM. They should serve as a template and as a 
// reference. There should be a config that is a singleton that they can share. GVMSheetConfig should be the template.
class GVMSheet {
    private _slots: SlotDict     // Paramitarized value
    private _template: boolean
    // groupings: Groupings
    // operations: object
    // triggers: object

    constructor(sheetOptions: SheetOptions) {
        this._slots = sheetOptions.slots || {}
        this._template = sheetOptions.template || false
        // this.groupings = sheetOptions.groupings || {}
        // this.operations = sheetOptions.operations || {}
        // this.triggers = sheetOptions.triggers || {}
    }

    get slots(): SlotDict {
        return this._slots
    }

    get template(): boolean {
        return this._template
    }

    get isTemplate(): boolean {
        return this._template
    }

    configured(): boolean {
        if (this.isTemplate) {
            return false
        }

        Object.keys(this._slots).forEach(slotKey => {
            const slot = this._slots[slotKey]
            if (!GameValue.isGameValue(slot.value)) {
                return false
            }
        })

        return true
    }

    createTemplate(): GVMSheet {
        const clearedSlots: SlotDict = {}

        Object.keys(this._slots).forEach(slotKey => {
            const { type, scope, required } = this._slots[slotKey]
            clearedSlots[slotKey] = { type, scope, required }
        })

        return new GVMSheet({
            slots: clearedSlots,
            template: true
        })
    }

    addSlot(slotName: string, slot: Slot): boolean {
        if (this.isTemplate) {
            return false
        }

        if (!this._slots[slotName]) {
            this._slots[slotName] = slot
            return true
        }

        return false
    }
}

// This sort of sheet is for creating values that override the GVM values. If a value is not present it will default to 
// the GVM sheet which will pull values based on id (name?). The question that arrises is should you then be able to 
// swap the breakout and GVM sheet? And why bother? Should the GVM sheet just have the breajkout values natively? I 
// think for the sake of organization, I'd like to separate them, but realistically all sheets will be breakout sheets.
// This will help segemnt the logic a bit and keep it clean. GVM should be able to target value Params like owner and
// name so that I can say 'corey@dex'. But i don;t know now that seems messy. why not just let the sheet hold the value?
// Beacuse I want to be able to say 'player@dex'. Ok so then maybe the paradigm is inverted and breakouts are used for
// archived sheets? Maybe. Yeah, the system should favor using GVM but should be able to use breakouts for exceptions,
// pulling an old character sheet seems like a good usecase. 'Saved Sheet' type thing. Snapshot.

// Right, then you should be able to take the snapshot and use it to revert the GVM. On the snap sheet there should be
// a visual indication that the value is out of sync with the GVM. If its the whole sheet, use a border, if its a whole
// section, than just the section. Just a value, then just the value.
class SnapSheet {
    overrideValues: object

    constructor(overrideValues: object) {
        this.overrideValues = overrideValues
    }

}

export { GVMSheet }