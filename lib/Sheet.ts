import { GameValue } from "./GameValues.ts"

type SheetValue = {
    name: string,
    gameValue: GameValue
}

type SheetValueMap = Record<string, SheetValue>

class Sheet {
    sheetValues: SheetValueMap

    constructor(sheetValues: SheetValueMap = {}) {
        this.sheetValues = sheetValues
    }

    getVal(calcName: string): SheetValue {
        return this.sheetValues[calcName]
    }

    getSheetOutput(): object {
        const output = {}

        Object.keys(this.sheetValues).forEach(key => {
            const { name, gameValue } = this.sheetValues[key]
            output[name] = gameValue.displaySimple
        });

        return output
    }

    configTest() {
        this.sheetValues["HP"] = { gameValue: new GameValue(666, "HP"), name: "HP" }
        this.sheetValues["AC"] = { gameValue: new GameValue(20, "AC"), name: "AC" }
        this.sheetValues["STR"] = { gameValue: new GameValue(10, "STR"), name: "STR" }
        this.sheetValues["DEX"] = { gameValue: new GameValue(11, "DEX"), name: "DEX" }
        this.sheetValues["CON"] = { gameValue: new GameValue(12, "CON"), name: "CON" }
        this.sheetValues["INT"] = { gameValue: new GameValue(13, "INT"), name: "WIS" }
        this.sheetValues["WIS"] = { gameValue: new GameValue(14, "WIS"), name: "INT" }
        this.sheetValues["CHA"] = { gameValue: new GameValue(15, "CHA"), name: "CHA" }
    }
}

export { Sheet }