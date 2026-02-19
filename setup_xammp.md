# 🛠️ FirstSemMyHealth - Project Setup Guide

Follow these steps to set up the **FirstSemMyHealth** project on your local machine using XAMPP.

## 📌 Prerequisites

- A Windows PC (or macOS/Linux with XAMPP installed).
- **XAMPP** (Apache + MySQL/MariaDB).

---

## 1️⃣ Download & Install XAMPP

1.  **Download XAMPP** for your operating system from the official website:
    👉 [https://www.apachefriends.org/download.html](https://www.apachefriends.org/download.html)
    _(Choose the version with PHP 8.0 or higher)_

2.  **Run the Installer**:
    - Follow the installation wizard.
    - You can keep the default settings.
    - Ideally, install it to `C:\xampp\` (on Windows).

3.  **Launch Control Panel**:
    - After installation, open the **XAMPP Control Panel**.

---

## 2️⃣ Start the Servers

1.  In the XAMPP Control Panel, locate **Apache** and **MySQL**.
2.  Click the **Start** button for both services.
3.  ✅ Ensure the module names turn **Green**.

---

## 3️⃣ Deploy the Project

1.  **Copy the Project Folder**:
    - Copy the entire `FirstSemMyHealth` folder.

2.  **Paste into `htdocs`**:
    - Navigate to your XAMPP installation directory.
    - Find the `htdocs` folder (usually `C:\xampp\htdocs\`).
    - Paste the project folder inside.
    - Your final path should look like:
      `C:\xampp\htdocs\FirstSemMyHealth\`

---

## 4️⃣ Automated Database Setup

We have included a setup script that automatically creates the database, tables, and demo data.

1.  Open your web browser (Chrome, Edge, Firefox).
2.  Go to the following URL:
    👉 [http://localhost/FirstSemMyHealth/php/setup.php](http://localhost/FirstSemMyHealth/php/setup.php)

> **What this script does:**
>
> - Creates the `medical_center` database.
> - Creates all required tables (users, patients, doctors, medical records, etc.).
> - **Seeds demo accounts** (Admin, Patient, and Doctors).

✅ Once you see the message **"Setup and seeding completed successfully!"**, you are ready to use the site.

---

## 5️⃣ Launch & Test the Website

1.  Go to the homepage:
    👉 [http://localhost/FirstSemMyHealth/index.html](http://localhost/FirstSemMyHealth/index.html)

2.  **Log in with Demo Credentials:**

| Role          | Email                   | Password   |
| :------------ | :---------------------- | :--------- |
| **Admin**     | `admin@AM.com`          | `pass1234` |
| **Patient**   | `patient@AM.com`        | `pass1234` |
| **Doctor 1**  | `doctor1@example.test`  | `pass1234` |
| **Doctor 2**  | `doctor2@example.test`  | `pass1234` |
| ...           | ...                     | ...        |
| **Doctor 10** | `doctor10@example.test` | `pass1234` |

---

## ❓ Troubleshooting

### ❌ Database Connection Error?

If you see a "Connection failed" error:

1.  Open the file `php/db_connect.php` in a text editor.
2.  Ensure the settings match your XAMPP configuration (default is usually correct):
    ```php
    $servername = "localhost";
    $username   = "root";     // Default XAMPP user
    $password   = "";         // Default XAMPP password is empty
    $dbname     = "medical_center";
    ```

### ❌ Apache Won't Start?

If existing software (like Skype or IIS) is using port 80:

1.  Click **Config** > **Apache (httpd.conf)** in XAMPP.
2.  Change `Listen 80` to `Listen 8080`.
3.  Restart Apache.
4.  Access the site at `http://localhost:8080/FirstSemMyHealth/`.

### ❌ Images Not Loading?

Ensure the `image` folder is inside `FirstSemMyHealth` and contains the doctor images (e.g., `doc1(Female).jpg`, `doc2(Male).jpg`).
