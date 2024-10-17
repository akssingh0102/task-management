import { Request, Response } from 'express';
import logger from '../utils/logger';
import { z } from 'zod';
import db from '../db';
import {
  queryTaskSchema,
  taskSchema,
  updateTaskSchema,
} from '../validators/taskValidator';
import { redisPublisher } from '../pubsub/redisClient';
import { REDIS_CHANNEL, REDIS_EVENTS } from '../utils/constants';
import { validateUUID } from '../utils/utils';

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

    await redisPublisher.publish(REDIS_CHANNEL, JSON.stringify(message));

    // Log task creation
    logger.info(
      `Task created with ID ${createdTask.id} by user ${taskData.assigned_user_id}`
    );

    res.status(201).json(createdTask);
  } catch (error: any) {
    logger.error(`Error creating task: ${error.message}`);

    if (error instanceof z.ZodError) {
      logger.error(`Zod validation error: ${JSON.stringify(error.errors)}`);
      res.status(400).json({ error: error.errors });
      return;
    }

    logger.error(`Unexpected error: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    logger.info('Inside updateTask API');

    // Log the incoming request body for debugging
    logger.debug(`Request body: ${JSON.stringify(req.body)}`);

    const updateData = updateTaskSchema.parse(req.body);

    const { id } = req.params;
    logger.debug(`Task ID from request params: ${id}`);

    let userId;

    if (!req.user) {
      logger.error('Unauthorized access attempt, no user info found');
      res
        .status(401)
        .json({ error: 'Unauthorized, no user information found' });
      return;
    }

    if (req.user && typeof req.user != 'string' && 'id' in req.user) {
      userId = req.user.id;
      logger.debug(`User ID from request: ${userId}`);
    }

    const taskIdTrimmed = id.trim();
    if (!validateUUID(taskIdTrimmed)) {
      logger.error(`Invalid UUID format for task ID: ${taskIdTrimmed}`);
      res.status(400).json({ error: 'Invalid task ID format' });
      return;
    }

    // Log the query for task retrieval
    logger.debug(`Querying for task with ID: ${taskIdTrimmed}`);
    const taskQuery = await db.query('SELECT * FROM tasks WHERE id = $1', [
      taskIdTrimmed,
    ]);

    if (taskQuery.rows.length === 0) {
      logger.error(`Task with ID ${taskIdTrimmed} not found`);
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const foundTask = taskQuery.rows[0];
    logger.info(
      `Task with ID ${taskIdTrimmed} found: ${JSON.stringify(foundTask)}`
    );

    if (updateData.assigned_user_id) {
      const assignedUserIdTrimmed = updateData.assigned_user_id.trim();
      if (!validateUUID(assignedUserIdTrimmed)) {
        logger.error(
          `Invalid UUID format for assigned user ID: ${assignedUserIdTrimmed}`
        );
        res.status(400).json({ error: 'Invalid assigned user ID format' });
        return;
      }

      logger.debug(
        `Validating assigned user with ID: ${assignedUserIdTrimmed}`
      );
      const userQuery = await db.query('SELECT id FROM users WHERE id = $1', [
        assignedUserIdTrimmed,
      ]);

      if (userQuery.rows.length === 0) {
        logger.error(
          `Assigned user with ID ${assignedUserIdTrimmed} not found`
        );
        res.status(404).json({ error: 'Assigned user not found' });
        return;
      }
      logger.debug(`Assigned user with ID ${assignedUserIdTrimmed} exists`);
    }

    const updateFields = [];
    const values = [];
    const changes = [];

    if (updateData.status) {
      logger.debug(
        `Updating status from ${foundTask.status} to ${updateData.status}`
      );

      if (foundTask.status != updateData.status) {
        changes.push({
          field: 'status',
          oldValue: foundTask.status,
          newValue: updateData.status,
        });
      }

      updateFields.push(`status = $${updateFields.length + 1}`);
      values.push(updateData.status);
    }

    if (updateData.priority) {
      logger.debug(
        `Updating priority from ${foundTask.priority} to ${updateData.priority}`
      );
      if (foundTask.priority != updateData.priority) {
        changes.push({
          field: 'priority',
          oldValue: foundTask.priority,
          newValue: updateData.priority,
        });
      }

      updateFields.push(`priority = $${updateFields.length + 1}`);
      values.push(updateData.priority);
    }

    if (updateData.assigned_user_id) {
      const assignedUserIdTrimmed = updateData.assigned_user_id.trim();
      logger.debug(
        `Updating assigned_user_id from ${foundTask.assigned_user_id} to ${assignedUserIdTrimmed}`
      );
      if (foundTask.assigned_user_id != assignedUserIdTrimmed) {
        changes.push({
          field: 'assigned_user_id',
          oldValue: foundTask.assigned_user_id,
          newValue: assignedUserIdTrimmed,
        });
      }

      updateFields.push(`assigned_user_id = $${updateFields.length + 1}`);
      values.push(assignedUserIdTrimmed);
    }

    if (updateFields.length === 0) {
      logger.warn('No valid fields to update');
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    logger.debug(`Fields to update: ${updateFields.join(', ')}`);
    logger.debug(`Update values: ${JSON.stringify(values)}`);

    const updateQuery = `
          UPDATE tasks
          SET ${updateFields.join(', ')}
          WHERE id = $${values.length + 1}
          RETURNING *;
        `;
    values.push(taskIdTrimmed);

    logger.debug(`Executing update query: ${updateQuery}`);
    const updatedTask = await db.query(updateQuery, values);

    const task = updatedTask.rows[0];
    logger.info(
      `Task with ID ${taskIdTrimmed} updated: ${JSON.stringify(task)}`
    );

    // Log each change being recorded in task_logs
    for (const change of changes) {
      logger.debug(
        `Logging change for task ${taskIdTrimmed}: field ${change.field} from ${change.oldValue} to ${change.newValue}`
      );
      await db.query(
        `INSERT INTO task_logs (task_id, user_id, field_changed, old_value, new_value, change_made_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
        [taskIdTrimmed, userId, change.field, change.oldValue, change.newValue]
      );
    }

    const message = {
      task_id: task.id,
      status: task.status,
      assigned_user_id: task.assigned_user_id,
    };

    // Log Redis publishing event
    logger.debug(
      `Publishing update to Redis for task ${taskIdTrimmed}: ${JSON.stringify(
        message
      )}`
    );
    await redisPublisher.publish(REDIS_CHANNEL, JSON.stringify(message));

    logger.info(`Task with ID ${taskIdTrimmed} successfully updated`);

    res.status(200).json(updatedTask.rows[0]);
  } catch (error: any) {
    logger.error(`Error updating task: ${error.message}`);

    if (error instanceof z.ZodError) {
      logger.error(`Validation error: ${JSON.stringify(error.errors)}`);
      res.status(400).json({ error: error.errors });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const queryTasks = async (req: Request, res: Response) => {
  try {
    logger.info('Starting queryTasks API...');

    // Validate and parse query parameters
    const queryParams = queryTaskSchema.parse(req.query);
    logger.debug(`Parsed query parameters: ${JSON.stringify(queryParams)}`);

    if (Object.keys(queryParams).length === 0) {
      logger.warn('No query parameters provided');
      res
        .status(400)
        .json({ error: 'At least one query parameter is required' });
      return;
    }

    let query = `
        SELECT tasks.*, projects.name AS project_name, users.name AS assigned_user_name 
        FROM tasks
        LEFT JOIN projects ON tasks.project_id = projects.id
        LEFT JOIN users ON tasks.assigned_user_id = users.id
      `;
    const queryValues: any[] = [];
    let whereClauses: string[] = [];

    // Check for project_id
    if (queryParams.project_id) {
      logger.debug(
        `Checking existence of project with ID: ${queryParams.project_id}`
      );
      const projectExists = await db.query(
        'SELECT id FROM projects WHERE id = $1',
        [queryParams.project_id]
      );

      if (projectExists.rows.length === 0) {
        logger.warn(`Project with ID ${queryParams.project_id} not found`);
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      whereClauses.push(`tasks.project_id = $${queryValues.length + 1}`);
      queryValues.push(queryParams.project_id);
    }

    // Check for assigned_user_id
    if (queryParams.assigned_user_id) {
      logger.debug(
        `Checking existence of user with ID: ${queryParams.assigned_user_id}`
      );
      const userExists = await db.query('SELECT id FROM users WHERE id = $1', [
        queryParams.assigned_user_id,
      ]);

      if (userExists.rows.length === 0) {
        logger.warn(
          `Assigned user with ID ${queryParams.assigned_user_id} not found`
        );
        res.status(404).json({ error: 'Assigned user not found' });
        return;
      }
      whereClauses.push(`tasks.assigned_user_id = $${queryValues.length + 1}`);
      queryValues.push(queryParams.assigned_user_id);
    }

    // Build where clauses for additional filters
    if (queryParams.status) {
      whereClauses.push(`tasks.status = $${queryValues.length + 1}`);
      queryValues.push(queryParams.status);
    }

    if (queryParams.priority) {
      whereClauses.push(`tasks.priority = $${queryValues.length + 1}`);
      queryValues.push(queryParams.priority);
    }

    if (queryParams.due_in_days) {
      const dueDate = `CURRENT_DATE + INTERVAL '${queryParams.due_in_days} days'`;
      whereClauses.push(`tasks.due_date <= ${dueDate}`);
      logger.debug(
        `Filtering tasks due within ${queryParams.due_in_days} days`
      );
    }

    if (queryParams.comment_keyword) {
      query += `
          LEFT JOIN comments ON comments.task_id = tasks.id
        `;
      whereClauses.push(`comments.content ILIKE $${queryValues.length + 1}`);
      queryValues.push(`%${queryParams.comment_keyword}%`);
    }

    // Add where clauses to the query
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
      logger.debug(
        `Adding WHERE clauses to query: ${whereClauses.join(' AND ')}`
      );
    }

    // Handle pagination
    if (queryParams.limit) {
      query += ` LIMIT $${queryValues.length + 1}`;
      queryValues.push(queryParams.limit);
      logger.debug(`Setting limit to: ${queryParams.limit}`);
    }

    if (queryParams.offset) {
      query += ` OFFSET $${queryValues.length + 1}`;
      queryValues.push(queryParams.offset);
      logger.debug(`Setting offset to: ${queryParams.offset}`);
    }

    // Finalize query
    query += ' ORDER BY tasks.created_at DESC';
    logger.info(
      `Executing query: ${query} with values: ${JSON.stringify(queryValues)}`
    );

    // Execute the query
    const result = await db.query(query, queryValues);
    logger.info(
      `Tasks queried successfully, total tasks found: ${result.rows.length}`
    );

    // Respond with the results
    res.status(200).json(result.rows);
  } catch (error: any) {
    logger.error(`Error querying tasks: ${error.message}`);

    if (error instanceof z.ZodError) {
      logger.warn('Validation error: invalid input parameters');
      res.status(400).json({
        error: 'Invalid input',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    logger.error('Internal server error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
