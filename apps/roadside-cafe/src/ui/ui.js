import { DRINKS, MENU_TABS, ORDER_STEPS, WEATHER, drinkById, drinksFor } from '../state.js';

export function createUI(callbacks = {}) {
  const weatherButtons = Array.from(document.querySelectorAll('.weather-btn'));
  const weatherReadout = document.getElementById('weatherReadout');
  const interiorWeather = document.getElementById('interiorWeather');
  const orderPanel = document.getElementById('orderPanel');
  const cabinetPanel = document.getElementById('cabinetPanel');
  const menuGrid = document.getElementById('menuGrid');
  const menuTabs = Array.from(document.querySelectorAll('.menu-tab'));
  const orderViews = Array.from(document.querySelectorAll('[data-order-view]'));
  const progressEl = document.getElementById('orderProgress');
  const progressBar = document.getElementById('orderBar');
  const prepDrink = document.getElementById('prepDrink');
  const prepDrinkEn = document.getElementById('prepDrinkEn');
  const prepNote = document.getElementById('prepNote');
  const prepSteps = Array.from(document.querySelectorAll('#prepSteps li'));
  const prepCup = document.querySelector('.prep-cup');
  const servedDrink = document.getElementById('servedDrink');
  const servedDrinkEn = document.getElementById('servedDrinkEn');
  const servedIngredients = document.getElementById('servedIngredients');
  const cabinetName = document.getElementById('cabinetName');
  const cabinetEn = document.getElementById('cabinetEn');
  const cabinetDesc = document.getElementById('cabinetDesc');
  const cabinetPrice = document.getElementById('cabinetPrice');
  const cabinetTag = document.getElementById('cabinetTag');
  const cabinetIngredients = document.getElementById('cabinetIngredients');
  const cabinetNumber = document.getElementById('cabinetNumber');
  const cabinetCount = document.getElementById('cabinetCount');
  const cabinetVisual = document.getElementById('cabinetVisual');
  const toast = document.getElementById('toast');
  const dockHint = document.getElementById('dockHint');
  const enterLabel = document.getElementById('btnEnterLabel');
  const btnEnter = document.getElementById('btnEnter');
  const btnEnterUse = btnEnter?.querySelector('use');
  const interiorHud = document.getElementById('interiorHud');
  const interiorNote = document.getElementById('interiorNote');
  const placeIntro = document.getElementById('placeIntro');
  const hotspotsEl = document.getElementById('hotspots');
  const transitionVeil = document.getElementById('transitionVeil');
  const siteHeader = document.getElementById('siteHeader');

  let modal = null;
  let previousFocus = null;
  let activeTab = 'coffee';
  let toastTimer = 0;
  const hotspotEls = new Map();

  /* Weather */
  weatherButtons.forEach((button) => {
    button.addEventListener('click', () => {
      callbacks.onWeatherChange?.(button.dataset.weather);
    });
  });

  function setWeatherUI(weather) {
    const info = WEATHER[weather] || WEATHER.sunny;
    document.body.dataset.weather = weather;
    weatherButtons.forEach((button) => {
      const active = button.dataset.weather === weather;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (weatherReadout) weatherReadout.textContent = info.readout;
    if (interiorWeather) interiorWeather.textContent = info.interior;
  }

  /* Dock */
  document.getElementById('btnOrder')?.addEventListener('click', () => callbacks.onOrderRequest?.());
  document.getElementById('btnCabinet')?.addEventListener('click', () => callbacks.onCabinetRequest?.());
  btnEnter?.addEventListener('click', () => callbacks.onViewToggle?.());

  function setViewUI(view) {
    const interior = view === 'interior' || view === 'cabinet';
    document.body.classList.toggle('view-interior', interior);
    document.body.dataset.view = view;
    if (interiorHud) interiorHud.setAttribute('aria-hidden', String(!interior));
    if (enterLabel) enterLabel.textContent = interior ? '返回街景' : '进入咖啡店';
    if (btnEnterUse) btnEnterUse.setAttribute('href', interior ? '#i-exit' : '#i-enter');
    if (btnEnter) {
      btnEnter.setAttribute('aria-label', interior ? '返回街景' : '进入咖啡店');
    }
    if (dockHint) {
      dockHint.innerHTML = interior
        ? '<span class="hint-dot" aria-hidden="true"></span>点击吧台上的电脑点单，或打开右侧陈列柜'
        : '<span class="hint-dot" aria-hidden="true"></span>点击门或按“进入咖啡店”，到吧台前点一杯';
    }
    if (interiorNote) {
      interiorNote.textContent = '点单电脑就在吧台上。陈列柜里有今天做的咖啡与果茶。';
    }
    if (placeIntro) {
      placeIntro.setAttribute('aria-hidden', String(interior));
    }
    setHotspotsVisible(!interior ? 'exterior' : 'interior');
  }

  /* Modals */
  function openModal(kind) {
    const panel = kind === 'order' ? orderPanel : cabinetPanel;
    if (!panel) return;
    if (modal && modal !== kind) {
      closeModal(modal, { silent: true });
    }
    previousFocus = document.activeElement;
    modal = kind;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusTarget = panel.querySelector('.modal-close, .menu-item, .cabinet-back');
    window.setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 80);
  }

  function closeModal(kind = modal, { silent = false } = {}) {
    if (!kind) return;
    const panel = kind === 'order' ? orderPanel : cabinetPanel;
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (modal === kind) modal = null;
    if (!modal) document.body.classList.remove('modal-open');
    if (!silent && previousFocus instanceof HTMLElement) {
      previousFocus.focus?.({ preventScroll: true });
    }
  }

  function isModalOpen(kind) {
    return kind ? modal === kind : Boolean(modal);
  }

  orderPanel?.querySelectorAll('[data-close="order"]').forEach((button) => {
    button.addEventListener('click', () => callbacks.onRequestCloseOrder?.());
  });
  cabinetPanel?.querySelectorAll('[data-close="cabinet"]').forEach((button) => {
    button.addEventListener('click', () => callbacks.onRequestCloseCabinet?.());
  });
  document.getElementById('btnOrderAgain')?.addEventListener('click', () => {
    callbacks.onOrderAgain?.();
  });
  document.getElementById('btnOrderDone')?.addEventListener('click', () => {
    callbacks.onRequestCloseOrder?.();
  });
  document.getElementById('cabinetBack')?.addEventListener('click', () => {
    callbacks.onRequestCloseCabinet?.();
  });
  document.getElementById('cabinetPrev')?.addEventListener('click', () => {
    callbacks.onCabinetStep?.(-1);
  });
  document.getElementById('cabinetNext')?.addEventListener('click', () => {
    callbacks.onCabinetStep?.(1);
  });

  [orderPanel, cabinetPanel].forEach((panel) => {
    panel?.addEventListener('click', (event) => {
      if (event.target !== panel) return;
      if (panel === orderPanel) callbacks.onRequestCloseOrder?.();
      else callbacks.onRequestCloseCabinet?.();
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal) {
      if (modal === 'order') callbacks.onRequestCloseOrder?.();
      else callbacks.onRequestCloseCabinet?.();
    }
  });

  /* Menu */
  menuTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.menuTab;
      renderMenu(activeTab);
    });
  });

  function renderMenu(tab = activeTab) {
    activeTab = tab;
    menuTabs.forEach((button) => {
      const active = button.dataset.menuTab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (!menuGrid) return;
    menuGrid.innerHTML = '';
    for (const drink of drinksFor(tab)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'menu-item';
      button.dataset.drinkId = drink.id;
      button.setAttribute('aria-label', `${drink.name}，${drink.price} 元`);
      const cup = document.createElement('span');
      cup.className = 'menu-cup';
      cup.style.setProperty('--cup-color', drink.cup);
      cup.style.setProperty('--cup-lid', drink.lid);
      cup.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'menu-copy';
      const name = document.createElement('strong');
      name.textContent = drink.name;
      const en = document.createElement('em');
      en.textContent = drink.en;
      const short = document.createElement('small');
      short.textContent = drink.short;
      copy.append(name, en, short);
      const price = document.createElement('span');
      price.className = 'menu-price';
      price.textContent = `¥${drink.price}`;
      button.append(cup, copy, price);
      button.addEventListener('click', () => callbacks.onChooseDrink?.(drink));
      menuGrid.appendChild(button);
    }
  }

  function setOrderView(view) {
    orderViews.forEach((element) => {
      element.hidden = element.dataset.orderView !== view;
    });
    if (view === 'prep' || view === 'menu') {
      const close = orderPanel?.querySelector('.modal-close');
      if (close) close.classList.toggle('is-disabled', view === 'prep');
    }
  }

  function showMenu() {
    setOrderView('menu');
    const title = document.getElementById('orderTitle');
    if (title) title.textContent = '今天想喝什么？';
    renderMenu(activeTab);
    openModal('order');
  }

  function showOrderPrep(drink) {
    setOrderView('prep');
    const title = document.getElementById('orderTitle');
    if (title) title.textContent = '正在为你做一杯';
    if (prepDrink) prepDrink.textContent = drink.name;
    if (prepDrinkEn) prepDrinkEn.textContent = drink.en;
    if (prepNote) prepNote.textContent = '咖啡师在吧台后开始准备。';
    const labels = ORDER_STEPS[drink.category] || ORDER_STEPS.coffee;
    prepSteps.forEach((step, index) => {
      step.textContent = labels[index] || '';
      step.classList.remove('is-done');
    });
    if (prepCup) {
      prepCup.classList.remove('is-full', 'is-steaming');
      const liquid = prepCup.querySelector('.prep-cup-liquid');
      if (liquid) {
        liquid.style.background = drink.liquid || '#b47743';
      }
    }
    updateOrderProgress(drink, 0, { silent: true });
    openModal('order');
  }

  function updateOrderProgress(drink, progress, { note } = {}) {
    const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (progressEl) progressEl.setAttribute('aria-valuenow', String(percent));
    const step = Math.min(3, Math.floor(progress * 4));
    if (prepSteps) {
      prepSteps.forEach((element, index) => {
        element.classList.toggle('is-done', index <= step && progress > 0.02);
      });
    }
    if (prepNote && note) prepNote.textContent = note;
    if (prepCup) {
      prepCup.classList.toggle('is-full', progress > 0.55);
      prepCup.classList.toggle('is-steaming', progress > 0.7);
    }
  }

  function showOrderServed(drink) {
    setOrderView('served');
    const title = document.getElementById('orderTitle');
    if (title) title.textContent = '咖啡好了';
    if (servedDrink) servedDrink.textContent = drink.name;
    if (servedDrinkEn) servedDrinkEn.textContent = drink.en;
    if (servedIngredients) {
      servedIngredients.innerHTML = '';
      for (const ingredient of drink.ingredients) {
        const li = document.createElement('li');
        li.textContent = ingredient;
        servedIngredients.appendChild(li);
      }
    }
    openModal('order');
  }

  function showOrderCancelled() {
    closeModal('order');
  }

  function requestOrderClose() {
    callbacks.onRequestCloseOrder?.();
  }

  function showOrderMenuAndOpen() {
    showMenu();
  }

  /* Cabinet */
  function openCabinetPanel(drink, index = 0) {
    if (!drink) drink = DRINKS[0];
    document.body.classList.add('view-interior');
    if (cabinetName) cabinetName.textContent = drink.name;
    if (cabinetEn) cabinetEn.textContent = drink.en;
    if (cabinetDesc) cabinetDesc.textContent = drink.description;
    if (cabinetPrice) cabinetPrice.textContent = `¥ ${drink.price}`;
    if (cabinetTag) cabinetTag.textContent = drink.tag;
    if (cabinetNumber) cabinetNumber.textContent = String(index + 1).padStart(2, '0');
    if (cabinetCount) cabinetCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(DRINKS.length).padStart(2, '0')}`;
    if (cabinetIngredients) {
      cabinetIngredients.innerHTML = '';
      for (const ingredient of drink.ingredients) {
        const li = document.createElement('li');
        li.textContent = ingredient;
        cabinetIngredients.appendChild(li);
      }
    }
    if (cabinetVisual) {
      cabinetVisual.style.setProperty('--liquid', drink.liquid || '#b57544');
      cabinetVisual.style.setProperty('--liquid-top', drink.liquidTop || '#d9ad7c');
      cabinetVisual.style.setProperty('--straw', drink.straw || '#b4683f');
    }
    if (orderPanel?.classList.contains('is-open')) closeModal('order', { silent: true });
    openModal('cabinet');
  }

  function closeCabinetPanel() {
    closeModal('cabinet');
  }

  /* Hotspots */
  function ensureHotspot(id, label, action) {
    let element = hotspotEls.get(id);
    if (element) return element;
    element = document.createElement('button');
    element.type = 'button';
    element.className = 'hotspot';
    element.dataset.hotspot = id;
    element.innerHTML = `<span class="hotspot__dot" aria-hidden="true"></span>${label}`;
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      callbacks.onHotspotAction?.(action || id);
    });
    hotspotsEl?.appendChild(element);
    hotspotEls.set(id, element);
    return element;
  }

  function setHotspotsVisible(mode) {
    if (!hotspotsEl) return;
    hotspotsEl.dataset.mode = mode;
    // hide all by default; updateHotspotPositions shows the current set
    for (const element of hotspotEls.values()) {
      element.classList.remove('is-visible');
    }
  }

  function updateHotspotPositions(positions) {
    for (const [id, data] of Object.entries(positions)) {
      const element = ensureHotspot(id, data.label, data.action);
      element.style.left = `${data.x}px`;
      element.style.top = `${data.y}px`;
      element.classList.toggle('is-visible', Boolean(data.visible));
    }
  }

  /* Toast & misc */
  function showToast(message, duration = 2600) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, duration);
  }

  function setVeil(amount) {
    if (transitionVeil) transitionVeil.style.opacity = String(Math.max(0, Math.min(0.72, amount)));
  }

  function setLoaderProgress(value) {
    const bar = document.getElementById('loaderBar');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
  }

  function hideLoader() {
    document.body.classList.add('is-ready');
  }

  function showFallback() {
    const fallback = document.getElementById('fallback');
    if (fallback) fallback.hidden = false;
    document.body.classList.add('is-ready');
  }

  document.getElementById('btnReload')?.addEventListener('click', () => window.location.reload());

  function isCover() {
    return document.documentElement.classList.contains('is-cover');
  }

  function syncLayout() {
    if (siteHeader) siteHeader.setAttribute('aria-hidden', String(document.documentElement.classList.contains('is-embed')));
  }

  renderMenu(activeTab);
  syncLayout();

  return {
    openModal,
    closeModal,
    isModalOpen,
    setWeatherUI,
    setViewUI,
    showMenu,
    showOrderMenuAndOpen,
    showOrderPrep,
    updateOrderProgress,
    showOrderServed,
    showOrderCancelled,
    requestOrderClose,
    openCabinetPanel,
    closeCabinetPanel,
    updateHotspotPositions,
    setHotspotsVisible,
    showToast,
    setVeil,
    setLoaderProgress,
    hideLoader,
    showFallback,
    isCover
  };
}

/* Helpers used by the scene/order glue */
export function orderStepLabel(drink, progress) {
  const steps = ORDER_STEPS[drink?.category] || ORDER_STEPS.coffee;
  const index = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  return steps[index];
}

export function orderNote(drink, progress) {
  if (!drink) return '';
  const notes = drink.prep;
  const index = Math.min(notes.length - 1, Math.floor(progress * notes.length));
  return notes[index];
}

export function cabinetIndex(id) {
  return DRINKS.findIndex((drink) => drink.id === id);
}

export function findDrink(id) {
  return drinkById(id);
}

/* A small, quiet transition veil used while the camera crosses the glass. */
function ensureVeil() {
  let veil = document.getElementById('transitionVeil');
  if (veil) return veil;
  veil = document.createElement('div');
  veil.id = 'transitionVeil';
  veil.className = 'transition-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.getElementById('app')?.appendChild(veil);
  return veil;
}

if (typeof document !== 'undefined') {
  ensureVeil();
}
