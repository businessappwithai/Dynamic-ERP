---
name: erdwithai-web
description: Next.js web application with CopilotKit integration for human-in-the-loop ERD design
---

# @erdwithai/web Skill

This skill provides guidance for working with the web package of ERDwithAI, which is a Next.js application providing the user interface for AI-powered ERD design with CopilotKit integration.

## Package Overview

The web package provides:

- **Next.js Application**: Modern React-based web application
- **CopilotKit Integration**: AI copilot for interactive ERD design
- **Entity Approval UI**: Human-in-the-loop approval components
- **Dashboard**: Project and ERD management interface
- **Mastra Client**: Integration with Mastra.ai backend

## Directory Structure

```
packages/web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── copilotkit/
│   │   │   │   └── route.ts      # CopilotKit API endpoint
│   │   │   └── mastra/
│   │   │       └── route.ts      # Mastra API proxy
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Dashboard page
│   │   ├── editor/
│   │   │   └── page.tsx          # ERD editor page
│   │   ├── projects/
│   │   │   └── page.tsx          # Projects list
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   └── providers.tsx         # Provider wrappers
│   ├── components/
│   │   ├── approval/
│   │   │   ├── entity-approval-card.tsx  # Entity approval UI
│   │   │   └── relationship-approval.tsx # Relationship approval
│   │   ├── erd/
│   │   │   ├── mermaid-viewer.tsx        # Mermaid rendering
│   │   │   └── entity-list.tsx           # Entity list display
│   │   └── ui/
│   │       └── ...                        # Shadcn UI components
│   ├── hooks/
│   │   └── use-mastra.ts         # Mastra client hook
│   ├── lib/
│   │   └── utils.ts              # Utility functions
│   └── store/
│       └── project-store.ts      # Zustand state management
├── public/
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Key Concepts

### CopilotKit Integration

The app integrates CopilotKit for AI-powered interactions:

```typescript
// src/app/providers.tsx
import { CopilotKit, CopilotSidebar } from '@copilotkit/react-core';
import { CopilotTextarea } from '@copilotkit/react-ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar>
        {children}
      </CopilotSidebar>
    </CopilotKit>
  );
}
```

### CopilotKit API Route

The API route connects to the AI backend:

```typescript
// src/app/api/copilotkit/route.ts
import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/runtime';
import { mastra } from '@erdwithai/ai';

export async function POST(req: Request) {
  const runtime = new CopilotRuntime({
    actions: [
      {
        name: 'analyzeERD',
        description: 'Analyze a domain description and generate ERD',
        parameters: [...],
        handler: async ({ description }) => {
          const result = await mastra.getAgent('domainAgent').generate(description);
          return result;
        }
      }
    ]
  });
  
  return runtime.handle(req);
}
```

### Entity Approval Card

The HITL approval UI component:

```typescript
// src/components/approval/entity-approval-card.tsx
export function EntityApprovalCard({
  entity,
  onApprove,
  onReject,
  onModify
}: EntityApprovalCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{entity.name}</CardTitle>
        <Badge>{Math.round(entity.confidence * 100)}% confidence</Badge>
      </CardHeader>
      <CardContent>
        <AttributeList attributes={entity.suggestedAttributes} />
      </CardContent>
      <CardFooter>
        <Button onClick={onApprove}>Approve</Button>
        <Button onClick={onReject} variant="destructive">Reject</Button>
        <Button onClick={onModify} variant="outline">Modify</Button>
      </CardFooter>
    </Card>
  );
}
```

### Mastra Client Hook

Custom hook for Mastra.ai integration:

```typescript
// src/hooks/use-mastra.ts
import { MastraClient } from '@mastra/client-js';

export function useMastra() {
  const client = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4111'
  });
  
  return {
    async analyzeDescription(description: string) {
      const agent = await client.getAgent('domainAgent');
      return agent.generate(description);
    },
    
    async startWorkflow(description: string) {
      const workflow = await client.getWorkflow('erdDesignWorkflow');
      return workflow.start({ description });
    }
  };
}
```

### Zustand State Management

Project state is managed with Zustand:

```typescript
// src/store/project-store.ts
import { create } from 'zustand';

interface ProjectState {
  currentProject: Project | null;
  entities: Entity[];
  relationships: Relationship[];
  setProject: (project: Project) => void;
  addEntity: (entity: Entity) => void;
  // ...
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  entities: [],
  relationships: [],
  setProject: (project) => set({ currentProject: project }),
  addEntity: (entity) => set((state) => ({
    entities: [...state.entities, entity]
  }))
}));
```

## Running the Application

```bash
# Development mode
bun run dev

# Production build
bun run build && bun run start
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_MASTRA_URL=http://localhost:4111
ANTHROPIC_API_KEY=sk-ant-xxx
COPILOTKIT_API_KEY=ck_xxx  # If using CopilotKit Cloud
```

## Building the Package

```bash
# Build web package (requires core and ai first)
bun run build:core && bun run build:ai && bun run build:web
```

## Dependencies

### Production
- **@erdwithai/core**: workspace:* - Core types
- **@erdwithai/ai**: workspace:* - AI integration
- **@mastra/client-js**: ^1.0.0-beta.9 - Mastra client
- **@copilotkit/react-core**: latest - CopilotKit React
- **@copilotkit/react-ui**: latest - CopilotKit UI components
- **@copilotkit/runtime**: latest - CopilotKit runtime
- **@ag-ui/core**: latest - AG-UI components
- **next**: ^14.0.4 - Next.js framework
- **react**: ^18.2.0 - React
- **zustand**: ^4.4.7 - State management
- **@radix-ui/***: Various Radix UI primitives
- **tailwindcss**: ^3.3.6 - CSS framework
- **lucide-react**: ^0.294.0 - Icons

### Development
- **typescript**: ^5.3.3
- **@types/react**: ^18.2.0

## Common Tasks

### Adding a New Page

1. Create `src/app/my-page/page.tsx`:
   ```typescript
   export default function MyPage() {
     return <div>My Page Content</div>;
   }
   ```

### Adding a New Component

1. Create `src/components/my-component.tsx`
2. Use Shadcn patterns and Tailwind CSS
3. Export from appropriate barrel file

### Adding a CopilotKit Action

1. Edit `src/app/api/copilotkit/route.ts`
2. Add action to the `actions` array:
   ```typescript
   {
     name: 'myAction',
     description: 'What this action does',
     parameters: [
       { name: 'param1', type: 'string', description: '...' }
     ],
     handler: async ({ param1 }) => {
       // Implementation
     }
   }
   ```

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow Shadcn UI component patterns
- Use `cn()` utility for conditional classes
- Dark mode support via Tailwind

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'bg-background text-foreground',
  isActive && 'border-primary'
)}>
```

## Exports

This is a private package (not published to npm). It's the main entry point for the web application.

## Testing

```bash
cd packages/web
bun run lint
bun run type-check
```
