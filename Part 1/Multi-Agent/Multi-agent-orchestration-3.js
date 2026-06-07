/**
 * Aggregate results from both subagents and evaluate coverage completeness
Why: The coordinator must evaluate whether the combined results cover the full breadth of the original topic. This is where iterative refinement starts — gaps detected here trigger re-delegation.

You should see: An aggregation function that combines results from both subagents and produces a coverage assessment listing which subtopics are well-covered, partially covered, or missing.
 */

const { Anthropic } = require('@anthropic-ai/sdk');

const client = new Anthropic();
const MODEL_NAME = "claude-3-5-sonnet-20241022";

// --- 1. Schema for Structured Coverage Assessment ---
const coverageAssessmentTool = {
  name: "submit_coverage_assessment",
  description: "Submits a rigorous evaluation of how completely the subagent reports cover the original macro research topic.",
  input_schema: {
    type: "object",
    properties: {
      wellCoveredSubtopics: {
        type: "array",
        description: "Subtopics that have comprehensive data, factual clarity, and zero critical gaps.",
        items: { type: "string" }
      },
      partiallyCoveredSubtopics: {
        type: "array",
        description: "Subtopics mentioned but lacking deep analytical execution, technical specifications, or empirical statistics.",
        items: { type: "string" }
      },
      missingSubtopics: {
        type: "array",
        description: "Crucial dimensions of the macro topic that were completely ignored or omitted by the subagents.",
        items: { type: "string" }
      },
      loopStatus: {
        type: "string",
        enum: ["COMPLETE", "NEEDS_ITERATIVE_REFINEMENT"],
        description: "Choose NEEDS_ITERATIVE_REFINEMENT if any critical subtopics are missing or partially covered, signaling that the loop must spawn more tasks."
      },
      synthesisReport: {
        type: "string",
        description: "The compiled, aggregated analytical report of all findings gathered so far."
      }
    },
    required: ["wellCoveredSubtopics", "partiallyCoveredSubtopics", "missingSubtopics", "loopStatus", "synthesisReport"]
  }
};

// --- 2. The Aggregation & Evaluation Engine ---
async function aggregateAndEvaluateCoverage(macroTopic, subagentAOutput, subagentBOutput) {
  console.log(`\n[Coordinator Aggregator] Auditing subagent outputs for coverage completeness...`);

  const evaluationPrompt = `
    You are the Principal Quality Assurance Auditor in a hub-and-spoke multi-agent system.
    
    [MACRO RESEARCH OBJECTIVE]
    Topic: "${macroTopic}"
    
    [SUBAGENT A OUTPUT: WEB SEARCH SPECIALIST]
    ${subagentAOutput}
    
    [SUBAGENT B OUTPUT: DOCUMENT ANALYSIS SPECIALIST]
    ${subagentBOutput}
    
    [YOUR TASK]
    1. Review both subagent payloads.
    2. Assess the overall completeness against the full breadth of the macro topic "${macroTopic}".
    3. Call the 'submit_coverage_assessment' tool to log your audit. Be highly critical. If core categories of the macro topic (such as safety, raw material limits, economic scalability, or infrastructure) were skipped, mark them explicitly as missing or partially covered.
  `;

  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 2000,
    system: "You are an elite technical research auditor. Your sole purpose is to detect gaps, omissions, and thin reasoning in raw data streams. You map findings strictly to broad domain requirements.",
    messages: [{ role: "user", content: evaluationPrompt }],
    tools: [coverageAssessmentTool],
    tool_choice: { type: "tool", name: "submit_coverage_assessment" }
  });

  // Extract tool output
  const toolCall = response.content.find(block => block.type === "tool_use");
  if (!toolCall) {
    throw new Error("Aggregation failed: Coordinator did not execute the assessment tool.");
  }

  return toolCall.input;
}

// --- 3. Execution Framework Test ---
async function main() {
  const macroTopic = "Comprehensive Security Infrastructure of Commercial Cloud Systems";

  // Mocking Subagent A data: Covers software firewalls well, but narrow overall.
  const subagentAOutput = `
    [Web Search Findings - Cloud Security]:
    Mainstream cloud providers utilize robust Identity and Access Management (IAM) systems. 
    Role-Based Access Control (RBAC) and multi-factor authentication (MFA) are enforced across 95% of enterprise cloud setups. 
    Network security is maintained via virtual private clouds (VPCs) and state-of-the-art web application firewalls (WAFs).
  `;

  // Mocking Subagent B data: Covers encryption keys, but also narrow.
  const subagentBOutput = `
    [Document Analysis Findings - Data Protection]:
    Data-at-rest encryption is globally achieved using AES-256 standards. 
    Data-in-transit utilizes TLS 1.3 to prevent man-in-the-middle attacks. 
    Key Management Services (KMS) allow enterprises to rotate keys automatically every 90 days.
  `;

  try {
    const auditResult = await aggregateAndEvaluateCoverage(macroTopic, subagentAOutput, subagentBOutput);

    console.log(`\n======================================================`);
    console.log(`📊 COORDINATOR COMPLETENESS AUDIT MATRIX`);
    console.log(`======================================================`);
    console.log(`🟢 Well Covered :`, auditResult.wellCoveredSubtopics);
    console.log(`🟡 Partially    :`, auditResult.partiallyCoveredSubtopics);
    console.log(`🔴 Missing Vector:`, auditResult.missingSubtopics);
    console.log(`🔄 Loop Status  :`, auditResult.loopStatus);
    console.log(`======================================================`);
    
    if (auditResult.loopStatus === "NEEDS_ITERATIVE_REFINEMENT") {
      console.log(`\n💡 [Next Loop Action]: Coordinator detects gaps. Spawning subagents for:`, auditResult.missingSubtopics);
    } else {
      console.log(`\n✨ [Next Loop Action]: Report finalized. No gaps found.`);
    }
  } catch (error) {
    console.error("Aggregation Frame Failed:", error);
  }
}

main();