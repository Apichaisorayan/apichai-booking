-- Migration number: 0NaN 	 2026-03-11T12:11:23.679Z
-- Add patient_hn column to bookings table

ALTER TABLE bookings ADD COLUMN patient_hn TEXT;
