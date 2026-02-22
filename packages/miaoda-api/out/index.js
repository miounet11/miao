"use strict";
/**
 * Miaoda API
 * 统一的扩展间通信接口
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_VERSION = void 0;
exports.getMiaodaAPI = getMiaodaAPI;
exports.createMessage = createMessage;
const vscode = __importStar(require("vscode"));
/**
 * API 版本
 */
exports.API_VERSION = '0.1.0';
/**
 * 获取 Miaoda API
 */
async function getMiaodaAPI() {
    const sharedExt = vscode.extensions.getExtension('miaoda.shared-services');
    const skillsExt = vscode.extensions.getExtension('miaoda.skills-manager');
    const projectExt = vscode.extensions.getExtension('miaoda.miaoda-project-manager');
    const api = {
        version: exports.API_VERSION,
    };
    // Load shared services
    if (sharedExt) {
        await sharedExt.activate();
        const exports = sharedExt.exports;
        if (exports) {
            api.aiManager = exports.aiManager;
            api.quotaBar = exports.quotaBar;
        }
    }
    // Load skills manager
    if (skillsExt) {
        await skillsExt.activate();
        const exports = skillsExt.exports;
        if (exports) {
            api.skillsManager = exports.skillsManager;
        }
    }
    // Load project manager
    if (projectExt) {
        await projectExt.activate();
        const exports = projectExt.exports;
        if (exports) {
            api.projectManager = exports;
        }
    }
    return api;
}
/**
 * 创建扩展消息
 */
function createMessage(type, payload, sender, receiver) {
    return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
        sender,
        receiver,
    };
}
//# sourceMappingURL=index.js.map