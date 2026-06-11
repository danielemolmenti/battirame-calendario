const spaces = [
  { id: "fuoco", name: "Sala Fuoco", meta: "80 mq · corpo libero", rowColor: "#f5c0ba" },
  { id: "aria", name: "Sala Aria", meta: "40 mq · yoga e pratiche dolci", rowColor: "#d5edf7" },
  { id: "lago", name: "Lago", meta: "attività outdoor e acqua", rowColor: "#bfe6df" },
  { id: "parco", name: "Parco", meta: "passeggiate, corsa, nordic walking", rowColor: "#d8c0a5" },
];

let state = { activities: [], technicians: [], slots: [] };
let isAuthenticated = false;
let weekStart = startOfWeek(new Date());

const els = {
  tabs: document.querySelectorAll(".tab"),
  calendarView: document.querySelector("#calendarView"),
  backofficeView: document.querySelector("#backofficeView"),
  weekLabel: document.querySelector("#weekLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevWeek: document.querySelector("#prevWeek"),
  nextWeek: document.querySelector("#nextWeek"),
  todayWeek: document.querySelector("#todayWeek"),
  spaceFilter: document.querySelector("#spaceFilter"),
  activityFilter: document.querySelector("#activityFilter"),
  technicianFilter: document.querySelector("#technicianFilter"),
  loginForm: document.querySelector("#loginForm"),
  adminPassword: document.querySelector("#adminPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  adminContent: document.querySelector("#adminContent"),
  backupButton: document.querySelector("#backupButton"),
  restoreBackupInput: document.querySelector("#restoreBackupInput"),
  logoutButton: document.querySelector("#logoutButton"),
  slotForm: document.querySelector("#slotForm"),
  slotId: document.querySelector("#slotId"),
  slotDate: document.querySelector("#slotDate"),
  slotSpace: document.querySelector("#slotSpace"),
  slotStart: document.querySelector("#slotStart"),
  slotEnd: document.querySelector("#slotEnd"),
  slotActivity: document.querySelector("#slotActivity"),
  slotTechnician: document.querySelector("#slotTechnician"),
  slotNotes: document.querySelector("#slotNotes"),
  slotRepeatUntil: document.querySelector("#slotRepeatUntil"),
  repeatDays: document.querySelectorAll('input[name="repeatDay"]'),
  clearSlot: document.querySelector("#clearSlot"),
  formMessage: document.querySelector("#formMessage"),
  activityForm: document.querySelector("#activityForm"),
  activityName: document.querySelector("#activityName"),
  activityColor: document.querySelector("#activityColor"),
  activityList: document.querySelector("#activityList"),
  technicianForm: document.querySelector("#technicianForm"),
  technicianName: document.querySelector("#technicianName"),
  technicianList: document.querySelector("#technicianList"),
  slotList: document.querySelector("#slotList"),
  slotCount: document.querySelector("#slotCount"),
  adminSpaceFilter: document.querySelector("#adminSpaceFilter"),
  adminActivityFilter: document.querySelector("#adminActivityFilter"),
  adminTechnicianFilter: document.querySelector("#adminTechnicianFilter"),
  slotCardTemplate: document.querySelector("#slotCardTemplate"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || "Operazione non riuscita.");
  }
  return data;
}

async function loadPublicData() {
  const data = await api("/api/public-data");
  state = normalizeState(data);
  renderAll();
}

async function checkSession() {
  const data = await api("/api/session");
  setAuthenticated(data.authenticated);
}

async function saveState() {
  if (!isAuthenticated) {
    els.formMessage.textContent = "Accedi al backoffice per salvare le modifiche.";
    return false;
  }
  const data = await api("/api/admin-data", {
    method: "PUT",
    body: JSON.stringify(state),
  });
  state = normalizeState(data);
  renderAll();
  return true;
}

function normalizeState(data) {
  return {
    activities: Array.isArray(data.activities) ? data.activities : [],
    technicians: Array.isArray(data.technicians) ? data.technicians : [],
    slots: Array.isArray(data.slots) ? data.slots : [],
  };
}

function setAuthenticated(value) {
  isAuthenticated = value;
  els.loginForm.hidden = value;
  els.adminContent.hidden = !value;
  if (value) {
    els.loginMessage.textContent = "";
    clearSlotForm();
    renderBackoffice();
  }
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat("it-IT", options).format(date);
}

function getById(list, id) {
  return list.find((item) => item.id === id);
}

function option(select, value, label) {
  const el = document.createElement("option");
  el.value = value;
  el.textContent = label;
  select.append(el);
}

function populateSelects() {
  const filters = [
    [els.spaceFilter, "Tutti gli spazi", spaces],
    [els.activityFilter, "Tutte le attività", state.activities],
    [els.technicianFilter, "Tutti i tecnici", state.technicians],
    [els.adminSpaceFilter, "Tutti gli spazi", spaces],
    [els.adminActivityFilter, "Tutte le attività", state.activities],
    [els.adminTechnicianFilter, "Tutti i tecnici", state.technicians],
  ];

  filters.forEach(([select, allLabel, items]) => {
    const previous = select.value;
    select.replaceChildren();
    option(select, "all", allLabel);
    items.forEach((item) => option(select, item.id, item.name));
    select.value = [...select.options].some((item) => item.value === previous) ? previous : "all";
  });

  fillPlainSelect(els.slotSpace, spaces);
  fillPlainSelect(els.slotActivity, state.activities);
  fillPlainSelect(els.slotTechnician, state.technicians);
}

function fillPlainSelect(select, items) {
  const previous = select.value;
  select.replaceChildren();
  items.forEach((item) => option(select, item.id, item.name));
  if ([...select.options].some((item) => item.value === previous)) {
    select.value = previous;
  }
}

function renderCalendar() {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const startLabel = formatDate(days[0], { day: "numeric", month: "long" });
  const endLabel = formatDate(days[6], { day: "numeric", month: "long", year: "numeric" });
  els.weekLabel.textContent = `${startLabel} - ${endLabel}`;

  els.calendarGrid.replaceChildren();
  const corner = document.createElement("div");
  corner.className = "corner";
  corner.textContent = "Spazi";
  els.calendarGrid.append(corner);

  days.forEach((day) => {
    const head = document.createElement("div");
    head.className = "day-head";
    head.innerHTML = `<strong>${formatDate(day, { weekday: "long" })}</strong><span>${formatDate(day, { day: "2-digit", month: "2-digit" })}</span>`;
    els.calendarGrid.append(head);
  });

  const visibleSpaces = spaces.filter((space) => els.spaceFilter.value === "all" || els.spaceFilter.value === space.id);
  visibleSpaces.forEach((space) => {
    const spaceHead = document.createElement("div");
    spaceHead.className = "space-head";
    spaceHead.style.background = space.rowColor;
    spaceHead.innerHTML = `<strong>${space.name}</strong><span>${space.meta}</span>`;
    els.calendarGrid.append(spaceHead);

    days.forEach((day) => {
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.style.background = space.rowColor;
      const date = toISODate(day);
      const slots = filteredSlots().filter((slot) => slot.spaceId === space.id && slot.date === date).sort(sortSlots);
      if (!slots.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Libero";
        cell.append(empty);
      } else {
        slots.forEach((slot) => cell.append(renderEvent(slot)));
      }
      els.calendarGrid.append(cell);
    });
  });
}

function filteredSlots() {
  return state.slots.filter((slot) => {
    const activityOk = els.activityFilter.value === "all" || slot.activityId === els.activityFilter.value;
    const techOk = els.technicianFilter.value === "all" || slot.technicianId === els.technicianFilter.value;
    return activityOk && techOk;
  });
}

function renderEvent(slot) {
  const activity = getById(state.activities, slot.activityId) || { name: "Attività", color: "#0f7c65" };
  const technician = getById(state.technicians, slot.technicianId) || { name: "Tecnico" };
  const event = document.createElement("article");
  event.className = "event";
  event.style.borderLeftColor = activity.color;
  event.innerHTML = `
    <time>${slot.start} - ${slot.end}</time>
    <strong>${activity.name}</strong>
    <span>${technician.name}</span>
    ${slot.notes ? `<small>${slot.notes}</small>` : ""}
  `;
  return event;
}

function renderBackoffice() {
  if (!isAuthenticated) return;
  renderActivities();
  renderTechnicians();
  renderSlotList();
}

function renderActivities() {
  els.activityList.replaceChildren();
  state.activities.forEach((activity) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `<span class="swatch" style="background:${activity.color}"></span>${activity.name}`;
    chip.append(removeButton(() => removeActivity(activity.id)));
    els.activityList.append(chip);
  });
}

