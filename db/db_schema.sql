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
