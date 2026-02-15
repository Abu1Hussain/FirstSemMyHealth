USE myhealth;

-- Default Patient: patent@AM.com / pass1234
INSERT INTO users (name, email, cpr, phone, password, role) 
VALUES ('Patient Zero', 'patent@AM.com', '123456789', '12345678', 'pass1234', 'patient')
ON DUPLICATE KEY UPDATE password='pass1234';

-- Default Doctor: doctor@AM.com / pass1234
INSERT INTO users (name, email, cpr, phone, password, role) 
VALUES ('Dr. Strange', 'doctor@AM.com', '987654321', '87654321', 'pass1234', 'doctor')
ON DUPLICATE KEY UPDATE password='pass1234';
