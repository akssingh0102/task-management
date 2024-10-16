-- Seed Users
INSERT INTO users (name, email, password)
VALUES
    ('Alice Johnson', 'alice@example.com', 'password123'),
    ('Bob Smith', 'bob@example.com', 'password456'),
    ('Charlie Davis', 'charlie@example.com', 'password789'),
    ('Diana Miller', 'diana@example.com', 'password321'),
    ('Ethan Brown', 'ethan@example.com', 'password654');

-- Seed Projects
INSERT INTO projects (name, owner_id)
VALUES
    ('Web Development', (SELECT id FROM users WHERE name = 'Alice Johnson')),
    ('Mobile App', (SELECT id FROM users WHERE name = 'Bob Smith')),
    ('API Integration', (SELECT id FROM users WHERE name = 'Charlie Davis')),
    ('DevOps Automation', (SELECT id FROM users WHERE name = 'Diana Miller')),
    ('Data Analytics', (SELECT id FROM users WHERE name = 'Ethan Brown'));

-- Seed Tasks
INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_user_id)
VALUES
    ('Setup React Environment', 'Initialize a new React project and install necessary dependencies.', 'pending', 'high', '2024-11-05 10:00:00', 
        (SELECT id FROM projects WHERE name = 'Web Development'), 
        (SELECT id FROM users WHERE name = 'Alice Johnson')),

    ('Implement User Authentication', 'Create login and registration pages with form validation.', 'in_progress', 'high', '2024-11-15 17:00:00', 
        (SELECT id FROM projects WHERE name = 'Web Development'), 
        (SELECT id FROM users WHERE name = 'Bob Smith')),

    ('Build REST API', 'Develop a RESTful API using Express.js and connect to the database.', 'pending', 'medium', '2024-11-25 09:00:00', 
        (SELECT id FROM projects WHERE name = 'API Integration'), 
        (SELECT id FROM users WHERE name = 'Charlie Davis')),

    ('Containerize Application', 'Create Docker images for the application and set up Docker Compose.', 'pending', 'high', '2024-12-10 12:00:00', 
        (SELECT id FROM projects WHERE name = 'DevOps Automation'), 
        (SELECT id FROM users WHERE name = 'Diana Miller')),

    ('Visualize Data', 'Create charts and dashboards to display analytics data.', 'in_progress', 'medium', '2024-12-15 16:00:00', 
        (SELECT id FROM projects WHERE name = 'Data Analytics'), 
        (SELECT id FROM users WHERE name = 'Ethan Brown'));

-- Seed Comments
INSERT INTO comments (task_id, author_id, content)
VALUES
    ((SELECT id FROM tasks WHERE title = 'Setup React Environment'), (SELECT id FROM users WHERE name = 'Alice Johnson'), 'Initialized the project and installed dependencies.'),
    ((SELECT id FROM tasks WHERE title = 'Implement User Authentication'), (SELECT id FROM users WHERE name = 'Bob Smith'), 'Working on JWT authentication logic.'),
    ((SELECT id FROM tasks WHERE title = 'Build REST API'), (SELECT id FROM users WHERE name = 'Charlie Davis'), 'API endpoints are being defined.'),
    ((SELECT id FROM tasks WHERE title = 'Containerize Application'), (SELECT id FROM users WHERE name = 'Diana Miller'), 'Dockerfile created and tested.'),
    ((SELECT id FROM tasks WHERE title = 'Visualize Data'), (SELECT id FROM users WHERE name = 'Ethan Brown'), 'Starting with Chart.js for data visualization.');

-- Seed Notifications
INSERT INTO notifications (user_id, task_id, message)
VALUES
    ((SELECT id FROM users WHERE name = 'Alice Johnson'), (SELECT id FROM tasks WHERE title = 'Setup React Environment'), 'New task assigned: Setup React Environment'),
    ((SELECT id FROM users WHERE name = 'Bob Smith'), (SELECT id FROM tasks WHERE title = 'Implement User Authentication'), 'Update: Implement User Authentication task has been updated'),
    ((SELECT id FROM users WHERE name = 'Charlie Davis'), (SELECT id FROM tasks WHERE title = 'Build REST API'), 'New task assigned: Build REST API'),
    ((SELECT id FROM users WHERE name = 'Diana Miller'), (SELECT id FROM tasks WHERE title = 'Containerize Application'), 'New task assigned: Containerize Application'),
    ((SELECT id FROM users WHERE name = 'Ethan Brown'), (SELECT id FROM tasks WHERE title = 'Visualize Data'), 'New task assigned: Visualize Data');

-- Seed Task Logs
INSERT INTO task_logs (task_id, user_id, field_changed, old_value, new_value)
VALUES
    ((SELECT id FROM tasks WHERE title = 'Setup React Environment'), (SELECT id FROM users WHERE name = 'Alice Johnson'), 'status', 'pending', 'in_progress'),
    ((SELECT id FROM tasks WHERE title = 'Implement User Authentication'), (SELECT id FROM users WHERE name = 'Bob Smith'), 'status', 'in_progress', 'completed'),
    ((SELECT id FROM tasks WHERE title = 'Build REST API'), (SELECT id FROM users WHERE name = 'Charlie Davis'), 'due_date', '2024-11-25', '2024-12-01'),
    ((SELECT id FROM tasks WHERE title = 'Containerize Application'), (SELECT id FROM users WHERE name = 'Diana Miller'), 'old_value', NULL, 'Docker image created'),
    ((SELECT id FROM tasks WHERE title = 'Visualize Data'), (SELECT id FROM users WHERE name = 'Ethan Brown'), 'status', 'in_progress', 'completed');
