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

## 4️⃣ Database Setup (3 Methods)

You can set up the database using any of the following three methods. **Method A is the recommended and fastest way.**

### Method A: Automated Setup (Quickest) ✅

We have included a setup script that automatically creates the database, tables, and demo data.

1.  Open your web browser.
2.  Go to: 👉 [http://localhost/FirstSemMyHealth/php/setup.php](http://localhost/FirstSemMyHealth/php/setup.php)
3.  Wait for the message **"Setup and seeding completed successfully!"**.

---

### Method B: Manual Setup (via phpMyAdmin UI)

If you prefer using the XAMPP interface:

1.  Open the **XAMPP Control Panel** and click the **Admin** button next to **MySQL**.
2.  In the phpMyAdmin dashboard, click the **Import** tab at the top.
3.  Click **Choose File** and navigate to:
    `C:\xampp\htdocs\FirstSemMyHealth\DataBase\master_setup.sql`
4.  Scroll to the bottom and click **Go** (or **Import**).
5.  ✅ This will create the `medical_center` database and all required tables.

---

### Method C: Command Line Setup (For Developers)

If you have MySQL in your PATH:

1.  Open a terminal or CMD.
2.  Run the following command:
    ```bash
    mysql -u root -p < "C:\xampp\htdocs\FirstSemMyHealth\DataBase\master_setup.sql"
    ```
3.  (Press Enter when asked for a password, as XAMPP's default is empty).

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
| ...           | ...                     | ...        |
| **Doctor 10** | `doctor10@example.test` | `pass1234` |

---

## ❓ Troubleshooting & Verification

### ✅ Verify Database Connection

Open `DataBase/db_connect.php` and verify these settings (default XAMPP):

```php
$servername = "localhost";
$username   = "root";     // Default XAMPP user
$password   = "";         // Default XAMPP password is empty
$dbname     = "medical_center";
```

### ❌ Apache Won't Start?

If port 80 is blocked:

1.  Click **Config** > **Apache (httpd.conf)** in XAMPP.
2.  Change `Listen 80` to `Listen 8080`.
3.  Access the site at `http://localhost:8080/FirstSemMyHealth/`.

### ❌ "Table not found" Errors?

If you manually imported `schema_medical_center.sql` but see errors about missing data, make sure to also run the seeding files in the `DataBase/` folder (e.g., `allusers_simple.sql`, `doctors_simple.sql`) or simply use **Method A** above.