function renderTechnicians() {
  els.technicianList.replaceChildren();
  state.technicians.forEach((technician) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = technician.name;
    chip.append(removeButton(() => removeTechnician(technician.id)));
    els.technicianList.append(chip);
  });
}

function removeButton(handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "x";
  button.title = "Rimuovi";
  button.addEventListener("click", handler);
  return button;
}

function renderSlotList() {
  const slots = state.slots
    .filter((slot) => {
      const spaceOk = els.adminSpaceFilter.value === "all" || slot.spaceId === els.adminSpaceFilter.value;
      const activityOk = els.adminActivityFilter.value === "all" || slot.activityId === els.adminActivityFilter.value;
      const technicianOk = els.adminTechnicianFilter.value === "all" || slot.technicianId === els.adminTechnicianFilter.value;
      return spaceOk && activityOk && technicianOk;
    })
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  els.slotCount.textContent = `${slots.length} di ${state.slots.length} orari`;
  els.slotList.replaceChildren();

  if (!slots.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nessun orario programmato.";
    els.slotList.append(empty);
    return;
  }

  slots.forEach((slot) => {
    const card = els.slotCardTemplate.content.firstElementChild.cloneNode(true);
    const activity = getById(state.activities, slot.activityId) || { name: "Attività", color: "#0f7c65" };
    const technician = getById(state.technicians, slot.technicianId) || { name: "Tecnico" };
    const space = getById(spaces, slot.spaceId) || { name: "Spazio" };
    card.querySelector(".slot-color").style.background = activity.color;
    card.querySelector("strong").textContent = `${slot.date} · ${slot.start}-${slot.end} · ${activity.name}`;
    card.querySelector("span").textContent = `${space.name} · ${technician.name}`;
    card.querySelector("small").textContent = slot.notes || "Nessuna nota";
    card.querySelector(".edit").addEventListener("click", () => editSlot(slot.id));
    card.querySelector(".delete").addEventListener("click", () => deleteSlot(slot.id));
    els.slotList.append(card);
  });
}

