/**
 * Device Date & Time Synchronization Utility
 * Guarantees all dates and times across Jarvis originate strictly from the
 * browser's local system clock and resolved local timezone.
 */

export interface DeviceTimeInfo {
  date: Date;
  dateString: string;       // "2026-09-11" (local YYYY-MM-DD)
  timeString: string;       // "02:36:26 AM" or "02:36:26"
  timeString24: string;     // "02:36:26"
  formattedDate: string;    // "Friday, Sep 11, 2026"
  formattedShortDate: string; // "Fri, Sep 11"
  timeZone: string;         // e.g. "America/Los_Angeles"
  timeZoneOffsetMinutes: number; // e.g. 420 for UTC-7
  timeZoneOffsetFormatted: string; // e.g. "GMT-07:00"
  epochMs: number;
}

/**
 * Returns formatted YYYY-MM-DD from the local device clock (NEVER UTC).
 */
export function getDeviceLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns formatted HH:mm from the local device clock (24h format for input[type="time"]).
 */
export function getDeviceLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns local datetime in format required by <input type="datetime-local">: YYYY-MM-DDTHH:mm
 * (Guaranteed local device clock, preventing UTC offset shifts).
 */
export function getDeviceLocalDateTimeInputValue(date: Date = new Date()): string {
  return `${getDeviceLocalDateString(date)}T${getDeviceLocalTimeString(date)}`;
}

/**
 * Formats timezone offset into GMT+/-HH:MM format
 */
export function getDeviceFormattedTimeZoneOffset(date: Date = new Date()): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const minutes = String(absOffset % 60).padStart(2, '0');
  return `GMT${sign}${hours}:${minutes}`;
}

/**
 * Extracts complete local device time info with resolved timezone
 */
export function getDeviceTimeInfo(date: Date = new Date()): DeviceTimeInfo {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const dateString = getDeviceLocalDateString(date);
  const timeString = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const timeString24 = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const formattedDate = date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedShortDate = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return {
    date,
    dateString,
    timeString,
    timeString24,
    formattedDate,
    formattedShortDate,
    timeZone,
    timeZoneOffsetMinutes: date.getTimezoneOffset(),
    timeZoneOffsetFormatted: getDeviceFormattedTimeZoneOffset(date),
    epochMs: date.getTime()
  };
}

/**
 * Sanity Check: Confirms that device clock is accessible, live, and non-stale.
 */
export function checkLiveSystemTime() {
  return {
    systemEpoch: Date.now(),
    localTime: new Date().toLocaleTimeString(),
    localDate: getDeviceLocalDateString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

if (typeof window !== 'undefined') {
  (window as any).__checkLiveSystemTime = checkLiveSystemTime;
}
