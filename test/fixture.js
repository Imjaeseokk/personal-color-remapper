for (const color of ['#FF0000','#F50000','#EA1010','#D92727','#C83A3A','#28A745','#21A040','#398C46','#488A52','#608568','#0000FF','#1020EB','#203ACD','#334BB9','#4660AD']) {
  const el = document.createElement('div'); el.className = 'swatch'; el.style.backgroundColor = color; el.textContent = color; document.getElementById('swatches').append(el);
}
document.getElementById('add').onclick = () => { const fragment = document.createDocumentFragment(); for (let i=0;i<50;i++) { const el = document.createElement('span'); el.style.color = i % 2 ? 'red' : '#28a745'; el.textContent = `Dynamic ${i}`; fragment.append(el); } document.getElementById('dynamic').append(fragment); };
document.getElementById('theme').onclick = () => { const el = document.getElementById('named'); el.style.color = el.style.color === 'red' ? 'green' : 'red'; };
document.getElementById('remove').onclick = () => document.getElementById('dynamic').replaceChildren();
document.getElementById('spa').onclick = () => history.pushState({}, '', '?route=' + Date.now());
