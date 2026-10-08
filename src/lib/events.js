export const STORAGE_KEYS = {
  events: "signal-club-events-v1",
  attendee: "signal-club-attendee-email-v1",
  theme: "signal-club-theme",
};

export function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.map((event) => ({
    id: event.id || crypto.randomUUID(),
    title: event.title || "Untitled event",
    category: event.category || "other",
    date: event.date || "",
    time: event.time || "",
    location: event.location || "",
    capacity: Number.isInteger(event.capacity) && event.capacity > 0 ? event.capacity : null,
    description: event.description || "",
    registrations: Array.isArray(event.registrations) ? event.registrations : [],
  }));
}

export function createStarterEvents(idFactory = () => crypto.randomUUID()) {
  const dateAfter = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return [
    {
      id: idFactory(), title: "Make a website in an hour", date: dateAfter(4), category: "workshop",
      time: "18:00", location: "Innovation Lab", capacity: 24,
      description: "A friendly, no-pressure build night. Bring a laptop and leave with a tiny corner of the internet of your own.", registrations: [],
    },
    {
      id: idFactory(), title: "AI, actually", date: dateAfter(11), category: "talk",
      time: "17:30", location: "Lecture Hall B", capacity: 60,
      description: "A hands-on session about what today's AI tools can do, where they fall short, and what to try next.", registrations: [],
    },
    {
      id: idFactory(), title: "Open hardware lab", date: dateAfter(19), category: "hardware",
      time: "16:00", location: "Makerspace", capacity: 18,
      description: "Sensors, circuits, and pleasantly strange prototypes. Drop in, meet the makers, and get something blinking.", registrations: [],
    },
  ];
}

export function loadEvents(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(STORAGE_KEYS.events);
    if (saved === null) return createStarterEvents();
    return normalizeEvents(JSON.parse(saved));
  } catch {
    return createStarterEvents();
  }
}

export function saveEvents(events, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEYS.events, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

export function filterEvents(events, search, category = "all") {
  const normalizedSearch = search.trim().toLowerCase();
  return events.filter((event) => {
    const searchable = [event.title, event.description, event.location].join(" ").toLowerCase();
    return (!normalizedSearch || searchable.includes(normalizedSearch)) && (category === "all" || event.category === category);
  });
}

export function addRegistration(event, email, phone) {
  const normalizedEmail = email.trim().toLowerCase();
  if (event.registrations.some((registration) => registration.email === normalizedEmail)) return event;
  if (event.capacity && event.registrations.length >= event.capacity) return event;
  return { ...event, registrations: [...event.registrations, { email: normalizedEmail, phone }] };
}

export function removeRegistration(event, email) {
  return {
    ...event,
    registrations: event.registrations.filter((registration) => registration.email !== email),
  };
}

export function formatDate(dateString, options = {}) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, options);
}

export function formatTime(timeString) {
  if (!timeString) return "";
  const [hour, minute] = timeString.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
