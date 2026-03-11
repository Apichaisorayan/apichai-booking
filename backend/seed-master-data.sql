-- ============================================
-- MASTER DATA SEED (Based on Clinic Excel Table)
-- ============================================

-- CLEAR OLD MASTER DATA
DELETE FROM machine_rooms;
DELETE FROM machine_procedures;
DELETE FROM booking_procedures;
DELETE FROM procedures;
DELETE FROM machines;
DELETE FROM rooms;

-- 1. จัดการห้องหัตถการ (Rooms)
INSERT OR REPLACE INTO rooms (id, name, room_type, is_available) VALUES 
('room-c1', 'C1', 'CONSULTATION', 1),
('room-c2', 'C2', 'CONSULTATION', 1),
('room-tr1', 'TR1', 'TREATMENT', 1),
('room-tr2', 'TR2', 'TREATMENT', 1),
('room-tr3', 'TR3', 'TREATMENT', 1),
('room-tr4', 'TR4', 'TREATMENT', 1),
('room-l1', 'L1', 'PREP', 1),
('room-l2', 'L2', 'PREP', 1),
('room-l3', 'L3', 'PREP', 1),
('room-l4', 'L4', 'PREP', 1),
('room-prep', 'Standard Prep Room', 'PREP', 1);

-- 2. จัดการเครื่องมือและอุปกรณ์ (Machines)
INSERT OR REPLACE INTO machines (id, name, type, is_available, room_id) VALUES 
('m-ulthera', 'Ulthera', 'MOVABLE', 1, NULL),
('m-thermage', 'Thermage', 'MOVABLE', 1, NULL),
('m-morpheus', 'Morpheus', 'MOVABLE', 1, NULL),
('m-emface', 'Emface', 'MOVABLE', 1, NULL),
('m-pico', 'Pico', 'FIXED', 1, 'room-tr4'),
('m-ematrix', 'Ematrix', 'MOVABLE', 1, NULL),
('m-fotona', 'Fotona', 'FIXED', 1, 'room-tr2'),
('m-emax', 'Emax', 'MOVABLE', 1, NULL),
('m-aurora', 'Aurora', 'MOVABLE', 1, NULL),
('m-proyellow', 'Proyellow', 'MOVABLE', 1, NULL),
('m-plxer', 'Plxer', 'MOVABLE', 1, NULL),
('m-diode', 'Diode ไม่มีหมอ', 'MOVABLE', 1, NULL),
('m-injection', 'หัตถการฉีดไม่ใช้เครื่อง', 'MOVABLE', 1, NULL),
('m-noneedle', 'No needle', 'MOVABLE', 1, NULL),
('m-vital', 'Vital Injector', 'MOVABLE', 1, NULL),
('m-miradry', 'miraDry', 'MOVABLE', 1, NULL),
('m-skinpen', 'Skinpen', 'MOVABLE', 1, NULL),
('m-plasmalis', 'Plasmalis', 'MOVABLE', 1, NULL),
('m-tesla', 'Tesla', 'FIXED', 1, 'room-l4'),
('m-dcool', 'D-Cool', 'MOVABLE', 1, NULL);

