import crypto from "crypto";

// Excludes ambiguous characters (0/O, 1/I) so codes are easy to read aloud/type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateSessionCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = crypto.randomInt(0, ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}
