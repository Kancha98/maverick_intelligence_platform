# Maverick Intelligence Platform - Command Reference

## Running the Application

This document provides the commands you need to start the Maverick Intelligence Platform manually in PowerShell, which doesn't support the `&&` operator for command chaining like bash.

### Option 1: Use the provided scripts (Recommended)

1. PowerShell Script:
   ```
   .\run-maverick.ps1
   ```

2. Batch File (from Command Prompt):
   ```
   run-maverick.bat
   ```

### Option 2: Manual commands

#### Starting the Backend Server

Open a PowerShell window and run:

```powershell
# Navigate to the backend directory
cd C:\path\to\maverick_intelligence_platform\backend

# Start the Python Flask server
python app.py
```

#### Starting the Frontend Server

Open another PowerShell window and run:

```powershell
# Navigate to the frontend directory
cd C:\path\to\maverick_intelligence_platform\frontend-next

# Start the Next.js development server
npm run dev
```

## PowerShell Tips for Command Chaining

Since PowerShell doesn't support the `&&` operator for command chaining like bash, here are some alternatives:

### Option 1: Use semicolons

```powershell
cd backend; python app.py
```

### Option 2: Use the pipeline with ForEach-Object

```powershell
"cd backend", "python app.py" | ForEach-Object { Invoke-Expression $_ }
```

### Option 3: PowerShell script blocks

```powershell
& { cd backend; python app.py }
```

## Application Access

Once both servers are running:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000 