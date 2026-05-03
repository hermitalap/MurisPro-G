# MurisPro-G 代码审阅报告

> 审阅日期：2026-05-03  
> 审阅范围：backend/（Flask + SQLite）、src/（Vue 3 + Pinia + Naive UI）  
> 审阅版本：branch `new`，最新提交 `8c9570b`

---

## 1. 概述

MurisPro-G 是一套面向实验室小鼠管理的桌面应用，前端采用 Vue 3 + Pinia + Naive UI，后端采用 Flask + SQLAlchemy + SQLite，通过 pywebview 封装为单机桌面程序。代码库功能已基本定型，涵盖小鼠档案、笼位管理、繁配计划、基因型分析、体重追踪、生存分析等核心模块。

整体架构清晰，业务逻辑（特别是 Mendelian 预测和繁配推荐引擎）实现扎实；但存在若干会在运行时直接 crash 的 Blocker 级缺陷和多处性能 N+1 问题，需要在收尾阶段优先修复。

---

## 2. 问题清单

### [Blocker] B1 — bare `except:` 中引用未绑定变量 `e`，三处 ✅ 已修复

- **修复状态：** 已将三处裸 `except:` 改为 `except Exception as e:`，并返回有效的 500 JSON 错误响应。
- **位置：** `backend/app.py:1376`、`1391`、`1407`
- **现象：** 三个路由使用了 `except:` 而非 `except Exception as e:`，但 except 块内紧跟 `logger.error(f"... {str(e)}")` 引用 `e`。裸 `except` 不绑定异常对象，`e` 未定义，触发异常时会在错误处理代码里再抛出 `NameError: name 'e' is not defined`，掩盖原始错误。
- **影响：** `update_allele`、`delete_gene`、`delete_allele` 三个接口在出错时不能返回任何响应，客户端只会看到连接被终止。
- **建议：**
```python
# 将三处 except: 改为
except Exception as e:
    logger.error(f"操作失败: {str(e)}")
    db.session.rollback()
    return jsonify({'error': '操作失败'}), 500
```

---

### [Blocker] B2 — `delete_allele` 返回整数而非 Response ✅ 已修复

- **修复状态：** 已将 `return 404` 改为 `return jsonify({'error': '删除等位基因失败'}), 500`。
- **位置：** `backend/app.py:1409`
- **现象：** `return 404` 返回一个 Python 整数，Flask 视图函数要求返回 Response、str、dict 或 tuple，返回整数会引发 `TypeError: The view function for 'delete_allele' did not return a valid response`，导致 500 崩溃。
- **影响：** 每次删除等位基因出错时服务端 crash，与 B1 合并时故障尤为严重。
- **建议：**
```python
return jsonify({'error': '删除等位基因失败'}), 500
```

---

### [Blocker] B3 — `ExperimentClass.to_dict()` 引用不存在的属性 `class_id` ✅ 已修复

- **修复状态：** 已改为返回 `self.id`。
- **位置：** `backend/models.py:379`
- **现象：** `ExperimentClass` 的主键列名为 `id`（第 374 行），但 `to_dict` 返回 `'class_id': self.class_id`，该属性不存在，调用即抛 `AttributeError`。
- **影响：** 任何调用 `ExperimentClass.to_dict()` 的路径均 crash；虽然目前主路径中 `to_dict` 调用较少，但一旦触发必然报错。
- **建议：**
```python
def to_dict(self):
    return {
        'class_id': self.id,      # 修正：self.id 而非 self.class_id
        'mouse_id': self.mouse_id,
        'experiment_id': self.experiment_id,
        'mouse_info': self.mouse.to_dict() if self.mouse else None
    }
```

---

### [Blocker] B4 — `IdGroupingManager.vue` 直接 mutation props ✅ 已确认已修复

