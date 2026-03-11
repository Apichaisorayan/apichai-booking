
-- 1. เพิ่มห้องสำหรับการทำ miraDry
INSERT OR IGNORE INTO rooms (id, name, room_type, is_available) VALUES ('room-c1', 'C1', 'CONSULTATION', 1);
INSERT OR IGNORE INTO rooms (id, name, room_type, is_available) VALUES ('room-c2', 'C2', 'CONSULTATION', 1);
INSERT OR IGNORE INTO rooms (id, name, room_type, is_available) VALUES ('room-tr1-local', 'TR1', 'TREATMENT', 1);
INSERT OR IGNORE INTO rooms (id, name, room_type, is_available) VALUES ('room-tr3-local', 'TR3', 'TREATMENT', 1);

-- 2. เพิ่มเครื่อง miraDry
INSERT OR IGNORE INTO machines (id, name, type, is_available) VALUES ('machine-miradry-local', 'miraDry', 'MOVABLE', 1);

-- 3. เพิ่ม/อัปเดต หัตถการ miraDry
INSERT OR IGNORE INTO procedures (id, name, duration_minutes, requires_doctor) 
VALUES ('proc-miradry', 'miraDry', 120, 1);

UPDATE procedures SET requires_doctor = 1 WHERE name LIKE '%miraDry%';
