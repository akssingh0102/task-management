# Task Management System

A Task Management System built with Node.js, Express, PostgreSQL, and Redis. This application allows users to manage tasks, projects, and notifications efficiently while maintaining an audit log of changes.

## Table of Contents

- [Task Management System](#task-management-system)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Database Setup](#database-setup)
  - [API Endpoints](#api-endpoints)
    - [User Authentication](#user-authentication)
    - [Task Management](#task-management)
  - [Real-Time Notifications](#real-time-notifications)
  - [Scheduled Notifications](#scheduled-notifications)
  - [Audit Logging](#audit-logging)
  - [Testing the API](#testing-the-api)
  - [License](#license)

## Requirements

- Node.js (v14.x or higher)
- PostgreSQL (v12.x or higher)
- Redis (v6.x or higher)
- npm (v6.x or higher)

## Installation

1. **Clone the repository:**

   ```
   git clone https://github.com/akssingh0102/task-management.git
   cd task-management
   ```

2. **Install dependencies:**

   ```
   npm install
   ```

3. **Create a `.env` file** in the root directory and set the following environment variables:

   ```
    DATABASE_USER=postgres
    DATABASE_PASSWORD=postgres
    DATABASE_NAME=task_management_db
    DATABASE_HOST=localhost

    PORT=3000
    NODE_ENV=dev

    JWT_SECRET=your_key
    JWT_EXPIRES_IN=12h
   ```

## Configuration

- Ensure PostgreSQL and Redis servers are running locally or update the connection settings in the `.env` file accordingly.
- Configure your JWT secret for secure token generation.

## Database Setup

1. **Create the database:**

   ```
   CREATE DATABASE task_management_db;
   ```

2. **Run the seeder script** 
   ```
   npm run build
   node dist/seed//seed.js
   ```
   Note: this will create the required tables and seeder data.



## API Endpoints

### User Authentication

- **POST** `/auth/login`: Authenticate user and return JWT token.
- **POST** `/auth/register`: Register a new user.

### Task Management

- **POST** `/tasks`: Create a new task.
- **GET** `/tasks`: Retrieve all tasks or filter by project_id, assigned_user_id, status, priority, or due date.
- **PUT** `/tasks/:id`: Update an existing task.

## Real-Time Notifications

The application uses Redis for real-time notification processing. When a task is created or updated, a message is published to Redis, which can be consumed by notification handlers.

## Scheduled Notifications

A daily scheduled task runs at 8 AM to notify users of tasks due the next day. This is achieved using `node-cron`.

## Audit Logging

Every update to a task is logged in the `task_logs` table, allowing you to track changes made to each task over time.

## Testing the API

You can test the API endpoints using Postman or any other API testing tool. Here's a sample Postman collection with success and failure scenarios:

1. Import the [Postman Collection](link-to-postman-collection.json) to test the API endpoints.
2. Ensure you include the JWT token in the Authorization header for protected routes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

