# MurisPro 代码索引

## 项目架构概述

**技术栈**: Vue 3 + Flask + pywebview (桌面应用)

**目录结构**:
```
MurisPro-G/
├── src/                    # 前端代码
│   ├── App.vue            # 主应用组件
│   ├── main.js            # 入口文件
│   ├── router/index.js    # 路由配置
│   ├── stores/            # Pinia状态管理
│   ├── views/             # 页面视图组件
│   └── components/        # 可复用组件
├── backend/               # 后端代码
│   ├── app.py             # Flask API (主要逻辑)
│   ├── models.py          # SQLAlchemy数据模型
│   └── main.py            # pywebview入口
└── vue.config.js          # Vue配置
```

---

## 后端索引 (Flask API)

### 数据库模型 (`backend/models.py`)

| 模型 | 行号 | 功能描述 |
|------|------|----------|
| `Mouse` | 5-65 | 小鼠主表 (tid, id, sex, live_status, birth_date, death_date, cage_id, strain) |
| `Pedigree` | 67-77 | 血统关系表 (mouse_id, parent_id, parent_type) |
| `Cage` | 79-96 | 笼位表 (section→Location.identifier, cage_id, order) |
| `WeightRecord` | 97-116 | 体重记录 (mouse_id, weight, record_livingdays) |
| `StatusRecord` | 118-135 | 状态记录 (mouse_id, status, record_livingdays) |
| `GeneLocus` | 154-166 | 基因位点 (symbol, description) |
| `Allele` | 138-151 | 等位基因 (symbol, locus_id, is_wildtype) |
| `Genotype` | 169-224 | 小鼠基因型 (mouse_id, locus_id, allele1_id, allele2_id) |
| `Location` | 227-239 | 位置区域 (identifier, order) |
| `ExperimentType` | 242-265 | 实验类型 (name, description, is_show) |
| `FieldDefinition` | 268-290 | 实验字段定义 (field_name, data_type, unit, visualize_type) |
| `Experiment` | 293-318 | 实验记录 (mouse_id, experiment_type_id, researcher, date) |
| `ExperimentValue` | 321-360 | 实验数据值 (EAV模式存储) |
| `ExperimentClass` | 363-374 | 实验分组关联 (mouse_id, experiment_id) |
| `PredefinedGroup` | 376-396 | 预定义分组规则 (name, Gtype, rules) |

### API端点 (`backend/app.py`)

#### 小鼠管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/mice` | 223-269 | 获取所有小鼠 |
| `POST /api/mice` | 271-354 | 添加小鼠 |
| `PUT /api/mice/<tid>` | 356-423 | 更新小鼠 |
| `DELETE /api/mice/<tid>` | 425-442 | 删除小鼠 |
| `DELETE /api/mice` | 444-464 | 批量删除小鼠 |
| `POST /api/mice/<tid>` | 466-506 | 基于模板批量添加 |
| `PUT /api/mice/experiments` | 509-540 | 批量修改实验状态 |
| `GET /api/mice/<tid>` | 717-776 | 获取小鼠详细信息 (谱系、体重、状态) |

#### 笼位管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/cages` | 545-577 | 获取所有笼位 |
| `GET /api/cages/-1` | 579-597 | 获取未分配笼位的小鼠 |
| `POST /api/cages` | 599-624 | 添加笼位 |
| `PUT /api/cage` | 626-639 | 移动小鼠到笼位 |
| `DELETE /api/cages/<id>` | 642-656 | 删除笼位 |
| `PUT /api/cages/<id>` | 659-693 | 更新笼位 |
| `PUT /api/cages/order` | 696-711 | 更新笼位排序 |

#### 体重管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `POST /api/weight` | 822-863 | 批量添加体重记录 |
| `GET /api/weight` | 865-872 | 获取所有体重记录 |
| `GET /api/weight_records` | 1812-1869 | 带筛选和分页的体重记录 |
| `POST /api/weight_records` | 1872-1907 | 添加单个体重记录 |
| `PUT /api/weight_records/<id>` | 1910-1939 | 更新体重记录 |
| `DELETE /api/weight_records/<id>` | 1942-1953 | 删除体重记录 |

#### 生存分析
| 路由 | 行号 | 功能 |
|------|------|------|
| `POST /api/survival-analysis` | 911-948 | 获取生存分析数据 |
| `calculate_survival_analysis` | 950-1071 | 计算生存曲线 (Kaplan-Meier) |

#### 基因型管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/gene` | 1076-1083 | 获取基因位点 |
| `POST /api/gene` | 1085-1102 | 创建基因位点 |
| `POST /api/<id>/gene_allele` | 1104-1114 | 添加等位基因 |
| `PUT /api/gene/<id>` | 1116-1127 | 更新基因位点 |
| `PUT /api/gene_allele/<id>` | 1129-1146 | 更新等位基因 |
| `DELETE /api/gene/<id>` | 1148-1160 | 删除基因位点 |
| `DELETE /api/gene_allele/<id>` | 1162-1176 | 删除等位基因 |

#### 位置管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/locations` | 1179-1186 | 获取所有位置 |
| `POST /api/locations` | 1188-1212 | 添加位置 |
| `PUT /api/locations/<id>` | 1214-1232 | 更新位置 |
| `DELETE /api/locations/<id>` | 1234-1251 | 删除位置 |
| `PUT /api/locations/order` | 1789-1808 | 更新位置排序 |

