const STORAGE_KEY = "signal-club-events-v1";
const ATTENDEE_KEY = "signal-club-attendee-email-v1";

const eventList = document.querySelector("#event-list");
const registeredList = document.querySelector("#registered-list");
const eventForm = document.querySelector("#event-form");
const eventIdInput = document.querySelector("#event-id");
const dateInput = document.querySelector("#event-date");
const eventCount = document.querySelector("#event-count");
const registeredCount = document.querySelector("#registered-count");
const emptyState = document.querySelector("#empty-state");
const registeredEmpty = document.querySelector("#registered-empty");
const noResults = document.querySelector("#no-results");
const formMessage = document.querySelector("#form-message");
const eventSearch = document.querySelector("#event-search");
const categoryFilter = document.querySelector("#event-category-filter");
const registrationFeedback = document.querySelector("#registration-feedback");
const eventFormHeading = document.querySelector("#event-form-heading");
const eventSubmit = document.querySelector("#event-submit");
const cancelEditButton = document.querySelector("#cancel-edit");

const categoryLabels = {
  workshop: "WORKSHOP",
  talk: "TALK",
  hardware: "HARDWARE",
  social: "SOCIAL",
  other: "OTHER"
};

function loadAttendeeEmail() {
  try {
    return localStorage.getItem(ATTENDEE_KEY)?.trim().toLowerCase() || "";
  } catch {
    return "";
  }
}

function saveAttendeeEmail(email) {
  try {
    localStorage.setItem(ATTENDEE_KEY, email);
  } catch {
    // The current page can still use the attendee identity for this session.
  }
}

let attendeeEmail = loadAttendeeEmail();

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function makeStarterEvents() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Make a website in an hour",
      date: dateAfter(4),
      category: "workshop",
      time: "18:00",
      location: "Innovation Lab",
      capacity: 24,
      description: "A friendly, no-pressure build night. Bring a laptop and leave with a tiny corner of the internet of your own.",
      registrations: []
    },
    {
      id: crypto.randomUUID(),
      title: "AI, actually",
      date: dateAfter(11),
      category: "talk",
      time: "17:30",
      location: "Lecture Hall B",
      capacity: 60,
      description: "Skip the hype cycle. A hands-on session about what today's AI tools can do, where they fall short, and what to try next.",
      registrations: []
    },
    {
      id: crypto.randomUUID(),
      title: "Open hardware lab",
      date: dateAfter(19),
      category: "hardware",
      time: "16:00",
      location: "Makerspace",
      capacity: 18,
      description: "Sensors, circuits, and a few pleasantly strange prototypes. Drop in, meet the makers, and get something blinking.",
      registrations: []
    }
  ];
}

function loadEvents() {
  try {
    const savedEvents = localStorage.getItem(STORAGE_KEY);
    if (savedEvents === null) {
      const starterEvents = makeStarterEvents();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(starterEvents));
      return starterEvents;
    }
    const parsedEvents = JSON.parse(savedEvents);
    return Array.isArray(parsedEvents) ? parsedEvents.map((event) => ({
      ...event,
      category: event.category || "other",
      time: event.time || "",
      location: event.location || "",
      capacity: Number.isInteger(event.capacity) && event.capacity > 0 ? event.capacity : null,
      registrations: Array.isArray(event.registrations) ? event.registrations : []
    })) : [];
  } catch {
    return [];
  }
}

let events = loadEvents();

function saveEvents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

function formatDate(dateString, options) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, options);
}

