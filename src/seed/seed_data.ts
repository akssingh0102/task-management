import db from '../db';
import bcrypt from 'bcryptjs';

interface User {
  name: string;
  email: string;
  password: string;
  id?: string; // optional for users being inserted
}

// User data
const users: User[] = [
  {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'password123',
  },
  { name: 'Bob Smith', email: 'bob@example.com', password: 'password456' },
  {
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    password: 'password789',
  },
  { name: 'Diana Miller', email: 'diana@example.com', password: 'password321' },
  { name: 'Ethan Brown', email: 'ethan@example.com', password: 'password654' },
];

const createTables = async () => {
  const createTablesSQL = `
      -- Create Users Table
      DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL
      );
  
      -- Create Projects Table
      DROP TABLE IF EXISTS projects CASCADE;
      CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          owner_id UUID NOT NULL,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE  -- Cascade on user delete
      );
  
      -- Create Tasks Table
      DROP TABLE IF EXISTS tasks CASCADE;
      CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
          priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          due_date TIMESTAMPTZ,
          project_id UUID,
          assigned_user_id UUID,
          
          -- Foreign Key constraints
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,  -- Cascade on project delete
          FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL  -- Optionally set to NULL on user delete
      );
  
      -- Create Comments Table
      DROP TABLE IF EXISTS comments CASCADE;
      CREATE TABLE IF NOT EXISTS comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL,
          author_id UUID NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          
          -- Foreign Key constraints
          CONSTRAINT fk_task
            FOREIGN KEY (task_id)
            REFERENCES tasks(id)
            ON DELETE CASCADE,  -- Cascade on task delete
            
          CONSTRAINT fk_author
            FOREIGN KEY (author_id)
            REFERENCES users(id)
            ON DELETE CASCADE  -- Cascade on user delete
      );
  
      -- Create Notifications Table
      DROP TABLE IF EXISTS notifications CASCADE;
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          task_id UUID NOT NULL,
          message VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          
          -- Foreign Key constraints
          CONSTRAINT fk_user
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,  -- Cascade on user delete
            
          CONSTRAINT fk_task
            FOREIGN KEY (task_id)
            REFERENCES tasks(id)
            ON DELETE CASCADE  -- Cascade on task delete
      );
  
      -- Create Task Logs Table
      DROP TABLE IF EXISTS task_logs CASCADE;
      CREATE TABLE IF NOT EXISTS task_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL,
          user_id UUID NOT NULL,
          field_changed VARCHAR(255) NOT NULL,
          old_value TEXT,
          new_value TEXT,
          change_made_at TIMESTAMP DEFAULT NOW(),
          
          -- Foreign Key constraints
          CONSTRAINT fk_task
            FOREIGN KEY (task_id)
            REFERENCES tasks(id)
            ON DELETE CASCADE,  -- Cascade on task delete
            
          CONSTRAINT fk_user
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE  -- Cascade on user delete
      );
    `;

  await db.query(createTablesSQL);
  console.log('Tables created successfully! ✅');
};

