/** The multi-party Vedic chamber — groom, bride, guardians and the astrologer.
 *
 *  Mirrors `app/schemas/milan.py`. Note the two seat shapes: `MilanOccupant`
 *  is what everyone in the room sees of everyone else, while `MilanSeat`
 *  carries the invitation code and reaches the host alone. */

import type { CallCredentials, CallStatus, ConsultationMode } from "@/types";

export type MilanPurpose = "kundali_matching" | "family_vastu" | "other";

export type MilanOccupant = {
  seat_id: string;
  label: string;
  display_name: string | null;
  is_present: boolean;
  joined_at: string | null;
};

export type MilanSeat = MilanOccupant & {
  join_code: string;
  is_revoked: boolean;
};

export type MilanBilling = {
  coins_per_minute: number;
  minutes_booked: number;
  minutes_charged: number;
  coins_charged: number;
};

export type MilanRoom = {
  id: string;
  purpose: MilanPurpose;
  mode: ConsultationMode;
  status: CallStatus;

  astrologer_id: string;
  astrologer_name: string | null;
  astrologer_avatar_url: string | null;
  host_name: string | null;

  viewer_is_host: boolean;
  viewer_is_astrologer: boolean;
  viewer_is_guest: boolean;

  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  end_reason: string | null;

  max_guests: number;
  seats_taken: number;
  occupants: MilanOccupant[];
  /** Host only; empty for everyone else. */
  seats: MilanSeat[];
  /** Host and astrologer only. */
  billing: MilanBilling | null;
};

export type MilanRoomSession = { room: MilanRoom; credentials: CallCredentials | null };

export type CreateMilanRoomInput = {
  astrologer_id: string;
  mode: ConsultationMode;
  purpose: MilanPurpose;
  requested_minutes: number;
  /** One label per guest seat, e.g. ["Bride", "Bride's father"]. */
  guests: string[];
};

export const MILAN_PURPOSE_LABELS: Record<MilanPurpose, { en: string; bn: string; hi: string }> = {
  kundali_matching: {
    en: "Kundali matching",
    bn: "কুণ্ডলী মিলন",
    hi: "कुंडली मिलान",
  },
  family_vastu: {
    en: "Family vastu",
    bn: "পারিবারিক বাস্তু",
    hi: "पारिवारिक वास्तु",
  },
  other: { en: "Consultation", bn: "পরামর্শ", hi: "परामर्श" },
};