- **修复状态：** 当前代码已通过 `cloneRules()` 复制规则后修改，并通过 `emit('update:editingGroup', ...)` 回传；未发现报告中的直接 props mutation。
- **位置：** `src/components/IdGroupingManager.vue:242, 279, 294, 299, 313`
- **现象：** 组件对 `props.editingGroup.rules` 调用 `.push()`、`.splice()` 和属性赋值进行原地修改，Vue 3 明确禁止此行为（会触发运行时警告，并可能导致父组件错过变更）。
- **影响：** 分组规则编辑器状态与父组件可能不同步，数据保存后出现幽灵状态。
- **建议：**
```js
// 使用本地副本，编辑完成后再 emit
const localRules = ref(JSON.parse(JSON.stringify(props.editingGroup?.rules ?? [])))
watch(() => props.editingGroup, (val) => {
  localRules.value = JSON.parse(JSON.stringify(val?.rules ?? []))
}, { deep: true })

// 在所有修改处操作 localRules.value，不操作 props
// 在需要通知父组件时：
emit('update:editingGroup', { ...props.editingGroup, rules: localRules.value })
```

---

### [Major] M1 — `get_all_mice` N+1 查询（Pedigree） ✅ 已修复

- **修复状态：** 已改为一次性加载 `Pedigree.query.all()` 并构建 `pedigree_map`，循环内不再逐只查询。
- **位置：** `backend/app.py:280-285`
- **现象：** 对每只小鼠执行一条 `Pedigree.query.filter_by(mouse_id=m.tid)`，小鼠数量为 N 时产生 N+1 次数据库查询。
- **影响：** 数百只小鼠时接口响应明显变慢；小鼠 > 1000 时将严重卡顿。
- **建议：**
```python
# 在查询 mice 之后，一次性加载所有 pedigree
all_pedigrees = Pedigree.query.all()
pedigree_map = {}
for p in all_pedigrees:
    pedigree_map.setdefault(p.mouse_id, {'father': [], 'mother': []})
    pedigree_map[p.mouse_id][p.parent_type].append(p.parent_id)

# 在循环中改为：
pinfo = pedigree_map.get(m.tid, {})
father = pinfo.get('father') or None
mother = pinfo.get('mother') or None
```

---

### [Major] M2 — `StatusRecord.to_dict()` 返回未序列化的 `date` 对象 ✅ 已修复

- **修复状态：** 已改为 `self.record_date.isoformat() if self.record_date else None`。
- **位置：** `backend/models.py:140`
- **现象：** `'record_date': self.record_date` 直接返回 Python `date` 对象，Flask 的 `jsonify` 无法序列化 `date`，调用时抛 `TypeError: Object of type date is not JSON serializable`。
- **影响：** 所有依赖 `StatusRecord.to_dict()` 的接口（如导出 records）将 crash。
- **建议：**
```python
'record_date': self.record_date.isoformat() if self.record_date else None,
```

---

### [Major] M3 — `WeightRecord.to_dict()` 在模型层执行额外查询（N+1） ✅ 已修复

- **修复状态：** `WeightRecord.to_dict()` 已支持传入预加载的 `mouse`；导出路径已批量加载 Mouse 字典后传入，避免逐条查询。`StatusRecord.to_dict()` 同步支持传入 `mouse`。
- **位置：** `backend/models.py:115`
- **现象：** `Mouse.query.get_or_404(self.mouse_id)` 在 `to_dict` 内调用，每条体重记录都触发一次 DB 查询。在列表接口中 `[row.to_dict() for row in query.all()]` 会产生严重 N+1。
- **影响：** 体重导出大量数据时性能极差。
- **建议：** 路由层预加载鼠只信息，`to_dict` 接受 `mouse` 参数传入，或在路由中不调用 `to_dict` 而直接构造字典。

---

### [Major] M4 — 多处错误响应 `str(e)` 暴露内部信息 ✅ 已修复

- **修复状态：** 已将后端 API 中直接返回 `str(e)` 的错误响应收敛为通用提示，详细异常仅写入日志；受控的参数校验错误保留用户可读提示。
- **位置：** `backend/app.py:407-408, 477, 496, 518, 560, 594, 670, 690, 715, 730, 747` 等
- **现象：** 错误响应直接返回 `jsonify({'error': str(e)})`，将 SQLAlchemy 异常、文件路径等内部信息暴露给前端。
- **影响：** 虽是桌面应用，但日志行为和消息措辞不专业；如系统被意外暴露到网络则构成信息泄露。
- **建议：** 500 级错误返回通用提示，详细信息仅记录日志：
```python
logger.error(f"操作失败: {str(e)}", exc_info=True)
return jsonify({'error': '操作失败，请查看日志'}), 500
```

