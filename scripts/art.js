// Single source of truth for the Agentic Bull pixel art.
// gen-art.js writes these into contracts/AgenticBull.sol (hex constants) and the site preview generator.
// Group: [colourSlot, flags, rects]; flags 1 = no mirror, 2 = translucent. Rects [x,y,w,h] on the left half are mirrored (x' = 24 - x - w).
// Colour slots: 0 fur, 1 muzzle, 2 horn, 3 black, 4 white, 5 red, 6 cyan, 7 gold, 8 neon, 9 cigar, 10 ember, 11 smoke, 12 cap, 13 pink, 14 dark, 15 yellow
const L = {
  HEAD: [[[0, 0, [[4, 9, 3, 2], [7, 6, 5, 3], [6, 9, 6, 6], [7, 15, 5, 2], [10, 5, 2, 1]]]]],
  MUZZLE: [[[1, 0, [[7, 17, 5, 4], [8, 21, 4, 1], [5, 10, 1, 1]]]]],
  FACE: [[[3, 2, [[6, 9, 1, 6], [7, 10, 4, 1]]], [3, 0, [[9, 18, 1, 2]]]]],
  HORNS: [
    [[2, 0, [[5, 6, 2, 2], [4, 5, 2, 1]]]], // short
    [[2, 0, [[4, 6, 3, 2], [2, 5, 3, 2], [1, 3, 2, 2]]]], // long (also golden)
    [[2, 0, [[4, 6, 3, 2], [3, 4, 2, 2], [4, 2, 2, 2]]]], // curved (also neon)
    [[2, 1, [[4, 6, 3, 2], [2, 5, 3, 2], [1, 3, 2, 2], [17, 6, 2, 2]]]], // broken (right horn snapped)
  ],
  EYES: [
    [[4, 0, [[8, 11, 2, 2]]], [3, 0, [[9, 11, 1, 2]]]], // normal
    [[5, 0, [[8, 11, 2, 2]]], [5, 2, [[0, 11, 8, 1]]]], // laser
    [[3, 0, [[8, 12, 2, 1]]]], // sleepy
    [[3, 0, [[7, 11, 4, 2], [11, 11, 1, 1]]], [4, 0, [[8, 11, 1, 1]]]], // sunglasses
    [[14, 0, [[6, 11, 6, 2]]], [6, 0, [[7, 11, 5, 1]]]], // visor
    [[15, 2, [[7, 10, 4, 4]]], [15, 0, [[8, 11, 2, 2]]]], // glowing
  ],
  RING: [[[7, 0, [[10, 20, 1, 1], [11, 21, 1, 1]]]]],
  ACC: [
    [[12, 0, [[7, 3, 5, 3], [5, 5, 7, 1]]], [4, 0, [[11, 2, 1, 1]]]], // cap
    [[14, 0, [[7, 3, 5, 1], [6, 4, 1, 4]]], [13, 0, [[4, 8, 2, 4]]]], // headphones
    [[7, 0, [[7, 22, 5, 1], [11, 23, 1, 1]]]], // chain
    [[9, 1, [[15, 19, 5, 1]]], [10, 1, [[20, 19, 1, 1]]], [11, 3, [[21, 16, 1, 2], [22, 15, 1, 1]]]], // cigar
    [[7, 0, [[8, 4, 4, 2], [8, 2, 1, 2], [10, 2, 1, 2]]], [5, 0, [[11, 4, 1, 1]]]], // crown
  ],
};
const COLORS = {
  BG: ["0b0f1a", "0f3d2a", "3d0f14", "3a2e0a", "0a1f3d", "2a0f3d", "1c1c1c", "0a3333"],
  FUR: ["2b2b2b", "6b3f1f", "8b4513", "c8a165", "e8e8e8", "7d7d7d", "a83232", "3a6ea5"],
  MUZ: ["5a4a42", "c49a6c", "deb887", "f1dfc0", "f7c6c6", "c2b8b0", "e8a0a0", "a9d1f0"],
  FIX: ["111111", "ffffff", "ff2a2a", "00e5ff", "ffd700", "39ff14", "8b5a2b", "ff6a00", "9a9a9a", "16c784", "ff3b6b", "222222", "ffe14d"],
};
const NAMES = {
  TIER: ["Common", "Uncommon", "Rare", "Epic", "Legendary"],
  BG: ["Midnight", "Bull Green", "Candle Red", "Gold Rush", "Deep Sea", "Purple Haze", "Charcoal", "Teal"],
  FUR: ["Black", "Brown", "Chestnut", "Tan", "White", "Grey", "Red", "Cyber Blue"],
  HORNS: ["Short", "Long", "Curved", "Broken", "Golden", "Neon"],
  EYES: ["Normal", "Laser", "Sleepy", "Sunglasses", "Visor", "Glowing"],
  ACC: ["None", "Cap", "Headphones", "Chain", "Cigar", "Crown"],
};
// item -> bytes: [groupCount, (c, f, n, x,y,w,h * n) * groupCount]
function encode(items) {
  const out = [];
  for (const groups of items) {
    out.push(groups.length);
    for (const [c, f, rects] of groups) { out.push(c, f, rects.length); for (const r of rects) out.push(...r); }
  }
  return Buffer.from(out).toString("hex");
}
module.exports = { L, COLORS, NAMES, encode };
