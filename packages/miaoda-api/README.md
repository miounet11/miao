# @miaoda/api

Unified API for Miaoda VSCode extensions.

## Installation

```bash
npm install @miaoda/api
```

## Usage

```typescript
import { getMiaodaAPI } from '@miaoda/api';

const api = await getMiaodaAPI();

if (api.aiManager) {
  const response = await api.aiManager.complete('Hello, AI!', {
    temperature: 0.7,
    maxTokens: 100,
  });
  console.log(response.content);
}

if (api.skillsManager) {
  const skills = api.skillsManager.listSkills();
  console.log(`Found ${skills.length} skills`);
}

if (api.quotaBar) {
  const canConsume = await api.quotaBar.consume(1);
  if (canConsume) {
    console.log('Quota consumed successfully');
  }
}
```

## API Reference

### getMiaodaAPI()

Returns a unified API object with access to all Miaoda services.

```typescript
interface MiaodaAPI {
  version: string;
  aiManager?: AIManagerAPI;
  quotaBar?: QuotaBarAPI;
  skillsManager?: SkillsManagerAPI;
  projectManager?: ProjectManagerAPI;
}
```

### AIManagerAPI

- `complete(prompt, options)` - Generate AI completions
- `getCurrentModel()` - Get current AI model
- `setCurrentModel(modelId)` - Set current AI model
- `getAllModels()` - Get all available models
- `addCustomModel(config)` - Add custom model

### QuotaBarAPI

- `consume(amount)` - Consume quota
- `getCurrentQuota()` - Get current quota
- `getTotalQuota()` - Get total quota
- `showDetails()` - Show quota details
- `refresh()` - Refresh quota

### SkillsManagerAPI

- `registerSkill(skill)` - Register a new skill
- `getSkill(skillId)` - Get skill by ID
- `listSkills()` - List all skills
- `executeSkill(skillId, params, context)` - Execute a skill
- `onSkillEvent(listener)` - Listen to skill events

### ProjectManagerAPI

- `getProjectStats()` - Get project statistics
- `getStorageStats()` - Get storage statistics
- `getRecentChanges(limit)` - Get recent file changes
- `optimizeStorage()` - Optimize storage

## Type Definitions

All TypeScript type definitions are included and exported from the main module.

## License

MIT