function formatTime(timeString) {
  const [hour, minute] = timeString.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function buildEventCard(event, index) {
  const card = document.createElement("article");
  card.className = "event-card";
  card.id = `event-${event.id}`;

  const head = document.createElement("div");
  head.className = "event-card-head";
  head.append(createTextElement("span", "event-number", `SESSION / ${String(index + 1).padStart(2, "0")}`));

  const dateBadge = document.createElement("time");
  dateBadge.className = "event-date-badge";
  dateBadge.dateTime = event.date;
  dateBadge.append(
    createTextElement("strong", "", formatDate(event.date, { day: "2-digit" })),
    createTextElement("span", "", formatDate(event.date, { month: "short" }).toUpperCase())
  );
  head.append(dateBadge);

  const body = document.createElement("div");
  body.className = "event-card-body";
  body.append(
    createTextElement("div", "event-meta", `${categoryLabels[event.category] || categoryLabels.other} / ${formatDate(event.date, { weekday: "long", month: "long", day: "numeric" })}`),
    createTextElement("h3", "", event.title),
    createTextElement("p", "event-details", [event.time && formatTime(event.time), event.location].filter(Boolean).join(" · ")),
    createTextElement("p", "event-description", event.description)
  );

  const footer = document.createElement("div");
  footer.className = "card-footer";
  footer.append(createTextElement("span", "registration-count", `${event.registrations.length}${event.capacity ? ` / ${event.capacity}` : ""} REGISTERED`));

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const alreadyRegistered = event.registrations.some((registration) => registration.email === attendeeEmail);
  const registerToggle = createTextElement("button", "register-toggle", alreadyRegistered ? "ALREADY REGISTERED" : "JOIN THIS EVENT +");
  registerToggle.type = "button";
  registerToggle.disabled = alreadyRegistered;
  if (alreadyRegistered) registerToggle.classList.add("is-registered");
  registerToggle.setAttribute("aria-expanded", "false");
  const deleteButton = createTextElement("button", "delete-event", "×");
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${event.title}`);
  deleteButton.title = "Delete event";
  const editButton = createTextElement("button", "edit-event", "EDIT");
  editButton.type = "button";
  actions.append(registerToggle, editButton, deleteButton);
  footer.append(actions);

  const registrationForm = document.createElement("form");
  registrationForm.className = "registration-form";
  registrationForm.hidden = true;
  registrationForm.innerHTML = `
    <label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
    <label>Phone number<input name="phone" type="tel" autocomplete="tel" placeholder="+1 555 000 0000" required></label>
    <button type="submit">CONFIRM YOUR SPOT ↗</button>
    <p class="registration-message" role="status"></p>
  `;
  registrationForm.elements.email.value = attendeeEmail;
  const atCapacity = Boolean(event.capacity && event.registrations.length >= event.capacity);
  if (atCapacity && !alreadyRegistered) {
    registerToggle.textContent = "EVENT FULL";
    registerToggle.disabled = true;
  }

  registerToggle.addEventListener("click", () => {
    const isExpanded = !registrationForm.hidden;
    registrationForm.hidden = isExpanded;
    registerToggle.setAttribute("aria-expanded", String(!isExpanded));
    registerToggle.textContent = isExpanded ? "JOIN THIS EVENT +" : "CLOSE FORM −";
    if (!isExpanded) registrationForm.querySelector("input").focus();
  });

  registrationForm.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const formData = new FormData(registrationForm);
    const email = String(formData.get("email")).trim().toLowerCase();
    const phone = String(formData.get("phone")).trim();
    const message = registrationForm.querySelector(".registration-message");

    if (event.registrations.some((registration) => registration.email === email)) {
      attendeeEmail = email;
      saveAttendeeEmail(email);
      registrationFeedback.textContent = `You're already registered for ${event.title}.`;
      renderEvents();
      return;
    }

    if (event.capacity && event.registrations.length >= event.capacity) {
      registrationFeedback.textContent = `${event.title} is full. Registration is closed.`;
      renderEvents();
      return;
    }

    event.registrations.push({ email, phone });
    if (!saveEvents()) {
      event.registrations.pop();
      message.textContent = "Could not save this registration in browser storage.";
      message.classList.remove("success");
      return;
    }
    attendeeEmail = email;
    saveAttendeeEmail(email);
    registrationFeedback.textContent = `You're registered for ${event.title}.`;
    renderEvents();
  });

  editButton.addEventListener("click", () => startEventEdit(event));

  deleteButton.addEventListener("click", () => {
    if (!window.confirm(`Delete “${event.title}” and its registrations?`)) return;
    const previousEvents = events;
    events = events.filter((savedEvent) => savedEvent.id !== event.id);
    if (!saveEvents()) {
      events = previousEvents;
      formMessage.textContent = "Could not delete this event in browser storage.";
      return;
    }
    if (eventIdInput.value === event.id) resetEventForm();
    renderEvents();
  });

  body.append(footer, registrationForm);
  card.append(head, body);
  return card;
}

function renderEvents() {
  const today = localDateString(new Date());
  const upcomingEvents = events
    .filter((event) => event.date >= today)
    .sort((first, second) => first.date.localeCompare(second.date));
  const searchTerm = eventSearch.value.trim().toLowerCase();
  const visibleEvents = upcomingEvents.filter((event) => {
    const matchesSearch = [event.title, event.description, event.location].some((value) => value.toLowerCase().includes(searchTerm));
    const matchesCategory = categoryFilter.value === "all" || event.category === categoryFilter.value;
    return matchesSearch && matchesCategory;
  });
  const attendeeEvents = upcomingEvents.filter((event) =>
    event.registrations.some((registration) => registration.email === attendeeEmail)
  );

  eventList.replaceChildren(...visibleEvents.map(buildEventCard));
  registeredList.replaceChildren(...attendeeEvents.map((event) => {
    const item = document.createElement("article");
    item.className = "registered-event";
    const details = document.createElement("div");
    details.className = "registered-details";
    details.append(
      createTextElement("h3", "", event.title),
      createTextElement("p", "", formatDate(event.date, { weekday: "long", month: "long", day: "numeric" }))
    );
    const actions = document.createElement("div");
    actions.className = "registered-actions";
    const eventLink = createTextElement("a", "registered-event-link", "VIEW EVENT ↗");
    eventLink.href = `#event-${event.id}`;
    eventLink.addEventListener("click", () => {
      eventSearch.value = "";
      categoryFilter.value = "all";
      renderEvents();
    });
    const cancelButton = createTextElement("button", "cancel-registration", "CANCEL");
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => cancelRegistration(event));
    actions.append(eventLink, cancelButton);
    item.append(
      createTextElement("time", "registered-date", formatDate(event.date, { month: "short", day: "2-digit" }).toUpperCase()),
      details,
      actions
    );
    return item;
  }));
  eventCount.textContent = String(visibleEvents.length).padStart(2, "0");
  registeredCount.textContent = String(attendeeEvents.length).padStart(2, "0");
  emptyState.hidden = upcomingEvents.length > 0;
  noResults.hidden = upcomingEvents.length === 0 || visibleEvents.length > 0;
  registeredEmpty.hidden = attendeeEvents.length > 0;
}

