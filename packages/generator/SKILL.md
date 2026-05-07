---
name: erdwithai-generator
description: Code generation engine with Mermaid parsing and Handlebars template loading for ERDwithAI
---

# @erdwithai/generator Skill

This skill provides guidance for working with the generator package of ERDwithAI, which handles parsing Mermaid ERD syntax and generating application code using Handlebars templates.

## Package Overview

The generator package is responsible for:

- **Mermaid Parsing**: Converting Mermaid ERD syntax into structured Entity objects
- **Template Loading**: Loading and compiling Handlebars templates with custom helpers
- **Code Generation**: Producing application code for multiple stacks (Next.js, NestJS, OData, OpenUI5)
- **CLI Tool**: Command-line interface for code generation

## Directory Structure

```
packages/generator/
├── src/
│   ├── cli/
│   │   └── generate.ts          # CLI entry point
│   ├── generators/
│   │   ├── base.generator.ts    # Abstract base generator
│   │   ├── nextjs.generator.ts  # Next.js + NestJS generator
│   │   ├── odata.generator.ts   # OData v4 generator
│   │   └── ui5.generator.ts     # OpenUI5 + FCL generator
│   ├── parsers/
│   │   └── mermaid.parser.ts    # Mermaid ERD parser
│   ├── templates/
│   │   └── loader.ts            # Handlebars template loader
│   └── index.ts
├── templates/                    # Handlebars templates
│   ├── nextjs/
│   ├── odata/
│   └── ui5/
└── package.json
```

## Key Concepts

### Mermaid Parser

Parses Mermaid ERD syntax into structured data:

```typescript
import { MermaidParser } from '@erdwithai/generator';

const parser = new MermaidParser();
const result = parser.parse(`
erDiagram
    User ||--o{ Post : creates
    
    User {
        string id PK
        string email UK
        string name
    }
    
    Post {
        string id PK
        string title
        string content
        string authorId FK
    }
`);

console.log(result.entities);      // Array of Entity objects
console.log(result.relationships); // Array of Relationship objects
```

### Template Loader

Loads Handlebars templates with pre-registered helpers:

```typescript
import { TemplateLoader } from '@erdwithai/generator';

const loader = new TemplateLoader('./templates/nextjs');
const template = await loader.load('page.tsx.hbs');

const output = template({
  entity: userEntity,
  entities: allEntities
});
```

### Built-in Handlebars Helpers

The template loader registers these helpers automatically:

- `pascalCase` - Convert to PascalCase
- `camelCase` - Convert to camelCase
- `snakeCase` - Convert to snake_case
- `kebabCase` - Convert to kebab-case
- `plural` - Pluralize a word
- `singular` - Singularize a word
- `eq` - Equality check
- `ne` - Not equal check
- `and` - Logical AND
- `or` - Logical OR

### Base Generator Pattern

All generators extend the BaseGenerator class:

```typescript
import { BaseGenerator } from '@erdwithai/generator';
import type { Entity, Relationship } from '@erdwithai/core/types';

class CustomGenerator extends BaseGenerator {
  async generate(entities: Entity[], relationships: Relationship[]): Promise<void> {
    // Use this.loader for templates
    // Use this.outputDir for output location
  }
}
```

## CLI Usage

```bash
# Generate Next.js application
bun --filter @erdwithai/generator generate -- --stack nextjs --input schema.erd --output ./generated

# Generate OData service
bun --filter @erdwithai/generator generate -- --stack odata --input schema.erd --output ./generated

# Generate OpenUI5 application
bun --filter @erdwithai/generator generate -- --stack ui5 --input schema.erd --output ./generated
```

## Building the Package

```bash
# Build only generator
bun run build:generator

# Requires core to be built first
bun run build:core && bun run build:generator
```

## Dependencies

- **@erdwithai/core**: workspace:* - Core types and utilities
- **handlebars**: ^4.7.8 - Template engine
- **commander**: ^11.1.0 - CLI framework
- **knex**: ^3.1.0 - Database query builder (for migrations)
- **prettier**: ^3.1.1 - Code formatting

## Common Tasks

### Adding a New Generator Stack

1. Create `src/generators/mystack.generator.ts`
2. Extend `BaseGenerator`
3. Create templates in `templates/mystack/`
4. Register in CLI `src/cli/generate.ts`

### Adding a New Handlebars Helper

1. Open `src/templates/loader.ts`
2. Add to `registerHelpers()` method:
   ```typescript
   Handlebars.registerHelper('myHelper', (value) => {
     return transformed(value);
   });
   ```

### Creating Templates

Templates use Handlebars syntax:

```handlebars
// templates/nextjs/page.tsx.hbs
import { {{pascalCase entity.name}}List } from '@/components';

export default function {{pascalCase entity.name}}Page() {
  return (
    <div>
      <h1>{{plural entity.name}}</h1>
      <{{pascalCase entity.name}}List />
    </div>
  );
}
```

## Template Variables

Templates receive these context variables:

- `entity` - Current entity being generated
- `entities` - All entities in the schema
- `relationships` - All relationships
- `config` - Generator configuration

## Exports

- `@erdwithai/generator` - Main entry point
- CLI: `erdwithai-generate` - CLI binary

## Testing

```bash
cd packages/generator
bun test
```
