import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_TYPE = 'sqlite';
process.env.DATABASE_PATH = ':memory:';
process.env.OPENAI_API_KEY = 'test-key';
process.env.API_KEY = 'test-api-key';
process.env.LOG_LEVEL = 'error';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  aspects: [
                    {
                      name: "Direct Competitors Analysis",
                      description: "Test description",
                      importance: 10,
                      researchFocus: ["test"]
                    }
                  ]
                })
              }
            }]
          })
        }
      }
    }))
  };
});

// Mock Cloud Tasks
jest.mock('@google-cloud/tasks', () => {
  return {
    CloudTasksClient: jest.fn().mockImplementation(() => ({
      queuePath: jest.fn().mockReturnValue('projects/test/locations/test/queues/test'),
      createTask: jest.fn().mockResolvedValue([{ name: 'test-task' }])
    }))
  };
});