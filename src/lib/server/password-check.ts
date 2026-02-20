/**
 * Password breach detection using HIBP Pwned Passwords API (k-anonymity).
 * Also checks against a built-in list of common passwords.
 *
 * Privacy: only the first 5 characters of the SHA-1 hash are sent to HIBP.
 * The full hash never leaves the server.
 */

import { createHash } from "crypto"

// Top 100 most common passwords (from various public breach analyses)
const COMMON_PASSWORDS = new Set([
  "123456", "password", "12345678", "qwerty", "123456789",
  "12345", "1234", "111111", "1234567", "dragon",
  "123123", "baseball", "abc123", "football", "monkey",
  "letmein", "shadow", "master", "666666", "qwertyuiop",
  "123321", "mustang", "1234567890", "michael", "654321",
  "superman", "1qaz2wsx", "7777777", "121212", "000000",
  "qazwsx", "123qwe", "killer", "trustno1", "jordan",
  "jennifer", "zxcvbnm", "asdfgh", "hunter", "buster",
  "soccer", "harley", "batman", "andrew", "tigger",
  "sunshine", "iloveyou", "2000", "charlie", "robert",
  "thomas", "hockey", "ranger", "daniel", "starwars",
  "klaster", "112233", "george", "computer", "michelle",
  "jessica", "pepper", "1111", "zxcvbn", "555555",
  "11111111", "131313", "freedom", "777777", "pass",
  "maggie", "159753", "aaaaaa", "ginger", "princess",
  "joshua", "cheese", "amanda", "summer", "love",
  "ashley", "nicole", "chelsea", "biteme", "matthew",
  "access", "yankees", "987654321", "dallas", "austin",
  "thunder", "taylor", "matrix", "welcome", "password1",
  "password123", "admin", "admin123", "root", "toor",
])

/**
 * Check if a password appears in the HIBP Pwned Passwords database.
 * Uses k-anonymity: only sends first 5 chars of SHA-1 hash.
 */
async function checkHibp(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "User-Agent": "Specra-PasswordCheck" },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return false // fail open — don't block login if HIBP is down

    const text = await res.text()
    // Each line is: HASH_SUFFIX:COUNT
    return text.split("\n").some((line) => {
      const [hashSuffix] = line.split(":")
      return hashSuffix.trim() === suffix
    })
  } catch {
    return false // fail open
  }
}

/**
 * Check if a password is common (local list) or breached (HIBP).
 * Returns true if the password is compromised.
 */
export async function isPasswordCompromised(password: string): Promise<boolean> {
  // Check common passwords first (instant, no network)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return true
  }

  // Check HIBP
  return checkHibp(password)
}
