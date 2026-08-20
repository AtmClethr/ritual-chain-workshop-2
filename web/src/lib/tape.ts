let px = 4300;
let ts = Date.now();
export function tape() {
  return { price: px, symbol: "ETHUSD", ts, venue: "window" };
}
export function print(n: number) {
  if (!Number.isFinite(n) || n < 0) throw new Error("bad print");
  px = Math.round(n);
  ts = Date.now();
  return tape();
}
