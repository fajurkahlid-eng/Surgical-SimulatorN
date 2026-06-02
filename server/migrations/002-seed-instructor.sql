-- Ensure default instructor exists for testing
INSERT INTO TRAINEES (Name, Email, Password, Role) VALUES
('Instructor', 'instructor@example.com', 'instructor123', 'instructor')
ON DUPLICATE KEY UPDATE Role = 'instructor';
