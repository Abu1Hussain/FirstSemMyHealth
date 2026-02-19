# 🏥 Healthcare Portal

A comprehensive web-based Medical Center Management System designed to streamline interactions between patients, doctors, and administrators. This project provides a secure platform for appointment booking, medical record management, and efficient clinic administration.

## ✨ Features

### 👤 Patient Portal

- **Secure Registration & Login**: Easy account creation with secure authentication.
- **Dashboard**: Personalized overview of upcoming appointments and health stats.
- **Book Appointments**: Schedule consultations with doctors based on specialization and availability.
- **Medical Records**: Access consultation history, prescriptions, diagnoses, and lab results.

### 🩺 Doctor Portal

- **Patient Management**: View patient profiles and history.
- **Appointment Handling**: View and manage daily schedules.
- **Medical Documentation**: Create and update medical records, prescriptions, and lab orders.

### 🛡️ Admin Dashboard

- **System Overview**: KPIs, appointment stats, and user metrics.
- **User Management**: Manage patient and staff accounts.
- **Audit Trails**: Track system activities and logs for security.
- **Content Management**: Manage doctor profiles and clinic details.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Google Fonts (Inter).
- **Backend**: PHP (Native).
- **Database**: MySQL.
- **Authentication**: Secure session-based auth with `password_hash` (Bcrypt).

## 🚀 Installation & Setup

### Prerequisites

- A local server environment (e.g., [XAMPP](https://www.apachefriends.org/), [WAMP](https://www.wampserver.com/), or [MAMP](https://www.mamp.info/)).
- PHP 7.4 or higher.
- MySQL 5.7 or higher.

### Steps

1.  **Clone/Download the Repository**
    Place the project folder (e.g., `FirstSemMyHealth`) inside your server's root directory:
    - **XAMPP**: `C:\xampp\htdocs\`
    - **MAMP**: `/Applications/MAMP/htdocs/`

2.  **Configure Database Connection**
    Open `DataBase/db_connect.php` and verify the credentials match your local setup:

    ```php
    $servername = "localhost";
    $username   = "root";      // Default for XAMPP
    $password   = "";          // Default for XAMPP
    $dbname     = "medical_center";
    ```

3.  **Run Setup Script**
    Open your browser and navigate to the setup script to create the database and seed demo data:

    ```
    http://localhost/FirstSemMyHealth/php/setup.php
    ```

    _You should see a success message indicating tables were created and data was seeded._

4.  **Access the Application**
    Go to the landing page:
    ```
    http://localhost/FirstSemMyHealth/index.html
    ```

## 🔑 Demo Credentials

Use these accounts to test different roles in the system. **Password for all accounts:** `pass1234`

| Role        | Email                  | Password   |
| :---------- | :--------------------- | :--------- |
| **Admin**   | `admin@AM.com`         | `pass1234` |
| **Patient** | `patient@AM.com`       | `pass1234` |
| **Doctor**  | `doctor1@example.test` | `pass1234` |

_(Note: There are 10 demo doctors seeded, from `doctor1@example.test` to `doctor10@example.test`)_

## 📂 Project Structure

```
FirstSemMyHealth/
├── css/                # Stylesheets
├── DataBase/          # SQL schemas and connection script
├── dashboards/        # Role-specific dashboard HTML files
├── image/             # Profile images and assets
├── js/                # Frontend logic scripts
├── loginReg/          # Login and Register pages
├── php/               # Backend APIs and logic
│   ├── auth.php       # Authentication handler
│   ├── setup.php      # Database setup script
│   └── ...api.php     # Data endpoints
└── index.html         # Landing page
```

## 🛡️ Security

- **SQL Injection Protection**: Uses Prepared Statements for all database queries.
- **XSS Protection**: Inputs are sanitized before processing.
- **Password Security**: Passwords are hashed using `PASSWORD_DEFAULT` (Bcrypt).
