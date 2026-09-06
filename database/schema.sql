-- ============================================================
-- An Improved Application-Based Bus Transport Booking and
-- Seat Reservation System for ATBU, Bauchi
-- Database Schema (MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS atbu_bus_booking;
USE atbu_bus_booking;

-- ------------------------------------------------------------
-- Users: students/staff who book seats, and admins who manage
-- ------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    matric_or_staff_no VARCHAR(50) UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'staff', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Routes: currently just Yelwa <-> Gubi, but kept generic
-- ------------------------------------------------------------
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    distance_km DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Buses: physical shuttle vehicles
-- ------------------------------------------------------------
CREATE TABLE buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    capacity INT NOT NULL DEFAULT 18,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Trips: a specific bus running a specific route at a set time
-- ------------------------------------------------------------
CREATE TABLE trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    bus_id INT NOT NULL,
    departure_time DATETIME NOT NULL,
    fare DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    status ENUM('scheduled', 'departed', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Seats: generated per trip based on the bus capacity, so
-- availability can be tracked and locked per seat
-- ------------------------------------------------------------
CREATE TABLE seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    UNIQUE KEY unique_seat_per_trip (trip_id, seat_number)
);

-- ------------------------------------------------------------
-- Bookings: a user's reservation of a specific seat on a trip
-- ------------------------------------------------------------
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    trip_id INT NOT NULL,
    seat_id INT NOT NULL,
    booking_reference VARCHAR(20) NOT NULL UNIQUE,
    status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Payments: records against a booking
-- ------------------------------------------------------------
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer', 'wallet', 'paystack') NOT NULL DEFAULT 'paystack',
    paystack_reference VARCHAR(100) UNIQUE,
    status ENUM('pending', 'successful', 'failed') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Seed data: the Yelwa-Gubi route and a couple of buses
-- ------------------------------------------------------------
INSERT INTO routes (origin, destination, distance_km) VALUES
    ('Yelwa Campus', 'Gubi Campus', 12.5),
    ('Gubi Campus', 'Yelwa Campus', 12.5);

INSERT INTO buses (plate_number, capacity) VALUES
    ('ATBU-001-BAU', 18),
    ('ATBU-002-BAU', 18);
