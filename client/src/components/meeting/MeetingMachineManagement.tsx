// This is a wrapper component that filters machines for meeting mode
import { MachineManagement } from './MachineManagement';

export function MeetingMachineManagement() {
  // Pass meeting mode to MachineManagement
  return <MachineManagement mode="meeting" />;
}