function sortSlots(a, b) {
  return a.start.localeCompare(b.start);
}

function editSlot(id) {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot) return;
  els.slotId.value = slot.id;
  els.slotDate.value = slot.date;
  els.slotSpace.value = slot.spaceId;
  els.slotStart.value = slot.start;
  els.slotEnd.value = slot.end;
  els.slotActivity.value = slot.activityId;
  els.slotTechnician.value = slot.technicianId;
  els.slotNotes.value = slot.notes || "";
  els.slotRepeatUntil.value = "";
  els.repeatDays.forEach((checkbox) => {
    checkbox.checked = false;
  });
  els.formMessage.textContent = "Orario caricato per la modifica.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteSlot(id) {
  state.slots = state.slots.filter((slot) => slot.id !== id);
  if (await saveState()) {
    els.formMessage.textContent = "Orario eliminato.";
  }
}

function clearSlotForm() {
  els.slotId.value = "";
  els.slotForm.reset();
  els.slotDate.value = toISODate(new Date());
  els.slotStart.value = "09:00";
  els.slotEnd.value = "10:00";
  els.slotRepeatUntil.value = "";
  els.repeatDays.forEach((checkbox) => {
    checkbox.checked = false;
  });
  els.formMessage.textContent = "";
}

async function removeActivity(id) {
  if (state.slots.some((slot) => slot.activityId === id)) {
    els.formMessage.textContent = "Questa attività è usata in calendario: elimina o modifica prima gli orari collegati.";
    return;
  }
  state.activities = state.activities.filter((item) => item.id !== id);
  await saveState();
}

async function removeTechnician(id) {
  if (state.slots.some((slot) => slot.technicianId === id)) {
    els.formMessage.textContent = "Questo tecnico è assegnato a un orario: elimina o modifica prima gli orari collegati.";
    return;
  }
  state.technicians = state.technicians.filter((item) => item.id !== id);
  await saveState();
}

