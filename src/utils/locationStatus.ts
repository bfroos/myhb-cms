/**
 * Get location status based on opening date and timezone
 * @param newOpeningDate - The opening date of the location (optional)
 * @param timezone - The timezone of the location (default: "Europe/Berlin")
 * @returns "open" | "openSoon" | "comingSoon"
 */
export function getLocationStatus(
  newOpeningDate?: string | Date | null,
  timezone: string = "Europe/Berlin",
): "open" | "openNewToday" | "openSoon" | "comingSoon" {
  // Helper function to get date string (YYYY-MM-DD) in a specific timezone
  const getDateStringInTimezone = (
    date: string | Date,
    tz: string = "Europe/Berlin",
  ): string => {
    let dateObj: Date;

    if (typeof date === "string") {
      // Parse "YYYY-MM-DD" format
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      if (match) {
        dateObj = new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
        );
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

    // Format date in the specified timezone as YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return formatter.format(dateObj);
  };

  const getTodayInTimezone = (tz: string = "Europe/Berlin"): string => {
    return getDateStringInTimezone(new Date(), tz);
  };

  const isOpen = (date?: string, tz: string = "Europe/Berlin"): boolean => {
    if (!date) return false;
    const today = getTodayInTimezone(tz);
    const openingDate = getDateStringInTimezone(date, tz);
    // Compare as strings (YYYY-MM-DD format is lexicographically sortable)
    return openingDate <= today;
  };

  const isToday = (date?: string, tz: string = "Europe/Berlin"): boolean => {
    if (!date) return false;
    const today = getTodayInTimezone(tz);
    const openingDate = getDateStringInTimezone(date, tz);
    return openingDate === today;
  };

  if (!newOpeningDate) {
    return "comingSoon";
  }

  const openingDateStr =
    typeof newOpeningDate === "string"
      ? newOpeningDate
      : newOpeningDate.toString();

  if (isToday(openingDateStr, timezone)) {
    return "openNewToday";
  }

  if (isOpen(openingDateStr, timezone)) {
    return "open";
  }

  return "openSoon";
}