---

### [Major] M5 — `batch_experiments_change` 对动态关系 `tests_done` 的错误判断 ✅ 已修复

- **修复状态：** 已改为直接通过 `ExperimentClass.query.filter_by(mouse_id=m.tid).delete()` 删除旧记录。
- **位置：** `backend/app.py:575-576`
- **现象：** `if m.tests_done:` 对 SQLAlchemy 的 `dynamic` 关系求值，动态关系返回 Query 对象，始终为 truthy，无论是否有数据都会进入 if 分支。随后 `m.tests_done.delete()` 虽然有效，但意图已与代码不一致，容易造成维护误解。
- **影响：** 逻辑上无 bug，但存在隐患；若将关系从 `dynamic` 改为默认加载，这里会 crash。
- **建议：**
```python
# 直接删除，不需要判断
ExperimentClass.query.filter_by(mouse_id=m.tid).delete()
```

---

### [Major] M6 — 导出小鼠时 N+1 查询（两层循环） ✅ 已修复

- **修复状态：** 已改为一次性取出导出 Mouse rows，并批量加载 Cage 字典；基因型字符串直接由当前 Mouse 对象生成，不再循环内 `get_or_404`。
- **位置：** `backend/app.py:1562-1578`
- **现象：** 先对 `data` 遍历一次调用 `Cage.query.get_or_404(tid)`，再遍历一次调用 `Mouse.query.get_or_404(data[index]['tid'])`，均在循环内逐条查询。导出 500 条小鼠 = 1000 次额外 DB 查询。
- **影响：** 大量数据导出时超时或严重卡顿。
- **建议：** 导出前一次性加载所有需要的 Cage 和 Mouse，构建 `{id: obj}` 字典后在循环中直接查找。

---

### [Major] M7 — `IdGroupingManager.vue` `groupedMice` 返回 `undefined` 元素 ✅ 已确认已修复

- **修复状态：** 当前代码已在 `map()` 后调用 `.filter(Boolean)`。
- **位置：** `src/components/IdGroupingManager.vue:207`
- **现象：**
```js
return group.mouseId.map(mId => props.candidateMice.find(m => m.tid === mId))
```
若 `mouseId` 中存在 `candidateMice` 里不存在的 tid，`find` 返回 `undefined`，模板中访问 `mouse.id`、`mouse.genotype.symbol` 将 crash。
- **影响：** 分组视图运行时 TypeError，导致整个分组面板白屏。
- **建议：**
```js
return group.mouseId
  .map(mId => props.candidateMice.find(m => m.tid === mId))
  .filter(Boolean)
```

---

### [Major] M8 — `geneStore.js` `onFormLocusChange` 空引用 ✅ 已修复

- **修复状态：** 已在 `matchedLocus` 不存在时清空 allele 并提前返回，同时将长度比较改为 `=== 1`。
- **位置：** `src/stores/geneStore.js:173-174`
- **现象：**
```js
const matchedLocus = genotypes.value.find(g => g.symbol === locus)
if (matchedLocus.alleles.length == 1) { ... }   // matchedLocus 可能为 undefined
```
若 locus 在 genotypes 中不存在，`matchedLocus` 为 `undefined`，第二行抛 `TypeError`。
- **影响：** 基因型表单中选择未知位点时崩溃。
- **建议：**
```js
const matchedLocus = genotypes.value.find(g => g.symbol === locus)
if (!matchedLocus) return
alleleSuggestions.value[index] = [matchedLocus.alleles, matchedLocus.alleles]
if (matchedLocus.alleles.length === 1) { ... }
```

---

### [Major] M9 — `GenotypeComboBuilder.vue` 双重 emit 使用过期 props ✅ 已修复

