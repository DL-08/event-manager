import { useEffect, useMemo, useState } from "react";
import TechText from "./components/TechText.jsx";
import { STORAGE_KEYS, addRegistration, createStarterEvents, filterEvents, formatDate, formatTime, loadEvents, removeRegistration, saveEvents } from "./lib/events.js";

const categories = { workshop: "WORKSHOP", talk: "TALK", hardware: "HARDWARE", social: "SOCIAL", other: "OTHER" };
const artwork = {
  workshop: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85",
  talk: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=900&q=85",
  hardware: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85",
  social: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=85",
  other: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85",
};

function useStoredTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.theme) || "dark"; } catch { return "dark"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#090b0e" : "#eef1f5");
    try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch { /* storage is optional. */ }
  }, [theme]);
  return [theme, setTheme];
}

function EventCard({ event, index, attendeeEmail, onRegister, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(attendeeEmail);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const registered = event.registrations.some((registration) => registration.email === attendeeEmail);
  const full = Boolean(event.capacity && event.registrations.length >= event.capacity);

  const submitRegistration = (eventObject) => {
    eventObject.preventDefault();
    if (full && !registered) { setMessage("This event is full."); return; }
    const updated = addRegistration(event, email, phone);
    if (updated === event) { setMessage("You are already registered or the event is full."); return; }
    onRegister(updated);
    setMessage("Registration confirmed.");
  };

  return <article className="event-card" id={`event-${event.id}`}>
    <div className="event-card-head">
      <img className="event-artwork" src={artwork[event.category] || artwork.other} alt="" loading="lazy" />
      <span className="poster-rank">{String(index + 1).padStart(2, "0")}</span>
      <span className="event-number">SESSION / {String(index + 1).padStart(2, "0")}</span>
      <span className="poster-category">{categories[event.category] || categories.other}</span>
      <time className="event-date-badge" dateTime={event.date}><strong>{formatDate(event.date, { day: "2-digit" })}</strong><span>{formatDate(event.date, { month: "short" }).toUpperCase()}</span></time>
    </div>
    <div className="event-card-body">
      <p className="event-meta">{categories[event.category] || categories.other} / {formatDate(event.date, { weekday: "long", month: "long", day: "numeric" })}</p>
      <h3>{event.title}</h3>
      <p className="event-details">{formatTime(event.time)} · {event.location}</p>
      <p className="event-description">{event.description}</p>
      <div className="card-footer">
        <span className="registration-count">{event.registrations.length}{event.capacity ? ` / ${event.capacity}` : ""} REGISTERED</span>
        <div className="card-actions">
          <button className={`register-toggle ${registered ? "is-registered" : ""}`} onClick={() => setOpen((value) => !value)} disabled={registered || full}>{registered ? "ALREADY REGISTERED" : full ? "EVENT FULL" : "JOIN THIS EVENT +"}</button>
          <button className="edit-event" onClick={() => onEdit(event)}>EDIT</button>
          <button className="delete-event" onClick={() => onDelete(event)} aria-label={`Delete ${event.title}`}>×</button>
        </div>
      </div>
      {open && <form className="registration-form" onSubmit={submitRegistration}>
        <label>Email address<input type="email" value={email} onChange={(change) => setEmail(change.target.value)} required /></label>
        <label>Phone number<input type="tel" value={phone} onChange={(change) => setPhone(change.target.value)} required /></label>
        <button type="submit">CONFIRM YOUR SPOT ↗</button>
        {message && <p className="registration-message" role="status">{message}</p>}
      </form>}
    </div>
  </article>;
}

function EventForm({ eventToEdit, onSave, onCancel }) {
  const [form, setForm] = useState({ title: "", category: "workshop", date: "", time: "", location: "", capacity: "", description: "" });
  useEffect(() => { if (eventToEdit) setForm({ title: eventToEdit.title, category: eventToEdit.category, date: eventToEdit.date, time: eventToEdit.time, location: eventToEdit.location, capacity: eventToEdit.capacity || "", description: eventToEdit.description }); }, [eventToEdit]);
  const update = (field) => (change) => setForm((current) => ({ ...current, [field]: change.target.value }));
  const submit = (eventObject) => {
    eventObject.preventDefault();
    onSave({ ...form, capacity: form.capacity ? Number(form.capacity) : null });
  };
  return <form className="event-form" id="event-form" onSubmit={submit}>
    <div className="form-topline"><span>{eventToEdit ? "EDIT EVENT" : "NEW EVENT"}</span><span>01 — 06</span></div>
    <label>EVENT TITLE <span>*</span><input required maxLength="80" value={form.title} onChange={update("title")} placeholder="e.g. Build a tiny robot" /></label>
    <label>TOPIC <span>*</span><select value={form.category} onChange={update("category")}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>DATE <span>*</span><input required type="date" value={form.date} onChange={update("date")} min={new Date().toISOString().slice(0, 10)} /></label>
    <div className="form-row"><label>START TIME<input type="time" value={form.time} onChange={update("time")} /></label><label>LOCATION<input value={form.location} onChange={update("location")} placeholder="Room or meeting link" /></label></div>
    <label>CAPACITY <span className="optional-label">OPTIONAL</span><input type="number" min="1" max="500" value={form.capacity} onChange={update("capacity")} placeholder="Leave blank for no limit" /></label>
    <label>THE DETAILS <span>*</span><textarea required maxLength="400" rows="3" value={form.description} onChange={update("description")} placeholder="What are we making, learning, or figuring out?" /></label>
    <div className="form-footer"><p>Keep it curious. Keep it welcoming.</p><div className="form-actions">{eventToEdit && <button className="cancel-edit" type="button" onClick={onCancel}>CANCEL EDIT</button>}<button className="submit-button" type="submit">{eventToEdit ? "SAVE CHANGES ↗" : "ADD TO CALENDAR ↗"}</button></div></div>
  </form>;
}

export default function App() {
  const [theme, setTheme] = useStoredTheme();
  const [events, setEvents] = useState(() => loadEvents());
  const [attendeeEmail, setAttendeeEmail] = useState(() => { try { return localStorage.getItem(STORAGE_KEYS.attendee) || "" } catch { return "" } });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [eventToEdit, setEventToEdit] = useState(null);
  const [feedback, setFeedback] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => events.filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [events, today]);
  const visibleEvents = useMemo(() => filterEvents(upcoming, search, category), [upcoming, search, category]);
  const registeredEvents = useMemo(() => upcoming.filter((event) => event.registrations.some((registration) => registration.email === attendeeEmail)), [upcoming, attendeeEmail]);
  const upNext = upcoming.slice(0, 3);

  useEffect(() => {
    saveEvents(events);
  }, [events]);
  useEffect(() => { if (attendeeEmail) try { localStorage.setItem(STORAGE_KEYS.attendee, attendeeEmail); } catch {} }, [attendeeEmail]);
  const updateEvent = (updated) => setEvents((current) => current.map((event) => event.id === updated.id ? updated : event));
  const register = (updatedEvent) => {
    setEvents((current) => current.map((event) => event.id === updatedEvent.id ? updatedEvent : event));
    setAttendeeEmail(updatedEvent.registrations.at(-1)?.email || attendeeEmail);
    setFeedback(`You're registered for ${updatedEvent.title}.`);
  };
  const submitEvent = (values) => {
    const candidate = { ...values, id: eventToEdit?.id || crypto.randomUUID(), registrations: eventToEdit?.registrations || [], capacity: values.capacity };
    if (eventToEdit) updateEvent(candidate); else setEvents((current) => [...current, candidate]);
    setEventToEdit(null); setFeedback(eventToEdit ? "Event changes saved." : "Added to the calendar.");
  };
  const removeEvent = (event) => {
    if (!window.confirm(`Delete “${event.title}” and its registrations?`)) return;
    setEvents((current) => current.filter((item) => item.id !== event.id));
    if (eventToEdit?.id === event.id) setEventToEdit(null);
  };
  const cancelRegistration = (event) => {
    if (!window.confirm(`Cancel your registration for “${event.title}”?`)) return;
    const updated = removeRegistration(event, attendeeEmail);
    setEvents((current) => current.map((item) => item.id === event.id ? updated : item));
    setFeedback(`Your registration for ${event.title} was canceled.`);
  };

  return <div className="site-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">S<span>.</span></span><span>Signal</span></a><nav className="main-nav"><a className="nav-link" href="#top">Home</a><a className="nav-link" href="#events">Events</a><a className="nav-link" href="#registered">My RSVPs</a></nav><div className="topbar-actions"><button className="nav-search" onClick={() => document.querySelector("#events")?.scrollIntoView({ behavior: "smooth" })} aria-label="Search events"><span className="search-icon" /></button><button className="theme-toggle" role="switch" aria-checked={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span className="theme-symbol theme-sun">☀</span><span className="theme-symbol theme-moon">☾</span><i className="theme-thumb" /></button><a className="topbar-link" href="#create"><b className="host-plus">+</b> HOST EVENT</a></div></header>
    <main id="top">
      <section className="hero">
        <img className="hero-image" src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=85" alt="Students collaborating around a table" />
        <div className="hero-shade" />
        <div className="hero-content"><p className="eyebrow"><span>SIGNAL PRESENTS</span><span className="eyebrow-line" /> CAMPUS EVENT SERIES</p><h1><TechText text="Plan and Track" className="main-heading-tech-text" fontSize={116} /></h1><p className="hero-copy">Plan and track workshops, talks, and curious people. Your next campus night starts here.</p><a className="hero-cta" href="#events">BROWSE EVENTS <span>↓</span></a></div>
        <div className="hero-stamp"><span>BUILD</span><span>LEARN</span><span>REPEAT</span></div>
        <div className="hero-index">SIGNAL / 01 <span>·</span> YOUR CAMPUS, AFTER HOURS</div>
        <aside className="hero-up-next"><p className="up-next-heading"><span className="up-next-indicator" /> UP NEXT</p><div className="up-next-list">{upNext.map((event) => <a key={event.id} className="up-next-item" href={`#event-${event.id}`}><img src={artwork[event.category] || artwork.other} alt="" /><span className="up-next-copy"><strong>{event.title}</strong><span>{formatDate(event.date, { month: "short", day: "numeric" })}</span></span></a>)}</div></aside>
      </section>
      <section className="events-section" id="events"><div className="section-heading"><div><p className="eyebrow">THE CLUB CALENDAR <span className="eyebrow-line" /> OPEN TO ALL</p><h2>Coming up<span className="heading-period">.</span></h2></div><div className="section-side"><p className="section-note"><span>{visibleEvents.length}</span> UPCOMING SESSIONS<br />GOOD IDEAS WELCOME</p></div></div><div className="event-tools"><label className="search-field">SEARCH THE CALENDAR<input value={search} onChange={(change) => setSearch(change.target.value)} placeholder="Title, details, or location" /></label><label className="filter-field">TOPIC<select value={category} onChange={(change) => setCategory(change.target.value)}><option value="all">ALL TOPICS</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="event-grid">{visibleEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} attendeeEmail={attendeeEmail} onRegister={register} onEdit={(item) => { setEventToEdit(item); document.querySelector("#create")?.scrollIntoView({ behavior: "smooth" }); }} onDelete={removeEvent} />)}</div>{visibleEvents.length === 0 && <div className="empty-state"><span className="empty-symbol">✳</span><h3>Nothing on the board. Yet.</h3><p>Start the next good thing by adding an event below.</p><a href="#create">ADD THE FIRST EVENT ↓</a></div>}</section>
      <section className="registered-section" id="registered"><div className="section-heading"><div><p className="eyebrow">YOUR SAVED SEATS <span className="eyebrow-line" /> SEE YOU THERE</p><h2>You're going<span className="heading-period">.</span></h2></div><p className="section-note"><span>{registeredEvents.length}</span> EVENTS YOU'VE JOINED<br />STORED IN THIS BROWSER</p></div><div className="registered-list">{registeredEvents.map((event) => <article key={event.id} className="registered-event"><time className="registered-date">{formatDate(event.date, { month: "short", day: "2-digit" }).toUpperCase()}</time><div><h3>{event.title}</h3><p>{formatDate(event.date, { weekday: "long", month: "long", day: "numeric" })}</p></div><div className="registered-actions"><a className="registered-event-link" href={`#event-${event.id}`}>VIEW EVENT ↗</a><button className="cancel-registration" onClick={() => cancelRegistration(event)}>CANCEL</button></div></article>)}</div>{feedback && <p className="registration-feedback" role="status">{feedback}</p>}{registeredEvents.length === 0 && <div className="registered-empty"><span>↗</span><p>Your sign-ups will show up here after you join an event.</p><a href="#events">FIND AN EVENT ↑</a></div>}</section>
      <section className="create-section" id="create"><div className="create-intro"><p className="eyebrow"><span>YOUR TURN</span><span className="eyebrow-line" /> MAKE IT HAPPEN</p><h2>Put it<br />on the <em>board.</em></h2><p>Have a workshop, talk, or wonderfully nerdy idea? Give it a date and bring people together.</p><div className="create-aside"><span className="aside-mark">+</span> COMMUNITY-LED, ALWAYS.</div></div><EventForm eventToEdit={eventToEdit} onSave={submitEvent} onCancel={() => setEventToEdit(null)} /></section>
    </main>
    <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark">S<span>.</span></span><span>Signal</span></a><span>PLAN AND TRACK YOUR NEXT EVENT</span><a href="#top">BACK TO TOP ↑</a></footer>
  </div>;
}
