const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize the Anthropic client.
// Assumes ANTHROPIC_API_KEY is configured in your environment variables.
const client = new Anthropic();
const MODEL_NAME = "claude-3-5-sonnet-20241022";

// ============================================================================
// 1. SPOKE AGENTS (Specialized Workers)
// ============================================================================

/**
 * Specialized Subagent Worker
 * Executes a single, isolated research task provided by the Coordinator.
 */
async function executeSubagentWorker(subtopicTitle, assignmentPrompt) {
  console.log(`   🚀 Dispatching [Spoke Subagent] -> Topic: "${subtopicTitle}"`);
  
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1000,
    system: `You are a specialized Senior Research Analyst. Your job is to investigate a single, highly isolated subtopic. 
    Provide deep architectural facts, empirical evidence, current challenges, and clear insights.
    Stay strictly within the boundaries of your assignment. Do not generalize outside your specific subtopic field.`,
    messages: [
      { 
        role: "user", 
        content: `Your assigned subtopic is: "${subtopicTitle}".\nExecute this research assignment:\n${assignmentPrompt}` 
      }
    ]
  });
  
  return {
    title: subtopicTitle,
    findings: response.content[0].text
  };
}


// ============================================================================
// 2. HUB AGENT (The Coordinator Engine)
// ============================================================================

/**
 * Central Hub Coordinator Agent
 * Manages Task Decomposition, Subagent Delegation, and Final Result Aggregation.
 */