- **修复状态：** 已改为先计算 `base`，只触发一次 `emitNext()`。
- **位置：** `src/components/GenotypeComboBuilder.vue:117-119`
- **现象：**
```js
function addLocus() {
  if (isWildtype.value) emitNext([])           // emit #1：清空
  emitNext([...props.modelValue, newEntry])    // emit #2：props.modelValue 仍是旧值
}
```
两次 emit 之间 `props.modelValue` 尚未更新（Vue 响应式是异步的），第二次 emit 可能产生 `[{locus:'WT'}, {locus:''}]`，而非预期的 `[{locus:''}]`。
- **影响：** 从 WT 状态添加新位点时，WT 条目可能没有被正确清除。
- **建议：**
```js
function addLocus() {
  const base = isWildtype.value ? [] : [...props.modelValue]
  emitNext([...base, { locus: '', allele1: null, allele2: null }])
}
```

---

### [Major] M10 — `breedingStore.js` 跨 store 静默 mutation ✅ 已修复

- **修复状态：** 已在 `cageStore` 增加 `updateCage()` action，并由 `breedingStore.setBreedingStatus()` 调用，避免跨 store 原地修改对象。
- **位置：** `src/stores/breedingStore.js:61-73`
- **现象：** `setBreedingStatus` 通过 `cageStore.cages.find()` 找到 cage 对象后直接修改其属性，属于跨 store 直接 mutation，绕过了 cageStore 的管理边界。浅监听 `cageStore.cages` 的组件不会感知到变更。
- **影响：** 可能出现笼位状态已更新但 UI 未刷新的情况。
- **建议：** 在 `cageStore` 中暴露 `updateCageField(id, key, value)` action，由 `breedingStore` 调用，或 mutation 后替换整个对象以触发数组响应性：
```js
const idx = cageStore.cages.findIndex(c => c.id === cage.id)
if (idx !== -1) cageStore.cages[idx] = { ...cageStore.cages[idx], ...updatedFields }
```

---

### [Major] M11 — `pairKey` 函数在 4 处重复定义 ✅ 已修复

- **修复状态：** 已新增 `src/utils/allele.js` 并统一从该文件导入 `pairKey`。
- **位置：** `src/components/BatchGenotypeModal.vue:259`、`src/utils/genotypePresets.js:141`、`src/utils/mendelianPredictor.js:13`、`src/utils/pedigree.js:66`
- **现象：** 完全相同的 `pairKey(a, b)` 函数被复制到 4 个文件，违反 DRY 原则。
- **影响：** 若 key 生成逻辑需要修改（如 allele ID 类型变更），必须同步修改 4 处，极易遗漏。
- **建议：** 提取到 `src/utils/allele.js` 并统一 import：
```js
// src/utils/allele.js
export const pairKey = (a, b) => [a, b].sort().join('-')
```

---

### [Minor] N1 — `update_cage` 调用 `get_or_404` 后仍有死代码检查 ✅ 已修复

- **修复状态：** 已删除 `get_or_404()` 后不可达的 `if not cage` 判断。
- **位置：** `backend/app.py:752-754`
- **现象：** `cage = Cage.query.get_or_404(cage_id)` 在找不到时已自动返回 404，其后的 `if not cage: return jsonify(...), 404` 永远不会执行。
- **建议：** 删除死代码 `if not cage:` 段。

---

### [Minor] N2 — `StatusRecord` 无 `__tablename__` ✅ 已修复

- **修复状态：** 已添加 `__tablename__ = 'status_record'`。
- **位置：** `backend/models.py:126`
- **现象：** `StatusRecord` 类未定义 `__tablename__`，SQLAlchemy 会自动推断为 `status_record`，与其他明确定义表名的 Model 不一致，存在将来迁移歧义。
- **建议：** 显式添加 `__tablename__ = 'status_record'`。

---

### [Minor] N3 — `ExperimentClass` 无 `__tablename__`，且缺少 `mouse` backref ✅ 已修复

- **修复状态：** 已添加 `__tablename__ = 'experiment_class'`，并将关系 backref 改为唯一的 `experiment_mouse`，`to_dict()` 同步使用新关系名。
- **位置：** `backend/models.py:373-384`
- **现象：** 无显式 `__tablename__`；`to_dict` 中引用 `self.mouse`，但该关系在 `Mouse` 的 `tests_done` backref 中定义（`backref='mouse'`），与 `Pedigree` 的 `mouse` backref 同名（见 Mouse line 83 `pedigree_records` 和 `offspring`）。多个模型用同名 backref 可能导致 SQLAlchemy 关系冲突。
- **建议：** 添加 `__tablename__ = 'experiment_class'` 并将 tests_done 的 backref 名称更改为唯一值如 `backref='experiment_assignments'`。

