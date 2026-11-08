import { LIGHT_MODES, VIEW_ORDER, VIEWS, windLabel } from '../state.js';

export function createControls({
  state,
  onView,
  onLight,
  onPetal,
  onWind,
  onCutaway,
  onOrbit,
  onCar,
  onAbout
}) {
  const viewButtons = Array.from(document.querySelectorAll('[data-view]'));
  const navButtons = Array.from(document.querySelectorAll('.topnav [data-view]'));
  const railButtons = Array.from(document.querySelectorAll('.view-rail .rail-btn'));
  const lightButtons = Array.from(document.querySelectorAll('.light-btn'));
  const petalToggle = document.getElementById('petalToggle');
  const cutawayToggle = document.getElementById('cutawayToggle');
  const orbitToggle = document.getElementById('orbitToggle');
  const windSlider = document.getElementById('windSlider');
  const windValue = document.getElementById('windValue');
  const statusText = document.getElementById('statusText');
  const carAction = document.getElementById('carAction');
  const carActionLabel = document.getElementById('carActionLabel');
  const carActionSub = document.getElementById('carActionSub');

  for (const button of viewButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      onView(button.dataset.view);
    });
  }

  for (const button of document.querySelectorAll('[data-about]')) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      onAbout();
    });
  }

  for (const button of lightButtons) {
    button.addEventListener('click', () => onLight(button.dataset.light));
  }

  petalToggle.addEventListener('click', () => onPetal(!state.petals));
  cutawayToggle.addEventListener('click', () => onCutaway(!state.cutaway));
  orbitToggle.addEventListener('click', () => onOrbit(!state.autoOrbit));
  carAction.addEventListener('click', () => onCar());

  windSlider.addEventListener('input', () => {
    const value = Number(windSlider.value) / 100;
    onWind(value);
  });

  function setActiveView(view) {
    const railView = VIEW_ORDER.includes(view) ? view : '';
    for (const button of railButtons) {
      const active = button.dataset.view === railView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    }
    for (const button of navButtons) {
      const target = button.dataset.view;
      let active = target === view;
      if (target === 'living' && (view === 'bedroom' || view === 'tea')) active = true;
      if (target === 'courtyard' && view === 'aerial') active = false;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    }
  }

  function setLightUI(mode) {
    for (const button of lightButtons) {
      const active = button.dataset.light === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    const info = LIGHT_MODES[mode];
    if (info && statusText) {
      statusText.textContent = info.status;
      statusText.dataset.mode = mode;
    }
  }

  function setPetalsUI(enabled) {
    petalToggle.classList.toggle('is-on', enabled);
    petalToggle.setAttribute('aria-pressed', String(enabled));
  }

  function setCutawayUI(enabled) {
    cutawayToggle.classList.toggle('is-on', enabled);
    cutawayToggle.setAttribute('aria-pressed', String(enabled));
  }

  function setOrbitUI(enabled) {
    orbitToggle.classList.toggle('is-on', enabled);
    orbitToggle.setAttribute('aria-pressed', String(enabled));
  }

  function setWindUI(value) {
    const percent = Math.round(value * 100);
    windSlider.value = String(percent);
    windValue.textContent = windLabel(value);
    windSlider.style.setProperty('--wind', `${percent}%`);
  }

  function setCarUI({ label, sub, mode = 'parked', disabled = false }) {
    carActionLabel.textContent = label;
    carActionSub.textContent = sub;
    carAction.disabled = disabled;
    carAction.setAttribute('aria-label', label);
    carAction.setAttribute('aria-pressed', String(mode === 'outside'));
    carAction.classList.toggle('is-driving', mode === 'driving');
    carAction.classList.toggle('is-out', mode === 'outside');
  }

  function sync(nextState) {
    setActiveView(nextState.view);
    setLightUI(nextState.light);
    setPetalsUI(nextState.petals);
    setCutawayUI(nextState.cutaway);
    setOrbitUI(nextState.autoOrbit);
    setWindUI(nextState.wind);
    document.body.dataset.view = nextState.view;
    document.body.dataset.light = nextState.light;
  }

  sync(state);

  return {
    sync,
    setActiveView,
    setLightUI,
    setPetalsUI,
    setCutawayUI,
    setOrbitUI,
    setWindUI,
    setCarUI
  };
}
