-- Seed Mock Data for Beauty Clinic Booking System
-- This migration populates the database with sample users, rooms, machines, procedures, and bookings

-- ============================================
-- 1. SEED USERS (Doctors, Nurses, Staff, Admin)
-- ============================================

INSERT OR IGNORE INTO users (id, name, email, password, role, is_available) VALUES
-- Doctors
('u1', 'นพ.สมชาย ใจดี', 'doctor1@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 1),
('u2', 'พญ.วิภา รักดี', 'doctor2@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 1),
('u5', 'นพ.เกษม สุขสวัสดิ์', 'doctor3@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 1),
('u6', 'พญ.นลินี งามวิไล', 'doctor4@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 1),
('u7', 'นพ.วรวิทย์ จันทร์สว่าง', 'doctor5@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 1),
('u9', 'พญ.มนัสนันท์ รัตนโชติ', 'doctor6@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 1),
('u10', 'นพ.ธนาวุฒิ เกียรติเลิศ', 'doctor7@clinic.com', '$2a$10$dummy.hash.for.testing', 'DOCTOR', 0),
-- Nurses
('u3', 'พยาบาล อรุณ สุขใส', 'nurse1@clinic.com', '$2a$10$dummy.hash.for.testing', 'SALES', 1),
('u8', 'พยาบาล สายใจ บริบาล', 'nurse2@clinic.com', '$2a$10$dummy.hash.for.testing', 'SALES', 1),
('u11', 'พยาบาล ขวัญใจ สร้อยทอง', 'nurse3@clinic.com', '$2a$10$dummy.hash.for.testing', 'SALES', 1),
-- Staff
('u12', 'เจ้าหน้าที่ ตะวัน จันทรา', 'staff1@clinic.com', '$2a$10$dummy.hash.for.testing', 'CRM', 1),
-- Admin
('u4', 'Admin ระบบ', 'admin@clinic.com', '$2a$10$dummy.hash.for.testing', 'ADMIN', 1);

-- ============================================
-- 2. SEED ROOMS
-- ============================================

INSERT OR IGNORE INTO rooms (id, name, room_type, is_available) VALUES
-- Treatment Rooms
('r1', 'ห้องหัตถการ A', 'TREATMENT', 1),
('r2', 'ห้องหัตถการ B', 'TREATMENT', 1),
('r5', 'ห้องหัตถการ C', 'TREATMENT', 1),
('r7', 'ห้องหัตถการ D', 'TREATMENT', 1),
-- Consultation Rooms
('r6', 'ห้องประเมิน 1', 'CONSULTATION', 1),
('r8', 'ห้องประเมิน 2', 'CONSULTATION', 1),
('r9', 'ห้องให้คำปรึกษา 1', 'CONSULTATION', 1),
-- Prep/Lounge Rooms
('r11', 'Lounge 1 (L1)', 'PREP', 1),
('r12', 'Lounge 2 (L2)', 'PREP', 1),
('r13', 'Lounge 3 (L3)', 'PREP', 1),
('r14', 'Lounge 4 (L4)', 'BOTH', 1),
-- Meeting Rooms
('r3', 'ห้องประชุม 1', 'MEETING', 1),
('r4', 'ห้องประชุม 2', 'MEETING', 1),
('r10', 'Executive Room', 'MEETING', 1);

-- ============================================
-- 3. SEED MACHINES
-- ============================================

INSERT OR IGNORE INTO machines (id, name, type, machine_type_category, is_available) VALUES
-- Medical Equipment
('m1', 'เลเซอร์ Fotona', 'FIXED', 'MEDICAL', 1),
('m2', 'เลเซอร์ CO2', 'FIXED', 'MEDICAL', 1),
('m3', 'Ultrasound', 'MOVABLE', 'MEDICAL', 1),
('m5', 'Hifu Ultraformer III', 'FIXED', 'MEDICAL', 1),
('m6', 'Discovery PICO', 'FIXED', 'MEDICAL', 1),
('m7', 'Thermage FLX', 'FIXED', 'MEDICAL', 1),
('m8', 'CoolSculpting Elite', 'FIXED', 'MEDICAL', 1),
('m9', 'V-Shape Muscle', 'MOVABLE', 'MEDICAL', 1),
('m11', 'Ultherapy', 'FIXED', 'MEDICAL', 1),
('m12', 'Morpheus8', 'FIXED', 'MEDICAL', 1),
('m13', 'Candela GentleYAG', 'FIXED', 'MEDICAL', 1),
('m14', 'Dual Yellow Laser', 'FIXED', 'MEDICAL', 1),
('m15', 'HEALITE II', 'MOVABLE', 'MEDICAL', 1),
-- Meeting Equipment
('m4', 'Projector A', 'FIXED', 'MEETING', 1),
('m10', 'Projector B', 'FIXED', 'MEETING', 1);

-- ============================================
-- 4. SEED PROCEDURES
-- ============================================

INSERT OR IGNORE INTO procedures (id, name, duration_minutes, is_active, description) VALUES
('p1', 'เลเซอร์ Fotona', 60, 1, 'รักษาผิวและกระชับใบหน้า'),
('p2', 'Botox (Allergan/Nabota)', 30, 1, 'ฉีดลดริ้วรอย ปรับรูปหน้า'),
('p3', 'Filler (Juvederm/Restylane)', 45, 1, 'ฉีดเติมเต็มร่องลึก ปรับรูปหน้า'),
('p4', 'ปรึกษาแพทย์ (Discovery)', 20, 1, 'ปรึกษาแพทย์และวิเคราะห์ผิว'),
('p5', 'ยกกระชับ Hifu Full Face', 90, 1, 'ยกกระชับใบหน้าและเหนียง'),
('p6', 'เลเซอร์ CO2 (จี้ไฝ/กระเนื้อ)', 40, 1, 'จี้กำจัดไฝ ขี้แมลงวัน กระเนื้อ'),
('p7', 'Meso Fat (Lipo-X)', 20, 1, 'ฉีดสลายไขมันเฉพาะจุด'),
('p8', 'Thermage FLX 900 Shots', 120, 1, 'ยกกระชับผิวหน้าขั้นสูงสุด'),
('p9', 'Aura Skin Treatment', 45, 1, 'ผลักวิตามินหน้าใส'),
('p10', 'miraDry (ลดเหงื่อ/กลิ่นตัว)', 150, 1, 'รักษาภาวะเหงื่อออกมากที่รักแร้'),
('p11', 'Ultherapy Full Face', 90, 1, 'ยกกระชับด้วยเทคโนโลยีเสียง'),
('p12', 'Morpheus8 Face & Neck', 60, 1, 'กระชับผิวระดับลึก'),
('p13', 'กำจัดขน GentleYAG', 30, 1, 'เลเซอร์กำจัดขนรักแร้/ขา'),
('p14', 'ฉีดวิตามินผิว (IV Drip)', 45, 1, 'เติมสารอาหารทางหลอดเลือด'),
('p15', 'Thread Lift (ร้อยไหม)', 60, 1, 'ร้อยไหมยกกระชับปรับรูปหน้า'),
('p16', 'PRP Face Bio-Repair', 60, 1, 'บำรุงผิวด้วยเกล็ดเลือดตัวเอง'),
('p17', 'Advanced Acne Clear', 45, 1, 'รักษาสิวอักเสบและกดสิว');

-- Note: Bookings with dynamic dates will be handled by application code
-- This migration only sets up the master data (users, rooms, machines, procedures)
