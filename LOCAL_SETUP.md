# Local Setup Guide

This guide explains how to run the Martens Exclusive CRM on a normal computer with `npm` available.

The project is still in an early phase. Right now, the goal is only to get the project running locally with:

- dependencies installed
- Prisma ready
- database created
- seed data loaded
- login page working

## Before You Start

You need:

- Node.js installed
- `npm` working in Terminal
- access to this project folder

## Step-by-Step Setup

### 1. Open Terminal

Open Terminal on your computer.

### 2. Go to the project folder

Replace the path below with the real folder location on your computer if needed.

```bash
cd /path/to/martens-exclusive-crm
```

### 3. Install dependencies

```bash
npm install
```

This downloads everything the project needs.

### 4. Create the environment file

Copy the example environment file:

```bash
cp .env.example .env
```

### 5. Generate the Prisma client

```bash
npm run prisma:generate
```

This prepares the database connection code.

### 6. Run the first migration

```bash
npm run prisma:migrate -- --name init
```

This creates the local database.

### 7. Seed the first data

```bash
npm run prisma:seed
```

This adds:

- one admin user
- default lead sources
- default lost reasons
- one example vehicle

### 8. Start the app

```bash
npm run dev
```

### 9. Open the project in your browser

Open:

```text
http://localhost:3000
```

Then go to:

```text
http://localhost:3000/login
```

### 10. Log in

Use the credentials from your `.env` file:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

If you did not change them, the default values are:

- Email: `admin@martensexclusive.local`
- Password: `ChangeMe123!`

## Exact Commands To Run In Order

```bash
cd /path/to/martens-exclusive-crm
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

## Verification Checklist

### Dependencies installed

Check:

- `node_modules` folder exists
- Terminal completed `npm install` without errors

### Prisma client generated

Check:

- `npm run prisma:generate` finishes successfully
- Prisma client is available for the app

### First migration completed

Check:

- `npm run prisma:migrate -- --name init` finishes successfully
- a local SQLite database file is created
- a Prisma migration folder is created under `prisma/migrations`

### Seed completed

Check:

- `npm run prisma:seed` finishes successfully
- admin user exists
- default lead sources exist
- lost reasons exist

### Login page works

Check:

- `npm run dev` starts the app
- `http://localhost:3000/login` opens
- you can sign in with the admin email and password

## Troubleshooting

### `npm: command not found`

Reason:

- Node.js or npm is not installed correctly

Fix:

- install Node.js from the official website
- close and reopen Terminal
- run `npm --version` to confirm it works

### `cp: .env.example: No such file or directory`

Reason:

- you are not inside the project folder

Fix:

- run `pwd` to see where you are
- go to the correct folder first using `cd`

### Prisma generate or migration fails

Possible reasons:

- dependencies were not installed
- `.env` file is missing
- Prisma packages were not downloaded correctly

Fix:

- run `npm install` again
- make sure `.env` exists
- check that `DATABASE_URL` is present in `.env`

### Seed fails

Possible reasons:

- migration was not run yet
- Prisma client was not generated yet

Fix:

- run these again in order:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

### Login page does not open

Possible reasons:

- app is not running
- wrong port
- startup failed in Terminal

Fix:

- check the Terminal output after `npm run dev`
- confirm it says the app is running
- open `http://localhost:3000/login`

### Login fails with the default admin account

Possible reasons:

- seed did not run
- `.env` values were changed

Fix:

- open `.env` and check `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- run `npm run prisma:seed` again