---

### [Minor] N4 — 导出日期过滤变量 `start_dt`/`end_dt` 可能未定义 ✅ 已修复

- **修复状态：** 已在日期过滤前初始化 `start_dt = datetime.min.date()`、`end_dt = datetime.max.date()`，并将日期解析放入 `try`。
- **位置：** `backend/app.py:1541-1558`
- **现象：** `start_dt` 和 `end_dt` 在 if/elif 分支内定义，若 `start_date` 或 `end_date` 格式正确但进入了未赋值的分支，后续 `query.filter(... .between(start_dt, end_dt))` 会抛 `UnboundLocalError`。
- **建议：** 在进入 if 块前初始化：
```python
start_dt = datetime.min.date()
end_dt = datetime.max.date()
```

---

### [Minor] N5 — `IdGroupingManager.vue` 拖放事件缺少 `dragleave` 清理 ✅ 已修复

- **修复状态：** 已添加 `@dragleave.prevent="onDragLeave"` 并在处理函数中移除 `drag-over` 类。
- **位置：** `src/components/IdGroupingManager.vue:260-264`
- **现象：** `@dragover` 直接操作 DOM 添加 `drag-over` 类，但无 `@dragleave` 事件移除，鼠标离开目标区域时高亮样式残留。
- **建议：** 添加 `@dragleave.prevent="onDragLeave"` 处理函数，或改用响应式 `dragOverId` ref 绑定 class。

---

### [Minor] N6 — `cageStore.js` 遗留 `console.log` 调试输出 ✅ 已修复

- **修复状态：** 已删除生产路径调试输出；`main.js` 中保留的启动成功日志已改为仅开发环境输出。
- **位置：** `src/stores/cageStore.js:38, 48, 52, 55`，`src/stores/settingStore.js:73, 83`，`src/main.js:22, 39`，`src/views/MouseDetailView.vue:203`
- **现象：** 多处 console.log 残留在生产路径，会向浏览器控制台泄露内部状态信息。
- **建议：** 统一删除或替换为条件日志：
```js
if (import.meta.env.DEV) console.log(...)
```
注意：Vue CLI 使用 `process.env.NODE_ENV !== 'production'` 而非 `import.meta.env.DEV`。

---

### [Minor] N7 — `breedingPlanStore.js` localStorage 数据无 schema 校验 ✅ 已修复

- **修复状态：** 繁配计划已迁移到后端 API/数据库；旧 localStorage 只作为一次性迁移源，迁移成功后删除。
- **位置：** `src/stores/breedingPlanStore.js:60`
- **现象：** `const plans = ref(loadFromLS())` 直接使用 localStorage 数据，无版本检查或结构校验。若 schema 升级（如新增必填字段），旧数据将导致运行时错误。
- **建议：** 在 `loadFromLS` 中添加版本号检查，schema 不兼容时清空并迁移：
```js
function loadFromLS() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    if (raw.version !== CURRENT_VERSION) return { version: CURRENT_VERSION, plans: [] }
    return raw
  } catch { return { version: CURRENT_VERSION, plans: [] } }
}
```

---

### [Minor] N8 — `experimentStore.js` `experimentPresets` 初始化类型歧义 ✅ 已修复

- **修复状态：** 已在 API 返回后明确断言为非数组对象，否则回退 `{}`，与当前 Setting 页面按 key 访问的用法保持一致。
- **位置：** `src/stores/experimentStore.js:19`
- **现象：** `const experimentPresets = ref({})` 初始化为对象，但 API 可能返回数组，类型不一致会导致模板中的 `v-for` 行为异常。
- **建议：** 统一为数组 `ref([])` 或在 API 返回后明确断言类型。

---

### [Minor] N9 — `settingStore.js` 默认值重复，违反 DRY ✅ 已修复

