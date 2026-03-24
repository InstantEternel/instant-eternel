//================== Carrousel accueil (final stable + preload) ==================
const imgs = [
  'Images/image accueil (1).jpg',
  'Images/image accueil (2).jpg',
  'Images/image accueil (3).jpg',
  'Images/image accueil (4).jpg',
  'Images/image accueil (5).jpg',
  'Images/image accueil (6).jpg'
];

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const track   = document.querySelector('.triptych .track');

if (prevBtn && nextBtn && track) {
  let index = 0;     // image au CENTRE
  let locked = false;

  const DURATION = 550;
  const EASING = 'cubic-bezier(.22,1,.36,1)';
  const mod = (n, m) => ((n % m) + m) % m;

  // Désactive boutons pendant le chargement
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  prevBtn.style.pointerEvents = 'none';
  nextBtn.style.pointerEvents = 'none';

  function preloadAll(list) {
    return Promise.all(
      list.map((src) => new Promise((res) => {
        const im = new Image();
        im.src = src;
        // decode() limite souvent les micro-freezes au moment d'afficher
        if (im.decode) {
          im.decode().then(res).catch(res);
        } else {
          im.onload = res;
          im.onerror = res;
        }
      }))
    );
  }

  function build() {
    track.innerHTML = '';

    const ids = [
      mod(index - 2, imgs.length),
      mod(index - 1, imgs.length),
      mod(index,     imgs.length), // centre (pos 2)
      mod(index + 1, imgs.length),
      mod(index + 2, imgs.length),
    ];

    ids.forEach((imgIdx, pos) => {
      const slide = document.createElement('div');
      slide.className = 'slide' + (pos === 2 ? ' is-center' : '');
      slide.dataset.pos = String(pos);

      const img = document.createElement('img');
      img.src = imgs[imgIdx];
      img.alt = 'Photo carrousel';
      img.decoding = 'async';
      img.width = 1200;
      img.height = 800; 
      img.fetchPriority = 'high';

      // Perf (sans changer le rendu)
      img.loading = 'eager';

      slide.appendChild(img);
      track.appendChild(slide);
    });
  }

  function getStep() {
    const slide = track.querySelector('.slide');
    if (!slide) return 0;

    const w = slide.getBoundingClientRect().width;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '0');

    return w + gap;
  }

  function resetToCenter() {
    const step = getStep();
    track.style.transition = 'none';
    track.style.transform = `translateX(${-2 * step}px)`;
    void track.offsetWidth;
  }

  function move(dir) {
    if (locked) return;
    locked = true;

    const s1 = track.querySelector('.slide[data-pos="1"]');
    const s2 = track.querySelector('.slide[data-pos="2"]');
    const s3 = track.querySelector('.slide[data-pos="3"]');

    if (dir === 1) { s2?.classList.remove('is-center'); s3?.classList.add('is-center'); }
    else          { s2?.classList.remove('is-center'); s1?.classList.add('is-center'); }

    const step = getStep();

    track.style.transition = `transform ${DURATION}ms ${EASING}`;
    track.style.transform  = `translateX(${-(2 + dir) * step}px)`;

    window.setTimeout(() => {
      index = mod(index + dir, imgs.length);
      build();
      resetToCenter();
      locked = false;
    }, DURATION);
  }

  // ✅ Initialise seulement après preload -> plus de “flash écrabouillé” + moins de lag
  preloadAll(imgs).then(() => {
    build();
    requestAnimationFrame(resetToCenter);

    // Réactive boutons
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    prevBtn.style.pointerEvents = '';
    nextBtn.style.pointerEvents = '';

    // Resize = debounced (évite de recalculer 60x/sec)
    let _resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => requestAnimationFrame(resetToCenter), 120);
    }, { passive: true });

    prevBtn.addEventListener('click', () => move(-1), { passive: true });
    nextBtn.addEventListener('click', () => move(1), { passive: true });
  });
}