INSERT OR REPLACE INTO procedures (id, name, duration_minutes, prep_duration_minutes, requires_doctor, requires_prep_room) VALUES 
('p-ulthera-300', 'Ultherapy 300-400 lines', 60, 60, 1, 1),
('p-ulthera-500', 'Ultherapy 500-600 lines', 90, 60, 1, 1),
('p-thermage-900', 'Thermage 900 หน้า', 90, 60, 1, 1),
('p-thermage-450', 'Thermage 450 ตา', 45, 60, 1, 1),
('p-thermage-500', 'Thermage 500 ตัว', 45, 60, 1, 1),
('p-morpheus-face', 'Morpheus หน้า', 60, 60, 1, 1),
('p-morpheus-eye', 'Morpheus ตา', 45, 60, 1, 1),
('p-morpheus-body', 'Morpheus ตัว', 60, 60, 1, 1),
('p-emface', 'Emface', 30, 0, 1, 0),
('p-pico-bright', 'Pico Bright', 30, 30, 1, 1),
('p-pico-deep', 'Pico หลุมสิว', 30, 45, 1, 1),
('p-pico-scar', 'Pico รอยแผล', 30, 0, 1, 0),
('p-pico-tummy', 'Pico TummyTuck/ตัดหนังทุกส่วน', 30, 30, 1, 1),
('p-ematrix', 'Ematrix', 30, 60, 1, 1),
('p-fotona-4d', '4D', 45, 0, 1, 0),
('p-fotona-4d-1step', '4D 1 step', 30, 0, 1, 0),
('p-fotona-virgin', 'Virgin Lift', 30, 30, 1, 1),
('p-fotona-snoring', 'นอนกรน ครั้ง 2,3,4', 30, 0, 1, 0),
('p-fotona-beard', 'เลเซอร์หนวด', 30, 30, 1, 1),
('p-fotona-neck', 'เลเซอร์เครา', 30, 30, 1, 1),
('p-fotona-face', 'เลเซอร์ขนหน้า', 30, 30, 1, 1),
('p-emax-trinity', 'Emax Trinity', 60, 0, 1, 0),
('p-aurora', 'Aurora', 30, 0, 1, 0),
('p-proyellow', 'Proyellow', 30, 0, 1, 0),
('p-plxer', 'Plxer จี้ไฝ ขี้แมลงวัน กระ', 30, 30, 1, 1),
('p-diode-bikini', 'เลเซอร์กำจัดขนบิกินี่', 30, 0, 0, 0),
('p-diode-arm', 'เลเซอร์กำจัดขนแขน', 30, 0, 0, 0),
('p-diode-armpit', 'เลเซอร์กำจัดขนรักแร้', 30, 0, 0, 0),
('p-diode-leg', 'เลเซอร์กำจัดขนขา', 60, 0, 0, 0),
('p-botox', 'Botox', 30, 30, 1, 1),
('p-filler', 'Filler', 60, 30, 1, 1),
('p-radiesse', 'Radiesse', 60, 30, 1, 1),
('p-rejuran', 'Rejuran', 30, 30, 1, 1),
('p-revive', 'Revive', 30, 30, 1, 1),
('p-skinvive', 'Skinvive', 30, 30, 1, 1),
('p-profhilo', 'Profhilo', 30, 30, 1, 1),
('p-noneedle', 'Rejuran no needle', 30, 0, 1, 0),
('p-prp', 'Prp', 30, 60, 1, 1),
('p-miradry', 'miraDry', 180, 0, 1, 1),
('p-skinpen', 'Skinpen', 30, 30, 1, 1),
('p-plasmalis', 'Plasmalis', 30, 0, 0, 0),
('p-tesla', 'Tesla Former', 30, 0, 0, 0),
('p-dcool', 'F/U miraDry', 45, 0, 0, 0),
('p-consultation', 'ปรึกษา', 30, 0, 1, 0);

