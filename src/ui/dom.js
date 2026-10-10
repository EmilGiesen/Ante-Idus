// Mini-Helfer zum Erzeugen von DOM-Elementen
export function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}

export function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }

// Pixel-Canvas aus einem Quell-Canvas, hochskaliert dargestellt
export function pixelCanvas(src, scale, cls) {
  const c = el('canvas', { class: cls || 'px' });
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  c.style.width = `${src.width * scale}px`;
  c.style.height = `${src.height * scale}px`;
  return c;
}
