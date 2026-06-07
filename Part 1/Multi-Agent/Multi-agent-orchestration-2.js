/*
Spawn two subagents (web search and document analysis) with explicit context passing — include all relevant information in each subagent prompt
Why: Subagent isolation means no shared memory and no inherited context. The exam heavily tests this: if a subagent produces poor results, check whether the coordinator gave it sufficient context, not whether the subagent itself is flawed.

You should see: Two subagent invocations where each receives the full assigned subtopic, the research goal, and any relevant context from prior agents — all explicitly included in the prompt.
*/

const { Anthropic } = require('@anthropic-ai/sdk');

const client = new Anthropic();
const MODEL_NAME = "claude-3-5-sonnet-20241022";

// ============================================================================
// 1. ISOLATED SPOKE AGENTS (No Shared Memory, No Inherited Context)
// ============================================================================

/**
 * Subagent A: Web Search Specialist
 * Context Requirements: Explicit search goal and query parameters.
 */
async function webSearchSubagent(targetTopic, specificGoal) {
  console.log(`   📡 [Subagent: Web Search] Initializing isolated process...`);
  
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 600,
    system: "You are an isolated Web Search Agent. Your sole job is to return mock real-time search results based on the provided topic and goal. Do not assume or reference any external information outside your prompt.",
    messages: [
      { 
        role: "user", 
        content: `CORE RESEARCH TOPIC: ${targetTopic}\nSPECIFIC GOAL: ${specificGoal}\n\nExecute the search and return key data points.` 
      }
    ]
  });

  return response.content[0].text;
}

/**
 * Subagent B: Document Analysis Specialist
 * Context Requirements: MUST receive the original goal AND the exact output of Subagent A.
 */
async function documentAnalysisSubagent(targetTopic, originalGoal, rawSearchData) {
  console.log(`   📊 [Subagent: Document Analysis] Initializing isolated process...`);
  
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 800,
    system: "You are an isolated Deep Document Analyst. Your job is to evaluate raw incoming text blocks against a specific research goal and extract structured analytical insights.",
    messages: [
      { 
        role: "user", 
        // CRITICAL EXAM CHECK: Explicit context injection. 
        // We pass the macro context, the micro goal, AND the raw output of the prior agent.
        content: `You are evaluating a dataset within an isolated runtime frame.
        
        [MACRO CONTEXT]
        Topic: ${targetTopic}
        Original Objective: ${originalGoal}

        [PRIOR EXECUTION DATA]
        The Web Search Subagent has completed its task and provided the following raw data payload:
        ----------------------------------------------------------------------
        ${rawSearchData}
        ----------------------------------------------------------------------

        [YOUR DIRECTIVE]
        Analyze the provided raw data payload. Cross-reference it against the Original Objective, identify missing data vectors, and extract a structured 3-point analytical summary.`
      }
    ]
  });

  return response.content[0].text;
}


// ============================================================================
// 2. HUB AGENT (The Coordinator / Context Manager)
// ============================================================================

async function runCoordinatedResearchPipeline(targetTopic, researchGoal) {
  console.log(`\n======================================================`);
  console.log(`🏛️  COORDINATOR ENGINE ACTIVATED`);
  console.log(`======================================================\n`);

  // --- STEP 1: Spawn Subagent A (Web Search) ---
  console.log(`[Step 1] Spawning Subagent A...`);
  const searchFindings = await webSearchSubagent(targetTopic, researchGoal);
  
  console.log(`\n[Step 1 Output Captured] Raw Findings from Search Subagent:\n${searchFindings}\n`);


  // --- STEP 2: Spawn Subagent B (Document Analysis) with Explicit Handoff ---
  console.log(`[Step 2] Spawning Subagent B...`);
  console.log(`⚠️  Notice: Manually injecting prior findings into Subagent B's prompt environment.`);
  
  // If we just passed 'researchGoal' without 'searchFindings', Subagent B would fail entirely.
  const finalAnalysis = await documentAnalysisSubagent(
    targetTopic, 
    researchGoal, 
    searchFindings
  );

  console.log(`\n======================================================`);
  console.log(`🎉 PIPELINE COMPLETE: Final Consolidated Insights`);
  console.log(`======================================================`);
  console.log(finalAnalysis);
  console.log(`======================================================\n`);
}


// ============================================================================
// 3. RUNNER
// ============================================================================
async function main() {
  const targetTopic = "Solid-State Battery Manufacturing Constraints";
  const researchGoal = "Identify the specific raw material bottlenecks holding back commercial factory scalability.";

  await runCoordinatedResearchPipeline(targetTopic, researchGoal);
}

main();