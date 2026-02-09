export interface OutreachMessage {
  id: string;
  member_id: string;
  member_name: string;
  message_type: string;
  message_text: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  custom_topic: string | null;
}