- **修复状态：** 已提取 `DEFAULT_MOUSE_COLUMNS`，初始化和重置共用同一份默认定义。
- **位置：** `src/stores/settingStore.js:14-28, 49-64`
- **现象：** `showColumns` 的默认值在 ref 初始化和 `resetToDefault` 中完全重复。
- **建议：**
```js
const DEFAULT_COLUMNS = { id: true, genotype: true, ... }
const showColumns = ref({ ...DEFAULT_COLUMNS })
function resetToDefault() { showColumns.value = { ...DEFAULT_COLUMNS } }
```

---

### [Minor] N10 — 工程化：Vue CLI 而非 Vite，`pathRewrite` 无效配置 ✅ 已部分修复

- **修复状态：** 已删除 no-op 的 `pathRewrite`；Vue CLI 到 Vite 属于独立工程化迁移，未在本轮混入。
- **位置：** `vue.config.js:20-22`，`package.json`
- **现象①：** 项目仍使用 `@vue/cli-service`（基于 webpack），而 Vue 3 生态推荐的标准是 Vite，Vite 构建速度和开发体验显著更优。这不构成 bug，但属于技术债务。
- **现象②：** `pathRewrite: { '^/api': '/api' }` 将 `/api` 前缀重写为同样的 `/api`，是无效的 no-op 配置，可删除。
- **建议：** 删除冗余 `pathRewrite`；迁移至 Vite 可作为下一个工程化里程碑。

---

### [Minor] N11 — `app.use(naive)` 全量注册与按需引入并存

- **位置：** `src/main.js:12`
- **现象：** `app.use(naive)` 全量注册 Naive UI 的同时，各组件内部仍有 `import { NButton } from 'naive-ui'` 的按需引入（冗余）。全量注册会使 bundle 包含所有未用到的组件。
- **影响：** 对 pywebview 桌面应用而言包体影响有限，但首屏加载时间略有增加。
- **建议：** 二选一：全量注册（删除组件内按需 import）或按需引入（删除 `app.use(naive)`，配合 `unplugin-vue-components`）。

---

### [Minor] N12 — `idGenerator.js` 未转义 regex 中的用户输入 ✅ 已修复

- **修复状态：** 已对 prefix 做正则转义后再构造 `RegExp`。
- **位置：** `src/utils/idGenerator.js:17`
- **现象：**
```js
const re = new RegExp(`^${upper}(\\d+)$`)
```
若 `prefix` 含正则元字符（如 `.`、`*`、`(`），会创建意外的正则表达式。prefix 通常是单字母，风险极低，但防御性编码值得加入。
- **建议：**
```js
const escaped = upper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const re = new RegExp(`^${escaped}(\\d+)$`)
```

---

### [Nit] T1 — `geneStore.js` 使用 `==` 而非 `===` ✅ 已修复

- **修复状态：** 已改为 `=== 1`。
- **位置：** `src/stores/geneStore.js:174`
- **建议：** `matchedLocus.alleles.length == 1` → `=== 1`

---

### [Nit] T2 — `cageStore.js` `section_key` 命名混淆 ✅ 已修复

- **修复状态：** 已重命名为 `shouldSetDefaultSection`，并同步更新 `Setting.vue` 引用。
- **位置：** `src/stores/cageStore.js:28-29`
- **现象：** 布尔值 ref `section_key` 语义不清。
- **建议：** 重命名为 `shouldSetDefaultSection` 或 `isFirstCageLoad`。

---

### [Nit] T3 — `StoreUtils` 类仅有静态方法，应改为普通函数 ✅ 已修复

- **修复状态：** 已改为导出普通函数 `initializeStores()`，`main.js` 同步更新调用。
- **位置：** `src/stores/index.js:25`
- **建议：** `class StoreUtils { static initializeStores() {...} }` → `export async function initializeStores() {...}`

---

### [Nit] T4 — `router/index.js` 通配路由顺序及不一致的懒加载 ✅ 已修复

- **修复状态：** 已将通配路由移到最后，并为首页/小鼠列表静态 import 的首屏取舍添加注释。
- **位置：** `src/router/index.js:18-20`
- **现象①：** 通配路由 `/:pathMatch(.*)*` 按惯例应放在最后（Vue Router v4 虽然自动排序，但按惯例放末尾更易维护）。
- **现象②：** `HomeView` 和 `MiceView` 直接 import，其余懒加载，不一致。若有意为之（优化首屏），建议注释说明。