-- 4. เชื่อมโยงเครื่องมือกับหัตถการ (Machine_Procedures)
INSERT OR REPLACE INTO machine_procedures (id, machine_id, procedure_id) VALUES 
('mp1', 'm-ulthera', 'p-ulthera-300'), ('mp2', 'm-ulthera', 'p-ulthera-500'),
('mp3', 'm-thermage', 'p-thermage-900'), ('mp4', 'm-thermage', 'p-thermage-450'), ('mp5', 'm-thermage', 'p-thermage-500'),
('mp6', 'm-morpheus', 'p-morpheus-face'), ('mp7', 'm-morpheus', 'p-morpheus-eye'), ('mp8', 'm-morpheus', 'p-morpheus-body'),
('mp9', 'm-emface', 'p-emface'),
('mp10', 'm-pico', 'p-pico-bright'), ('mp11', 'm-pico', 'p-pico-deep'), ('mp12', 'm-pico', 'p-pico-scar'), ('mp13', 'm-pico', 'p-pico-tummy'),
('mp14', 'm-ematrix', 'p-ematrix'),
('mp15', 'm-fotona', 'p-fotona-4d'), ('mp16', 'm-fotona', 'p-fotona-4d-1step'), ('mp17', 'm-fotona', 'p-fotona-virgin'), ('mp18', 'm-fotona', 'p-fotona-snoring'), ('mp19', 'm-fotona', 'p-fotona-beard'), ('mp20', 'm-fotona', 'p-fotona-neck'), ('mp21', 'm-fotona', 'p-fotona-face'),
('mp22', 'm-emax', 'p-emax-trinity'), ('mp23', 'm-aurora', 'p-aurora'),
('mp24', 'm-proyellow', 'p-proyellow'), ('mp25', 'm-plxer', 'p-plxer'),
('mp26', 'm-diode', 'p-diode-bikini'), ('mp27', 'm-diode', 'p-diode-arm'), ('mp28', 'm-diode', 'p-diode-armpit'), ('mp29', 'm-diode', 'p-diode-leg'),
('mp30', 'm-injection', 'p-botox'), ('mp31', 'm-injection', 'p-filler'), ('mp32', 'm-injection', 'p-radiesse'), ('mp33', 'm-injection', 'p-rejuran'), ('mp34', 'm-injection', 'p-revive'), ('mp35', 'm-injection', 'p-skinvive'), ('mp36', 'm-injection', 'p-profhilo'),
('mp37', 'm-noneedle', 'p-noneedle'),
('mp38', 'm-vital', 'p-prp'),
('mp39', 'm-miradry', 'p-miradry'),
('mp40', 'm-skinpen', 'p-skinpen'),
('mp41', 'm-plasmalis', 'p-plasmalis'),
('mp42', 'm-tesla', 'p-tesla'),
('mp43', 'm-dcool', 'p-dcool'),
('mp-c1', 'm-ulthera', 'p-consultation'),
('mp-c2', 'm-thermage', 'p-consultation'),
('mp-c3', 'm-morpheus', 'p-consultation'),
('mp-c4', 'm-emface', 'p-consultation'),
('mp-c5', 'm-pico', 'p-consultation'),
('mp-c6', 'm-ematrix', 'p-consultation'),
('mp-c7', 'm-fotona', 'p-consultation'),
('mp-c8', 'm-emax', 'p-consultation'),
('mp-c9', 'm-aurora', 'p-consultation'),
('mp-c10', 'm-proyellow', 'p-consultation'),
('mp-c11', 'm-plxer', 'p-consultation'),
('mp-c12', 'm-diode', 'p-consultation'),
('mp-c13', 'm-injection', 'p-consultation'),
('mp-c14', 'm-noneedle', 'p-consultation'),
('mp-c15', 'm-vital', 'p-consultation'),
('mp-c16', 'm-miradry', 'p-consultation'),
('mp-c17', 'm-skinpen', 'p-consultation'),
('mp-c18', 'm-plasmalis', 'p-consultation'),
('mp-c19', 'm-tesla', 'p-consultation'),
('mp-c20', 'm-dcool', 'p-consultation');


-- 5. จัดการเครื่องมือล็อคห้อง (Machine_Rooms Junction Table)
INSERT OR REPLACE INTO machine_rooms (id, machine_id, room_id) VALUES 
('mr-pico-tr4', 'm-pico', 'room-tr4'),
('mr-fotona-tr2', 'm-fotona', 'room-tr2'),
('mr-tesla-l4', 'm-tesla', 'room-l4'),
('mr-diode-tr1', 'm-diode', 'room-tr1'),
('mr-diode-tr3', 'm-diode', 'room-tr3'),
('mr-diode-tr4', 'm-diode', 'room-tr4'),
('mr-miradry-tr1', 'm-miradry', 'room-tr1'),
('mr-miradry-tr3', 'm-miradry', 'room-tr3');
