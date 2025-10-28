import React from "react";

export function formatPrettyDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);
  if (isNaN(date)) return "—";

  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const yearShort = String(date.getFullYear()).slice(2);
  const month = monthNames[date.getMonth()];

  // Return JSX element with superscript directly
  return (
    <span className="pretty-date">
      {day}
      <sup>{suffix}</sup> {month}'{yearShort}
    </span>
  );
}

export function formatPrettyDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date)) return "—";

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <span className="pretty-date">
      {formatPrettyDate(dateString)}, {time}
    </span>
  );
}