#### 实验管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/experiment-types` | 1959-1966 | 获取实验类型 |
| `POST /api/experiment-types` | 1968-2005 | 创建实验类型 |
| `PUT /api/experiment-types/<id>` | 2007-2069 | 更新实验类型 |
| `DELETE /api/experiment-types/<id>` | 2071-2092 | 删除实验类型 |
| `GET /api/experiment-types/presets` | 2095-2140 | 获取预设实验类型 |
| `GET /api/experiment/<id>` | 2145-2151 | 获取实验信息 |
| `GET /api/experiment/<id>/data` | 2153-2207 | 获取实验数据 |
| `POST /api/experiments` | 2209-2293 | 录入实验数据 |
| `PATCH /api/experiments/<id>` | 2296-2377 | 更新实验记录 |
| `DELETE /api/experiments/<id>` | 2380-2398 | 删除实验记录 |

#### 数据导入导出
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/export/<type>` | 1254-1354 | 导出数据 (mice/weights/records/survival/experiment) |
| `POST /api/import` | 1375-1422 | 导入数据 |
| `import_mice_data` | 1424-1598 | 导入小鼠数据 |
| `import_weights_data` | 1600-1659 | 导入体重数据 |
| `import_record_data` | 1661-1719 | 导入状态记录 |
| `import_pedigree_data` | 1721-1786 | 导入血统关系 |

---

## 前端索引 (Vue 3)

### 路由配置 (`src/router/index.js`)

| 路径 | 组件 | 功能 |
|------|------|------|
| `/` | DashBoard.vue | 笼位视图 (主页) |
| `/mice` | MiceView.vue | 小鼠列表 |
| `/mouse/:id` | MouseDetailView.vue | 小鼠详情 |
| `/weight` | BodyWeight.vue | 体重曲线 |
| `/weight_list` | WeightView.vue | 体重列表 |
| `/experiments/:id` | ExperimentDisplay.vue | 实验展示 |
| `/survival` | Survival.vue | 生存曲线 |
| `/setting` | Setting.vue | 系统设置 |
| `/info` | InfoView.vue | 宣传页 |

### Pinia状态管理 (`src/stores/`)

| Store | 文件 | 功能 |
|-------|------|------|
| `useCageStore` | cageStore.js | 笼位和位置管理 |
| `useExperimentStore` | experimentStore.js | 实验类型和分组管理 |
| `useGeneStore` | geneStore.js | 基因型管理 |
| `useSettingStore` | settingStore.js | 系统设置 |
| `StoreUtils.initializeStores` | index.js | 统一初始化所有Store |

### 视图组件 (`src/views/`)

| 组件 | 功能 |
|------|------|
| `DashBoard.vue` | 笼位视图 - 搜索、拖拽排序、PDF导出 |
| `MiceView.vue` | 小鼠列表 - 筛选、排序、批量操作 |
| `MouseDetailView.vue` | 小鼠详情 - 谱系图、体重图、状态记录 |
| `WeightView.vue` | 体重列表 - 分页、筛选、CRUD |
| `BodyWeight.vue` | 体重曲线图表 |
| `ExperimentDisplay.vue` | 实验数据表格和图表 |
| `Survival.vue` | Kaplan-Meier生存曲线 |
| `Setting.vue` | 实验类型、基因型、位置管理 |
| `InfoView.vue` | 系统信息页面 |
| `NotFound.vue` | 404页面 |

### 可复用组件 (`src/components/`)

| 组件 | 功能 |
|------|------|
| `AppIcon.vue` | 图标组件 |
| `IdGroupingManager.vue` | ID分组管理器 |

---

## 关键业务逻辑

### 小鼠状态系统
- `live_status`: 1=活, 0=死, 2=解剖, 3=意外消失, 4=丢弃
- 死亡小鼠需要记录 `death_date`

### 基因型系统
- 基因型格式: `{位点}[等位基因1]/[等位基因2]`
- 多位点用 `&` 连接
- 纯合子(homo): 两个等位基因相同
- 杂合子(hetero): 两个等位基因不同

### 笼位系统
- 笼位属于位置(Location)，通过 `section` 字段关联
- 笼位有排序(order)字段，支持拖拽排序
- 未分配笼位的小鼠在临时区(cage_id = NULL)

### 实验系统
- EAV模式存储实验数据
- 支持多种数据类型: INTEGER, REAL, TEXT, BOOLEAN, DATE
- `visualize_type` 控制图表展示: x, y, column

### 生存分析
- 使用Kaplan-Meier方法计算生存曲线
- 支持删失数据(censored)
- 计算中位生存时间(LS50)

---

## 数据库关系图

```
Location (1) ──→ (N) Cage
                     │
                     ↓ (1:N)
                    Mouse ──→ (N) Genotype ──→ GeneLocus ──→ (N) Allele
                     │
                     ├──→ (N) WeightRecord
                     ├──→ (N) StatusRecord
                     ├──→ (N) Experiment ──→ (N) ExperimentValue ──→ FieldDefinition
                     ├──→ (N) ExperimentClass ──→ ExperimentType
                     └──→ Pedigree (父/母关系)
```

---

## 常用开发任务

### 添加新的API端点
1. 在 `backend/app.py` 添加路由函数
2. 遵循 `/api/` 前缀约定
3. 使用 `jsonify()` 返回数据
4. 错误处理使用 try/except + db.session.rollback()

### 添加新的前端页面
1. 在 `src/views/` 创建组件
2. 在 `src/router/index.js` 添加路由
3. 在 `src/App.vue` 的 `menuOptions` 添加菜单项

### 添加新的Store
1. 在 `src/stores/` 创建文件
2. 使用 `defineStore` + Composition API
3. 在 `index.js` 导出并添加到 `initializeStores`

### 修改数据模型
1. 更新 `backend/models.py`
2. 添加 `to_dict()` 方法
3. 更新相关API端点
