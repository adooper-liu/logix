/**
 * 异步任务管理器
 * Async Task Manager
 * 
 * 管理异步任务，提高系统响应速度
 */

import { logger } from '../../utils/logger';

/**
 * 任务类型
 */
export enum TaskType {
  SQL_QUERY = 'sql_query',
  AI_CHAT = 'ai_chat',
  SCHEDULING = 'scheduling',
  DATA_IMPORT = 'data_import',
  REPORT_GENERATION = 'report_generation'
}

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * 任务接口
 */
export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

/**
 * 任务选项
 */
export interface TaskOptions {
  timeout?: number; // 超时时间（毫秒）
  priority?: number; // 优先级（数字越小优先级越高）
  metadata?: Record<string, any>; // 任务元数据
}

/**
 * 异步任务管理器类
 */
export class AsyncTaskManager {
  private tasks: Map<string, Task> = new Map();
  private taskQueue: string[] = [];
  private runningTasks: Set<string> = new Set();
  private maxConcurrentTasks: number = 5;
  private taskIdCounter: number = 0;

  constructor(options?: {
    maxConcurrentTasks?: number;
  }) {
    this.maxConcurrentTasks = options?.maxConcurrentTasks || 5;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    this.taskIdCounter++;
    return `task_${Date.now()}_${this.taskIdCounter}`;
  }

  /**
   * 添加任务
   */
  async addTask<T>(
    type: TaskType,
    taskFunction: () => Promise<T>,
    options?: TaskOptions
  ): Promise<string> {
    const taskId = this.generateTaskId();
    const task: Task = {
      id: taskId,
      type,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      metadata: {
        ...options?.metadata,
        taskFunction
      }
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(taskId);

    // 尝试执行任务
    this.processQueue();

    return taskId;
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    while (
      this.taskQueue.length > 0 &&
      this.runningTasks.size < this.maxConcurrentTasks
    ) {
      const taskId = this.taskQueue.shift();
      if (!taskId) continue;

      this.runTask(taskId);
    }
  }

  /**
   * 运行任务
   */
  private async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // 标记任务为运行中
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    this.runningTasks.add(taskId);

    try {
      // 执行任务函数
      // 注意：这里需要从任务元数据中获取taskFunction
      // 由于我们在addTask中没有存储taskFunction，这里需要修改实现
      // 为了简化，我们假设任务函数已经在元数据中
      if (task.metadata?.taskFunction) {
        task.result = await task.metadata.taskFunction();
      } else {
        throw new Error('Task function not found');
      }

      // 标记任务为完成
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.progress = 100;

      logger.info(`[AsyncTaskManager] Task ${taskId} completed successfully`);
    } catch (error: any) {
      // 标记任务为失败
      task.status = TaskStatus.FAILED;
      task.completedAt = new Date();
      task.error = error.message;

      logger.error(`[AsyncTaskManager] Task ${taskId} failed:`, error);
    } finally {
      // 从运行任务集合中移除
      this.runningTasks.delete(taskId);

      // 继续处理队列
      this.processQueue();
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length
    };
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === TaskStatus.PENDING) {
      // 从队列中移除
      const index = this.taskQueue.indexOf(taskId);
      if (index > -1) {
        this.taskQueue.splice(index, 1);
      }
      this.tasks.delete(taskId);
      return true;
    }

    // 对于正在运行的任务，我们无法直接取消，只能标记为失败
    if (task.status === TaskStatus.RUNNING) {
      task.status = TaskStatus.FAILED;
      task.completedAt = new Date();
      task.error = 'Task cancelled';
      this.runningTasks.delete(taskId);
      this.processQueue();
      return true;
    }

    return false;
  }

  /**
   * 清理已完成的任务
   */
  cleanupCompletedTasks(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) &&
        now - task.completedAt!.getTime() > maxAge
      ) {
        this.tasks.delete(taskId);
        deletedCount++;
      }
    }

    logger.info(`[AsyncTaskManager] Cleaned up ${deletedCount} completed tasks`);
    return deletedCount;
  }

  /**
   * 执行 SQL 查询任务
   */
  async executeSqlTask(
    sql: string,
    executeFunction: () => Promise<any>,
    options?: TaskOptions
  ): Promise<string> {
    return this.addTask(TaskType.SQL_QUERY, executeFunction, {
      ...options,
      metadata: {
        ...options?.metadata,
        sql,
        taskFunction: executeFunction
      }
    });
  }

  /**
   * 执行 AI 聊天任务
   */
  async executeAiChatTask(
    message: string,
    chatFunction: () => Promise<any>,
    options?: TaskOptions
  ): Promise<string> {
    return this.addTask(TaskType.AI_CHAT, chatFunction, {
      ...options,
      metadata: {
        ...options?.metadata,
        message,
        taskFunction: chatFunction
      }
    });
  }

  /**
   * 执行排产任务
   */
  async executeSchedulingTask(
    schedulingFunction: () => Promise<any>,
    options?: TaskOptions
  ): Promise<string> {
    return this.addTask(TaskType.SCHEDULING, schedulingFunction, {
      ...options,
      metadata: {
        ...options?.metadata,
        taskFunction: schedulingFunction
      }
    });
  }
}

/**
 * 默认异步任务管理器实例
 */
export const asyncTaskManager = new AsyncTaskManager();