const seedData = async () => {
  try {
    await db.connect();

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const insertUserQuery = `
          INSERT INTO users (name, email, password)
          VALUES ($1, $2, $3) RETURNING id;
        `;
      const res = await db.query(insertUserQuery, [
        user.name,
        user.email,
        hashedPassword,
      ]);
      user.id = res.rows[0].id;
    }

    const projects = [
      { name: 'Web Development', owner_id: users[0].id },
      { name: 'Mobile App', owner_id: users[1].id },
      { name: 'API Integration', owner_id: users[2].id },
      { name: 'DevOps Automation', owner_id: users[3].id },
      { name: 'Data Analytics', owner_id: users[4].id },
    ];

    for (const project of projects) {
      const insertProjectQuery = `
          INSERT INTO projects (name, owner_id)
          VALUES ($1, $2);
        `;
      await db.query(insertProjectQuery, [project.name, project.owner_id]);
    }

    const tasks = [
      {
        title: 'Setup React Environment',
        description:
          'Initialize a new React project and install necessary dependencies.',
        status: 'pending',
        priority: 'high',
        due_date: '2024-11-05 10:00:00',
        project_id: 'Web Development',
        assigned_user_id: users[0].id,
      },
      {
        title: 'Implement User Authentication',
        description:
          'Create login and registration pages with form validation.',
        status: 'in_progress',
        priority: 'high',
        due_date: '2024-11-15 17:00:00',
        project_id: 'Web Development',
        assigned_user_id: users[1].id,
      },
      {
        title: 'Build REST API',
        description:
          'Develop a RESTful API using Express.js and connect to the database.',
        status: 'pending',
        priority: 'medium',
        due_date: '2024-11-25 09:00:00',
        project_id: 'API Integration',
        assigned_user_id: users[2].id,
      },
      {
        title: 'Containerize Application',
        description:
          'Create Docker images for the application and set up Docker Compose.',
        status: 'pending',
        priority: 'high',
        due_date: '2024-12-10 12:00:00',
        project_id: 'DevOps Automation',
        assigned_user_id: users[3].id,
      },
      {
        title: 'Visualize Data',
        description: 'Create charts and dashboards to display analytics data.',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2024-12-15 16:00:00',
        project_id: 'Data Analytics',
        assigned_user_id: users[4].id,
      },
    ];

    for (const task of tasks) {
      const insertTaskQuery = `
          INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_user_id)
          VALUES ($1, $2, $3, $4, $5, (SELECT id FROM projects WHERE name = $6), $7);
        `;
      await db.query(insertTaskQuery, [
        task.title,
        task.description,
        task.status,
        task.priority,
        task.due_date,
        task.project_id,
        task.assigned_user_id,
      ]);
    }

    // Insert comments
    const comments = [
      {
        task_title: 'Setup React Environment',
        author_id: users[0].id,
        content: 'Initialized the project and installed dependencies.',
      },
      {
        task_title: 'Implement User Authentication',
        author_id: users[1].id,
        content: 'Working on JWT authentication logic.',
      },
      {
        task_title: 'Build REST API',
        author_id: users[2].id,
        content: 'API endpoints are being defined.',
      },
      {
        task_title: 'Containerize Application',
        author_id: users[3].id,
        content: 'Dockerfile created and tested.',
      },
      {
        task_title: 'Visualize Data',
        author_id: users[4].id,
        content: 'Starting with Chart.js for data visualization.',
      },
    ];

    for (const comment of comments) {
      const insertCommentQuery = `
          INSERT INTO comments (task_id, author_id, content)
          VALUES ((SELECT id FROM tasks WHERE title = $1), $2, $3);
        `;
      await db.query(insertCommentQuery, [
        comment.task_title,
        comment.author_id,
        comment.content,
      ]);
    }

    const notifications = [
      {
        user_id: users[0].id,
        task_title: 'Setup React Environment',
        message: 'New task assigned: Setup React Environment',
      },
      {
        user_id: users[1].id,
        task_title: 'Implement User Authentication',
        message: 'Update: Implement User Authentication task has been updated',
      },
      {
        user_id: users[2].id,
        task_title: 'Build REST API',
        message: 'New task assigned: Build REST API',
      },
      {
        user_id: users[3].id,
        task_title: 'Containerize Application',
        message: 'New task assigned: Containerize Application',
      },
      {
        user_id: users[4].id,
        task_title: 'Visualize Data',
        message: 'New task assigned: Visualize Data',
      },
    ];

    for (const notification of notifications) {
      const insertNotificationQuery = `
          INSERT INTO notifications (user_id, task_id, message)
          VALUES ($1, (SELECT id FROM tasks WHERE title = $2), $3);
        `;
      await db.query(insertNotificationQuery, [
        notification.user_id,
        notification.task_title,
        notification.message,
      ]);
    }

    const taskLogs = [
      {
        task_title: 'Setup React Environment',
        user_id: users[0].id,
        field_changed: 'status',
        old_value: 'pending',
        new_value: 'in_progress',
      },
      {
        task_title: 'Implement User Authentication',
        user_id: users[1].id,
        field_changed: 'status',
        old_value: 'in_progress',
        new_value: 'completed',
      },
      {
        task_title: 'Build REST API',
        user_id: users[2].id,
        field_changed: 'due_date',
        old_value: '2024-11-25',
        new_value: '2024-12-01',
      },
      {
        task_title: 'Containerize Application',
        user_id: users[3].id,
        field_changed: 'old_value',
        old_value: null,
        new_value: 'Docker image created',
      },
      {
        task_title: 'Visualize Data',
        user_id: users[4].id,
        field_changed: 'status',
        old_value: 'in_progress',
        new_value: 'completed',
      },
    ];

    for (const log of taskLogs) {
      const insertLogQuery = `
          INSERT INTO task_logs (task_id, user_id, field_changed, old_value, new_value)
          VALUES ((SELECT id FROM tasks WHERE title = $1), $2, $3, $4, $5);
        `;
      await db.query(insertLogQuery, [
        log.task_title,
        log.user_id,
        log.field_changed,
        log.old_value,
        log.new_value,
      ]);
    }

    console.log('Database seeded successfully! 🌱');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

const run = async () => {
  await createTables();
  await seedData();
};

run();
