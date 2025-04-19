import { UUID } from "crypto"
import { GameValue, Scalar, Calc, Die } from "./GameValues.ts"

type Options = Array<string>    //Should this be a GameValue?

type SlotTypes = 'GameValue' | 'Calc' | 'Scalar' | 'Die' | 'Text' | 'Option'
type SlotControl = 'Admin' | 'Owner' | 'All'
type Slot = {
    type: SlotTypes,
    control: SlotControl,
    required: boolean,
    value?: GameValue | Scalar | Calc | Die | string | Options | null | undefined
    // invokeCondition?: string
}

type Grouping = Set<UUID>
type Groupings = Record<string, Grouping>

type SheetOptions = {
    slots: Record<string, Slot>
    groupings: Groupings
    // operations: object
    // triggers: object
}

class GVMSheet {
    slots: Record<string, Slot>     // Paramitarized value
    groupings: Groupings
    // operations: object
    // triggers: object

    constructor(sheetOptions: SheetOptions) {
        this.slots = sheetOptions.slots || {}
        this.groupings = sheetOptions.groupings || {}
        // this.operations = sheetOptions.operations || {}
        // this.triggers = sheetOptions.triggers || {}
    }

}

// This sort of sheet is for creating values that override the GVM values. If a value is not present it will default to 
// the GVM sheet which will pull values based on id (name?). The question that arrises is should you then be able to 
// swap the breakout and GVM sheet? And why bother? Should the GVM sheet just have the breajkout values natively? I 
// think for the sake of organization, I'd like to separate them, but realistically all sheets will be breakout sheets.
// This will help segemnt the logic a bit and keep it clean. GVM should be able to target value Params like owner and
// name so that I can say 'corey@dex'. But i don;t know now that seems messy. why not just let the sheet hold the value?
// Beacuse I want to be able to say 'player@dex'. Ok so then maybe the paradigm is inverted and breakouts are used for
// archived sheets? Maybe. Yeah, the system should favor using GVM but should be abnle to use breakouts for exceptions,
// pulling an old character sheet seems like a good usecase. 'Saved Sheet' type thing. Snapshot.
class SnapSheet {
    overrideValues: object

    constructor(overrideValues: object) {
        this.overrideValues = overrideValues
    }

}

export { GVMSheet }