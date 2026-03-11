// This is a wrapper component that filters rooms for meeting mode
import { RoomManagement } from './RoomManagement';

export function MeetingRoomManagement() {
  // Pass meeting mode to RoomManagement
  return <RoomManagement mode="meeting" />;
}
