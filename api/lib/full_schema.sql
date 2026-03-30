-- 🏛️ Nexus Institutional Intelligence: Complete Cloud Schema (v5.0)

CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255),
    role VARCHAR(50),
    roles JSON, -- Support for multi-role arrays
    email VARCHAR(255),
    mobile VARCHAR(20),
    branch VARCHAR(50),
    section VARCHAR(10),
    semester VARCHAR(20),
    pin_number VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    avatar_blob LONGBLOB, -- Biometric backup
    transport_fee DECIMAL(10,2),
    academic_fee_paid DECIMAL(10,2),
    transport_fee_paid DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institutional_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    file_type VARCHAR(100),
    file_data LONGBLOB,
    branch VARCHAR(50),
    category VARCHAR(50) DEFAULT 'LMS', -- 'LMS' or 'results'
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(255),
    subject_id VARCHAR(255),
    semester VARCHAR(20),
    status VARCHAR(20), -- 'present' | 'absent'
    marked_by VARCHAR(255),
    date DATE,
    topic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (student_id, subject_id, date, semester)
);

CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    target_role VARCHAR(50) DEFAULT 'ALL',
    target_branch VARCHAR(50) DEFAULT 'ALL',
    category VARCHAR(50) DEFAULT 'General',
    author_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    code VARCHAR(50),
    branch VARCHAR(50),
    faculty_id VARCHAR(255),
    branch_isolation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id VARCHAR(255),
    title VARCHAR(255),
    order_index INT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    subject_id VARCHAR(255),
    due_date TIMESTAMP,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT,
    student_id VARCHAR(255),
    file_url TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS timetable_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch VARCHAR(50),
    semester VARCHAR(20),
    section VARCHAR(10),
    day VARCHAR(20),
    slot INT,
    subject_id VARCHAR(255),
    faculty_id VARCHAR(255),
    room VARCHAR(50),
    UNIQUE KEY (branch, semester, section, day, slot)
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pin_number VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    branch VARCHAR(50),
    semester VARCHAR(20),
    section VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
