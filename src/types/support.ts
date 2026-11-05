export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: "mobile" | "web" | "admin";
  device_info: Record<string, any> | null;
  admin_notes: string | null;
  admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface SupportTicketUpdatePayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  admin_notes?: string;
}
