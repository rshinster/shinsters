// Email buttons copy the address; mailto: is the fallback.
document.querySelectorAll('a[data-copy-email]').forEach((link) => {
  const address = link.href.replace(/^mailto:/, '');
  const label = link.textContent;
  let resetTimer;

  link.addEventListener('click', async (event) => {
    if (!navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(address);
      link.textContent = 'Copied: ' + address;
    } catch {
      window.location.href = link.href;
      return;
    }
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { link.textContent = label; }, 2500);
  });
});

// Override per list with data-seconds-per-item.
const SECONDS_PER_ITEM = 8;

function buildMarquee(marquee) {
  const list = marquee.querySelector('ul');
  const originals = [...list.children].filter((li) => !li.hasAttribute('aria-hidden'));

  list.replaceChildren(...originals);
  marquee.classList.add('is-moving');

  // Repeat the items until they overflow, then duplicate so -50% loops seamlessly.
  let copies = 0;
  while (list.scrollWidth < marquee.clientWidth && copies < 20) {
    originals.forEach((li) => list.append(decorativeCopy(li)));
    copies++;
  }

  [...list.children].forEach((li) => list.append(decorativeCopy(li)));

  const perItem = Number(marquee.dataset.secondsPerItem) || SECONDS_PER_ITEM;
  const itemsPerHalf = list.children.length / 2;
  marquee.style.setProperty('--marquee-duration', `${itemsPerHalf * perItem}s`);
}

// Fade an edge only while there is more content on that side.
const SCROLLER_FADE = '24px';

function updateScrollerFades(scroller) {
  const moreAbove = scroller.scrollTop > 1;
  const moreBelow = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
  scroller.style.setProperty('--fade-top', moreAbove ? SCROLLER_FADE : '0px');
  scroller.style.setProperty('--fade-bottom', moreBelow ? SCROLLER_FADE : '0px');
}

document.querySelectorAll('[data-scroller]').forEach((scroller) => {
  updateScrollerFades(scroller);
  scroller.addEventListener('scroll', () => updateScrollerFades(scroller), { passive: true });
  window.addEventListener('resize', () => updateScrollerFades(scroller));
});

// Hide copies from screen readers and keyboard focus.
function decorativeCopy(li) {
  const copy = li.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
  return copy;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!reducedMotion.matches) {
  const marquees = document.querySelectorAll('[data-marquee]');
  marquees.forEach(buildMarquee);

  // Ignore height-only resizes (mobile address bar).
  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => marquees.forEach(buildMarquee), 200);
  });
}
