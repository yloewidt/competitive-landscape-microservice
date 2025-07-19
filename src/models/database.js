import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import { logInfo, logError } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

class Database {
  constructor() {
    this.db = null;
    this.type = config.database.type;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      if (this.type === 'sqlite') {
        await this.initSQLite();
      } else if (this.type === 'mysql') {
        await this.initMySQL();
      } else {
        throw new Error(`Unsupported database type: ${this.type}`);
      }
      
      await this.runMigrations();
      this.isInitialized = true;
      logInfo(`Database initialized successfully (${this.type})`);
    } catch (error) {
      logError('Failed to initialize database', error);
      throw error;
    }
  }

  async initSQLite() {
    const dbPath = config.database.sqlite.path;
    const dbDir = path.dirname(dbPath);
    
    // Ensure directory exists
    await fs.mkdir(dbDir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          logInfo(`SQLite database connected: ${dbPath}`);
          resolve();
        }
      });
    });
  }

  async initMySQL() {
    const connectionConfig = process.env.NODE_ENV === 'production' && config.database.cloudSql.connectionName
      ? {
          socketPath: `/cloudsql/${config.database.cloudSql.connectionName}`,
          user: config.database.cloudSql.user,
          password: config.database.cloudSql.password,
          database: config.database.cloudSql.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        }
      : {
          host: config.database.mysql.host,
          port: config.database.mysql.port,
          user: config.database.mysql.user,
          password: config.database.mysql.password,
          database: config.database.mysql.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        };

    this.db = await mysql.createPool(connectionConfig);
    
    // Test connection
    const connection = await this.db.getConnection();
    await connection.ping();
    connection.release();
    
    logInfo('MySQL database connected');
  }

  async runMigrations() {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    try {
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .filter(f => {
          // Filter based on database type
          if (this.type === 'sqlite' && f.includes('mysql')) return false;
          if (this.type === 'mysql' && !f.includes('mysql')) return false;
          return true;
        })
        .sort();
      
      for (const file of sqlFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf8');
        
        logInfo(`Running migration: ${file}`);
        
        if (this.type === 'sqlite') {
          await this.runSQLite(sql);
        } else {
          await this.runMySQL(sql);
        }
      }
      
      logInfo('All migrations completed successfully');
    } catch (error) {
      logError('Migration failed', error);
      throw error;
    }
  }

  async runSQLite(sql) {
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      await new Promise((resolve, reject) => {
        this.db.run(statement, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async runMySQL(sql) {
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      await this.db.execute(statement);
    }
  }

  // Unified query methods
  async run(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    } else {
      const [result] = await this.db.execute(sql, params);
      return { lastID: result.insertId, changes: result.affectedRows };
    }
  }

  async get(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else {
      const [rows] = await this.db.execute(sql, params);
      return rows[0];
    }
  }

  async all(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    } else {
      const [rows] = await this.db.execute(sql, params);
      return rows;
    }
  }

  async close() {
    if (this.type === 'sqlite' && this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else if (this.type === 'mysql' && this.db) {
      await this.db.end();
    }
  }

  // Transaction support
  async beginTransaction() {
    if (this.type === 'sqlite') {
      await this.run('BEGIN TRANSACTION');
    } else {
      const connection = await this.db.getConnection();
      await connection.beginTransaction();
      return connection;
    }
  }

  async commit(connection) {
    if (this.type === 'sqlite') {
      await this.run('COMMIT');
    } else {
      await connection.commit();
      connection.release();
    }
  }

  async rollback(connection) {
    if (this.type === 'sqlite') {
      await this.run('ROLLBACK');
    } else {
      await connection.rollback();
      connection.release();
    }
  }
}

export default new Database();