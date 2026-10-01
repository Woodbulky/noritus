/** Wi-Fi join string (the de-facto ZXing format), with \ ; , : " escaped. */
export function wifiPayload(ssid: string, password: string) {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  return password ? `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;` : `WIFI:T:nopass;S:${esc(ssid)};;`
}

/** One SVG path with a 1×1 square per dark module. */
export const svgPath = (data: boolean[][]) =>
  data.map((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('')
