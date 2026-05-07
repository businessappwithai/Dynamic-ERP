import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";


const MERMAID_ERD_DOCUMENTATION = `
# Mermaid Entity Relationship Diagram Syntax

## Basic Structure
\`\`\`mermaid
erDiagram
    ENTITY_NAME {
        type DataType
        attributeName DataType constraints
    }
    ENTITY_NAME ||--o{ OTHER_ENTITY : "relationship label"
\`\`\`

## Cardinalities
- ||--||  One-to-One (exactly one)
- ||--o{  One-to-Many (zero or more)
- }o--||  Many-to-One (zero or more)
- }o--o{  Many-to-Many (zero or more)

## Example
\`\`\`mermaid
erDiagram
    USER {
        int id PK
        string email UK
        string name
        datetime created_at
    }
    USER ||--o{ POST : "creates"
    POST {
        int id PK
        int user_id FK
        string title
        text content
        datetime created_at
    }
\`\`\`

## Rules
- Entity names: UPPERCASE
- Relationships: entity_A {cardinality} entity_B : "label"
- Attributes: name type constraints
- Required attributes: no nullability marker
- Primary Key: PK
- Foreign Key: FK
- Unique Key: UK
`;

async function analyzeDomainWithOpenAI(description: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable not set");
  }

  console.log(`[OpenRouter] Analyzing domain with API key: ${apiKey.substring(0, 10)}...`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-OpenRouter-Title": "ERDwithAI",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing business domain descriptions and extracting entities and relationships for Entity Relationship Diagrams (ERDs).

Analyze the user's description and extract:
1. Entities (tables) with their attributes
2. Relationships between entities
3. Data types for each attribute
4. Primary keys and foreign keys
5. Constraints (NOT NULL, UNIQUE, etc.)

IMPORTANT GUIDELINES:
- If the request is vague (like "taskflow", "workflow", "管理系统"), make reasonable assumptions based on common patterns
- For task/workflow systems, always include: USERS, TASKS, STATUSES, PROJECTS/WORKFLOWS
- Always return at least 2-3 entities even for vague requests
- Use standard attributes: id (PK, AUTO_INCREMENT), name/title, created_at, updated_at

Return ONLY valid JSON with this exact structure:
{
  "entities": [
    {
      "name": "ENTITY_NAME",
      "attributes": [
        {"name": "id", "type": "int", "constraints": "PK"},
        {"name": "name", "type": "string", "constraints": "NOT_NULL"}
      ]
    }
  ],
  "relationships": [
    {"from": "ENTITY_A", "to": "ENTITY_B", "cardinality": "||--o{", "label": "has"}
  ]
}

No markdown, no code blocks, no explanations.`,
        },
        {
          role: "user",
          content: description,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[OpenRouter] Error: ${response.status} - ${text}`);
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "{}";

  // Remove markdown code blocks if present
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const result = JSON.parse(content);
  console.log(`[OpenRouter] Successfully extracted ${result.entities?.length || 0} entities`);
  return result;

  // Fallback: if no entities returned, provide a default schema
  if (!result.entities || result.entities.length === 0) {
    console.log('No entities extracted, providing default schema');
    result.entities = [
      {
        name: "USER",
        attributes: [
          { name: "id", type: "int", constraints: "PK AUTO_INCREMENT" },
          { name: "username", type: "string", constraints: "NOT_NULL UNIQUE" },
          { name: "email", type: "string", constraints: "NOT_NULL UNIQUE" },
          { name: "created_at", type: "datetime", constraints: "NOT_NULL" }
        ]
      },
      {
        name: "TASK",
        attributes: [
          { name: "id", type: "int", constraints: "PK AUTO_INCREMENT" },
          { name: "title", type: "string", constraints: "NOT_NULL" },
          { name: "description", type: "text", constraints: "NULL" },
          { name: "status", type: "string", constraints: "NOT_NULL DEFAULT 'pending'" },
          { name: "assigned_user_id", type: "int", constraints: "FK" },
          { name: "created_at", type: "datetime", constraints: "NOT_NULL" }
        ]
      },
      {
        name: "WORKFLOW",
        attributes: [
          { name: "id", type: "int", constraints: "PK AUTO_INCREMENT" },
          { name: "name", type: "string", constraints: "NOT_NULL" },
          { name: "description", type: "text", constraints: "NULL" },
          { name: "created_at", type: "datetime", constraints: "NOT_NULL" }
        ]
      }
    ];
    result.relationships = [
      { from: "USER", to: "TASK", cardinality: "||--o{", label: "assigned to" },
      { from: "WORKFLOW", to: "TASK", cardinality: "||--o{", label: "contains" }
    ];
  }

  return result;
}

