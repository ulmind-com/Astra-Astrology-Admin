/** The astrologer's live Co-Pilot panel.
 *
 *  Read-only and derived: the backend calculates this per request from the
 *  client's saved birth details and stores nothing. Mirrors
 *  `app/schemas/copilot.py` in the backend. */

export type CoPilotDashaPeriod = {
  lord: string;
  lord_label: string;
  starts_on: string;
  ends_on: string;
  percent_complete: number;
  days_remaining: number;
};

export type CoPilotSadeSati = {
  is_active: boolean;
  phase_code: "rising" | "peak" | "setting" | "kantaka" | "ashtama" | "none";
  phase_title: string;
  impact_level: "high" | "medium" | "favorable";
  saturn_sign: string;
  saturn_house_from_moon: number;
  description: string;
  remedy_summary: string;
};

export type CoPilotRemedyFocus = {
  planet: string;
  planet_label: string;
  reason: string;
  remedies: string[];
  beej_mantra: string;
  deity: string;
  lucky_day: string;
  /** Empty for Rahu and Ketu, which rule dashas but have no stone. */
  gemstone: string;
  gemstone_metal: string;
  gemstone_finger: string;
  gemstone_day: string;
};

export type CoPilotSummary = {
  session_id: string;
  client_name: string;
  language: string;
  /** False when the client's saved birth details cannot produce a chart. The
   *  four blocks below are then null — nothing is guessed. */
  is_ready: boolean;
  unavailable_reason: string;
  /** False when no birth time was given, which moves the dasha by months. */
  is_birth_time_known: boolean;
  accuracy_note: string;
  moon_sign: string;
  nakshatra: string;
  mahadasha: CoPilotDashaPeriod | null;
  antardasha: CoPilotDashaPeriod | null;
  sade_sati: CoPilotSadeSati | null;
  remedy_focus: CoPilotRemedyFocus | null;
  computed_at: string;
};
