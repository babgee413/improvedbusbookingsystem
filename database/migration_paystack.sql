-- Migration: add Paystack support to the payments table
-- Run this if your database already exists from before Paystack integration.

USE atbu_bus_booking;

ALTER TABLE payments
    ADD COLUMN paystack_reference VARCHAR(100) UNIQUE AFTER payment_method;

ALTER TABLE payments
    MODIFY COLUMN payment_method ENUM('cash', 'card', 'transfer', 'wallet', 'paystack') NOT NULL DEFAULT 'paystack';
