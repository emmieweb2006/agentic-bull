/* Agentic Bull art generator in JS. Mirrors AgenticBull.sol _svg() byte for byte (tested in test/AgenticBull.test.js). */
var BULL_ART = (function () {
  var A = /*ART_JSON*/null/*END_ART_JSON*/;
  var NAMES = {
    TIER: ["Common", "Uncommon", "Rare", "Epic", "Legendary"],
    BG: ["Midnight", "Bull Green", "Candle Red", "Gold Rush", "Deep Sea", "Purple Haze", "Charcoal", "Teal"],
    FUR: ["Black", "Brown", "Chestnut", "Tan", "White", "Grey", "Red", "Cyber Blue"],
    HORNS: ["Short", "Long", "Curved", "Broken", "Golden", "Neon"],
    EYES: ["Normal", "Laser", "Sleepy", "Sunglasses", "Visor", "Glowing"],
    ACC: ["None", "Cap", "Headphones", "Chain", "Cigar", "Crown"]
  };
  function hx(h) { var b = []; for (var i = 0; i < h.length; i += 2) b.push(parseInt(h.substr(i, 2), 16)); return b; }
  function rects(data, item, pal) {
    var d = hx(data), p = 0, out = "";
    for (; item > 0; item--) { var g = d[p++]; for (; g > 0; g--) p += 3 + 4 * d[p + 2]; }
    for (var g2 = d[p++]; g2 > 0; g2--) {
      var c = d[p], f = d[p + 1], n = d[p + 2];
      out += '<g fill="#' + pal[c] + (f & 2 ? '" opacity=".45">' : '">');
      p += 3;
      for (; n > 0; n--) {
        var x = d[p], y = d[p + 1], w = d[p + 2], h = d[p + 3]; p += 4;
        var tail = '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
        out += '<rect x="' + x + tail;
        if (!(f & 1)) out += '<rect x="' + (24 - x - w) + tail;
      }
      out += "</g>";
    }
    return out;
  }
  function traits(s, t) {
    s = BigInt(s);
    var by = function (k, m) { return Number((s >> BigInt(k)) % BigInt(m)); };
    return {
      tier: t, bg: by(0, 8), fur: by(8, 8),
      horns: t === 4 ? 4 : by(16, 6), eyes: by(24, 6),
      ring: by(32, 3) === 0, acc: t === 4 ? 5 : by(40, 6)
    };
  }
  function svg(s, t) { return svgFromTraits(traits(s, t)); }
  function svgFromTraits(tr) {
    var t = tr.tier;
    var pal = [A.FUR[tr.fur], A.MUZ[tr.fur], tr.horns === 4 ? "ffd700" : tr.horns === 5 ? "39ff14" : "efe6cf"].concat(A.FIX);
    var head = rects(A.HEAD, 0, pal) + rects(A.MUZZLE, 0, pal);
    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="480" height="480" shape-rendering="crispEdges"><rect width="24" height="24" fill="#' + A.BG[tr.bg] + '"/>';
    if (t > 0) out += '<defs><pattern id="p" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="2" fill="#16c784" opacity=".35"/><rect x="2" y="2" width="1" height="1" fill="#ffd700" opacity=".25"/></pattern></defs><rect width="24" height="24" fill="url(#p)"/>';
    out += rects(A.HORNS, tr.horns === 4 ? 1 : tr.horns === 5 ? 2 : tr.horns, pal);
    if (t > 1) {
      out += (t === 2 ? '<g stroke="#39ff14" stroke-width="1">'
        : t === 3 ? '<g stroke="#ff2bd6" stroke-width="1"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/>'
        : '<g stroke="#ffd700" stroke-width="1"><animate attributeName="stroke-width" values=".6;1.8;.6" dur="2s" repeatCount="indefinite"/>') + head + "</g>";
    }
    out += head + rects(A.FACE, 0, pal) + rects(A.EYES, tr.eyes, pal);
    if (tr.ring) out += rects(A.RING, 0, pal);
    if (tr.acc > 0) out += rects(A.ACC, tr.acc - 1, pal);
    return out + "</svg>";
  }
  function attributes(s, t) {
    var tr = traits(s, t);
    return [["Tier", NAMES.TIER[t]], ["Background", NAMES.BG[tr.bg]], ["Fur", NAMES.FUR[tr.fur]], ["Horns", NAMES.HORNS[tr.horns]],
      ["Eyes", NAMES.EYES[tr.eyes]], ["Nose Ring", tr.ring ? "Yes" : "No"], ["Accessory", NAMES.ACC[tr.acc]]];
  }
  return { svg: svg, svgFromTraits: svgFromTraits, traits: traits, attributes: attributes, NAMES: NAMES };
})();
if (typeof module !== "undefined") module.exports = BULL_ART;
