import OpenAI from 'openai';
import { config } from '../config.js';
import { logInfo, logError } from '../utils/logger.js';
import db from '../models/database.js';

export class CompetitiveLandscapeAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.db = db;
  }

  async analyzeCompetitiveLandscape(solutionDescription, industryId = null, metadata = {}) {
    try {
      logInfo('Starting competitive landscape analysis', { industryId, metadata });

      // Step 1: Generate analysis aspects
      const analysisAspects = await this.generateAnalysisAspects(solutionDescription);
      
      // Step 2: Research each aspect in parallel
      const researchPromises = analysisAspects.map(aspect => 
        this.researchAspect(aspect, solutionDescription)
      );
      const researchResults = await Promise.all(researchPromises);
      
      // Step 3: Aggregate and format results
      const formattedResults = await this.formatResults(researchResults, solutionDescription);
      
      // Step 4: Store in database
      const analysisId = await this.storeAnalysis(formattedResults, industryId, metadata);
      
      return {
        id: analysisId,
        timestamp: new Date().toISOString(),
        results: formattedResults
      };
    } catch (error) {
      logError('Error in competitive landscape analysis', error);
      throw error;
    }
  }

  async generateAnalysisAspects(solutionDescription) {
    const systemPrompt = `You are an elite market research strategist analyzing a competitive landscape.

REQUIRED ANALYSIS ASPECTS (must include ALL):
1. "Direct Competitors Analysis" - Find companies with similar solutions, their metrics and positioning
2. "Feature Comparison Matrix" - Detailed feature sets across competitors
3. "Market Segmentation Mapping" - Position competitors on innovation vs market share axes
4. "Market Gaps and Opportunities" - Unmet needs and white spaces

For each aspect provide:
- name: Exact name from above list
- description: Brief description (max 30 words)
- importance: Score 1-10 (competitors=10, features=9, mapping=8, gaps=9)
- researchFocus: Specific data points to gather

Return ONLY a JSON object:
{
  "aspects": [{
    "name": "Direct Competitors Analysis",
    "description": "Identify and analyze direct and adjacent competitors",
    "importance": 10,
    "researchFocus": ["company names", "year founded", "total funding", "ARR/revenue", "target market", "employee count"]
  }]
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Analyze this solution for competitive landscape: ${solutionDescription}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // Validate and sort by importance
    const aspects = parsed.aspects || parsed;
    return Array.isArray(aspects) ? 
      aspects.sort((a, b) => b.importance - a.importance) : 
      [];
  }

  async researchAspect(aspect, solutionDescription) {
    const researchPrompt = this.generateResearchPrompt(aspect, solutionDescription);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: researchPrompt
          },
          {
            role: "user",
            content: `Research and analyze: ${solutionDescription}

CRITICAL: Provide detailed, data-driven analysis with specific examples.
Focus on real companies and actual market data where possible.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      const structuredData = JSON.parse(content);
      
      return {
        aspect: aspect.name,
        importance: aspect.importance,
        findings: structuredData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logError('Error researching aspect', { aspect: aspect.name, error });
      return this.getFallbackResearch(aspect);
    }
  }

  generateResearchPrompt(aspect, solutionDescription) {
    const templates = {
      "Direct Competitors Analysis": `You are an elite market research assistant.

TASK: Find and analyze competitors for: ${solutionDescription}

REQUIRED DATA POINTS FOR EACH COMPETITOR:
1. Company Name
2. Year Founded (YYYY format)
3. Total Funding Raised (format: "$XXM" or "$X.XB" or "Bootstrapped")
4. Latest Funding Round (format: "Series X" or "Seed" or "IPO")
5. Target Market (specific segment, max 20 words)
6. ARR/Revenue (format: "$XXM ARR" or "$XXM revenue" or "Not disclosed")
7. Employee Count (format: "50-100" or exact number)
8. Headquarters Location
9. Key Product/Service (max 30 words)
10. Relevancy Score (1-10, based on similarity to solution)

OUTPUT FORMAT - STRICT JSON:
{
  "competitors": [
    {
      "name": "Company Name",
      "yearFounded": "YYYY",
      "totalFunding": "$XXM",
      "latestRound": "Series X",
      "targetMarket": "specific segment",
      "arr": "$XXM ARR",
      "employeeCount": "X-Y",
      "headquarters": "City, State",
      "keyProduct": "specific product description",
      "relevancyScore": 1-10
    }
  ],
  "topThreats": [
    {
      "company": "Company Name",
      "threatReason": "Specific reason why they are a threat"
    }
  ]
}

Find 8-12 competitors. Be precise with data formatting.`,

      "Feature Comparison Matrix": `You are a product analyst.

TASK: Create a feature comparison matrix for: ${solutionDescription}

FEATURE CATEGORIES TO ANALYZE:
- Core Functionality
- Scalability & Performance 
- Integration Capabilities
- Security & Compliance
- Deployment Options
- Support & Service Level
- Pricing Model
- Unique Differentiators

OUTPUT FORMAT - STRICT JSON:
{
  "competitors": ["Company1", "Company2", "Company3", "Company4", "Company5"],
  "features": [
    {
      "category": "Core Functionality",
      "features": [
        {
          "name": "Feature name",
          "companies": {
            "Company1": true,
            "Company2": false,
            "Company3": true,
            "Company4": true,
            "Company5": false
          }
        }
      ]
    }
  ],
  "keyInsights": [
    "Key insight about competitive advantages",
    "Key insight about market gaps"
  ]
}`,

      "Market Segmentation Mapping": `You are a market positioning analyst.

TASK: Create MULTIPLE market segmentation perspectives for: ${solutionDescription}

Create THREE different 2x2 market maps:
1. Innovation vs Market Share
2. Price vs Features/Quality
3. Customer Size vs Specialization

For each map, position 5-8 companies with x,y coordinates (1-10 scale).

OUTPUT FORMAT - STRICT JSON:
{
  "segmentationMaps": [
    {
      "title": "Innovation vs Market Share",
      "xAxis": "Market Share",
      "yAxis": "Innovation Level",
      "description": "Traditional market position analysis",
      "quadrants": {
        "topRight": {
          "label": "Market Leaders",
          "companies": [{"name": "Company", "x": 8.5, "y": 9.0, "rationale": "Leader in AI, 40% market share"}]
        },
        "topLeft": {
          "label": "Emerging Innovators",
          "companies": [{"name": "Company", "x": 3.0, "y": 8.5, "rationale": "New tech, limited reach"}]
        },
        "bottomRight": {
          "label": "Established Players",
          "companies": [{"name": "Company", "x": 7.5, "y": 4.0, "rationale": "Large but legacy tech"}]
        },
        "bottomLeft": {
          "label": "Niche Players",
          "companies": [{"name": "Company", "x": 2.5, "y": 3.0, "rationale": "Limited scope and tech"}]
        }
      }
    }
  ],
  "keyInsights": [
    "Most competitors cluster in enterprise segment",
    "Innovation leaders struggle with market penetration"
  ]
}`,

      "Market Gaps and Opportunities": `You are a market opportunity analyst.

TASK: Identify market gaps and opportunities for: ${solutionDescription}

ANALYSIS FRAMEWORK:
- Customer pain points not addressed
- Regulatory requirements creating demand
- Technology limitations of existing solutions
- Geographic or vertical market white spaces
- Emerging use cases not yet served

OUTPUT FORMAT - STRICT JSON:
{
  "marketGaps": [
    {
      "gapTitle": "Brief title",
      "description": "Detailed description",
      "marketSize": "$X.XB or 'Not quantified'",
      "currentSolutions": "Brief description",
      "opportunityScore": 1-10,
      "timeToMarket": "X-Y months/years",
      "requiredCapabilities": ["Capability 1", "Capability 2"]
    }
  ],
  "strategicRecommendations": [
    {
      "recommendation": "Clear action",
      "rationale": "Why this matters",
      "priority": "High/Medium/Low"
    }
  ],
  "emergingTrends": ["Trend 1", "Trend 2"]
}`
    };

    return templates[aspect.name] || this.generateCustomResearchPrompt(aspect, solutionDescription);
  }

  generateCustomResearchPrompt(aspect, solutionDescription) {
    return `I'm researching "${aspect.name}" for: ${solutionDescription}

You are an expert analyst focused on ${aspect.description}

TASK:
1. Research key factors related to ${aspect.name}
2. Focus areas: ${aspect.researchFocus.join(', ')}
3. Provide data-driven insights
4. Structure findings clearly

Return findings as clean JSON format.`;
  }

  async formatResults(researchResults, solutionDescription) {
    const competitorsData = researchResults.find(r => r.aspect === "Direct Competitors Analysis");
    const featuresData = researchResults.find(r => r.aspect === "Feature Comparison Matrix");
    const marketMapData = researchResults.find(r => r.aspect === "Market Segmentation Mapping");
    const gapsData = researchResults.find(r => r.aspect === "Market Gaps and Opportunities");

    const formattedResults = {
      solutionDescription,
      analysisDate: new Date().toISOString(),
      
      competitors: competitorsData?.findings?.competitors || [],
      topThreats: competitorsData?.findings?.topThreats || [],
      
      featureMatrix: featuresData?.findings || { competitors: [], features: [], keyInsights: [] },
      
      marketSegmentationMaps: marketMapData?.findings?.segmentationMaps || [],
      marketInsights: marketMapData?.findings?.keyInsights || [],
      
      marketGaps: gapsData?.findings?.marketGaps || [],
      strategicRecommendations: gapsData?.findings?.strategicRecommendations || [],
      emergingTrends: gapsData?.findings?.emergingTrends || [],
      
      summary: await this.generateExecutiveSummary(researchResults),
      
      rawAspects: researchResults.map(result => ({
        name: result.aspect,
        importance: result.importance,
        findings: result.findings,
        timestamp: result.timestamp
      }))
    };

    return formattedResults;
  }

  async generateExecutiveSummary(researchResults) {
    const keyFindings = [];
    
    researchResults.forEach(result => {
      if (result.findings?.topThreats) {
        keyFindings.push(`Top competitive threats: ${result.findings.topThreats.map(t => t.company).join(', ')}`);
      }
      if (result.findings?.keyInsights) {
        keyFindings.push(...result.findings.keyInsights);
      }
      if (result.findings?.strategicRecommendations) {
        keyFindings.push(...result.findings.strategicRecommendations.map(r => r.recommendation));
      }
    });

    const summaryPrompt = `Generate a concise 3-paragraph executive summary (max 200 words) covering:
1. Key competitive threats
2. Market opportunities  
3. Recommended strategic actions

Keep it action-oriented and specific.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: summaryPrompt
        },
        {
          role: "user",
          content: `Key findings:\n${keyFindings.slice(0, 5).join('\n')}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content;
  }

  async storeAnalysis(results, industryId, metadata = {}) {
    const analysisId = Date.now().toString();
    
    await this.db.run(`
      INSERT INTO competitive_analyses (
        id, industry_id, solution_description, results, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      analysisId,
      industryId,
      results.solutionDescription,
      JSON.stringify(results),
      new Date().toISOString(),
      JSON.stringify(metadata)
    ]);

    // Store individual competitors
    if (results.competitors && results.competitors.length > 0) {
      for (const competitor of results.competitors) {
        await this.db.run(`
          INSERT INTO competitors (
            analysis_id, name, relevancy, details, strategic_note
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          analysisId,
          competitor.name || 'Unknown',
          competitor.relevancyScore || 5,
          JSON.stringify(competitor),
          this.generateStrategicNote(competitor)
        ]);
      }
    }

    return analysisId;
  }

  generateStrategicNote(competitor) {
    const keyProduct = competitor.keyProduct || '';
    const funding = competitor.totalFunding || '';
    
    if (funding.includes('B') || competitor.relevancyScore >= 8) {
      return 'Direct competitor - monitor closely for strategic moves';
    } else if (competitor.relevancyScore >= 6) {
      return 'Adjacent player - potential partner or acquisition target';
    }
    return 'Indirect competitor - watch for market pivot';
  }

  getFallbackResearch(aspect) {
    return {
      aspect: aspect.name,
      importance: aspect.importance,
      findings: {
        error: 'Unable to complete research',
        message: 'Manual review needed for this aspect'
      },
      timestamp: new Date().toISOString()
    };
  }
}