// ===== Apparition progressive portfolio (IntersectionObserver) =====
document.addEventListener('DOMContentLoaded', () => {
  const galleryImgs = document.querySelectorAll('.gallery img');
  if (!galleryImgs.length) return;
  // Perf: charge en priorité les premières images visibles, le reste en lazy
galleryImgs.forEach((img, i) => {
  // Décodage non-bloquant (réduit les micro-freezes)
  img.decoding = 'async';

  // Les premières images "au-dessus de la ligne de flottaison" chargent tout de suite
  if (i < 6) {
    img.loading = 'eager';
    // Certains navigateurs le prennent en compte
    try { img.fetchPriority = 'high'; } catch(e) {}
  } else {
    img.loading = 'lazy';
    try { img.fetchPriority = 'low'; } catch(e) {}
  }
});

  if (!('IntersectionObserver' in window)) {
    galleryImgs.forEach(img => img.classList.add('is-visible'));
    return;
  }

  // ✅ Affiche tout de suite les premières images pour éviter le "trou blanc"
  galleryImgs.forEach((img, i) => {
    if (i < 6) {
      img.classList.add('is-visible');
      img.style.transitionDelay = '0ms';
    } else {
      img.style.transitionDelay = `${Math.min((i - 6) * 60, 420)}ms`;
    }
  });

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.classList.add('is-visible');
      observer.unobserve(img);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  // ✅ Observe seulement celles qui ne sont pas déjà visibles
  galleryImgs.forEach(img => {
    if (!img.classList.contains('is-visible')) obs.observe(img);
  });
});

// ================== Slider des tarifs ==================
const tarifSlides = document.querySelectorAll('.tarif-slide');
const tarifPrev = document.querySelector('.tarif-arrow.left');
const tarifNext = document.querySelector('.tarif-arrow.right');

if (tarifSlides.length && tarifPrev && tarifNext) {
  let currentTarif = 0;

  function showTarif(index) {
    tarifSlides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
  }

  tarifPrev.addEventListener('click', () => {
    currentTarif = (currentTarif - 1 + tarifSlides.length) % tarifSlides.length;
    showTarif(currentTarif);
  });

  tarifNext.addEventListener('click', () => {
    currentTarif = (currentTarif + 1) % tarifSlides.length;
    showTarif(currentTarif);
  });

  showTarif(currentTarif);
}

// ================== GOOGLE SHEETS (AVIS) ==================

document.addEventListener('DOMContentLoaded', () => {

  const container = document.querySelector('.avis-list');
  if (!container) return;

  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRXvHMAITU-h7zXphnhh06GPoOoOHUujUoub43KxbVV47cuRXfl4N99vm5ax1ULSbIVU_eoiajdDF99/pub?gid=1213944665&single=true&output=csv";

  fetch(url)
    .then(res => res.text())
    .then(data => {

      const rows = data.split("\n").filter(r => r.trim() !== "");

      // enlève header
      rows.shift();

      container.innerHTML = '';

      rows.forEach(row => {

        const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!cols || cols.length < 3) return;

        const prenom = clean(cols[0]);
        const type   = clean(cols[1]);
        const avis   = clean(cols[2]);

        if (!avis) return;

        const bubble = document.createElement('div');
        bubble.className = 'avis-bubble';

        bubble.innerHTML = `
          <p class="avis-bubble-head">${prenom} — ${type}</p>
          <p class="avis-bubble-text">${avis}</p>
        `;

        container.appendChild(bubble);
      });

    })
    .catch(() => {
      container.innerHTML = '<p class="avis-loading">Impossible de charger les avis.</p>';
    });

});

// nettoyage
function clean(str) {
  return str.replace(/^"|"$/g, "").trim();
}

let scrollTimeout;

window.addEventListener('scroll', () => {
  document.body.classList.add('show-scrollbar');

  clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    document.body.classList.remove('show-scrollbar');
  }, 1200); // disparaît après 1.2s
});


const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
  });
}