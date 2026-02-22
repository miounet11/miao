"use strict";
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
exports.EventBus = void 0;
exports.getEventBus = getEventBus;
exports.resetEventBus = resetEventBus;
const vscode = __importStar(require("vscode"));
/**
 * In-process Event Bus implementation
 * Provides type-safe event publishing and subscription within Extension Host
 */
class EventBus {
    constructor() {
        this.handlers = new Map();
        this.requestHandlers = new Map();
    }
    /**
     * Emit an event to all subscribers
     */
    emit(event, payload) {
        const eventHandlers = this.handlers.get(event);
        if (!eventHandlers) {
            return;
        }
        for (const handler of eventHandlers) {
            try {
                handler(payload);
            }
            catch (error) {
                console.error(`Error in event handler for '${event}':`, error);
            }
        }
    }
    /**
     * Subscribe to an event
     * @returns Disposable to unsubscribe
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        const eventHandlers = this.handlers.get(event);
        const typedHandler = handler;
        eventHandlers.add(typedHandler);
        return new vscode.Disposable(() => {
            eventHandlers.delete(typedHandler);
            if (eventHandlers.size === 0) {
                this.handlers.delete(event);
            }
        });
    }
    /**
     * Subscribe to an event once (auto-unsubscribe after first invocation)
     * @returns Disposable to unsubscribe
     */
    once(event, handler) {
        const disposable = this.on(event, (payload) => {
            disposable.dispose();
            handler(payload);
        });
        return disposable;
    }
    /**
     * Request-response pattern with timeout
     */
    async request(channel, payload, timeout = 5000) {
        const requestHandler = this.requestHandlers.get(channel);
        if (!requestHandler) {
            throw new Error(`No handler registered for channel '${channel}'`);
        }
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout}ms for channel '${channel}'`));
            }, timeout);
        });
        const responsePromise = requestHandler(payload);
        return Promise.race([responsePromise, timeoutPromise]);
    }
    /**
     * Register a request handler for a channel
     * @returns Disposable to unregister
     */
    onRequest(channel, handler) {
        if (this.requestHandlers.has(channel)) {
            throw new Error(`Request handler already registered for channel '${channel}'`);
        }
        const typedHandler = handler;
        this.requestHandlers.set(channel, typedHandler);
        return new vscode.Disposable(() => {
            this.requestHandlers.delete(channel);
        });
    }
    /**
     * Get the number of subscribers for an event
     */
    getSubscriberCount(event) {
        return this.handlers.get(event)?.size ?? 0;
    }
    /**
     * Clear all handlers (useful for testing)
     */
    clear() {
        this.handlers.clear();
        this.requestHandlers.clear();
    }
}
exports.EventBus = EventBus;
/**
 * Singleton instance of Event Bus
 */
let eventBusInstance;
function getEventBus() {
    if (!eventBusInstance) {
        eventBusInstance = new EventBus();
    }
    return eventBusInstance;
}
function resetEventBus() {
    eventBusInstance = undefined;
}
//# sourceMappingURL=EventBus.js.map