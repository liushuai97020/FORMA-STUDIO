export function createPanels({ onNavigate }) {
  const roomPanel = document.getElementById('roomPanel');
  const panelClose = document.getElementById('panelClose');
  const panelIndex = document.getElementById('panelIndex');
  const panelTitle = document.getElementById('panelTitle');
  const panelEn = document.getElementById('panelEn');
  const panelDesc = document.getElementById('panelDesc');
  const panelSpecs = document.getElementById('panelSpecs');
  const panelMaterials = document.getElementById('panelMaterials');
  const panelNote = document.getElementById('panelNote');
  const panelGo = document.getElementById('panelGo');
  const aboutDialog = document.getElementById('aboutDialog');
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const toast = document.getElementById('toast');
  const fallback = document.getElementById('fallback');
  let activeRoom = null;
  let toastTimer = 0;

  function openRoom(room) {
    if (!room) return;
    activeRoom = room;
    panelIndex.textContent = room.index;
    panelTitle.textContent = room.title;
    panelEn.textContent = room.en;
    panelDesc.textContent = room.desc;
    panelNote.textContent = room.note;
    panelSpecs.replaceChildren(
      ...room.specs.map(([value, label]) => {
        const wrap = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = value;
        const dd = document.createElement('dd');
        dd.textContent = label;
        wrap.append(dt, dd);
        return wrap;
      })
    );
    panelMaterials.replaceChildren(
      ...room.materials.map(([name, color]) => {
        const chip = document.createElement('span');
        chip.className = 'material-chip';
        chip.style.setProperty('--swatch', color);
        const dot = document.createElement('i');
        const label = document.createElement('span');
        label.textContent = name;
        chip.append(dot, label);
        return chip;
      })
    );
    roomPanel.classList.add('is-open');
    roomPanel.setAttribute('aria-hidden', 'false');
  }

  function closeRoom() {
    activeRoom = null;
    roomPanel.classList.remove('is-open');
    roomPanel.setAttribute('aria-hidden', 'true');
  }

  panelClose.addEventListener('click', closeRoom);
  panelGo.addEventListener('click', () => {
    if (!activeRoom) return;
    onNavigate(activeRoom.view);
    closeRoom();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeRoom) closeRoom();
  });

  function openAbout() {
    if (!aboutDialog.open) aboutDialog.showModal();
  }

  aboutDialog.addEventListener('click', (event) => {
    if (event.target === aboutDialog) {
      aboutDialog.close();
    }
  });

  function setProgress(value) {
    loaderBar.style.width = `${Math.min(100, Math.max(0, value))}%`;
  }

  function finishLoader() {
    setProgress(100);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 420;
    window.setTimeout(() => {
      document.body.classList.add('is-ready');
      loader.classList.add('is-done');
      loader.setAttribute('aria-hidden', 'true');
    }, delay);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  function showFallback() {
    loader.classList.add('is-done');
    fallback.hidden = false;
    document.body.classList.add('is-ready');
  }

  return {
    openRoom,
    closeRoom,
    openAbout,
    setProgress,
    finishLoader,
    showToast,
    showFallback,
    getActiveRoom: () => activeRoom
  };
}
