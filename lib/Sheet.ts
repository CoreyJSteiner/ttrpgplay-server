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

export { GVMSheet }