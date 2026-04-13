# MurisPro 代码索引

## 项目架构概述

**技术栈**: Vue 3 + Flask + pywebview (桌面应用)

**目录结构**:
```
MurisPro-G/
├── src/                    # 前端代码
│   ├── App.vue            # 主应用组件 (侧边栏+路由布局)
│   ├── main.js            # 入口文件 (Pinia/NaiveUI/pywebview集成)
│   ├── router/index.js    # 路由配置 (Hash模式)
│   ├── stores/            # Pinia状态管理
│   ├── views/             # 页面视图组件
│   ├── components/        # 可复用组件
│   └── utils/             # 工具函数 (API客户端/格式化/搜索)
├── backend/               # 后端代码
│   ├── app.py             # Flask API (~3300行, 主要逻辑)
│   ├── models.py          # SQLAlchemy数据模型 (~394行)
│   ├── main.py            # pywebview入口 (~422行)
│   ├── build.py           # Windows Nuitka打包
│   └── build_mac.py       # macOS Nuitka打包+DMG生成
└── vue.config.js          # Vue配置
```

---

## 后端索引 (Flask API)

### 数据库模型 (`backend/models.py`)

| 模型 | 行号 | 功能描述 |
|------|------|----------|
| `Mouse` | 5-65 | 小鼠主表 (tid, id, sex, live_status, birth_date, death_date, cage_id, strain, tests_planned) |
| `Pedigree` | 67-77 | 血统关系表 (mouse_id, parent_id, parent_type) |
| `Cage` | 79-93 | 笼位表 (section→Location, cage_id, location, cage_type, order, mice_birth_date, mice_genotype) |
| `WeightRecord` | 95-114 | 体重记录 (mouse_id, weight, record_date, record_livingdays) |
| `StatusRecord` | 116-133 | 状态记录 (mouse_id, status, record_date, record_livingdays) |
| `Allele` | 136-149 | 等位基因 (symbol, locus_id, description, is_wildtype) |
| `GeneLocus` | 152-164 | 基因位点 (symbol, description) |
| `Genotype` | 167-222 | 小鼠基因型 (mouse_id, locus_id, allele1_id, allele2_id) |
| `Location` | 225-237 | 位置区域 (identifier, description, order) |
| `ExperimentType` | 240-263 | 实验类型 (name, description, is_show) |
| `FieldDefinition` | 266-288 | 实验字段定义 (field_name, data_type, unit, visualize_type, display_order) |
| `Experiment` | 291-316 | 实验记录 (mouse_id, experiment_type_id, researcher, date, notes) |
| `ExperimentValue` | 319-358 | 实验数据值 (EAV模式: value_int, value_real, value_text, value_bool, value_date) |
| `ExperimentClass` | 361-372 | 实验分组关联 (mouse_id, experiment_id) |
| `PredefinedGroup` | 374-394 | 预定义分组规则 (name, Gtype, rules JSON) |

### API端点 (`backend/app.py`)

#### 基础设施
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /` | 189 | 提供静态index.html |
| `GET /<path>` | 193 | 提供静态资源 |
| `POST /heartbeat` | 204 | 客户端心跳保活 |

#### 小鼠管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/mice` | 223 | 获取所有小鼠 (含基因型、谱系、日龄) |
| `POST /api/mice` | 271 | 添加小鼠 |
| `PUT /api/mice/<tid>` | 356 | 更新小鼠 |
| `DELETE /api/mice/<tid>` | 425 | 删除小鼠 |
| `DELETE /api/mice` | 444 | 批量删除小鼠 |
| `POST /api/mice/<tid>` | 466 | 基于模板批量添加 |
| `PUT /api/mice/experiments` | 509 | 批量修改实验状态 |
| `GET /api/mice/<tid>` | 725 | 获取小鼠详细信息 (谱系、体重、状态) |

