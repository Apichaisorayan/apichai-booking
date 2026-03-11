-- ============================================
-- SEED PROCEDURES WITH ANESTHESIA TIME
-- อัปเดตข้อมูลหัตถการพร้อมเวลาแป๊ะยาชา
-- ============================================

-- ลบข้อมูลเก่า
DELETE FROM booking_procedures;
DELETE FROM machine_procedures;
DELETE FROM procedures;

-- ============================================
-- INSERT PROCEDURES (หัตถการ)
-- name, duration_minutes, anesthesia_minutes (in minutes)
-- ============================================

-- Ulthera (1 hr = 60 min, 1 hr 30m = 90 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-ulthera-300-400', 'Ultherapy 300-400 lines', 60, 60, 1),
('proc-ulthera-500-600', 'Ultherapy 500-600 lines', 90, 60, 1);

-- Thermage (1 hr = 60 min, 45m = 45 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-thermage-900', 'Thermage 900 หน้า', 90, 60, 1),
('proc-thermage-450', 'Thermage 450 ตา', 45, 60, 1),
('proc-thermage-500', 'Thermage 500 ตัว', 45, 60, 1);

-- Morpheus (1 hr = 60 min, 45m = 45 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-morpheus-face', 'Morpheus หน้า', 60, 60, 1),
('proc-morpheus-eye', 'Morpheus ตา', 45, 60, 1),
('proc-morpheus-body', 'Morpheus ตัว', 60, 60, 1);

-- Emface (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-emface', 'Emface', 30, 0, 1);

-- Pico (30m = 30 min, 45m = 45 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-pico-bright', 'Pico Bright', 30, 30, 1),
('proc-pico-scars', 'Pico หลุมสิว', 30, 45, 1),
('proc-pico-marks', 'Pico รอยแผล', 30, 0, 1),
('proc-pico-tummy', 'Pico TummyTuck/ตัดหนังทุกส่วน', 30, 30, 1);

-- Ematrix (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-ematrix', 'Ematrix', 30, 60, 1);

-- Fotona (45m = 45 min, 30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-fotona-4d', '4D', 45, 0, 1),
('proc-fotona-4d-1step', '4D 1 step', 30, 0, 1),
('proc-fotona-virgin-lift', 'Virgin Lift', 30, 30, 1),
('proc-fotona-snoring-consult', 'นอนกรน ครั้ง 2,3,4', 30, 0, 1),
('proc-fotona-mustache', 'เลเซอร์หนวด', 30, 30, 1),
('proc-fotona-beard', 'เลเซอร์เครา', 30, 30, 1),
('proc-fotona-face-hair', 'เลเซอร์ขนหน้า', 30, 30, 1);

-- Emax (1 hr = 60 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-emax-trinity', 'Emax Trinity', 60, 0, 1);

-- Aurora (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-aurora', 'Aurora', 30, 0, 1);

-- Proyellow (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-proyellow', 'Proyellow', 30, 0, 1);

-- Plxer (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-plxer', 'Plxer จี้ไฝ ขี้แมลงวัน กระ', 30, 30, 1);

-- Diode (30m = 30 min, 1 hr = 60 min) - เจ้าหน้าที่ทำ
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-diode-bikini', 'เลเซอร์กำจัดขนบิกินี่', 30, 0, 1),
('proc-diode-arm', 'เลเซอร์กำจัดขนแขน', 30, 0, 1),
('proc-diode-armpit', 'เลเซอร์กำจัดขนรักแร้', 30, 0, 1),
('proc-diode-leg', 'เลเซอร์กำจัดขนขา', 60, 0, 1);

-- หัตถการฉีดไม่ใช้เครื่อง (30m = 30 min, 1 hr = 60 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-botox', 'Botox', 30, 30, 1),
('proc-filler', 'Filler', 60, 30, 1),
('proc-radiesse', 'Radiesse', 60, 30, 1),
('proc-rejuran', 'Rejuran', 30, 30, 1),
('proc-revive', 'Revive', 30, 30, 1),
('proc-skinvive', 'Skinvive', 30, 30, 1),
('proc-profhilo', 'Profhilo', 30, 30, 1);

-- No needle (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-rejuran-no-needle', 'Rejuran no needle', 30, 0, 1);

-- Vital Injector - PRP (30m = 30 min, ยาชา + เจาะเลือด 1 hr)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-prp', 'Prp', 30, 60, 1);

-- Skinpen (30m = 30 min)
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-skinpen', 'Skinpen', 30, 30, 1);

-- Plasmalis (30m = 30 min) - เจ้าหน้าที่ทำ
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-plasmalis', 'Plasmalis', 0, 30, 1);

-- Tesla (30m = 30 min) - เจ้าหน้าที่ทำ
INSERT INTO procedures (id, name, duration_minutes, anesthesia_minutes, is_active) VALUES
('proc-tesla-former', 'Tesla Former', 0, 30, 1);
