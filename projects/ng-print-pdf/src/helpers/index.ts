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
  el.setAttribute('style', 'visibility: hidden; position: absolute; left: -2000px;');
}

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.addEventListener('error', reject);
    reader.addEventListener('loadend', event => resolve(event.target['result']));

    reader.readAsArrayBuffer(blob);
  });
}
