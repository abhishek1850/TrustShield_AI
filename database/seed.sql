-- TrustShield AI - Seed Data
-- Bank of Baroda Hackathon 2026

-- Password hash for 'password123' (bcrypt: $2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O)
-- Insert Users
INSERT INTO users (username, email, password_hash, role, is_locked) VALUES
('admin_system', 'admin@bob.in', '$2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O', 'Admin', FALSE),
('analyst_vikram', 'vikram.analyst@bob.in', '$2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O', 'SecurityAnalyst', FALSE),
('mgr_amit', 'amit.manager@bob.in', '$2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O', 'BranchManager', FALSE),
('emp_sunita', 'sunita.employee@bob.in', '$2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O', 'Employee', FALSE),
('cust_rajesh', 'rajesh.customer@gmail.com', '$2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O', 'Customer', FALSE),
('cust_priya', 'priya.customer@gmail.com', '$2a$10$1/0qICee900kEJyUfG1Jc.fdEg.kHrFP9PBBbg6wZW.UMmQxoa03O', 'Customer', FALSE);

-- Insert Devices
INSERT INTO devices (user_id, device_fingerprint, device_name, device_type, os, browser, status) VALUES
(5, 'fp_rajesh_mobile_9823', 'Rajesh OnePlus 11', 'Mobile', 'Android 13', 'Chrome Mobile', 'Trusted'),
(5, 'fp_rajesh_laptop_1120', 'Rajesh Dell XPS', 'Laptop', 'Windows 11', 'Edge', 'Trusted'),
(4, 'fp_sunita_desktop_0021', 'Sunita Branch Workstation 4', 'Desktop', 'Windows 10', 'Chrome', 'Trusted'),
(2, 'fp_vikram_workstation_soc', 'Vikram SOC Workstation', 'Desktop', 'RHEL 9', 'Firefox', 'Trusted');

-- Insert Sessions
INSERT INTO sessions (user_id, device_id, token, ip_address, location_city, location_country, current_risk_score, status) VALUES
(5, 1, 'session_token_rajesh_1', '103.241.12.44', 'Mumbai', 'India', 5, 'Active'),
(4, 3, 'session_token_sunita_1', '10.12.14.88', 'Baroda', 'India', 15, 'Active'),
(2, 4, 'session_token_vikram_1', '10.2.100.12', 'Mumbai', 'India', 0, 'Active');

-- Insert Behavior Logs (normal and anomalous history)
INSERT INTO behavior_logs (user_id, session_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES
-- Rajesh (Customer) - Normal transactions
(5, 1, 'LOGIN', 'Internet Banking Portal', '{"device_fingerprint": "fp_rajesh_mobile_9823", "mfa_method": "OTP"}', '103.241.12.44', FALSE),
(5, 1, 'TRANSACTION', 'Fund Transfer API', '{"amount": 15000.00, "recipient_account": "9876543210", "currency": "INR"}', '103.241.12.44', FALSE),
(5, 1, 'TRANSACTION', 'Fund Transfer API', '{"amount": 4200.00, "recipient_account": "1122334455", "currency": "INR"}', '103.241.12.44', FALSE),

-- Sunita (Employee) - Normal branch tasks, then an anomaly
(4, 2, 'LOGIN', 'Employee Portal', '{"device_fingerprint": "fp_sunita_desktop_0021"}', '10.12.14.88', FALSE),
(4, 2, 'DB_QUERY', 'Customer Database Search', '{"query": "lastName = Sharma", "records_returned": 5}', '10.12.14.88', FALSE),
(4, 2, 'FILE_DOWNLOAD', 'Customer Record Export', '{"file_name": "sharma_kyc.pdf", "records_count": 1}', '10.12.14.88', FALSE),

-- Simulated Anomalous behavior (Sunita after-hours or compromised credentials)
-- In the seed, we log these anomalous behaviors to populate historical risk reports
(4, 2, 'FILE_DOWNLOAD', 'Mass Customer Record Export', '{"file_name": "all_customers_2026.csv", "records_count": 8500}', '10.12.14.88', TRUE),
(4, 2, 'USB_CONNECT', 'USB Hub Driver', '{"device_name": "SanDisk Cruiser 64GB", "serial": "USB881923A"}', '10.12.14.88', TRUE);

-- Insert Risk Scores
INSERT INTO risk_scores (user_id, session_id, risk_score, explanation) VALUES
(5, 1, 5, '{"trusted_device": -10, "normal_ip": -5, "normal_amount": -5}'),
(4, 2, 15, '{"trusted_device": -10, "normal_hours": -5}'),
(4, 2, 65, '{"mass_download_volume": 45, "unusual_data_export": 35, "trusted_device": -15}'),
(4, 2, 95, '{"usb_device_connected": 50, "mass_download_volume": 35, "security_override_attempt": 25, "trusted_device": -15}');

-- Insert Transactions
INSERT INTO transactions (user_id, session_id, amount, currency, recipient_account, status) VALUES
(5, 1, 15000.00, 'INR', '9876543210', 'Success'),
(5, 1, 4200.00, 'INR', '1122334455', 'Success');

-- Insert Alerts & Incidents
INSERT INTO alerts (user_id, session_id, alert_type, severity, description, status) VALUES
(4, 2, 'INSIDER_THREAT_MASS_DOWNLOAD', 'High', 'Employee Sunita downloaded 8,500 customer files, exceeding hourly threshold of 50.', 'Escalated'),
(4, 2, 'UNAUTHORIZED_USB_CONNECTION', 'Critical', 'Blocked write attempt to USB storage device SanDisk Cruiser 64GB by Employee Sunita.', 'Active');

INSERT INTO incidents (alert_id, assigned_to, status, notes) VALUES
(1, 2, 'Investigating', 'Analyst Vikram reviewing log access patterns. Sunita claims it was for compliance report, verifying with manager Amit.'),
(2, 2, 'Open', 'System blocked USB storage automatically. Session terminated, employee active directory account locked pending internal HR review.');
