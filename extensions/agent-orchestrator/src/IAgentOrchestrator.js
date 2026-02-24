"use strict";
/**
 * Agent Orchestrator Interface
 * Manages agent task lifecycle and execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskState = exports.TaskPriority = exports.AgentTaskType = void 0;
var AgentTaskType;
(function (AgentTaskType) {
    AgentTaskType["CODE_GENERATION"] = "code_generation";
    AgentTaskType["CODE_REFACTORING"] = "code_refactoring";
    AgentTaskType["BUG_FIX"] = "bug_fix";
    AgentTaskType["TEST_GENERATION"] = "test_generation";
    AgentTaskType["DOCUMENTATION"] = "documentation";
    AgentTaskType["CODE_REVIEW"] = "code_review";
    AgentTaskType["RESEARCH"] = "research";
    AgentTaskType["CUSTOM"] = "custom";
})(AgentTaskType || (exports.AgentTaskType = AgentTaskType = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["LOW"] = 0] = "LOW";
    TaskPriority[TaskPriority["NORMAL"] = 1] = "NORMAL";
    TaskPriority[TaskPriority["HIGH"] = 2] = "HIGH";
    TaskPriority[TaskPriority["URGENT"] = 3] = "URGENT";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var TaskState;
(function (TaskState) {
    TaskState["PENDING"] = "pending";
    TaskState["RUNNING"] = "running";
    TaskState["PAUSED"] = "paused";
    TaskState["COMPLETED"] = "completed";
    TaskState["FAILED"] = "failed";
    TaskState["CANCELLED"] = "cancelled";
})(TaskState || (exports.TaskState = TaskState = {}));
//# sourceMappingURL=IAgentOrchestrator.js.map