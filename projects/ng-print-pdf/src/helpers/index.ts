export const browser = {
  isIE: navigator.userAgent.indexOf('MSIE') !== -1 || !!document['documentMode'],
};

export function normalizeRotationProperty(rotate: number): number {
  if (rotate % 90 !== 0) {
    return 0;
  } else if (rotate >= 360) {
    return rotate % 360;
  } else if (rotate < 0) {
    return ((rotate % 360) + 360) % 360;
  }
}

export function hideEl(el: HTMLElement): void {
  el.setAttribute('style', 'visibility: hidden; position: absolute;');
}