async function generateMermaidWithValidation(entities: unknown[], relationships: unknown[], maxRetries: number = 3) {
  let retryCount = 0;
  let lastError: string | undefined;

  while (retryCount < maxRetries) {
    retryCount++;

    const prompt = `Generate a Mermaid ERD diagram syntax for these entities and relationships:

${JSON.stringify(entities, null, 2)}

${JSON.stringify(relationships, null, 2)}

Use this syntax guide:
${MERMAID_ERD_DOCUMENTATION}

Return ONLY the Mermaid code block starting with 'erDiagram' and ending with the closing relationship lines. No explanation text.`;

    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable not set");
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-OpenRouter-Title": "ERDwithAI",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [
            {
              role: "system",
              content: `You are a Mermaid ERD expert. Generate valid Mermaid erDiagram code only.`,
            },
            {
              role: "user",
              content: lastError
                ? `Previous attempt had errors: ${lastError}\n\nFix these errors and generate valid Mermaid code:\n${prompt}`
                : prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
      }

      const data = await response.json();
      let mermaidSyntax = data.choices?.[0]?.message?.content?.trim() || "";

      // Remove markdown code blocks if present
      mermaidSyntax = mermaidSyntax.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();

      // Validate the syntax
      const validation = validateMermaidSyntax(mermaidSyntax);
      if (validation.valid) {
        return {
          mermaidSyntax,
          entityCount: entities.length,
          relationshipCount: relationships.length,
        };
      }

      lastError = validation.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Mermaid generation attempt ${retryCount}]: ${lastError}`);
    }
  }

  throw new Error(`Failed to generate valid Mermaid syntax after ${maxRetries} attempts. Last error: ${lastError}`);
}

function validateMermaidSyntax(mermaidSyntax: string): { valid: boolean; error?: string } {
  const lines = mermaidSyntax.trim().split('\n');
  const errors: string[] = [];

  if (!lines[0]?.trim().startsWith('erDiagram')) {
    errors.push('Must start with "erDiagram"');
  }

  const validCardinalities = ['||--||', '||--o{', '}o--||', '}o--o{', '||--|{', '}|--||'];
  const linesWithContent = lines.filter(line => line.trim() && !line.trim().startsWith('%%'));

  for (let i = 0; i <linesWithContent.length; i++) {
    const line = (linesWithContent[i] ?? '').trim();

    if (line.includes('{') || line.includes('}') || line === 'erDiagram') {
      continue;
    }

    if (line.includes('--')) {
      const hasValidCardinality = validCardinalities.some(card => line.includes(card));
      if (!hasValidCardinality) {
        errors.push(`Invalid relationship syntax on line ${i + 1}: ${line}`);
      }
    }
  }

  return { valid: errors.length === 0, error: errors.join('; ') };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        const body = await request.json();
        const { description, currentErdCode = "", conversationHistory = [] } = body;

        if (!description || typeof description !== "string") {
          sendEvent("error", { message: "Description is required", step: "error" });
          controller.close();
          return;
        }

        // Build context from conversation history
        const conversationContext = (conversationHistory as Array<{ role: string; content: string }>)
          .filter((msg) => msg.role === 'user')
          .map((msg) => `- ${msg.content}`)
          .join('\n');

        sendEvent("status", {
          step: "analyzing",
          message: "Analyzing your requirements...",
          progress: 10
        });

        // Analyze the new request with full conversation context
        const domainAnalysis = await analyzeDomainWithOpenAI(
          `Previous context:\n${conversationContext}\n\nNew request: ${description}\n\n${
            currentErdCode && currentErdCode.trim() !== 'erDiagram'
              ? `Current ERD to extend:\n${currentErdCode}`
              : 'Start with a blank ERD'
          }`
        );

        sendEvent("status", {
          step: "generating",
          message: "Generating Mermaid ERD...",
          progress: 50
        });

        // Generate Mermaid with retry and validation
        const mermaidResult = await generateMermaidWithValidation(
          domainAnalysis.entities,
          domainAnalysis.relationships
        );

        sendEvent("status", {
          step: "validating",
          message: "Validating syntax...",
          progress: 90
        });

        sendEvent("complete", {
          mermaidSyntax: mermaidResult.mermaidSyntax,
          message: `Generated ${mermaidResult.entityCount} entities, ${mermaidResult.relationshipCount} relationships`,
          entityCount: mermaidResult.entityCount,
          relationshipCount: mermaidResult.relationshipCount
        });

        controller.close();
      } catch (error) {
        console.error("AI conversion error:", error);
        sendEvent("error", {
          message: error instanceof Error ? error.message : "Unknown error",
          step: "error"
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
