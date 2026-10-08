import { describe, expect, it } from "vitest";
import {
  addRegistration,
  createStarterEvents,
  filterEvents,
  normalizeEvents,
  removeRegistration,
} from "./events.js";

describe("event model", () => {
  it("normalizes saved events and safely defaults missing fields", () => {
    const events = normalizeEvents([
      {
        id: "event-1",
        title: "Build a robot",
        category: "hardware",
        date: "2027-01-05",
        registrations: [{ email: "guest@example.com", phone: "+1 555 0100" }],
      },
    ]);

    expect(events[0]).toMatchObject({
      id: "event-1",
      title: "Build a robot",
      category: "hardware",
      date: "2027-01-05",
      registrations: [{ email: "guest@example.com", phone: "+1 555 0100" }],
    });
    expect(events[0].capacity).toBeNull();
  });

  it("filters events by search text and category", () => {
    const events = [
      { id: "1", title: "Build a robot", description: "Circuits", location: "Lab", category: "hardware" },
      { id: "2", title: "Design systems", description: "UI", location: "Studio", category: "workshop" },
    ];

    expect(filterEvents(events, "robot", "all").map((event) => event.id)).toEqual(["1"]);
    expect(filterEvents(events, "", "workshop").map((event) => event.id)).toEqual(["2"]);
  });

  it("adds and removes registrations without allowing duplicate attendees", () => {
    const event = { id: "event-1", capacity: 20, registrations: [] };
    const firstRegistration = addRegistration(event, "guest@example.com", "+1 555 0100");
    const duplicateRegistration = addRegistration(firstRegistration, "guest@example.com", "+1 555 0100");
    const removedRegistration = removeRegistration(duplicateRegistration, "guest@example.com");

    expect(firstRegistration.registrations).toHaveLength(1);
    expect(duplicateRegistration.registrations).toHaveLength(1);
    expect(removedRegistration.registrations).toHaveLength(0);
  });

  it("creates starter events with deterministic shape", () => {
    const events = createStarterEvents(() => "event-id");

    expect(events).toHaveLength(3);
    expect(events.every((event) => event.registrations.length === 0)).toBe(true);
    expect(events.every((event) => event.id === "event-id")).toBe(true);
  });
});