#### 笼位管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/cages` | 545 | 获取所有笼位 (含小鼠) |
| `GET /api/cages/-1` | 592 | 获取未分配笼位的小鼠 |
| `POST /api/cages` | 612 | 添加笼位 |
| `PUT /api/cage` | 637 | 移动小鼠到笼位 |
| `DELETE /api/cages/<id>` | 653 | 删除笼位 |
| `PUT /api/cages/<id>` | 670 | 更新笼位 |
| `PUT /api/cages/order` | 704 | 更新笼位排序 |

#### 健康监测
| 路由 | 行号 | 功能 |
|------|------|------|
| `DELETE /api/status_records/<id>` | 787 | 删除状态记录 |
| `POST /api/status_records` | 801 | 添加状态记录 |
| `POST /api/weight` | 830 | 批量添加体重记录 |
| `GET /api/weight` | 873 | 获取所有体重记录 |
| `GET /api/weight_records` | 1820 | 带筛选和分页的体重记录 |
| `POST /api/weight_records` | 1880 | 添加单个体重记录 |
| `PUT /api/weight_records/<id>` | 1918 | 更新体重记录 |
| `DELETE /api/weight_records/<id>` | 1950 | 删除体重记录 |

#### 生存分析
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/lived_mice` | 882 | 获取有寿命数据的小鼠 |
| `POST /api/survival-analysis` | 919 | 获取生存分析数据 |
| `calculate_survival_analysis` | 958 | 计算生存曲线 (Kaplan-Meier) |

#### 基因型管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/gene` | 1084 | 获取基因位点 |
| `POST /api/gene` | 1093 | 创建基因位点 |
| `POST /api/<id>/gene_allele` | 1112 | 添加等位基因 |
| `PUT /api/gene/<id>` | 1124 | 更新基因位点 |
| `PUT /api/gene_allele/<id>` | 1137 | 更新等位基因 |
| `DELETE /api/gene/<id>` | 1156 | 删除基因位点 |
| `DELETE /api/gene_allele/<id>` | 1170 | 删除等位基因 |

#### 位置管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/locations` | 1187 | 获取所有位置 |
| `POST /api/locations` | 1196 | 添加位置 |
| `PUT /api/locations/<id>` | 1222 | 更新位置 |
| `DELETE /api/locations/<id>` | 1242 | 删除位置 |
| `PUT /api/locations/order` | 1797 | 更新位置排序 |

#### 数据导入导出
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/export/<type>` | 1262 | 导出数据 (mice/weights/records/survival/experiment) |
| `POST /api/import` | 1383 | 导入数据 (Excel) |
| `import_mice_data` | 1432 | 导入小鼠数据 |
| `import_weights_data` | 1608 | 导入体重数据 |
| `import_record_data` | 1669 | 导入状态记录 |
| `import_pedigree_data` | 1729 | 导入血统关系 |

#### 实验类型管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/experiment-types` | 1967 | 获取实验类型 |
| `POST /api/experiment-types` | 1976 | 创建实验类型 |
| `PUT /api/experiment-types/<id>` | 2015 | 更新实验类型 |
| `DELETE /api/experiment-types/<id>` | 2079 | 删除实验类型 |
| `GET /api/experiment-types/presets` | 2103 | 获取预设实验类型 |

#### 实验数据管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/experiment/<id>` | 2153 | 获取实验信息 |
| `GET /api/experiment/<id>/data` | 2161 | 获取实验数据 |
| `POST /api/experiments` | 2217 | 录入实验数据 |
| `PATCH /api/experiments/<id>` | 2304 | 更新实验记录 |
| `DELETE /api/experiments/<id>` | 2388 | 删除实验记录 |
| `GET /api/experiments/<id>/grouped_mice` | 2590 | 获取实验分组小鼠 |
| `GET /api/experiments/<id>/mice` | 2603 | 获取实验小鼠列表 |

#### 数据库管理
| 路由 | 行号 | 功能 |
|------|------|------|
| `POST /api/database/clear` | 2618 | 清空数据库 |
| `GET /api/database` | 2730 | 获取当前/可用数据库列表 |
| `POST /api/database/create` | 2735 | 创建新数据库 |
| `PUT /api/database/<key>` | 2752 | 切换活跃数据库 |
| `DELETE /api/database/<key>` | 2775 | 删除数据库 |
| `POST /api/database/<key>` | 2790 | 修改数据库属性 |
| `GET /api/database/info` | 2809 | 获取数据库元信息 |
| `GET /api/database/export/<key>` | 2842 | 导出整个数据库 |
| `GET /api/database/export-log` | 2861 | 导出日志文件 |
| `POST /api/database/import` | 2881 | 导入数据库备份 |