async function runCoordinatorAgent(broadTopic) {
  console.log(`\n================================================================`);
  // Hub-and-Spoke architectural pattern representation
  console.log(`🏛️  COORDINATOR AGENT ACTIVATED`);
  console.log(`🎯 Target Topic: "${broadTopic}"`);
  console.log(`================================================================\n`);

  // --------------------------------------------------------------------------
  // STAGE 1: COMPREHENSIVE TASK DECOMPOSITION (Preventing Narrow Coverage)
  // --------------------------------------------------------------------------
  console.log(`[Stage 1] Executing High-Breadth Task Decomposition...`);

  // Tool schema enforcing a structural, broad array of at least 5 subtopics
  const decompositionTool = {
    name: "submit_decomposed_tasks",
    description: "Submits a broad-breadth breakdown of the research topic containing at least 5 distinct angles.",
    input_schema: {
      type: "object",
      properties: {
        subtopics: {
          type: "array",
          description: "A comprehensive list of at least 5 distinct subtopics covering the full spectrum of the subject matter.",
          minItems: 5, // Explicit JSON Schema constraint
          items: {
            type: "object",
            properties: {
              title: { 
                type: "string", 
                description: "The specific subtopic category name." 
              },
              researchAssignment: { 
                type: "string", 
                description: "Detailed, isolated prompt guidelines mapping out the precise questions the subagent must answer." 
              }
            },
            required: ["title", "researchAssignment"]
          }
        }
      },
      required: ["subtopics"]
    }
  };

  const decompResponse = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1500,
    system: `You are a Principal Research Architect. Your job is to decompose broad concepts into isolated sub-tasks for a network of subagents. 
    
    CRITICAL ARCHITECTURE RULE: Avoid narrow thinking. You must break the topic down into at least 5 distinct, non-overlapping subtopics that cover the entire landscape of the subject (mainstream channels, emerging technologies, infrastructure dependencies, geopolitical/macroeconomic factors, and regulatory or environmental constraints). 
    
    Examples of required breadth:
    - Topic 'Renewable Energy': Do not stop at Solar and Wind. You must include Geothermal, Tidal/Hydrokinetic, Biomass, and frontiers like Hydrogen/Fusion.
    - Topic 'Autonomous Vehicles': Cover Sensor Technology (LiDAR/Radar), Computer Vision Models, Edge Compute Hardware Infrastructure, Legal/Ethical Liability, and Public Transit integration Frameworks.`,
    
    messages: [
      { role: "user", content: `Perform a comprehensive task decomposition for the topic: "${broadTopic}"` }
    ],
    tools: [decompositionTool],
    tool_choice: { type: "tool", name: "submit_decomposed_tasks" }
  });

  // Extract the structured tool block parameters
  const toolCall = decompResponse.content.find(block => block.type === "tool_use");
  if (!toolCall) {
    throw new Error("Decomposition Error: Claude failed to return the required structured tool block.");
  }

  const subtasks = toolCall.input.subtopics;
  console.log(`   ↳ Success: Generated ${subtasks.length} distinct research subtasks.\n`);


  // --------------------------------------------------------------------------
  // STAGE 2: SUBAGENT SELECTION & EXECUTION (Concurrently running Spokes)
  // --------------------------------------------------------------------------
  console.log(`[Stage 2] Dispatching workloads to specialized subagents concurrently...`);
  
  // Concurrently execute all independent subagent requests to save latency time
  const workerPromises = subtasks.map(task => 
    executeSubagentWorker(task.title, task.researchAssignment)
  );
  
  const rawSubagentReports = await Promise.all(workerPromises);
  console.log(`   ↳ Success: Received comprehensive reports from all ${rawSubagentReports.length} spoke subagents.\n`);


  // --------------------------------------------------------------------------
  // STAGE 3: RESULT AGGREGATION & BRIEFING DOCUMENT SYNTHESIS
  // --------------------------------------------------------------------------
  console.log(`[Stage 3] Hub synthesizing raw subagent reports into a unified Briefing Document...`);

  // Format the collected subagent documents cleanly to feed back into the Hub
  const formattedSubagentInputs = rawSubagentReports.map((report, i) => {
    return `### SUBAGENT REPORT ${i + 1}: ${report.title}\n${report.findings}\n---`;
  }).join("\n\n");

  const aggregationPrompt = `
    You are the Senior Director of Research. You have received ${rawSubagentReports.length} specialized technical reports regarding the macro topic: "${broadTopic}".
    
    Your goal is to synthesize these individual, isolated inputs into one seamless, comprehensive Executive Briefing Report. Eliminate redundancies, smooth out stylistic changes between authors, and bridge the connections between different subtopics.
    
    Here are the raw subagent reports to aggregate:
    ${formattedSubagentInputs}
    
    The Final Consolidated Report must be structured with the following layout:
    1. Executive Summary: A high-level view of the entire landscape.
    2. Deep-Dive Domain Analyses: Individual synthesized sections for each of the researched subtopics.
    3. Structural Cross-Impact Assessment: A analytical evaluation showing how these subtopics interact or depend on one another.
    4. Strategic Roadmap / Future Forecast: Clear, actionable conclusions regarding where this broad topic heading.
  `;

  const finalResponse = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 3000, // Large buffer allocation for the comprehensive compiled document
    system: "You are an Elite Research Editor. Your objective is to compile multi-author fragments into a highly cohesive, rigorous technical document with a uniform, executive-tier voice.",
    messages: [{ role: "user", content: aggregationPrompt }]
  });

  console.log(`🏛️  COORDINATOR AGENT SUCCESSFULY CONCLUDED LIFE CYCLE\n`);
  return finalResponse.content[0].text;
}


// ============================================================================
// 3. RUNNER IMPLEMENTATION
// ============================================================================
async function main() {
  try {
    // This classic broad query tests whether our engine triggers a comprehensive 5+ topic layout
    const macroSubject = "Next-Generation Global Renewable Energy Infrastructure";
    
    const briefingDocument = await runCoordinatorAgent(macroSubject);
    
    console.log("==========================================================================");
    console.log("🏆 FINAL SYNTHESIZED EXECUTIVE BRIEFING DOCUMENT");
    console.log("==========================================================================");
    console.log(briefingDocument);
    console.log("==========================================================================");

  } catch (error) {
    console.error("Critical System Framework Crash:", error);
  }
}

main();