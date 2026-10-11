/* Geometria della navbar (SVG viewBox 520x150) */
export const NAV_Y = 80, ITEM_W = 80, UL_X = 20;
export const EGG_W = 60, EGG_TOP_R = 46, EGG_BOT_R = 35;
export const GAP = 4, FILLET_R = 13;
export const EGG_TOP = NAV_Y - EGG_TOP_R, EGG_BOT = NAV_Y + EGG_BOT_R;
export const HOLE_W = EGG_W + GAP * 2, HOLE_TOP_R = EGG_TOP_R + GAP, HOLE_BOT_R = EGG_BOT_R + GAP;
export const HOLE_TOP = EGG_TOP - GAP, HOLE_BOT = EGG_BOT + GAP, HOLE_HW = HOLE_W / 2.10;

export function eggPath(cx, w, topR, botR, top, bottom) {
  const rx = w / 2, midY = top + topR;
  return [
    `M ${cx},${top}`,
    `A ${rx},${topR} 0 0 1 ${cx + rx},${midY}`,
    `A ${rx},${botR} 0 0 1 ${cx},${bottom}`,
    `A ${rx},${botR} 0 0 1 ${cx - rx},${midY}`,
    `A ${rx},${topR} 0 0 1 ${cx},${top}`,
    'Z',
  ].join(' ');
}
export function filletRight(cx) {
  return `M ${cx + HOLE_HW} ${NAV_Y} L ${cx + HOLE_HW + FILLET_R} ${NAV_Y} Q ${cx + HOLE_HW} ${NAV_Y} ${cx + HOLE_HW} ${NAV_Y + FILLET_R} Z`;
}
export function filletLeft(cx) {
  return `M ${cx - HOLE_HW} ${NAV_Y} L ${cx - HOLE_HW - FILLET_R} ${NAV_Y} Q ${cx - HOLE_HW} ${NAV_Y} ${cx - HOLE_HW} ${NAV_Y + FILLET_R} Z`;
}
