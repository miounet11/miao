# Miaoda Cloud Service

云端服务，用于管理用户额度、使用统计和配置同步。

## 功能

### 1. 额度管理
- 每日免费额度：50 次
- 额度消耗追踪
- 使用统计

### 2. 配置同步
- API Key 加密存储
- 模型配置同步
- 跨设备同步

### 3. 使用统计
- 实时使用情况
- 历史记录
- 可视化图表

## API 端点

### 额度管理
```
GET  /api/quota              # 获取额度信息
POST /api/quota/consume      # 消耗额度
GET  /api/quota/stats        # 获取统计
```

### 模型配置
```
GET    /api/models           # 获取模型列表
POST   /api/models           # 添加模型
DELETE /api/models/:id       # 删除模型
```

## 部署

后续实现...
