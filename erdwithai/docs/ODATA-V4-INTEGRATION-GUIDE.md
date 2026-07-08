# OData V4 Integration Guide - Auth, Workflow & Rules Engine

This guide shows how to integrate the Auth, Workflow, and Rules Engine modules from `@erdwithai/core` into an OData V4 backend.

## Target Project

**Generated Project**: `hms-openui5-odatav4-typescript` (OData V4 Backend)
**Location**: `/Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/hms-openui5-odatav4-typescript/backend`

---

## Prerequisites

1. Ensure you have the latest `@erdwithai/core` package
2. Run database migrations for auth/workflow/rules tables
3. Set up environment variables

---

## Step 1: Install Dependencies

### Add to `package.json`

```json
{
  "dependencies": {
    "@erdwithai/core": "workspace:*",
    "better-auth": "^1.5.6",
    "cookie-parser": "^1.4.6"
  }
}
```

### Install

```bash
cd /Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/hms-openui5-odatav4-typescript/backend
npm install
```

---

## Step 2: Environment Configuration

### Add to `.env`

```bash
# Better Auth
BETTER_AUTH_SECRET=your-32-character-secret-key-here
BETTER_AUTH_URL=http://localhost:4000

# Trigger.dev (for workflows)
TRIGGER_PROJECT_ID=your-project-id
TRIGGER_SECRET_KEY=your-secret-key
TRIGGER_API_URL=http://localhost:8888

# Feature Flags
ENABLE_WORKFLOW_ENGINE=true
ENABLE_RULES_ENGINE=true

# Database (existing)
DB_TYPE=sqlite
DB_PATH=./data/hms.db
```

---

## Step 3: Database Migrations

Copy the migrations from `@erdwithai/core`:

```bash
cp /Users/pramodkoshy/projects/dynamic/test/app-with-ai/database/migrations/004_*.ts \
   /Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/hms-openui5-odatav4-typescript/backend/migrations/

cp /Users/pramodkoshy/projects/dynamic/test/app-with-ai/database/migrations/005_*.ts \
   /Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/hms-openui5-odatav4-typescript/backend/migrations/

cp /Users/pramodkoshy/projects/dynamic/test/app-with-ai/database/migrations/006_*.ts \
   /Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/hms-openui5-odatav4-typescript/backend/migrations/

cp /Users/pramodkoshy/projects/dynamic/test/app-with-ai/database/migrations/007_*.ts \
   /Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/hms-openui5-odatav4-typescript/backend/migrations/
```

Run migrations:

```bash
npm run migrate
```

---

## Step 4: Create Auth Service

### File: `src/services/auth.service.ts`

```typescript
import { createAuthService, type LoginCredentials, type RegisterData } from '@erdwithai/core/auth';
import { getDatabase } from '@erdwithai/core/services';

let authService: ReturnType<typeof createAuthService>;

export function initAuthService() {
  authService = createAuthService({
    db: getDatabase(),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
  });
}

export function getAuthService() {
  if (!authService) {
    initAuthService();
  }
  return authService;
}

// Wrapper functions
export async function login(credentials: LoginCredentials) {
  return await getAuthService().login(credentials);
}

export async function register(data: RegisterData) {
  return await getAuthService().register(data);
}

export async function validateSession(sessionToken: string) {
  return await getAuthService().getSession(sessionToken);
}

export async function hasPermission(userId: string, entityName: string, operation: string) {
  return await getAuthService().hasPermission(userId, entityName, operation as any);
}

export async function getUserRoles(userId: string) {
  return await getAuthService().getUserRoles(userId);
}
```

---

## Step 5: Create Auth Controller

### File: `src/controllers/auth.controller.ts`

```typescript
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const session = await authService.login({ email, password });

      // Set session cookie
      res.cookie('better-auth.session_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.json(session);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      const session = await authService.register({ email, password, name });

      // Set session cookie
      res.cookie('better-auth.session_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const session = req.session;
      res.json(session.user);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('better-auth.session_token');
    res.json({ success: true });
  }
}

export default new AuthController();
```

---

## Step 6: Create Auth Middleware

### File: `src/middleware/auth.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    const session = await authService.validateSession(sessionToken);
    req.user = session.user;
    req.session = session;
    next();
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid session' });
  }
}

