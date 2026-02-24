export interface Reservation {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  responsible_name: string;
  event_type?: string;
  num_people?: number;
  contact?: string;
  deposit_amount?: number;
  deposit_status: "pending" | "paid" | "returned";
  menu_choice?: string;
  menu_price?: number;
  observations?: string;
  admin_observations?: string;
  status: "pending" | "confirmed" | "cancelled" | "archived";
  rooms?: { name: string; color?: string };
}