---

### [Nit] T5 — `genotypePresets.js` `RE_CRE` 正则过宽 ✅ 已修复

- **修复状态：** 已从 `RE_CRE` 中移除 `flpo?/flp` 匹配，避免将 Flp 误判为 Cre。
- **位置：** `src/utils/genotypePresets.js:25-26`
- **现象：** `/flpo?|flp/i` 将 Flp 重组酶标记为 Cre，应为独立分类，避免标签错误。

---

### [Praise] P1 — `format.js` 用 VNode 渲染替代 `v-html`

全代码库无一处 `v-html`，基因型符号的 `<sup>` 标签通过 `renderGenotypeSymbol` 生成 VNode 数组渲染，从根本上消除了 XSS 风险，是值得学习的最佳实践。

---

### [Praise] P2 — `get_all_cages` 的 eager loading 优化

笼位列表接口使用 `joinedload` + 批量 Genotype 查询，正确避免了 N+1，与 `get_all_mice` 的实现形成对比（后者仍有 N+1，见 M1）。

---

### [Praise] P3 — `stores/index.js` `Promise.allSettled` 初始化策略

`StoreUtils.initializeStores` 使用 `Promise.allSettled` 并行初始化各 store，单个 store 失败不阻塞其他 store，具备良好的容错设计。

---

### [Praise] P4 — `mendelianPredictor.js` 算法实现

Mendelian 遗传预测器实现正确，边界情况（null allele、缺失亲本）处理到位，并与 `genotypePresets.js` 的繁配推荐引擎（`buildBreedingRecommendation`）形成清晰的分层设计。

---

### [Praise] P5 — `protect_local_api` + `READ_ONLY_MODE`

`before_request` 钩子中的 pywebview token 校验和只读模式拦截设计合理，为未来多场景部署（演示/共享数据库）提供了良好基础。

---

### [Praise] P6 — `resolve_db_path` 路径遍历防护

```python
if candidate.parent != base_dir.resolve() or candidate.suffix.lower() != '.db':
    return None
```
正确防止了通过 `db_key` 参数进行路径遍历攻击，在数据库切换接口处是必要的安全措施。

---

## 3. 需要补充的上下文

1. **pywebview token 是否在生产环境启用？** 当前 `REQUIRE_WEBVIEW_TOKEN = False`（第 70 行），若始终关闭，则 token 机制形同虚设，需确认部署时的启用策略。
2. **`tabulator-tables` 依赖**（`package.json`）是否仍在使用？根据 git history 项目已从 Bootstrap 迁移至 Naive UI，若 Tabulator 也已下线应从 dependencies 移除以减小包体。
3. **`migration_script.py` / `DatabaseMigrator`**（app.py:16-18）在项目中是否存在？目前以 `try/except ImportError` 静默忽略，若此功能未完成应明确注释状态。
4. **`Genotype.get_genotype_description()`**（models.py:217）当 `allele1` 或 `allele2` 为 `None` 时（allele1_id 为空）直接访问 `self.allele1.symbol` 会 `AttributeError`，需确认数据库约束是否保证两个 allele 始终存在。

---

## 4. 总结 — 优先修复的 5 条

| 优先级 | 编号 | 描述 | 文件 |
|--------|------|------|------|
| 1 | **B1** | bare `except:` + 未绑定 `e`，三处路由出错时二次崩溃 | `app.py:1376/1391/1407` |
| 2 | **B2** | `return 404` 整数导致 Flask TypeError | `app.py:1409` |
| 3 | **B3** | `ExperimentClass.to_dict()` 引用不存在的 `class_id` | `models.py:379` |
| 4 | **B4** | `IdGroupingManager` 直接 mutation props，分组编辑器状态不一致 | `IdGroupingManager.vue:242+` |
| 5 | **M2** | `StatusRecord.to_dict()` 返回 `date` 对象导致 JSON 序列化失败 | `models.py:140` |

> M1（N+1）和 M6（导出 N+1）在数据量增大后会成为实际瓶颈，建议在 Blocker/Major 修完后立即跟进。
