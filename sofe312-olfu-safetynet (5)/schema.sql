
-- OLFU SafetyNet MySQL Database Schema

CREATE DATABASE IF NOT EXISTS olfu_safetynet;
USE olfu_safetynet;

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'SafetyOfficer', 'Supervisor', 'Staff') NOT NULL,
    worker_id VARCHAR(50)
);

-- 2. Workers Table
CREATE TABLE workers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    skill_level ENUM('Junior', 'Mid', 'Senior', 'Expert') DEFAULT 'Junior',
    productivity_score INT DEFAULT 100,
    fatigue_level INT DEFAULT 0,
    current_location VARCHAR(255) DEFAULT 'RISE Tower',
    heart_rate INT DEFAULT 75,
    body_temp DECIMAL(4, 1) DEFAULT 36.5,
    oxygen_level INT DEFAULT 98,
    ppe_compliant BOOLEAN DEFAULT TRUE,
    safety_status ENUM('Pending', 'Cleared', 'Rejected', 'Deployed') DEFAULT 'Pending'
);

-- 3. Shift Reports Table
CREATE TABLE shift_reports (
    id VARCHAR(50) PRIMARY KEY,
    worker_id VARCHAR(50),
    worker_name VARCHAR(100),
    date_str VARCHAR(50),
    time_str VARCHAR(50),
    location VARCHAR(255),
    final_hr INT,
    final_temp DECIMAL(4, 1),
    completion_photo LONGTEXT, -- Base64 storage
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- 4. Incidents Table
CREATE TABLE incidents (
    id VARCHAR(50) PRIMARY KEY,
    date_str VARCHAR(50),
    type VARCHAR(100),
    severity ENUM('Low', 'Medium', 'High', 'Critical'),
    description TEXT,
    location VARCHAR(255)
);

-- Seed Initial Data
INSERT INTO users (id, username, name, role, worker_id) VALUES 
('u1', 'admin', 'System Administrator', 'Admin', NULL),
('u2', 'delaney', 'Delaney Ame', 'SafetyOfficer', '7');

INSERT INTO workers (id, name, role, skill_level, productivity_score, fatigue_level, current_location, safety_status) VALUES
('7', 'Delaney Ame', 'Safety Officer', 'Senior', 94, 10, 'RISE Tower', 'Cleared');
