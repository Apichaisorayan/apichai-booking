-- ============================================
-- SEED MACHINES WITH PROCEDURES MAPPING
-- เชื่อมโยงเครื่องมือกับหัตถการตามตาราง
-- ============================================

-- ลบข้อมูลเก่า
DELETE FROM machine_procedures;
DELETE FROM machines WHERE machine_type_category = 'MEDICAL';

-- ============================================
-- INSERT MACHINES
-- ============================================

-- Ulthera (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-ulthera', 'Ulthera', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Thermage (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-thermage', 'Thermage', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Morpheus (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-morpheus', 'Morpheus', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Emface (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-emface', 'Emface', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Pico (TR4 เท่านั้น - FIXED)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-pico', 'Pico', 'FIXED', 'MEDICAL', '236dd1e8-19f0-421f-b73e-61bfec38c26b', 1);

-- Ematrix (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-ematrix', 'Ematrix', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Fotona (TR2 เท่านั้น - FIXED)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-fotona', 'Fotona', 'FIXED', 'MEDICAL', '27f75cb7-f082-4fe2-8c87-772f4e9431b0', 1);

-- Emax (TR1 หรือ TR3 - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-emax', 'Emax', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Aurora (TR1 หรือ TR3 - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-aurora', 'Aurora', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Proyellow (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-proyellow', 'Proyellow', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Plxer (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-plxer', 'Plxer', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Diode (TR1, TR3, TR4 - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-diode', 'Diode', 'MOVABLE', 'MEDICAL', NULL, 1);

-- หัตถการฉีดไม่ใช้เครื่อง (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-no-machine', 'หัตถการฉีดไม่ใช้เครื่อง', 'MOVABLE', 'MEDICAL', NULL, 1);

-- No needle (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-no-needle', 'No needle', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Vital Injector (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-vital-injector', 'Vital Injector', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Skinpen (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-skinpen', 'Skinpen', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Plasmalis (ทุกห้อง - MOVABLE)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-plasmalis', 'Plasmalis', 'MOVABLE', 'MEDICAL', NULL, 1);

-- Tesla (Lounge4 เท่านั้น - FIXED)
INSERT INTO machines (id, name, type, machine_type_category, room_id, is_available) VALUES
('machine-tesla', 'Tesla', 'FIXED', 'MEDICAL', '6125e1ef-a757-45eb-a795-963b12275fea', 1);

-- ============================================
-- LINK MACHINES TO PROCEDURES
-- ============================================

-- Ulthera
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-ulthera-1', 'machine-ulthera', 'proc-ulthera-300-400'),
('mp-ulthera-2', 'machine-ulthera', 'proc-ulthera-500-600');

-- Thermage
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-thermage-1', 'machine-thermage', 'proc-thermage-900'),
('mp-thermage-2', 'machine-thermage', 'proc-thermage-450'),
('mp-thermage-3', 'machine-thermage', 'proc-thermage-500');

-- Morpheus
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-morpheus-1', 'machine-morpheus', 'proc-morpheus-face'),
('mp-morpheus-2', 'machine-morpheus', 'proc-morpheus-eye'),
('mp-morpheus-3', 'machine-morpheus', 'proc-morpheus-body');

-- Emface
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-emface-1', 'machine-emface', 'proc-emface');

-- Pico
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-pico-1', 'machine-pico', 'proc-pico-bright'),
('mp-pico-2', 'machine-pico', 'proc-pico-scars'),
('mp-pico-3', 'machine-pico', 'proc-pico-marks'),
('mp-pico-4', 'machine-pico', 'proc-pico-tummy');

-- Ematrix
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-ematrix-1', 'machine-ematrix', 'proc-ematrix');

-- Fotona
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-fotona-1', 'machine-fotona', 'proc-fotona-4d'),
('mp-fotona-2', 'machine-fotona', 'proc-fotona-4d-1step'),
('mp-fotona-3', 'machine-fotona', 'proc-fotona-virgin-lift'),
('mp-fotona-4', 'machine-fotona', 'proc-fotona-snoring-consult'),
('mp-fotona-5', 'machine-fotona', 'proc-fotona-mustache'),
('mp-fotona-6', 'machine-fotona', 'proc-fotona-beard'),
('mp-fotona-7', 'machine-fotona', 'proc-fotona-face-hair');

-- Emax
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-emax-1', 'machine-emax', 'proc-emax-trinity');

-- Aurora
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-aurora-1', 'machine-aurora', 'proc-aurora');

-- Proyellow
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-proyellow-1', 'machine-proyellow', 'proc-proyellow');

-- Plxer
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-plxer-1', 'machine-plxer', 'proc-plxer');

-- Diode
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-diode-1', 'machine-diode', 'proc-diode-bikini'),
('mp-diode-2', 'machine-diode', 'proc-diode-arm'),
('mp-diode-3', 'machine-diode', 'proc-diode-armpit'),
('mp-diode-4', 'machine-diode', 'proc-diode-leg');

-- หัตถการฉีดไม่ใช้เครื่อง
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-no-machine-1', 'machine-no-machine', 'proc-botox'),
('mp-no-machine-2', 'machine-no-machine', 'proc-filler'),
('mp-no-machine-3', 'machine-no-machine', 'proc-radiesse'),
('mp-no-machine-4', 'machine-no-machine', 'proc-rejuran'),
('mp-no-machine-5', 'machine-no-machine', 'proc-revive'),
('mp-no-machine-6', 'machine-no-machine', 'proc-skinvive'),
('mp-no-machine-7', 'machine-no-machine', 'proc-profhilo');

-- No needle
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-no-needle-1', 'machine-no-needle', 'proc-rejuran-no-needle');

-- Vital Injector
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-vital-injector-1', 'machine-vital-injector', 'proc-prp');

-- Skinpen
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-skinpen-1', 'machine-skinpen', 'proc-skinpen');

-- Plasmalis
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-plasmalis-1', 'machine-plasmalis', 'proc-plasmalis');

-- Tesla
INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES
('mp-tesla-1', 'machine-tesla', 'proc-tesla-former');