function startEventEdit(event) {
  eventIdInput.value = event.id;
  eventForm.elements.title.value = event.title;
  eventForm.elements.category.value = event.category;
  eventForm.elements.date.value = event.date;
  eventForm.elements.time.value = event.time;
  eventForm.elements.location.value = event.location;
  eventForm.elements.capacity.value = event.capacity || "";
  eventForm.elements.description.value = event.description;
  eventFormHeading.textContent = "EDIT EVENT";
  eventSubmit.innerHTML = 'SAVE CHANGES <span aria-hidden="true">↗</span>';
  cancelEditButton.hidden = false;
  formMessage.textContent = "Update the event details below.";
  document.querySelector("#create").scrollIntoView({ behavior: "smooth", block: "start" });
  eventForm.elements.title.focus({ preventScroll: true });
}

function resetEventForm() {
  eventForm.reset();
  eventIdInput.value = "";
  eventFormHeading.textContent = "NEW EVENT";
  eventSubmit.innerHTML = 'ADD TO CALENDAR <span aria-hidden="true">↗</span>';
  cancelEditButton.hidden = true;
  formMessage.textContent = "";
  dateInput.min = localDateString(new Date());
}

function cancelRegistration(event) {
  if (!window.confirm(`Cancel your registration for “${event.title}”?`)) return;
  const registrationIndex = event.registrations.findIndex((registration) => registration.email === attendeeEmail);
  if (registrationIndex < 0) return;
  const [registration] = event.registrations.splice(registrationIndex, 1);
  if (!saveEvents()) {
    event.registrations.splice(registrationIndex, 0, registration);
    registrationFeedback.textContent = "Could not cancel this registration in browser storage.";
    return;
  }
  registrationFeedback.textContent = `Your registration for ${event.title} was canceled.`;
  renderEvents();
}

dateInput.min = localDateString(new Date());
eventSearch.addEventListener("input", renderEvents);
categoryFilter.addEventListener("change", renderEvents);
cancelEditButton.addEventListener("click", resetEventForm);

eventForm.addEventListener("submit", (submitEvent) => {
  submitEvent.preventDefault();
  const formData = new FormData(eventForm);
  const capacityValue = String(formData.get("capacity")).trim();
  const eventValues = {
    title: String(formData.get("title")).trim(),
    category: String(formData.get("category")),
    date: String(formData.get("date")),
    time: String(formData.get("time")),
    location: String(formData.get("location")).trim(),
    capacity: capacityValue ? Number(capacityValue) : null,
    description: String(formData.get("description")).trim()
  };

  if (eventValues.date < localDateString(new Date())) {
    formMessage.textContent = "Choose today or a future date for an upcoming event.";
    return;
  }

  const editingIndex = events.findIndex((event) => event.id === eventIdInput.value);
  const previousEvent = editingIndex >= 0 ? events[editingIndex] : null;
  if (previousEvent && eventValues.capacity && eventValues.capacity < previousEvent.registrations.length) {
    formMessage.textContent = `Capacity can't be lower than the ${previousEvent.registrations.length} existing registrations.`;
    return;
  }
  const savedEvent = previousEvent
    ? { ...previousEvent, ...eventValues }
    : { id: crypto.randomUUID(), ...eventValues, registrations: [] };

  if (previousEvent) events[editingIndex] = savedEvent;
  else events.push(savedEvent);
  if (!saveEvents()) {
    if (previousEvent) events[editingIndex] = previousEvent;
    else events.pop();
    formMessage.textContent = "Could not save this event in browser storage.";
    return;
  }
  resetEventForm();
  formMessage.textContent = previousEvent ? "Event changes saved." : "Added to the calendar.";
  renderEvents();
  document.querySelector("#events").scrollIntoView({ behavior: "smooth", block: "start" });
});

renderEvents();