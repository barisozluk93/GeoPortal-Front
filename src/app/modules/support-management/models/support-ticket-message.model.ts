export class SupportTicketMessageModel {
  id: string;
  ticketId: string;
  senderType: 'Customer' | 'Admin' | 'System';
  channel: 'ContactForm' | 'Email' | 'AdminPanel' | 'System';
  senderEmail?: string | null;
  body: string;
  externalMessageId?: string | null;
  inReplyToExternalMessageId?: string | null;
  createdAtUtc: string;
}