function slug(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function selectedRepeatDays() {
  return [...els.repeatDays].filter((checkbox) => checkbox.checked).map((checkbox) => Number(checkbox.value));
}

function getRepeatDates(startDateValue, repeatUntilValue, repeatDays) {
  if (!repeatUntilValue) {
    return [startDateValue];
  }

  const startDate = fromISODate(startDateValue);
  const endDate = fromISODate(repeatUntilValue);
  if (endDate < startDate) {
    return [startDateValue];
  }

  const allowedDays = repeatDays.length ? repeatDays : [startDate.getDay()];
  const dates = [];
  for (let day = new Date(startDate); day <= endDate; day = addDays(day, 1)) {
    if (allowedDays.includes(day.getDay())) {
      dates.push(toISODate(day));
    }
  }
  return dates.length ? dates : [startDateValue];
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      const isCalendar = tab.dataset.view === "calendar";
      els.calendarView.classList.toggle("is-visible", isCalendar);
      els.backofficeView.classList.toggle("is-visible", !isCalendar);
    });
  });

  [els.spaceFilter, els.activityFilter, els.technicianFilter].forEach((select) => {
    select.addEventListener("change", renderCalendar);
  });

  [els.adminSpaceFilter, els.adminActivityFilter, els.adminTechnicianFilter].forEach((select) => {
    select.addEventListener("change", renderSlotList);
  });

  els.prevWeek.addEventListener("click", () => {
    weekStart = addDays(weekStart, -7);
    renderCalendar();
  });
  els.nextWeek.addEventListener("click", () => {
    weekStart = addDays(weekStart, 7);
    renderCalendar();
  });
  els.todayWeek.addEventListener("click", () => {
    weekStart = startOfWeek(new Date());
    renderCalendar();
  });

  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.loginMessage.textContent = "";
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ password: els.adminPassword.value }),
      });
      els.adminPassword.value = "";
      setAuthenticated(true);
      await loadPublicData();
    } catch (error) {
      els.loginMessage.textContent = error.message;
    }
  });

  els.logoutButton.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST", body: "{}" });
    setAuthenticated(false);
  });

  els.backupButton.addEventListener("click", async () => {
    try {
      const backup = await api("/api/backup");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `backup-battirame-${stamp}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      els.formMessage.textContent = "Backup scaricato.";
    } catch (error) {
      els.formMessage.textContent = error.message;
    }
  });

  els.restoreBackupInput.addEventListener("change", async () => {
    const file = els.restoreBackupInput.files[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const restored = parsed.data || parsed;
      state = normalizeState(restored);
      if (await saveState()) {
        clearSlotForm();
        els.formMessage.textContent = "Backup caricato e ripristinato.";
      }
    } catch (error) {
      els.formMessage.textContent = "Il file scelto non sembra un backup valido.";
    } finally {
      els.restoreBackupInput.value = "";
    }
  });

  els.slotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (els.slotEnd.value <= els.slotStart.value) {
      els.formMessage.textContent = "L'orario di fine deve essere successivo all'inizio.";
      return;
    }

    const payload = {
      date: els.slotDate.value,
      spaceId: els.slotSpace.value,
      start: els.slotStart.value,
      end: els.slotEnd.value,
      activityId: els.slotActivity.value,
      technicianId: els.slotTechnician.value,
      notes: els.slotNotes.value.trim(),
    };
    const repeatDates = getRepeatDates(payload.date, els.slotRepeatUntil.value, selectedRepeatDays());
    let message = "";

    if (els.slotId.value) {
      state.slots = state.slots.map((slot) => (slot.id === els.slotId.value ? { ...slot, ...payload } : slot));
      const newDates = repeatDates.filter((date) => date !== payload.date);
      state.slots.push(...newDates.map((date) => ({ id: makeId(), ...payload, date })));
      message = newDates.length ? `Orario aggiornato e copiato su ${newDates.length} giorni.` : "Orario aggiornato.";
    } else {
      state.slots.push(...repeatDates.map((date) => ({ id: makeId(), ...payload, date })));
      message = repeatDates.length > 1 ? `Orario aggiunto su ${repeatDates.length} giorni.` : "Orario aggiunto.";
    }

    if (await saveState()) {
      clearSlotForm();
      els.formMessage.textContent = message;
    }
  });

  els.clearSlot.addEventListener("click", clearSlotForm);

  els.activityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = els.activityName.value.trim();
    if (!name) return;
    state.activities.push({ id: `${slug(name)}-${Date.now()}`, name, color: els.activityColor.value });
    els.activityForm.reset();
    els.activityColor.value = "#0f7c65";
    await saveState();
  });

  els.technicianForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = els.technicianName.value.trim();
    if (!name) return;
    state.technicians.push({ id: `${slug(name)}-${Date.now()}`, name });
    els.technicianForm.reset();
    await saveState();
  });
}

function renderAll() {
  populateSelects();
  renderCalendar();
  renderBackoffice();
}

async function boot() {
  bindEvents();
  await loadPublicData();
  await checkSession();
  clearSlotForm();
  renderAll();
}

boot().catch((error) => {
  els.calendarGrid.innerHTML = `<div class="empty">Impossibile caricare il calendario: ${error.message}</div>`;
});
