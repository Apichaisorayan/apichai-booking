-- Add booking_type field to distinguish between procedure and meeting bookings
ALTER TABLE bookings ADD COLUMN booking_type TEXT DEFAULT 'PROCEDURE' CHECK(booking_type IN ('PROCEDURE', 'MEETING'));

-- Add booking_type field to rooms
ALTER TABLE rooms ADD COLUMN room_type TEXT DEFAULT 'PROCEDURE' CHECK(room_type IN ('PROCEDURE', 'MEETING', 'BOTH'));

-- Add booking_type field to machines
ALTER TABLE machines ADD COLUMN machine_type_category TEXT DEFAULT 'MEDICAL' CHECK(machine_type_category IN ('MEDICAL', 'MEETING'));

-- Add indexes for faster filtering
CREATE INDEX idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX idx_rooms_room_type ON rooms(room_type);
CREATE INDEX idx_machines_machine_type_category ON machines(machine_type_category);