export async function requirePermission(entityName: string, operation: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const permission = await authService.hasPermission(
        req.user.id,
        entityName,
        operation
      );

      if (!permission.allowed) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export async function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userRoles = await authService.getUserRoles(req.user.id);
      const hasRole = roles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

function extractSessionToken(req: Request): string | undefined {
  // Try authorization header first
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  return req.cookies?.['better-auth.session_token'];
}
```

---

## Step 7: Create Workflow Service

### File: `src/services/workflow.service.ts`

```typescript
import { createWorkflowService } from '@erdwithai/core/workflow';
import { getDatabase } from '@erdwithai/core/services';

let workflowService: ReturnType<typeof createWorkflowService>;

export function initWorkflowService() {
  const enabled = process.env.ENABLE_WORKFLOW_ENGINE === 'true';

  workflowService = createWorkflowService(getDatabase(), {
    projectId: process.env.TRIGGER_PROJECT_ID || '',
    apiKey: process.env.TRIGGER_SECRET_KEY || '',
    enabled,
  });
}

export function getWorkflowService() {
  if (!workflowService) {
    initWorkflowService();
  }
  return workflowService;
}

export async function triggerWorkflow(data: {
  entityName: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  userId?: string;
}) {
  return await getWorkflowService().trigger({
    entityName: data.entityName,
    entityId: data.entityId,
    operation: data.operation,
    userId: data.userId,
    timestamp: new Date().toISOString(),
  });
}

export async function getWorkflowStatus(workflowRunId: string) {
  return await getWorkflowService().getStatus(workflowRunId);
}

export async function completeWorkflow(
  workflowRunId: string,
  status: 'success' | 'error',
  error?: string
) {
  return await getWorkflowService().complete(workflowRunId, status, error);
}

export async function retryWorkflow(workflowRunId: string) {
  return await getWorkflowService().retry(workflowRunId);
}
```

---

## Step 8: Create Rules Service

### File: `src/services/rules.service.ts`

```typescript
import { createRulesEngineService } from '@erdwithai/core/rules';
import { getDatabase } from '@erdwithai/core/services';

let rulesEngine: ReturnType<typeof createRulesEngineService>;

export function initRulesEngine() {
  rulesEngine = createRulesEngineService(getDatabase());
}

export function getRulesEngine() {
  if (!rulesEngine) {
    initRulesEngine();
  }
  return rulesEngine;
}

export async function evaluateRule(
  entityName: string,
  operation: string,
  context: any
) {
  const rule = await getRulesEngine().getRule(entityName, operation as any);

  if (!rule) {
    return { success: true, mutations: {} };
  }

  return await getRulesEngine().evaluate(rule.jdmContent, context);
}

export async function createRule(data: {
  entityName: string;
  ruleName: string;
  operation: string;
  jdmContent: any;
  userId?: string;
}) {
  return await getRulesEngine().createRule(
    data.entityName,
    data.ruleName,
    data.operation as any,
    data.jdmContent,
    data.userId
  );
}

export async function updateRule(ruleId: string, jdmContent: any) {
  return await getRulesEngine().updateRule(ruleId, jdmContent);
}

export async function deleteRule(ruleId: string) {
  return await getRulesEngine().deleteRule(ruleId);
}

export async function listRules(entityName?: string) {
  return await getRulesEngine().listRules(entityName);
}

export async function validateRule(jdmContent: any) {
  return await getRulesEngine().validateRule(jdmContent);
}
```

---

## Step 9: Create Admin Controllers

### File: `src/controllers/workflows.controller.ts`

```typescript
import { Request, Response } from 'express';
import { getDatabase } from '@erdwithai/core/services';
import * as workflowService from '../services/workflow.service';

export class WorkflowsController {
  async getWorkflows(req: Request, res: Response) {
    try {
      const db = getDatabase();
      const workflows = await db('sys_workflow_runs')
        .orderBy('created_at', 'desc')
        .limit(100);

      res.json({ workflows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getWorkflow(req: Request, res: Response) {
    try {
      const db = getDatabase();
      const workflow = await db('sys_workflow_runs')
        .where('id', req.params.id)
        .first();

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      res.json(workflow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async retryWorkflow(req: Request, res: Response) {
    try {
      const result = await workflowService.retryWorkflow(req.params.id);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new WorkflowsController();
```

### File: `src/controllers/rules.controller.ts`

```typescript
import { Request, Response } from 'express';
import * as rulesService from '../services/rules.service';

export class RulesController {
  async getRules(req: Request, res: Response) {
    try {
      const entityName = req.query.entity as string | undefined;
      const rules = await rulesService.listRules(entityName);
      res.json({ rules });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRule(req: Request, res: Response) {
    try {
      const db = getDatabase();
      const rule = await db('sys_rule_definitions')
        .where('id', req.params.id)
        .first();

      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      rule.jdmContent = JSON.parse(rule.jdm_content);
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createRule(req: Request, res: Response) {
    try {
      const { entityName, ruleName, operation, jdmContent } = req.body;
      const userId = req.user?.id;

      const rule = await rulesService.createRule({
        entityName,
        ruleName,
        operation,
        jdmContent,
        userId,
      });

      res.status(201).json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateRule(req: Request, res: Response) {
    try {
      const { jdmContent } = req.body;
      const rule = await rulesService.updateRule(req.params.id, jdmContent);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteRule(req: Request, res: Response) {
    try {
      await rulesService.deleteRule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async validateRule(req: Request, res: Response) {
    try {
      const { jdm } = req.body;
      const result = await rulesService.validateRule(jdm);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new RulesController();
```

---

## Step 10: Update Server.ts

### Modify `src/server.ts`

Add auth middleware and admin routes:

```typescript
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// OData imports
import { createODataServer } from 'odata-v4-server';
import { Database } from './database';
import { controllers } from './controllers';

// Auth & middleware
import { authMiddleware, requirePermission, requireRole } from './middleware/auth.middleware';
import authController from './controllers/auth.controller';
import workflowsController from './controllers/workflows.controller';
import rulesController from './controllers/rules.controller';

// Services
import * as authService from './services/auth.service';
import * as workflowService from './services/workflow.service';
import * as rulesService from './services/rules.service';

// Initialize services
authService.initAuthService();
workflowService.initWorkflowService();
rulesService.initRulesEngine();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth middleware required)
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/register', authController.register.bind(authController));
app.get('/api/auth/me', authMiddleware, authController.me.bind(authController));
app.post('/api/auth/logout', authController.logout.bind(authController));

// Workflow routes (authenticated)
app.get('/api/workflows', authMiddleware, workflowsController.getWorkflows.bind(workflowsController));
app.get('/api/workflows/:id', authMiddleware, workflowsController.getWorkflow.bind(workflowsController));
app.post('/api/workflows/:id/retry', authMiddleware, requireRole('admin'), workflowsController.retryWorkflow.bind(workflowsController));

// Rules routes (authenticated)
app.get('/api/rules', authMiddleware, rulesController.getRules.bind(rulesController));
app.get('/api/rules/:id', authMiddleware, rulesController.getRule.bind(rulesController));
app.post('/api/rules', authMiddleware, requireRole('admin'), rulesController.createRule.bind(rulesController));
app.put('/api/rules/:id', authMiddleware, requireRole('admin'), rulesController.updateRule.bind(rulesController));
app.delete('/api/rules/:id', authMiddleware, requireRole('admin'), rulesController.deleteRule.bind(rulesController));
app.post('/api/rules/validate', authMiddleware, rulesController.validateRule.bind(rulesController));

// OData server with auth middleware
const oDataServer = createODataServer();
const db = new Database();

// Wrap OData with auth middleware
app.use('/odata', authMiddleware, async (req, res, next) => {
  // Apply permission checks for OData requests
  const entityName = extractEntityName(req.url);
  const method = req.method;

  if (entityName) {
    const operation = methodToODataOperation(method);
    const permissionCheck = await requirePermission(entityName, operation);

    // Permission check middleware will handle the response
    return permissionCheck(req, res, next);
  }

  next();
});

// Mount OData server
app.use('/odata', oDataServer.create(db, controllers));

function extractEntityName(url: string): string | undefined {
  // Extract entity name from OData URL
  const match = url.match(/\/odata\/([^\/]+)/);
  return match ? match[1] : undefined;
}

function methodToODataOperation(method: string): string {
  switch (method) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PATCH':
    case 'PUT': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'READ';
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`OData endpoint: http://localhost:${PORT}/odata`);
  console.log(`API endpoint: http://localhost:${PORT}/api`);
});

export default app;
```

---

## Step 11: Update Entity Services

### Example: Update Patient Service

If you have entity-specific services, integrate workflow and rules:

```typescript
import { BaseService } from '@erdwithai/core/services';
import { getDatabase } from '@erdwithai/core/services';
import { getWorkflowService } from '../services/workflow.service';
import { getRulesEngine } from '../services/rules.service';

class PatientService extends BaseService<any> {
  protected entityName = 'bus_patient';

  constructor() {
    super();
    // Set workflow service
    this.setWorkflowService(getWorkflowService());
  }

  // Implement required abstract methods
  protected async performCreate(data: any): Promise<any> {
    const db = getDatabase();
    const [entity] = await db('bus_patient').insert(data).returning('*');
    return entity;
  }

  protected async performUpdate(id: string, data: any): Promise<any> {
    const db = getDatabase();
    const [entity] = await db('bus_patient')
      .where('id', id)
      .update(data)
      .returning('*');
    return entity;
  }

  protected async performDelete(id: string): Promise<void> {
    const db = getDatabase();
    await db('bus_patient').where('id', id).delete();
  }

  protected async performFindMany(filters?: any): Promise<any[]> {
    const db = getDatabase();
    return await db('bus_patient').where(filters || {});
  }

  protected async performFindOne(id: string): Promise<any> {
    const db = getDatabase();
    return await db('bus_patient').where('id', id).first();
  }

  // Override to add rule evaluation
  async create(data: any) {
    // Create with workflow triggering
    const result = await super.create(data);

    // Evaluate rules
    const ruleResult = await getRulesEngine().evaluate(
      'Patient',
      'CREATE',
      {
        entity: result,
        relations: {},
        metadata: { entityName: 'Patient', operation: 'CREATE' }
      }
    );

    if (ruleResult.success && ruleResult.mutations?.entity) {
      // Apply rule mutations
      await this.performUpdate(result.id, ruleResult.mutations.entity);
    }

    return result;
  }
}

export default new PatientService();
```

---

## Testing the Integration

### 1. Test Auth

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"admin123","name":"Admin User"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"admin123"}'

# Get profile
curl -X GET http://localhost:4000/api/auth/me \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

### 2. Test Rules

```bash
# Create a rule
curl -X POST http://localhost:4000/api/rules \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{
    "entityName": "Patient",
    "ruleName": "Age Stratification",
    "operation": "CREATE",
    "jdmContent": {
      "name": "Age Stratification",
      "nodes": [{
        "id": "rule-1",
        "type": "decisionTable",
        "name": "Age Check",
        "content": {
          "inputs": ["entity.age"],
          "outputs": ["age_category"],
          "rules": [{
            "id": "r1",
            "condition": "entity.age < 18",
            "output": {"age_category": "pediatric"}
          }]
        }
      }]
    }
  }'
```

### 3. Test OData with Auth

```bash
# Get patients (requires authentication)
curl -X GET http://localhost:4000/odata/bus_patient \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"

# Create patient (triggers workflow and rules)
curl -X POST http://localhost:4000/odata/bus_patient \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "age": 25
  }'
```

---

## OpenUI5 Frontend Integration

### Add Auth to OpenUI5 App

In your OpenUI5 `Component.js`, add auth interceptors:

```javascript
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
  "use strict";

  return UIComponent.extend("hms.app.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // Initialize auth
      this.initAuth();

      // Set data models
      this.setModel(new JSONModel(), "auth");
    },

    initAuth: function () {
      // Check for existing session
      const sessionToken = this.getCookie("better-auth.session_token");

      if (sessionToken) {
        // Validate session
        fetch("/api/auth/me", {
          headers: {
            "Cookie": "better-auth.session_token=" + sessionToken
          }
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Invalid session");
        })
        .then(user => {
          this.getModel("auth").setProperty("/user", user);
          this.getModel("auth").setProperty("/authenticated", true);
        })
        .catch(() => {
          this.getModel("auth").setProperty("/authenticated", false);
        });
      } else {
        this.getModel("auth").setProperty("/authenticated", false);
      }
    },

    getCookie: function(name) {
      const value = "; " + document.cookie;
      const parts = value.split("; " + name + "=");
      if (parts.length === 2) return parts.pop().split(";").shift();
    },

    // Add auth interceptors to OData model
    createODataModel: function () {
      const oDataModel = new sap.ui.model.odata.v2.ODataModel({
        serviceUrl: "/odata",
        useBatch: false
      });

      // Add session token to requests
      oDataModel.attachRequestCompleted(function(oEvent) {
        const sessionToken = this.getCookie("better-auth.session_token");
        if (sessionToken) {
          const headers = oEvent.getParameter("headers");
          headers["Cookie"] = "better-auth.session_token=" + sessionToken;
        }
      }.bind(this));

      return oDataModel;
    }
  });
});
```

---

## Benefits of Integration

1. **Authentication**: Users can log in via Better Auth
2. **Authorization**: Permission checks for OData requests
3. **Workflow Automation**: Automatic workflow triggering on OData CRUD
4. **Business Rules**: Dynamic rules applied to entities
5. **Admin API**: REST endpoints for rules and workflow management
6. **Session Management**: Secure cookie-based sessions

---

## Next Steps

1. Add OpenUI5 admin pages for rules/workflow management
2. Set up Trigger.dev for actual background job processing
3. Add comprehensive error handling
4. Add logging and monitoring
5. Write unit and integration tests

---

**Generated**: March 30, 2026
**For**: ERDwithAI v5.1.0+
