import prisma from "../lib/prisma.js";

/**
 * Generates a unique member ID from the member's full name.
 *
 * Format: first 2 letters of last name + first 2 letters of first name + 2 random digits
 * Example: "Joshua Mwalimu" → "MWJO12"
 *
 * Retries up to `maxAttempts` times to avoid collisions.
 */
export async function generateMemberId(fullName: string, maxAttempts = 10): Promise<string> {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length < 2) {
    throw new Error("Full name must contain at least a first and last name");
  }

  const firstName = parts[0].toUpperCase();
  const lastName = parts[parts.length - 1].toUpperCase();

  const prefix =
    lastName.slice(0, 2).padEnd(2, "X") +
    firstName.slice(0, 2).padEnd(2, "X");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const digits = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    const memberId = `${prefix}${digits}`;

    const existing = await prisma.member.findUnique({
      where: { memberId },
      select: { id: true },
    });

    if (!existing) {
      return memberId;
    }
  }

  // Fallback: extend to 3 digits if all 2-digit combos collide
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const fallbackId = `${prefix}${digits}`;

  const existing = await prisma.member.findUnique({
    where: { memberId: fallbackId },
    select: { id: true },
  });

  if (existing) {
    throw new Error("Unable to generate a unique member ID. Please try again.");
  }

  return fallbackId;
}