#### 基因型分组
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/genotypes` | 2950 | 获取所有基因型组合 |
| `GET /api/groups/temp` | 2963 | 按条件获取临时分组 |
| `GET /api/groups/predefined/<id>/mice` | 3059 | 获取预定义分组的小鼠 |
| `PUT /api/groups/predefined/<id>` | 3200 | 更新预定义分组 |
| `POST /api/groups/predefined` | 3228 | 创建预定义分组 |
| `POST /api/groups/predefined/review` | 3259 | 预览/分析分组数据 |
| `GET /api/groups/predefined` | 3283 | 获取所有预定义分组 |
| `DELETE /api/groups/predefined/<id>` | 3292 | 删除预定义分组 |

#### 显示设置
| 路由 | 行号 | 功能 |
|------|------|------|
| `GET /api/setting` | 3303 | 获取UI显示设置 |
| `POST /api/setting/<type>` | 3307 | 更新显示设置 |

### 重要辅助函数 (`backend/app.py`)

| 函数 | 行号 | 功能 |
|------|------|------|
| `apply_socket_patch()` | 22 | Socket模块编码安全补丁 |
| `get_base_dir()` | 72 | 获取应用基础目录 (打包/开发) |
| `get_db_file()` | 115 | 获取当前数据库文件名 |
| `allowed_file()` | 184 | 验证文件扩展名 |
| `check_and_shutdown()` | 197 | 心跳监控自动关闭 |
| `block_non_read_requests()` | 213 | 只读模式装饰器 |
| `create_export_file()` | 1364 | 生成Excel导出 (含格式) |
| `clean_sheet_name()` | 2535 | Excel工作表名清理 |
| `auto_adjust_column_widths()` | 2545 | Excel列宽自适应 |
| `add_summary_sheet()` | 2564 | Excel添加摘要页 |
| `analyse_rule()` | 3098 | 分析分组规则 |
| `find_mice_with_exact_locus()` | 3156 | 按基因型精确查找小鼠 |

### 入口与打包 (`backend/main.py`, `build.py`, `build_mac.py`)

| 函数 | 文件 | 行号 | 功能 |
|------|------|------|------|
| `setup_logging()` | main.py | 15 | 日志设置 (滚动文件) |
| `find_free_port()` | main.py | 125 | 查找可用端口 |
| `run_flask()` | main.py | 139 | 启动Flask服务 |
| `wait_for_server()` | main.py | 150 | 等待服务就绪 |
| `create_save_file_dialog()` | main.py | 163 | 文件保存对话框 |
| `mac_save_file()` | main.py | 224 | macOS文件保存 (AppleScript) |
| `build_app()` | build.py | 7 | Windows Nuitka打包 |
| `build_app()` | build_mac.py | 18 | macOS Nuitka打包 |
| `create_dmg()` | build_mac.py | 157 | 创建DMG安装包 |

---

## 前端索引 (Vue 3)

### 路由配置 (`src/router/index.js`)

| 路径 | Name | 组件 | 加载方式 |
|------|------|------|----------|
| `/` | home | DashBoard.vue | 静态导入 |
| `/mice` | mice | MiceView.vue | 静态导入 |
| `/mouse/:id` | MouseDetail | MouseDetailView.vue | 懒加载 |
| `/weight_list` | WeightList | WeightView.vue | 懒加载 |
| `/experiments/:experimentId` | Experiments | ExperimentDisplay.vue | 懒加载 |
| `/weight` | BodyWeight | BodyWeight.vue | 懒加载 |
| `/survival` | Survivalplot | Survival.vue | 懒加载 |
| `/setting` | SystemSettings | Setting.vue | 懒加载 |
| `/:pathMatch(.*)*` | — | NotFound.vue | 懒加载 |

### Pinia状态管理 (`src/stores/`)

| Store名称 | 文件 | 功能 |
|-----------|------|------|
| `cage` | cageStore.js | 笼位和位置管理 (locations, cages, activeSection, filteredCages) |
| `experiment` | experimentStore.js | 实验类型、预设和预定义分组 (experiments, experimentPresets, predefinedGroups) |
| `genotype` | geneStore.js | 基因型管理、小鼠列表和分组逻辑 (mice, genotypes, selectedGenes, tempGroups) |
| `setting` | settingStore.js | 显示设置和列配置 (showColumns, mouseColumns, selectedSetting) |
| `StoreUtils.initializeStores` | index.js | 统一初始化所有Store |

### 视图组件 (`src/views/`)

| 组件 | 路由 | 功能 |
|------|------|------|
| `DashBoard.vue` | `/` | 笼位视图 - 网格布局、搜索、区域标签、笼位管理、生存统计 |
| `MiceView.vue` | `/mice` | 小鼠列表 - 高级筛选 (ID/位置/笼位/基因型/品系/性别)、列自定义 |
| `MouseDetailView.vue` | `/mouse/:id` | 小鼠详情 - 基本信息、笼位、状态记录、测试记录 |
| `WeightView.vue` | `/weight_list` | 体重列表 - 分页、按ID/日期筛选、CRUD |
| `BodyWeight.vue` | `/weight` | 体重曲线 - 临时分组和预定义分组的体重趋势图 |
| `Survival.vue` | `/survival` | Kaplan-Meier生存曲线 - 分组生存分析 |
| `ExperimentDisplay.vue` | `/experiments/:id` | 实验数据 - 可视化(图表)和数据(Tabulator表格)双标签 |
| `Setting.vue` | `/setting` | 系统设置 - 基因型管理、位置管理、导出设置三标签 |
| `NotFound.vue` | 404 | 404页面 |
| `InfoView.vue` | (未路由) | 宣传页 - 视频教程、GitHub、文档链接 |

### 可复用组件 (`src/components/`)

| 组件 | 功能 |
|------|------|
| `AppIcon.vue` | 图标组件 - 封装@vicons/ionicons5, 支持~50种Material图标, 按name映射 |
| `IdGroupingManager.vue` | ID分组管理器 - 左侧候选小鼠+搜索, 右侧分组+拖拽+颜色, 最多8组 |

### 工具函数 (`src/utils/`)

| 文件 | 功能 |
|------|------|
| `api.js` | Axios HTTP客户端 (baseURL: `/api`, timeout: 60s) |
| `format.js` | 格式化函数: formatDate, formatFileSize, normalizeDateValue, renderEmpty |
| `search.js` | fuzzySearch - 模糊搜索 (前缀优先, 子串匹配排序, 默认10条) |

### 应用菜单结构 (`src/App.vue`)

```
核心功能
├─ 笼位视图 (home)
├─ 小鼠列表 (mice)
└─ 体重列表 (WeightList)

实验记录 (动态 - 仅有实验类型时显示)
├─ {实验名称1}
├─ {实验名称2}
└─ ...

数据分析
├─ 体重曲线 (BodyWeight)
└─ 生存曲线 (Survivalplot)

系统设置
└─ 设置 (SystemSettings)
```

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
- 笼位可记录 mice_birth_date 和 mice_genotype 元数据

### 实验系统
- EAV模式存储实验数据
- 支持多种数据类型: INTEGER, REAL, TEXT, BOOLEAN, DATE
- `visualize_type` 控制图表展示: x, y, column
- 支持预定义分组 (PredefinedGroup) 和临时分组

### 生存分析
- 使用Kaplan-Meier方法计算生存曲线
- 支持删失数据(censored)
- 计算中位生存时间(LS50)

### 数据库管理
- 支持多数据库切换
- 支持数据库导入/导出/备份
- 支持只读模式 (`block_non_read_requests` 装饰器)
- 心跳机制: 前端定期发送心跳, 后端超时自动关闭

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
                     ├──→ (N) PredefinedGroup (通过rules JSON关联)
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
