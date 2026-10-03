const STORAGE_KEY = "signal-club-events-v1";

const eventList = document.querySelector("#event-list");
const eventForm = document.querySelector("#event-form");
const dateInput = document.querySelector("#event-date");
const eventCount = document.querySelector("#event-count");
const emptyState = document.querySelector("#empty-state");
const formMessage = document.querySelector("#form-message");

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
      description: "A friendly, no-pressure build night. Bring a laptop and leave with a tiny corner of the internet of your own.",
      registrations: []
    },
    {
      id: crypto.randomUUID(),
      title: "AI, actually",
      date: dateAfter(11),
      description: "Skip the hype cycle. A hands-on session about what today's AI tools can do, where they fall short, and what to try next.",
      registrations: []
    },
    {
      id: crypto.randomUUID(),
      title: "Open hardware lab",
      date: dateAfter(19),
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
    return Array.isArray(parsedEvents) ? parsedEvents : [];
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

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function buildEventCard(event, index) {
  const card = document.createElement("article");
  card.className = "event-card";

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
    createTextElement("div", "event-meta", formatDate(event.date, { weekday: "long", month: "long", day: "numeric" })),
    createTextElement("h3", "", event.title),
    createTextElement("p", "event-description", event.description)
  );

  const footer = document.createElement("div");
  footer.className = "card-footer";
  footer.append(createTextElement("span", "registration-count", `${event.registrations.length} REGISTERED`));

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const registerToggle = createTextElement("button", "register-toggle", "JOIN THIS EVENT +");
  registerToggle.type = "button";
  registerToggle.setAttribute("aria-expanded", "false");
  const deleteButton = createTextElement("button", "delete-event", "×");
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${event.title}`);
  deleteButton.title = "Delete event";
  actions.append(registerToggle, deleteButton);
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
      message.textContent = "This email is already registered for this event.";
      message.classList.remove("success");
      return;
    }

    event.registrations.push({ email, phone });
    if (!saveEvents()) {
      event.registrations.pop();
      message.textContent = "Could not save this registration in browser storage.";
      message.classList.remove("success");
      return;
    }
    message.textContent = "You're on the list. See you there!";
    message.classList.add("success");
    registrationForm.reset();
    footer.querySelector(".registration-count").textContent = `${event.registrations.length} REGISTERED`;
  });

  deleteButton.addEventListener("click", () => {
    if (!window.confirm(`Delete “${event.title}” and its registrations?`)) return;
    events = events.filter((savedEvent) => savedEvent.id !== event.id);
    saveEvents();
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

  eventList.replaceChildren(...upcomingEvents.map(buildEventCard));
  eventCount.textContent = String(upcomingEvents.length).padStart(2, "0");
  emptyState.hidden = upcomingEvents.length > 0;
}

dateInput.min = localDateString(new Date());

eventForm.addEventListener("submit", (submitEvent) => {
  submitEvent.preventDefault();
  const formData = new FormData(eventForm);
  const newEvent = {
    id: crypto.randomUUID(),
    title: String(formData.get("title")).trim(),
    date: String(formData.get("date")),
    description: String(formData.get("description")).trim(),
    registrations: []
  };

  if (newEvent.date < localDateString(new Date())) {
    formMessage.textContent = "Choose today or a future date for an upcoming event.";
    return;
  }

  events.push(newEvent);
  if (!saveEvents()) {
    events.pop();
    formMessage.textContent = "Could not save this event in browser storage.";
    return;
  }
  eventForm.reset();
  dateInput.min = localDateString(new Date());
  formMessage.textContent = "Added to the calendar.";
  renderEvents();
  document.querySelector("#events").scrollIntoView({ behavior: "smooth", block: "start" });
});

renderEvents();