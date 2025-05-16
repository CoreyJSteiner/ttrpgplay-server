import crypto from 'crypto'
import type { UUID } from "crypto"

export const createUUID = (): UUID => {
    return crypto.randomUUID()
}

export const isUUID = (value: string): value is UUID => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(value);
}