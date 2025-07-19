import './setup.js';
import { CompetitiveLandscapeAnalyzer } from '../src/services/competitiveLandscapeAnalyzer.js';
import db from '../src/models/database.js';

describe('CompetitiveLandscapeAnalyzer', () => {
  let analyzer;

  beforeAll(async () => {
    await db.init();
    analyzer = new CompetitiveLandscapeAnalyzer();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('generateAnalysisAspects', () => {
    test('should generate required analysis aspects', async () => {
      const solutionDescription = 'AI-powered customer service chatbot';
      const aspects = await analyzer.generateAnalysisAspects(solutionDescription);

      expect(aspects).toBeInstanceOf(Array);
      expect(aspects.length).toBeGreaterThan(0);
      expect(aspects[0]).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        importance: expect.any(Number),
        researchFocus: expect.any(Array),
      });
    });
  });

  describe('generateStrategicNote', () => {
    test('should generate appropriate strategic notes', () => {
      const competitor1 = {
        name: 'BigCorp',
        totalFunding: '$1.2B',
        relevancyScore: 9,
      };
      const note1 = analyzer.generateStrategicNote(competitor1);
      expect(note1).toContain('Direct competitor');

      const competitor2 = {
        name: 'SmallStartup',
        totalFunding: '$5M',
        relevancyScore: 6,
      };
      const note2 = analyzer.generateStrategicNote(competitor2);
      expect(note2).toContain('Adjacent player');

      const competitor3 = {
        name: 'TinyCompany',
        relevancyScore: 3,
      };
      const note3 = analyzer.generateStrategicNote(competitor3);
      expect(note3).toContain('Indirect competitor');
    });
  });

  describe('storeAnalysis', () => {
    test('should store analysis results in database', async () => {
      const results = {
        solutionDescription: 'Test solution',
        analysisDate: new Date().toISOString(),
        competitors: [
          {
            name: 'TestCompetitor',
            relevancyScore: 8,
            keyProduct: 'Test product',
          },
        ],
        summary: 'Test summary',
      };

      const analysisId = await analyzer.storeAnalysis(results, 'test-industry');

      // Verify analysis was stored
      const stored = await db.get(
        'SELECT * FROM competitive_analyses WHERE id = ?',
        analysisId
      );
      expect(stored).toBeTruthy();
      expect(stored.solution_description).toBe('Test solution');

      // Verify competitor was stored
      const competitor = await db.get(
        'SELECT * FROM competitors WHERE analysis_id = ?',
        analysisId
      );
      expect(competitor).toBeTruthy();
      expect(competitor.name).toBe('TestCompetitor');
    });
  });

  describe('getFallbackResearch', () => {
    test('should return fallback research on error', () => {
      const aspect = {
        name: 'Test Aspect',
        importance: 5,
      };

      const fallback = analyzer.getFallbackResearch(aspect);

      expect(fallback).toMatchObject({
        aspect: 'Test Aspect',
        importance: 5,
        findings: {
          error: 'Unable to complete research',
          message: 'Manual review needed for this aspect',
        },
        timestamp: expect.any(String),
      });
    });
  });
});