const { Anthropic } = require('@anthropic-ai/sdk');

const client = new Anthropic();
const MODEL_NAME = "claude-3-5-sonnet-20241022";

/**
 * Technical Subagent: Focuses on core mechanics, engineering, and architectural facts.
 */
async function technicalSubagent(subtask) {
  console.log(`   ↳ [Spoke: Technical] Analyzing: "${subtask}"`);
  
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 800,
    system: "You are a Technical Research Specialist. Provide deep architectural, technical, or scientific data regarding the given subtask. Keep your response highly factual, technical, and concise.",
    messages: [{ role: "user", content: subtask }]
  });
  
  return response.content[0].text;
}

/**
 * Market Subagent: Focuses on industry impacts, business trends, and societal implications.
 */
async function marketSubagent(subtask) {
  console.log(`   ↳ [Spoke: Market/Society] Analyzing: "${subtask}"`);
  
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 800,
    system: "You are an Industry & Market Analyst. Focus on trends, economic impacts, business use cases, and societal implications regarding the given subtask. Keep your response concise.",
    messages: [{ role: "user", content: subtask }]
  });
  
  return response.content[0].text;
}

/**
 * Central Hub Coordinator Agent
 * Controls Task Decomposition, Delegation, and Aggregation.
 */
async function runCoordinatorAgent(broadTopic) {
  console.log(`\n=== COORDINATOR START: "${broadTopic}" ===\n`);

  // --- STEP 1: TASK DECOMPOSITION ---
  // The coordinator decomposes the broad topic into clear, structured sub-tasks.
  console.log(`[Step 1] Decomposing topic into sub-tasks...`);
  
  const decompositionPrompt = `
    Analyze this broad research topic: "${broadTopic}".
    Decompose it into exactly two distinct sub-tasks:
    1. A deeply technical sub-task suited for an engineer.
    2. A market/societal impact sub-task suited for a business analyst.
    
    Return your response strictly as a JSON object matching this format:
    {
      "technicalTask": "the specific technical aspect to research",
      "marketTask": "the specific market/social aspect to research"
    }
    Do not include any introductory or concluding text outside the JSON.
  `;

  const decompResponse = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 400,
    system: "You are a master research coordinator. Your job is to break down broad queries into discrete, non-overlapping tasks for specialized subagents. You always reply in raw JSON.",
    messages: [{ role: "user", content: decompositionPrompt }]
  });

  // Parse the coordinator's decomposition strategy
  const tasks = JSON.parse(decompResponse.content[0].text.trim());
  console.log(`[Step 1 Result] Tasks identified:`);
  console.log(`   ↳ Technical: "${tasks.technicalTask}"`);
  console.log(`   ↳ Market:    "${tasks.marketTask}"\n`);


  // --- STEP 2: SUBAGENT SELECTION & EXECUTION ---
  // The coordinator targets and dispatches tasks to the appropriate "spoke" workers.
  console.log(`[Step 2] Dispatching workloads to specialized subagents concurrently...`);
  
  const [technicalReport, marketReport] = await Promise.all([
    technicalSubagent(tasks.technicalTask),
    marketSubagent(tasks.marketTask)
  ]);
  
  console.log(`\n[Step 2 Result] Both subagents successfully returned findings.\n`);


  // --- STEP 3: RESULT AGGREGATION ---
  // The coordinator gathers the raw components and reviews, aligns, and merges them.
  console.log(`[Step 3] Coordinating and synthesizing final structured research report...`);

  const aggregationPrompt = `
    You are the Lead Research Coordinator. You have collected two specialized research inputs regarding the broad topic: "${broadTopic}".
    
    [Input 1: Technical Analysis]
    ${technicalReport}
    
    [Input 2: Market & Societal Analysis]
    ${marketReport}
    
    Synthesize these raw inputs into a comprehensive, cohesive Final Research Report. 
    The report must contain:
    - An Executive Summary
    - Core Technological Architecture Breakdown (Synthesized from Input 1)
    - Commercialization & Industry Impact Mapping (Synthesized from Input 2)
    - A brief "Future Outlook" reconciling both technical barriers and market opportunities.
  `;

  const finalResponse = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1500,
    system: "You are a Senior Research Director. Your task is to aggregate independent research threads into a single, cohesive, premium-tier executive briefing document. Ensure uniform tone and eliminate redundancies.",
    messages: [{ role: "user", content: aggregationPrompt }]
  });

  console.log(`\n=== 🏁 COORDINATOR TASK COMPLETE ===\n`);
  return finalResponse.content[0].text;
}

async function main() {
  try {
    const broadTopic = "The integration of Solid-State Batteries in Consumer Electric Vehicles";
    const finalReport = await runCoordinatorAgent(broadTopic);
    
    console.log("=================== FINAL SYNTHESIZED REPORT ===================");
    console.log(finalReport);
    console.log("================================================================");
  } catch (error) {
    console.error("Orchestration Framework Failed:", error);
  }
}

main();