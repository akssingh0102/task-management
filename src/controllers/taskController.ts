import { Request, Response } from 'express';
import logger from '../utils/logger'; // Import the winston logger
import { z } from 'zod';
import db from '../db';
import {
  queryTaskSchema,
  taskSchema,
  updateTaskSchema,
} from '../validators/taskValidator';
import redis from '../pubsub/redisClient';
import { REDIS_CHANNEL, REDIS_EVENTS } from '../utils/constants';

export const createTask = async (req: Request, res: Response) => {
  try {
    // Log the incoming request
    logger.info(`Incoming request to create task: ${JSON.stringify(req.body)}`);

    // Validate the request body using Zod
    const taskData = taskSchema.parse(req.body);
    logger.info(`Validated task data: ${JSON.stringify(taskData)}`);

    // Check if the project exists
    const projectQuery = await db.query(
      'SELECT id FROM projects WHERE id = $1',
      [taskData.project_id]
    );
    if (projectQuery.rows.length === 0) {
      logger.error(`Project with ID ${taskData.project_id} not found`);
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    logger.info(`Project with ID ${taskData.project_id} found`);

    // Check if the assigned user exists
    const userQuery = await db.query('SELECT id FROM users WHERE id = $1', [
      taskData.assigned_user_id,
    ]);
    if (userQuery.rows.length === 0) {
      logger.error(`User with ID ${taskData.assigned_user_id} not found`);
      res.status(404).json({ error: 'Assigned user not found' });
      return;
    }
    logger.info(`User with ID ${taskData.assigned_user_id} found`);

    // Create the task in the database
    const taskQuery = `
        INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

    const newTask = await db.query(taskQuery, [
      taskData.title,
      taskData.description,
      taskData.status,
      taskData.priority,
      taskData.due_date,
      taskData.project_id,
      taskData.assigned_user_id,
    ]);

    const createdTask = newTask.rows[0];
    const message = {
      event: REDIS_EVENTS.TASK_CREATED,
      task_id: createdTask.id,
      status: createdTask.status,
      assigned_user_id: createdTask.assigned_user_id,
    };

    await redis.publish(REDIS_CHANNEL, JSON.stringify(message));

    // Log task creation
    logger.info(
      `Task created with ID ${createdTask.id} by user ${taskData.assigned_user_id}`
    );

    // Return the created task
    res.status(201).json(createdTask);
  } catch (error: any) {
    // Log the error using winston
    logger.error(`Error creating task: ${error.message}`);

    if (error instanceof z.ZodError) {
      // Handle Zod validation errors
      logger.error(`Zod validation error: ${JSON.stringify(error.errors)}`);
      res.status(400).json({ error: error.errors });
      return;
    }

    // Handle any other errors
    logger.error(`Unexpected error: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    // Validate the request body using Zod
    const updateData = updateTaskSchema.parse(req.body);

    const { id } = req.params;
    const userId = req.user.id;

    // Check if the task exists
    const taskQuery = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskQuery.rows.length === 0) {
      logger.error(`Task with ID ${id} not found`);
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const foundTask = taskQuery.rows[0];

    // If assigned_user_id is present, check if the user exists
    if (updateData.assigned_user_id) {
      const userQuery = await db.query('SELECT id FROM users WHERE id = $1', [
        updateData.assigned_user_id,
      ]);
      if (userQuery.rows.length === 0) {
        logger.error(
          `Assigned user with ID ${updateData.assigned_user_id} not found`
        );
        res.status(404).json({ error: 'Assigned user not found' });
        return;
      }
    }

    // Prepare SQL query and update values
    const updateFields = [];
    const values = [];

    const changes = [];

    if (updateData.status) {
      changes.push({
        field: 'status',
        oldValue: foundTask.status,
        newValue: updateData.status,
      });

      updateFields.push(`status = $${updateFields.length + 1}`);
      values.push(updateData.status);
    }

    if (updateData.priority) {
      changes.push({
        field: 'priority',
        oldValue: foundTask.priority,
        newValue: updateData.priority,
      });

      updateFields.push(`priority = $${updateFields.length + 1}`);
      values.push(updateData.priority);
    }

    if (updateData.assigned_user_id) {
      changes.push({
        field: 'assigned_user_id',
        oldValue: foundTask.assigned_user_id,
        newValue: updateData.assigned_user_id,
      });

      updateFields.push(`assigned_user_id = $${updateFields.length + 1}`);
      values.push(updateData.assigned_user_id);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    // Perform the update
    const updateQuery = `
        UPDATE tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${values.length + 1}
        RETURNING *;
      `;
    values.push(id);

    const updatedTask = await db.query(updateQuery, values);

    const task = updatedTask.rows[0];

    for (const change of changes) {
      await db.query(
        `INSERT INTO task_logs (task_id, user_id, field_changed, old_value, new_value, change_made_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, userId, change.field, change.oldValue, change.newValue]
      );
    }

    // Publish the task update message to Redis
    const message = {
      task_id: task.id,
      status: task.status,
      assigned_user_id: task.assigned_user_id,
    };

    await redis.publish(REDIS_CHANNEL, JSON.stringify(message));

    // Log task update
    logger.info(`Task with ID ${id} updated`);

    // Return the updated task
    res.status(200).json(updatedTask.rows[0]);
  } catch (error: any) {
    logger.error(`Error updating task: ${error.message}`);

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const queryTasks = async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters using Zod
    const queryParams = queryTaskSchema.parse(req.query);

    // Ensure at least one filter is present
    if (Object.keys(queryParams).length === 0) {
      res
        .status(400)
        .json({ error: 'At least one query parameter is required' });
      return;
    }

    // Initialize base query and values array
    let query = `
        SELECT tasks.*, projects.name AS project_name, users.name AS assigned_user_name 
        FROM tasks
        LEFT JOIN projects ON tasks.project_id = projects.id
        LEFT JOIN users ON tasks.assigned_user_id = users.id
      `;
    const queryValues: any[] = [];
    let whereClauses: string[] = [];

    // Filter by project_id
    if (queryParams.project_id) {
      // Check if the project exists
      const projectExists = await db.query(
        'SELECT id FROM projects WHERE id = $1',
        [queryParams.project_id]
      );
      if (projectExists.rows.length === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      whereClauses.push(`tasks.project_id = $${queryValues.length + 1}`);
      queryValues.push(queryParams.project_id);
    }

    // Filter by assigned_user_id
    if (queryParams.assigned_user_id) {
      // Check if the user exists
      const userExists = await db.query('SELECT id FROM users WHERE id = $1', [
        queryParams.assigned_user_id,
      ]);
      if (userExists.rows.length === 0) {
        res.status(404).json({ error: 'Assigned user not found' });
        return;
      }

      whereClauses.push(`tasks.assigned_user_id = $${queryValues.length + 1}`);
      queryValues.push(queryParams.assigned_user_id);
    }

    // Filter by status
    if (queryParams.status) {
      whereClauses.push(`tasks.status = $${queryValues.length + 1}`);
      queryValues.push(queryParams.status);
    }

    // Filter by priority
    if (queryParams.priority) {
      whereClauses.push(`tasks.priority = $${queryValues.length + 1}`);
      queryValues.push(queryParams.priority);
    }

    // Filter by due_in_days
    if (queryParams.due_in_days) {
      const dueDate = `CURRENT_DATE + INTERVAL '${queryParams.due_in_days} days'`;
      whereClauses.push(`tasks.due_date <= ${dueDate}`);
    }

    // Filter by comment_keyword (join with comments table)
    if (queryParams.comment_keyword) {
      query += `
          LEFT JOIN comments ON comments.task_id = tasks.id
        `;
      whereClauses.push(`comments.content ILIKE $${queryValues.length + 1}`);
      queryValues.push(`%${queryParams.comment_keyword}%`);
    }

    // Add the WHERE clauses to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add pagination
    if (queryParams.limit) {
      query += ` LIMIT $${queryValues.length + 1}`;
      queryValues.push(queryParams.limit);
    }

    if (queryParams.offset) {
      query += ` OFFSET $${queryValues.length + 1}`;
      queryValues.push(queryParams.offset);
    }

    query += ' ORDER BY tasks.created_at DESC'; // Sort by most recent tasks

    // Execute the query
    const result = await db.query(query, queryValues);

    // Log the query action
    logger.info(`Tasks queried with filters: ${JSON.stringify(queryParams)}`);

    // Return the filtered tasks
    res.status(200).json(result.rows);
  } catch (error: any) {
    logger.error(`Error querying tasks: ${error.message}`);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid input',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};
