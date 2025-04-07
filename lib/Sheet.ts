import { GameValue } from "./GameValues.ts"

type SheetValue = {
    name: string,
    gameValue: GameValue
}

type SheetValueMap = Record<string, SheetValue>

export class Sheet {
    sheetValues: SheetValueMap
    constructor() {
        this.sheetValues = {}
    }

    getVal(calcName: string): SheetValue {
        return this.sheetValues[calcName]
    }

    getSheetOutput(): object {
        const output = {}

        Object.keys(this.sheetValues).forEach(key => {
            const { name, gameValue } = this.sheetValues[key]
            output[name] = gameValue.invoke()
        });

        return output
    }

    configTest() {
        this.sheetValues["HP"] = { gameValue: new GameValue(666), name: "HP" }
        this.sheetValues["AC"] = { gameValue: new GameValue(20), name: "AC" }
        this.sheetValues["STR"] = { gameValue: new GameValue(10), name: "STR" }
        this.sheetValues["DEX"] = { gameValue: new GameValue(11), name: "DEX" }
        this.sheetValues["CON"] = { gameValue: new GameValue(12), name: "CON" }
        this.sheetValues["INT"] = { gameValue: new GameValue(13), name: "WIS" }
        this.sheetValues["WIS"] = { gameValue: new GameValue(14), name: "INT" }
        this.sheetValues["CHA"] = { gameValue: new GameValue(15), name: "CHA" }
    }
}

export default { Sheet }