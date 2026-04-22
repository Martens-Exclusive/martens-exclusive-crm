# Martens Exclusive CRM

Internal lead management system for Martens Exclusive.

## Current Scope

This project currently includes the early foundation for:

- project setup
- Prisma database schema
- basic authentication structure

The project is not fully verified in this environment because a working package manager was not available here. The instructions below are the local handoff for running it on a normal computer with `npm`.

## Project Rules

- Code and technical implementation in English
- User interface in Dutch
- Customer-facing emails in Dutch
- Keep the app simple and practical
- Work in small reviewable steps
- Always explain changes in simple language

## Local Setup Guide

### What you need

- Node.js installed
- `npm` available in Terminal
- this project folder on your computer

### Step-by-step setup

#### 1. Open Terminal

Open Terminal on your computer.

#### 2. Go to the project folder

Replace the path below if your folder is somewhere else.

```bash
cd /path/to/martens-exclusive-crm
```

#### 3. Install dependencies

```bash
npm install
```

#### 4. Create the environment file

```bash
cp .env.example .env
```

#### 5. Generate the Prisma client

```bash
npm run prisma:generate
```

#### 6. Run the first migration

```bash
npm run prisma:migrate -- --name init
```

#### 7. Seed the database

```bash
npm run prisma:seed
```

This should create:

- one admin user
- default lead sources
- default lost reasons
- one example vehicle

#### 8. Start the app

```bash
npm run dev
```

#### 9. Open the login page

Open this in your browser:

```text
http://localhost:3000/login
```

#### 10. Log in

Use the admin details from `.env`.

Default values:

- Email: `admin@martensexclusive.local`
- Password: `ChangeMe123!`

## Exact Terminal Commands

Run these in this order:

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

### 1. Dependencies installed

Confirm:

- `npm install` finished without errors
- a `node_modules` folder now exists

### 2. Prisma client generated

Confirm:

- `npm run prisma:generate` finished successfully

### 3. First migration completed

Confirm:

- `npm run prisma:migrate -- --name init` finished successfully
- the local SQLite database was created
- a `prisma/migrations` folder was created

### 4. Seed completed

Confirm:

- `npm run prisma:seed` finished successfully
- the admin user was created
- the default data was inserted

### 5. Login page works

Confirm:

- `npm run dev` starts without errors
- `http://localhost:3000/login` opens in the browser
- the admin account can log in

## Troubleshooting

### `npm: command not found`

Reason:

- Node.js or npm is not installed properly

Fix:

- install Node.js from the official Node.js website
- reopen Terminal
- run `npm --version`

### `cp .env.example .env` fails

Reason:

- you are not in the correct project folder

Fix:

- run `pwd`
- go to the right folder with `cd`

### Prisma generate or migration fails

Check:

- did `npm install` finish successfully?
- does `.env` exist?
- does `.env` contain `DATABASE_URL`?

### Seed fails

Fix:

Run again in this order:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

### The app does not start

Check:

- whether `npm run dev` shows an error in Terminal
- whether port `3000` is already in use

### The login page opens but login fails

Check:

- whether the seed ran successfully
- whether the admin email and password in `.env` are correct

## Extra Setup File

The same instructions are also available in:

- [LOCAL_SETUP.md](/Users/jannickmartens/Documents/Codex/2026-04-21-i-want-to-build-a-lead/LOCAL_SETUP.md)
