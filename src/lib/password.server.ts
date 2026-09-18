import { hash, verify } from '@node-rs/argon2'

import type { Options } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} satisfies Options

export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$Px9ApSsHXRvFRvoh9YDVqw$qW6CeMwoWMy7fmgOCX7+FIDJ1j7uTRNcSpVLEU+nDrA'

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS)
}

export function verifyPasswordHash(passwordHash: string, password: string) {
  return verify(passwordHash, password, ARGON2_OPTIONS)
}
