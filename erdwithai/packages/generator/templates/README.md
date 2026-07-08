# Code Generation Templates

This directory contains templates and configurations for generating different application stacks.

## Available Stacks

### 1. Next.js (nextjs/)

- **Framework**: Next.js 14+ with React 18+
- **Styling**: TailwindCSS + Shadcn UI
- **Linting**: ESLint with React and Next.js plugins
- **Type checking**: TypeScript strict mode
- **Build command**: `bun run build` (includes lint check)
- **Lint command**: `bun run lint`

### 2. NestJS (nestjs/)

- **Framework**: NestJS 10+ with Express
- **ORM**: Knex.js with PostgreSQL
- **Linting**: ESLint with TypeScript strict rules
- **Testing**: Jest with type-checked tests
- **Build command**: `bun run build` (includes lint check)
- **Lint command**: `bun run lint`

### 3. OData V4 (odata/)

- **Framework**: @odata/server with Express
- **ORM**: Knex.js with PostgreSQL
- **Linting**: ESLint with TypeScript
- **Type checking**: TypeScript strict mode
- **Build command**: `bun run build` (includes lint check)
- **Lint command**: `bun run lint`

### 4. OpenUI5 (ui5/)

- **Framework**: OpenUI5 with Flexible Column Layout
- **Linting**: UI5 Linter
- **Build tool**: UI5 Tooling
- **Build command**: `bun run build` (includes UI5 lint check)
- **Lint command**: `bun run lint` (uses ui5lint)

## Template Structure

Each stack has a `config/` directory containing:

- `.eslintrc.cjs` - ESLint configuration (Next.js, NestJS, OData)
- `.ui5lintrc.json` - UI5 Linter configuration (OpenUI5 only)
- `package.json.hbs` - Handlebars template for package.json with lint scripts

## Lint Integration

All generated applications include:

1. **Pre-build lint check**: The `build` script automatically runs `lint` before building
2. **Lint fix**: Run `bun run lint:fix` to auto-fix issues
3. **Type checking**: Run `bun run type-check` for TypeScript validation
4. **Formatting**: Prettier configuration for code formatting

## Usage

When generating a new application:

```bash
# Generate Next.js application
bun run generate:nextjs -- -i schema.mermaid -o ./generated/my-app

# The generated app will have:
cd generated/my-app
bun install
bun run lint        # Check for linting issues
bun run lint:fix    # Auto-fix linting issues
bun run build       # Lint + Build (will fail if lint fails)
```

## Customization

To customize lint rules for generated applications:

1. Edit the appropriate `.eslintrc.cjs` or `.ui5lintrc.json` in the `config/` directory
2. Modify the `package.json.hbs` template to add/remove scripts
3. Regenerate applications to apply changes

## Lint Rules

### Common Rules (All Stacks)

- No unused variables (errors)
- Explicit `any` types discouraged (warnings)
- No unused imports

### Next.js Specific

- React hooks rules enforced
- Next.js core web vitals
- No React import needed in JSX

### NestJS Specific

- Async/await safety (no floating promises)
- Dependency injection patterns
- Controller/Service patterns

### OData Specific

- Bun.js runtime best practices
- Express middleware patterns

### OpenUI5 Specific

- No deprecated API usage
- Proper component flags
- Module pattern compliance
