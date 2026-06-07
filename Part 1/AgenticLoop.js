const { Anthropic } = require('@anthropic-ai/sdk');

const client = new Anthropic();
const MODEL_NAME = "claude-3-5-sonnet-20241022";

function calculateExpression(expression) {
  try {
    // Note: For production environments, use a sandboxed parser like 'mathjs'.
    // eval() is used here purely for standalone simplicity.
    const result = eval(expression);
    return JSON.stringify({ result: result });
  } catch (error) {
    return JSON.stringify({ error: `Invalid expression: ${error.message}` });
  }
}

function webSearchStub(query) {
  const normalizedQuery = query.toLowerCase();
  
  // Mocking targeted real-time search results to fulfill complex sequential requests
  if (normalizedQuery.includes("artemis 2") || normalizedQuery.includes("artemis ii")) {
    return JSON.stringify({ 
      title: "Artemis II Mission Details",
      crew_count: 4, 
      target_launch_year: 2025,
      summary: "Artemis II is scheduled to send a crew of 4 astronauts on a lunar flyby."
    });
  }
  
  return JSON.stringify({ results: `No specialized database entries found for '${query}'.` });
}

const tools = [
    {
        name: "calculator",
        description: "Evaluates a mathematical expression string. Use this whenever you need to calculate math operations or execute numerical conversions",
        input_schema: {
            type: "object",
            properties: {
                expression:
                {
                    name: "string",
                    description: "The mathematical string expression to solve, e.g., '4 * 365'."
                }
            },
            required: ["expression"]
        }
    },
    {
        name: "web_search_stub",
        description: "Searches the web for up-to-date facts, current events, configuration data, or specific mission details.",
        input_schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The raw search terms or query string."
                }
            },
            required: ["query"]
        }
    }
]

async function runAgent(userPrompt) {

    const messages = [
        { role: "user", content: userPrompt }
    ];

    let iterationCount = 0;
    while (true) {

        if (iterationCount >= MAX_ITERATIONS) {
            console.warn(
                `SAFETY BOUNDARY TRIGGERED: Hit maximum iteration cap of ${MAX_ITERATIONS}. ` +
                `Forcefully stopping to protect against API token runaway.`
            );
            throw new Error("Agent execution aborted: Safety iteration cap reached.");
        }

        iterationCount++;


        // Submit the ongoing frame historical state along with tool configurations to the LLM
        const response = await client.messages.create({
            model: MODEL_NAME,
            max_tokens: 1024,
            tools: tools,
            messages: messages
        });

        messages.push({
            role: "assistant",
            content: response.content
        });

        if (response.stop_reason === "tool_use") {
            console.log(`🎯 Decision: Claude requested external tool access.`);
      
            const toolResults = [];

            for (const block of response.content) {
                if (block.type === "tool_use") {
                    if (block.name === "calculate_expression") {
                        executionOutput = calculateExpression(block.input.expression);
                    } else if (block.name === "web_search_stub") {
                        executionOutput = webSearchStub(block.input.query);
                    } else {
                        executionOutput = JSON.stringify({ error: `Tool '${block.name}' is unhandled.` });
                    }

                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: block.id, // Mandatory matching link to the unique block query ID
                        content: executionOutput
                    });
                }
            }

            // Append the tool execution results back into history under the user identity role
            messages.push({
                role: "user",
                content: toolResults
            });

        }
        else if (response.stop_reason === "end_turn") {
            console.log(`🏁 Decision: Claude has completed the objective natively (stop_reason === "end_turn").`);

            // Isolate and gather all valid textual data sequences from the final frame
            const finalTextOutput = response.content
                .filter(block => block.type === "text")
                .map(block => block.text)
                .join("\n");

            return finalTextOutput;
        }
    }
}

// --- Sequential Execution Test ---
async function main() {
  try {
    // This prompt forces Claude to query information first, process the result, and execute math sequential steps
    const taskPrompt = "Find out how many crew members are on the Artemis 2 mission, and multiply that number by 365.";
    
    const outcome = await runAgent(taskPrompt);
    
    console.log(`\n======================================================`);
    console.log(`🎉 AGENT TASK COMPLETED SUCCESSFULY`);
    console.log(`======================================================`);
    console.log(`Final Response:\n${outcome}`);
    console.log(`======================================================\n`);

  } catch (error) {
    console.error("Critical Execution Abort Error:", error.message);
  }
}

main();