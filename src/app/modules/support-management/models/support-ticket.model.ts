import { SupportTicketMessageModel } from "./support-ticket-message.model";

export class SupportTicketModel {
  id: number;
  ticketNo: string;
  customerName: string;
  customerEmail: string;
  organization?: string | null;
  subject: string;
  status: string;
  createdAtUtc: string;
  lastMessageAtUtc: string;
  isClosed: boolean;
  assignedAdminEmail?: string | null;
  messages: SupportTicketMessageModel[];
}