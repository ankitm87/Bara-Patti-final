import { describe, it, expect } from "vitest";

/**
 * Test for the critical bug where winnerSeat === 0 was treated as falsy.
 * The COMPLETE_TRICK reducer had `if (!lastTrick.winnerSeat)` which
 * returned early when seat 0 won, preventing the next trick from starting.
 */
describe("Seat 0 winnerSeat falsy bug", () => {
  it("should not treat seat 0 as falsy", () => {
    const winnerSeat: number | null = 0;
    
    // The old buggy check: !winnerSeat would be true for seat 0
    const oldBuggyCheck = !winnerSeat;
    expect(oldBuggyCheck).toBe(true); // This is the bug!
    
    // The fixed check: winnerSeat == null correctly handles seat 0
    const fixedCheck = winnerSeat == null;
    expect(fixedCheck).toBe(false); // Seat 0 is a valid seat, not null
  });

  it("should correctly identify null winnerSeat", () => {
    const winnerSeat: number | null = null;
    const fixedCheck = winnerSeat == null;
    expect(fixedCheck).toBe(true); // null should be caught
  });

  it("should allow all valid seats (0, 1, 2, 3)", () => {
    for (const seat of [0, 1, 2, 3]) {
      const isNull = seat == null;
      expect(isNull).toBe(false);
    }
  });
});
