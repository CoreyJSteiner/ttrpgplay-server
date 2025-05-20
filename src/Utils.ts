export const tileToCoord = (tileX: number, tileY: number): Array<number> => {

    const TILE_WIDTH = 12
    const TILE_HEIGHT = 6
    const ORIGIN_X = 85
    const ORIGIN_Y = 72

    const screenX = ORIGIN_X + (tileX - 1) * TILE_WIDTH - (tileY - 1) * TILE_WIDTH
    const screenY = ORIGIN_Y - (tileX - 1) * TILE_HEIGHT - (tileY - 1) * TILE_HEIGHT

    return [screenX, screenY]
};