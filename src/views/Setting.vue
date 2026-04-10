<template>
<div class="main-content">
    <n-space class="content-header" justify="space-between" align="center">
    <h1 class="page-title">系统设置</h1>
    </n-space>
    
<!-- 标签页导航 -->
<n-tabs v-model:value="activeTab" type="line" justify-content="space-evenly" class="setting-tabs" animated>
    <!-- 基因型设置 -->
    <n-tab-pane name="genotype" tab="基因型设置">
    <n-space vertical size="large" class="form-container">
    <n-card title="添加新基因位点" size="small">
        <n-form @submit.prevent="addGeneLocus" label-placement="top">
            <n-grid :cols="24" :x-gap="12">
                <n-form-item-gi :span="8" label="基因组位点 *">
                    <n-input v-model:value="newGeneLocus.symbol" placeholder="例如: TP53" />
                </n-form-item-gi>
                <n-form-item-gi :span="12" label="描述">
                    <n-input v-model:value="newGeneLocus.description" placeholder="例如: 该基因编码一种肿瘤抑制蛋白，含有转录激活、DNA结合和寡聚化结构域。编码的蛋白能响应多种细胞应激，调控靶基因的表达，从而诱导细胞周期阻滞、凋亡、衰老、DNA修复或代谢变化。" />
                </n-form-item-gi>
                <n-form-item-gi :span="4" label=" ">
                    <n-button type="primary" attr-type="submit" style="width: 100%;">添加基因位点</n-button>
                </n-form-item-gi>
            </n-grid>
        </n-form>
    </n-card>

    <n-card title="基因位点与等位基因" size="small">
        <n-data-table :columns="genotypeLocusColumns" :data="genotypeLocusRows" :pagination="false" :bordered="true" />

        <n-space vertical size="medium" style="margin-top: 16px;">
            <n-card
                v-for="locus in expandedLocusDetails"
                :key="locus.id"
                size="small"
                :title="`等位基因 - ${locus.symbol}`"
            >
                <n-data-table :columns="alleleColumns" :data="locus.alleles" :pagination="false" :bordered="true" />
                <n-divider />
                <n-form @submit.prevent="addAllele(locus.id)" label-placement="top">
                    <n-grid :cols="24" :x-gap="12">
                        <n-form-item-gi :span="8" label="符号 *">
                            <n-input v-model:value="newAllele.symbol" placeholder="例如: KO" />
                        </n-form-item-gi>
                        <n-form-item-gi :span="10" label="描述">
                            <n-input v-model:value="newAllele.description" placeholder="例如: 基因敲除" />
                        </n-form-item-gi>
                        <n-form-item-gi :span="3" label="是否为野生型">
                            <n-checkbox v-model:checked="newAllele.is_wildtype" />
                        </n-form-item-gi>
                        <n-form-item-gi :span="3" label=" ">
                            <n-button type="primary" attr-type="submit" style="width: 100%;">添加</n-button>
                        </n-form-item-gi>
                    </n-grid>
                </n-form>
            </n-card>
        </n-space>
    </n-card>
    </n-space>
    </n-tab-pane>

    <!-- 位置设置 -->
    <n-tab-pane name="location" tab="位置设置">
    <n-space vertical size="large" class="form-container">

    <n-card title="新增位置" size="small">
        <n-form @submit.prevent="addLocation" label-placement="top">
            <n-grid :cols="24" :x-gap="12">
                <n-form-item-gi :span="8" label="位置标识 *">
                    <n-input v-model:value="newLocation.identifier" placeholder="例如: A-3-2" />
                </n-form-item-gi>
                <n-form-item-gi :span="12" label="描述">
                    <n-input v-model:value="newLocation.description" placeholder="例如: A区3排2号架" />
                </n-form-item-gi>
                <n-form-item-gi :span="4" label=" ">
                    <n-button type="primary" attr-type="submit" style="width: 100%;">添加位置</n-button>
                </n-form-item-gi>
            </n-grid>
        </n-form>
    </n-card>

    <n-card title="位置列表" size="small">
        <n-data-table :columns="locationColumns" :data="locations" :pagination="false" :bordered="true" />
    </n-card>
    </n-space>
    </n-tab-pane>
    
    <!-- 导出设置 -->
    <n-tab-pane name="export" tab="导出设置">
    <n-space vertical size="large" class="form-container">

    <n-card title="数据导出设置" size="small">
        <n-space class="btn-group">
            <n-button
                v-for="option in exportOptions" 
                :key="option.id"
                :type="currentExportType === option.id ? 'primary' : 'default'"
                @click="exportData(option.id)"
            >
                    {{ option.title }}
            </n-button>
        </n-space>
        
        <div v-if="exportOptionsVisible" class="export-options">
        <n-form label-placement="top">
            <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi
                v-if="currentExportType !== 'survival' && currentExportType !== 'experiment'"
                :span="24"
                label="时间范围"
            >
                <div class="date-range">
                <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="exportStartDate" />
                <span>至</span>
                <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="exportEndDate" />
                </div>
            </n-form-item-gi>
        <n-data-table
            v-if="currentExportType === 'experiment'"
            :columns="exportExperimentColumns"
            :data="experiments"
            :bordered="true"
            :single-line="false"
            :pagination="false"
            :row-key="(row) => row.id"
            :row-class-name="(row) => (selectedExperiments.includes(row.id) ? 'selected' : '')"
        />
            <n-form-item-gi :span="12" label="文件格式">
                <n-select v-model:value="exportFormat" :options="exportFormatOptions" />
            </n-form-item-gi>
            <n-form-item-gi :span="6" label=" ">
                <n-button type="primary" @click="confirmExport" style="width: 100%;">确认导出</n-button>
            </n-form-item-gi>
            </n-grid>
        </n-form>
        </div>
    </n-card>
    </n-space>
    </n-tab-pane>
    
    <!-- 导入设置 -->
    <n-tab-pane name="import" tab="导入数据">
    <n-space vertical size="large" class="form-container">

    <n-card size="small" title="从Excel文件导入小鼠数据">
        <div class="import-options">
            <n-form label-placement="top">
                <n-grid :cols="24" :x-gap="12">
                    <n-form-item-gi :span="8" label="导入类型">
                        <n-select v-model:value="importType" :options="importTypeOptions" />
                    </n-form-item-gi>
                </n-grid>
            </n-form>
            <h3>选择Excel文件</h3>
            <div class="file-upload" @dragover.prevent @drop="handleDrop">
                <div class="upload-area" :class="{ 'dragover': isDragging }">
                    <AppIcon  name="cloud_upload" />
                    <p v-if="!selectedFile">点击或拖拽Excel文件到此处上传</p>
                    <p v-else class="file-info">
                    <span>{{ selectedFile.name }}</span>
                    <span>({{ formatFileSize(selectedFile.size) }})</span>
                    </p>
                    <n-upload
                        accept=".xlsx,.xls"
                        :show-file-list="false"
                        :default-upload="false"
                        @change="handleNaiveFileChange"
                    >
                        <n-button quaternary>选择文件</n-button>
                    </n-upload>
                    <n-button v-if="selectedFile" quaternary @click="clearFile">清除</n-button>
                </div>
            </div>
            <n-form v-if="selectedFile" label-placement="top">
                <n-grid :cols="24" :x-gap="12">
                    <n-form-item-gi :span="10" label="处理重复数据">
                        <n-select v-model:value="importConflictResolution" :options="importConflictOptions" />
                    </n-form-item-gi>
                    <n-form-item-gi :span="6" label=" ">
                        <n-button type="primary" @click="importData" :disabled="isImporting" style="width: 100%;">
                        <span v-if="isImporting">导入中...</span>
                        <span v-else>开始导入</span>
                        </n-button>
                    </n-form-item-gi>
                </n-grid>
            </n-form>
        </div>
        <!-- 数据格式提示 - 根据导入类型动态显示 -->
        <n-alert type="info" class="format-hint" :show-icon="false">
            <template #header>
                数据格式要求 - {{ importType === 'mice' ? '小鼠信息' : importType === 'weights' ? '体重数据' : importType === 'record' ? '小鼠状态记录数据' : '血统关系' }}
            </template>
            
            <n-data-table
                class="format-table"
                :columns="importFormatColumns"
                :data="importFormatRows"
                :pagination="false"
                :bordered="true"
                :single-line="false"
                :row-key="(row) => row.column"
            />

            <div class="note">
                <div class="note-title">重要提示：</div>
                <div class="note-content">
                    <p v-for="(note, index) in importFormatNotes" :key="index">{{ index + 1 }}. {{ note }}</p>
                </div>
            </div>
        </n-alert>
    </n-card>
    </n-space>
    </n-tab-pane>

    <!-- 实验类型设置 -->
    <n-tab-pane name="experiment" tab="实验类型设置">
    <n-space vertical size="large" class="form-container">
        
        <n-card size="small" class="form-section">
            <h3>可选择预设实验类型</h3>
            <n-form label-placement="top">
                <n-form-item label="选择预设">
                    <n-select v-model:value="selectedPreset" :options="experimentPresetOptions" placeholder="-- 请选择预设 --" @update:value="applyPreset" />
                </n-form-item>
            </n-form>
            <span class="preset-description" v-if="selectedPreset">
                {{ experimentPresets[selectedPreset].description }}
            </span>
        </n-card>
        
        <n-card size="small" class="form-section">
        <h3>{{ editingExperimentType.id ? '编辑实验类型' : '新增实验类型' }}</h3>
        <n-form @submit.prevent="saveExperimentType" label-placement="top">
            <n-grid :cols="24" :x-gap="12">
                <n-form-item-gi :span="8" label="实验类型名称 *">
                    <n-input v-model:value="editingExperimentType.name" placeholder="例如: 肿瘤测量" />
                </n-form-item-gi>
                <n-form-item-gi :span="10" label="描述">
                    <n-input v-model:value="editingExperimentType.description" placeholder="例如: 测量裸鼠肿瘤尺寸" />
                </n-form-item-gi>
                <n-form-item-gi :span="6" label="是否展示">
                    <n-checkbox v-model:checked="editingExperimentType.is_show">在侧边栏显示</n-checkbox>
                </n-form-item-gi>
                <n-form-item-gi :span="24" label=" ">
                    <n-space class="btn-group">
                        <n-button type="primary" attr-type="submit">
                            {{ editingExperimentType.id ? '更新' : '添加' }}
                        </n-button>
                        <n-button v-if="editingExperimentType.id" quaternary @click="cancelEdit">
                            取消
                        </n-button>
                        <n-button quaternary @click="resetForm">
                            重置表单
                        </n-button>
                    </n-space>
                </n-form-item-gi>
            </n-grid>
        </n-form>
        
        <div class="fields-section">
            <h4>字段定义</h4>
            <div class="table-container">
                <n-data-table
                    :columns="fieldDefinitionColumns"
                    :data="editingExperimentType.fields"
                    :pagination="false"
                    :bordered="true"
                    :single-line="false"
                    :row-key="(_row, index) => index"
                />
            </div>
            
            <div class="field-actions">
            <n-button quaternary @click="addField">
                <AppIcon  name="add" /> 添加字段
            </n-button>
            </div>
        </div>
        </n-card>
        
        <n-card size="small" class="form-section">
        <h3>实验类型列表</h3>
        <div class="table-container">
            <n-data-table
                :columns="experimentTypeColumns"
                :data="experiments"
                :pagination="false"
                :bordered="true"
                :single-line="false"
                :row-key="(row) => row.id"
            />
            <n-card v-if="selectedExperimentType" class="detail-content" size="small" style="margin-top: 12px;">
                <div class="detail-header">
                    <h3 class="detail-title">{{ selectedExperimentType.name }} - 详情</h3>
                    <n-button quaternary @click="expandedExperimentType = null">
                        <AppIcon  name="close" /> 收起
                    </n-button>
                </div>

                <div class="detail-section">
                    <h4>描述</h4>
                    <p>{{ selectedExperimentType.description || '暂无描述' }}</p>
                </div>

                <div class="detail-section">
                    <h4>字段定义</h4>
                    <div v-if="selectedExperimentType.fields && selectedExperimentType.fields.length > 0" class="field-list">
                        <div v-for="(field, index) in selectedExperimentType.fields" :key="index" class="field-item">
                            <div class="field-name">{{ field.field_name }}</div>
                            <div class="field-props">
                                <span>{{ field.data_type }}</span>
                                <span v-if="field.unit">{{ field.unit }}</span>
                                <span v-else>无单位</span>
                            </div>
                            <div class="field-props">
                                <span v-if="field.is_required" class="required-badge">必填</span>
                                <span v-else>可选</span>
                                <span v-if="field.visualize_type" class="visualized-badge">可视化 {{ field.visualize_type }}</span>
                                <span v-else class="not-visualized-badge">不可视化</span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="no-fields">
                        <AppIcon  name="inbox" />
                        <p>此实验类型尚未定义任何字段</p>
                    </div>
                </div>
            </n-card>
        </div>
        </n-card>
    </n-space>
    </n-tab-pane>

    <!-- 在template中添加分组设置的内容 -->
    <n-tab-pane name="group" tab="预设分组">
    <n-space vertical size="large" class="form-container">
        
        <!-- 添加新分组 -->
        <n-card size="small" class="form-section">
            <h3>{{ editingGroup.id ? '编辑分组' : '添加新分组' }}</h3>
            <n-form label-placement="top">
                <n-grid :cols="24" :x-gap="12">
                    <n-form-item-gi :span="12" label="是否为实验预设分组？">
                        <n-select
                            v-model:value="editingGroup.experiment_id"
                            :options="groupExperimentOptions"
                            :disabled="editingGroup.id"
                            @update:value="changeGroupExperiment"
                        />
                    </n-form-item-gi>
                    <n-form-item-gi :span="12" label=" ">
                        <div class="form-group group-actions-row">
                            <n-button type="primary" @click="saveGroup" :disabled="isSaving">
                                {{ editingGroup.id ? '更新' : '添加' }}
                            </n-button>
                            <n-button quaternary @click="cancelEditGroup">
                                取消
                            </n-button>
                        </div>
                    </n-form-item-gi>
                </n-grid>
            </n-form>
            <n-form label-placement="top">
                <n-grid :cols="24" :x-gap="12">
                    <n-form-item-gi :span="8" label="分组名称 *">
                        <n-input v-model:value="editingGroup.name" placeholder="例如: WT vs TP53 ♀" />
                    </n-form-item-gi>
                    <n-form-item-gi :span="10" label="描述">
                        <n-input v-model:value="editingGroup.description" placeholder="例如: WT雌性小鼠 vs TP53敲除雌性小鼠" />
                    </n-form-item-gi>
                    <n-form-item-gi :span="6" label="分组类型">
                        <n-select
                            v-model:value="editingGroup.Gtype"
                            :options="groupTypeOptions"
                            placeholder="--请选择分组--"
                            :disabled="editingGroup.experiment_id"
                            @update:value="changeGroupType"
                        />
                    </n-form-item-gi>
                </n-grid>
            </n-form>
            <!-- 规则配置 -->
            <div v-if="editingGroup.Gtype" class="form-section-rule">
                <!-- 规则分组小组管理 -->
                <div v-if="editingGroup.Gtype === 'rule'" class="subgroups-container">
                    <h4>规则设置</h4>
                    <div v-for="(subgroup, subgroupIndex) in editingGroup.rules" 
                        :key="subgroupIndex" 
                        class="subgroup-item">
                        <div class="subgroup-header">
                            <div class="subgroup-title">
                                <h5>小组 {{ subgroupIndex + 1 }}</h5>
                                <n-input v-model:value="subgroup.name" placeholder="小组名称" class="subgroup-name-input" />
                                <div class="color-picker-container">
                                    <span>主题色:</span>
                                    <n-color-picker v-model:value="subgroup.color" :swatches="colors" />
                                </div>
                            </div>
                            <div class="subgroup-actions">
                                <n-button text type="error" @click="removeGroup(subgroupIndex)">
                                    <AppIcon  name="delete" />
                                </n-button>
                                <n-button text @click="toggleSubgroupRules(subgroupIndex)">
                                    {{ subgroup.expanded ? '收起规则' : '展开规则' }}
                                </n-button>
                            </div>
                        </div>
                        
                        <!-- 规则分组 -->
                        <div v-if="subgroup.expanded" class="subgroup-rules">
                            <div class="rules-container">
                                <div v-for="(rule, ruleIndex) in subgroup.rules" :key="ruleIndex" class="rule-item">
                                    <div class="rule-header">
                                        <span>规则 {{ ruleIndex + 1 }}</span>
                                        <n-button text type="error" @click="removeRule(subgroupIndex, ruleIndex)">
                                            <AppIcon  name="delete" />
                                        </n-button>
                                    </div>
                                    
                                    <div class="rule-content">
                                        <!-- 保持原有的规则设置界面不变 -->
                                        <n-space class="form-group-row" align="end">
                                            <div class="form-group" style="min-width: 220px;">
                                                <n-form-item label="规则类型" label-placement="top">
                                                <n-select v-model:value="rule.Rtype" :options="ruleTypeOptions" @update:value="resetRuleValues(rule)" />
                                                </n-form-item>
                                            </div>
                                                <n-button text v-if="rule.Rtype === 'genotype'" :disabled="!genotypeAddable" @click="addGenotype(subgroupIndex, ruleIndex)">
                                                    添加基因型
                                                </n-button>
                                        </n-space>

                                        <!-- 基因型规则 -->
                                        <div v-if="rule.Rtype === 'genotype'" class="form-group-row" style="width: 100%;">
                                            <div v-for="(gene, geneIndex) in rule.genes">
                                                <!-- 基因型选择 -->
                                                <div class="gene-form-group">
                                                    <div class="form-header">
                                                    <div>基因型:
                                                        <span class="selected-gene" v-if="!gene?.selectedGeneName" v-html="geneStore.selectedGeneName"></span>
                                                        <span class="selected-gene" v-else v-html="gene.selectedGeneName"></span>
                                                    </div>
                                                    <n-button text v-if="!gene?.selectedGeneName" @click="addGene" :disabled="!geneStore.addable">
                                                        <AppIcon  name="add" />
                                                    </n-button>
                                                    <n-button text type="error" v-else @click="removeGeneSelection(subgroupIndex, ruleIndex, geneIndex)">
                                                        <AppIcon  name="close" />
                                                    </n-button>
                                                    </div>

                                                    <div v-if="!gene?.selectedGeneName" v-for="(gene, index) in selectedGenes" class="genotype-select-container" :key="gene">
                                                    <div class="locus-control">
                                                        <div class="locus-select">
                                                        <n-select
                                                            v-model:value="gene.locus"
                                                            :options="getLocusOptions(index)"
                                                            @update:value="onFormLocusChange(index, gene.locus)"
                                                        />
                                                        </div>
                                                        <n-button text type="error" @click="deleteGene(index)">
                                                        <AppIcon  name="delete" />
                                                        </n-button>
                                                    </div>

                                                    <div class="allele-controls">
                                                        <div class="allele-group" v-if="gene.locus && gene.locus !== 'WT'">
                                                        <div class="n-form-item-label">等位基因 1</div>
                                                        <n-select
                                                            v-model:value="gene.allele1"
                                                            :disabled="!gene.locus"
                                                            :options="getAlleleOptions(index, 0)"
                                                            @update:value="onFormAlleleChange(true, index, gene.allele1)"
                                                        />
                                                        </div>
                                                        <div class="allele-group" v-if="gene.locus && gene.locus !== 'WT'">
                                                        <div class="n-form-item-label">等位基因 2</div>
                                                        <n-select
                                                            v-model:value="gene.allele2"
                                                            :disabled="!gene.locus"
                                                            :options="getAlleleOptions(index, 1)"
                                                            @update:value="onFormAlleleChange(false, index, gene.allele2)"
                                                        />
                                                        </div>
                                                    </div>
                                                    </div>
                                                    <div v-if="selectedGenes.length>0 && !gene?.selectedGeneName" class="form-group-row">
                                                        <n-button type="error" @click="deleteGenes">
                                                        <AppIcon  name="delete_forever" />
                                                        全部删除
                                                        </n-button>
                                                        <n-button type="primary" @click="saveGenes(subgroupIndex, ruleIndex, geneIndex)">
                                                        <AppIcon  name="archive" />
                                                        确定基因型
                                                        </n-button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 性别规则 -->
                                        <div v-if="rule.Rtype === 'sex'" class="form-group">
                                            <n-form-item label="性别" label-placement="top">
                                                <n-select v-model:value="rule.value" :options="sexRuleOptions" />
                                            </n-form-item>
                                        </div>
                                        
                                        <!-- 品系规则 -->
                                        <div v-if="rule.Rtype === 'strain'" class="form-group">
                                            <n-form-item label="品系" label-placement="top">
                                                <n-input v-model:value="rule.value" placeholder="例如: C57BL/6" />
                                            </n-form-item>
                                        </div>
                                        
                                        <!-- 笼位规则 -->
                                        <div v-if="rule.Rtype === 'cage'" class="form-group-location">
                                            <div class="n-form-item-label">笼位标识</div>
                                            <div class="genotype-tree">
                                                <div v-for="section in locations" :key="section.id" class="locus-item">
                                                <div class="locus-header">
                                                    <label class="locus-label">
                                                    <n-checkbox
                                                        :checked="(rule.locations || []).includes(section.identifier)"
                                                        @update:checked="(checked) => updateRuleArray(rule, 'locations', section.identifier, checked)"
                                                    />
                                                    <span class="locus-name">{{section.identifier}}</span>
                                                    </label>
                                                </div>
                                                <div class="combinations-list">
                                                    <div v-for="cage in calculateCages(section.identifier)" :key="cage.id" class="combination-item">
                                                    <label class="combination-label">
                                                        <n-checkbox
                                                            :checked="(rule.cages || []).includes(cage.id)"
                                                            @update:checked="(checked) => updateRuleArray(rule, 'cages', cage.id, checked)"
                                                        />
                                                        <span class="combination-name">{{ cage.cage_id }}</span>
                                                    </label>
                                                    </div>
                                                </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 存活状态规则 -->
                                        <div v-if="rule.Rtype === 'live_status'" class="form-group">
                                            <n-form-item label="存活状态" label-placement="top">
                                                <n-select v-model:value="rule.value" :options="liveStatusRuleOptions" />
                                            </n-form-item>
                                        </div>

                                        <!-- 存活状态规则 -->
                                        <div v-if="rule.Rtype === 'test_planned'" class="form-group-location">
                                            <div class="n-form-item-label">计划实验</div>
                                                <div class="genotype-tree">
                                                <div v-for="test in experiments" :key="test.id" class="locus-item">
                                                <div class="locus-header">
                                                    <label class="locus-label">
                                                    <n-checkbox
                                                        :checked="(rule.test_planned || []).includes(test.id)"
                                                        @update:checked="(checked) => updateRuleArray(rule, 'test_planned', test.id, checked)"
                                                    />
                                                    <span class="locus-name">{{test.name}}</span>
                                                    </label>
                                                </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <n-button @click="addRule(subgroupIndex)" :disabled="showIDList" quaternary>
                                <AppIcon  name="add" /> 添加规则
                            </n-button>
                        </div>
                    </div>
                    <n-space class="form-group-row" align="end">
                    <n-button :disabled="showIDList" @click="addGroup" quaternary class="add-subgroup-btn">
                        <AppIcon  name="add" /> 添加小组
                    </n-button>
                    <n-button v-if="!showIDList" @click="reviewRules" type="primary" class="add-subgroup-btn">
                        <AppIcon  name="book" /> 预览规则
                    </n-button>
                    <n-button v-else @click="reviewRulesClose" type="error" class="add-subgroup-btn">
                        <AppIcon  name="book" /> 取消预览
                    </n-button>
                    <n-button @click="saveGroup" type="primary" class="add-subgroup-btn">
                        <AppIcon  name="save" /> 按规则存储
                    </n-button>
                    </n-space>
                </div>
                <!-- ID分组 -->
                <div v-if="showIDList || editingGroup.Gtype === 'id'">
                        <IdGroupingManager
                            :candidate-mice="candidateMice"
                            :editing-group="editingGroup"
                            :colors="colors"
                            v-model:is-saving="isSaving"
                            @update:editing-group="handleGroupUpdate"
                            @save-group="saveGroup"
                        />
                </div>
            </div>
        </n-card>
        
        <!-- 分组列表 -->
        <n-card size="small" class="form-section">
            <h3>分组列表</h3>
            <div class="table-container">
                <n-data-table
                    :columns="predefinedGroupColumns"
                    :data="predefinedGroups"
                    :pagination="false"
                    :bordered="true"
                    :single-line="false"
                    :row-key="(row) => row.id"
                />
                <n-card
                    v-for="group in expandedGroupDetails"
                    :key="`group-detail-${group.id}`"
                    class="subtable-container"
                    size="small"
                    style="margin-top: 12px;"
                >
                    <template #header>
                        {{ group.name }} - 详情
                    </template>
                    <n-data-table
                        :columns="groupDetailColumns(group.Gtype)"
                        :data="group.rules || []"
                        :pagination="false"
                        :bordered="true"
                        :single-line="false"
                        :row-key="(row) => row.name"
                    />
                </n-card>
            </div>
        </n-card>
    </n-space>
    </n-tab-pane>


    <!-- 数据库管理 -->
    <n-tab-pane name="database" tab="数据库管理">
    <n-space vertical size="large" class="form-container">
    <p class="section-description">管理数据库文件和程序日志</p>
    
    <!-- 数据库信息 -->
    <n-card size="small" class="form-section">
        <n-space class="section-header" justify="space-between" align="center">
            <h3>数据库信息</h3>
            <n-space class="btn-group">
                <n-button v-if="!addingDatabase" quaternary @click="addDatabase">创建新数据库</n-button>
                <n-button type="primary" @click="importDatabase">导入数据库</n-button>
            </n-space>
        </n-space>
        <div class="database-list">
            <div 
                v-for="(db, key) in databases" 
                :key="key"
                class="database-card"
                :class="{ 'current': currentDatabase === key }"
            >
                <div class="database-header">
                    <div class="database-name">
                        <template v-if="editingIndex === key && editingField === 'projectName'">
                            <n-input 
                                v-model:value="editingValue" 
                                class="editing-input"
                                @keydown.enter="saveEdit(key)"
                                @blur="saveEdit(key)"
                                autofocus
                            />
                        </template>
                        <template v-else>
                            <span @dblclick="startEdit(key, 'projectName', db.projectName)">
                                {{ db.projectName || '未命名项目' }}
                            </span>
                        </template>
                    </div>
                    <div class="info-value">
                        <span 
                            class="status-badge" 
                            :class="getStatusClasses(db, key)"
                            @click="toggleReadOnly(key)"
                            :title="db.readOnly ? '点击设为可写' : '点击设为只读'"
                        >
                            <span class="status-icon">
                                <template v-if="currentDatabase === key">★</template>
                                <template v-else-if="db.readOnly">🔒</template>
                                <template v-else>✓</template>
                            </span>
                            {{ getDatabaseStatus(db.readOnly, key) }}
                        </span>
                    </div>
                </div>
                
                <div class="database-details">
                    <div class="detail-item">
                        <span class="detail-label">项目开始时间：</span>
                        <span class="detail-value">
                            <template v-if="editingIndex === key && editingField === 'startAt'">
                                <n-date-picker 
                                    v-model:formatted-value="editingValue"
                                    class="editing-input"
                                    type="date"
                                    value-format="yyyy-MM-dd"
                                    @blur="saveEdit(key)"
                                    autofocus
                                />
                            </template>
                            <template v-else>
                                <span @dblclick="startEdit(key, 'startAt', db.startAt)">
                                    {{ db.startAt || '未知' }}
                                </span>
                            </template>
                        </span>
                    </div>
                    <div v-if="db.readOnly" class="detail-item">
                        <span class="detail-label">项目结束时间：</span>
                        <span class="detail-value">
                            <template v-if="editingIndex === key && editingField === 'endAt'">
                                <n-date-picker 
                                    v-model:formatted-value="editingValue"
                                    class="editing-input"
                                    type="date"
                                    value-format="yyyy-MM-dd"
                                    @blur="saveEdit(key)"
                                    autofocus
                                />
                            </template>
                            <template v-else>
                                <span @dblclick="startEdit(key, 'endAt', db.endAt)">
                                    {{ db.endAt || '未知' }}
                                </span>
                            </template>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">文件大小:</span>
                        <span class="detail-value">{{ formatFileSize(db.fileSize) }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">最后修改:</span>
                        <span class="detail-value">{{ db.lastModified || '未知' }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">记录数量:</span>
                        <span class="detail-value">{{ db.totalRecords }} 条</span>
                    </div>
                </div>
                
                <div class="actions">
                    <n-button
                        type="primary"
                        @click="selectDatabase(key)"
                        :disabled="currentDatabase === key || databaseNotChanged === false"
                    >
                        设为当前
                    </n-button>
                    <n-button
                        quaternary
                        @click="exportDatabase(key)"
                        :disabled="(!db.totalRecords && db.totalRecords !== 0) || databaseNotChanged === false"
                    >
                        导出
                    </n-button>
                    <n-button
                        type="error"
                        @click="deleteDatabase(key)"
                        :disabled="currentDatabase === key || databaseNotChanged === false"
                    >
                        删除
                    </n-button>
                </div>
            </div>
            <div v-if="addingDatabase" class="database-card">
                <div class="database-header">
                    <span class="detail-label">项目名称：</span>
                    <div class="database-name">
                        <n-input v-model:value="editingDatabase.projectName" class="editing-input" autofocus />
                    </div>
                </div>
                
                <div class="database-details">
                    <div class="detail-item">
                        <span class="detail-label">项目开始时间：</span>
                        <span class="detail-value">
                            <n-date-picker v-model:formatted-value="editingDatabase.startAt" class="editing-input" type="date" value-format="yyyy-MM-dd" />
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">项目结束时间：</span>
                        <span class="detail-value">
                            <n-date-picker v-model:formatted-value="editingDatabase.endAt" class="editing-input" type="date" value-format="yyyy-MM-dd" />
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">只读模式</span>
                        <div class="checkbox-group">
                            <n-checkbox v-model:checked="editingDatabase.readOnly">启用只读模式</n-checkbox>
                        </div>
                    </div>
                </div>
                <div class="actions">
                    <n-button type="primary" @click="createDatabase">确认</n-button>
                    <n-button type="error" @click="cancelCreateDatabase">取消</n-button>
                </div>
            </div>
        </div>
    </n-card>

    <!-- 数据库清空 -->
    <n-card size="small" class="form-section">
        <h3>清空当前数据库</h3>
        <div class="export-options">
            <n-alert type="error" title="警告">
                此操作将删除所有数据，包括小鼠信息、基因型、位置、实验记录等，且无法恢复！
            </n-alert>
            <n-form label-placement="top" class="export-form">
                <n-form-item label="请输入确认文字 'DELETE ALL DATA' 以继续">
                    <n-input v-model:value="deleteConfirmation" placeholder="DELETE ALL DATA" class="confirmation-field" :class="{ 'error': deleteConfirmationError }" />
                    <div v-if="deleteConfirmationError" class="error-message">
                    {{ deleteConfirmationError }}
                    </div>
                </n-form-item>
            </n-form>
            
            <n-space class="form-group" align="end">
                <n-button type="error" @click="clearDatabase" :disabled="!isDeleteConfirmed || isClearingDb">
                    <span v-if="isClearingDb">清空中...</span>
                    <span v-else>清空数据库</span>
                </n-button>
            </n-space>
        </div>
    </n-card>
    
    <!-- 日志导出 -->
    <n-card size="small" class="form-section">
        <h3>导出程序日志</h3>
        <div class="export-options">
        <p>导出当前工作目录的程序日志文件</p>
        <n-space class="form-group" align="end">
            <n-button quaternary @click="exportLogFile" :disabled="isExportingLog">
            <span v-if="isExportingLog">导出中...</span>
            <span v-else>导出日志文件</span>
            </n-button>
        </n-space>
        </div>
    </n-card>
    </n-space>
    </n-tab-pane>

    <!-- 自定义显示设置 -->
    <n-tab-pane name="display" tab="自定义显示设置">
    <n-space vertical size="large" class="form-container">
        
        <!-- 列显示设置 -->
        <n-card size="small" class="form-section">
            <h3>显示列设置</h3>
            <n-form label-placement="top">
                <n-form-item label="选择预设">
                    <n-select v-model:value="selectedSetting" :options="displaySettingOptions" placeholder="-- 请选择预设 --" @update:value="applyDisplayPreset" />
                </n-form-item>
            </n-form>
            <!-- 基本信息列 -->
            <div v-if="selectedSetting === 'mouse'" class="column-category">
                <h4>小鼠列表</h4>
                <div class="column-grid">
                    <div class="column-item" :class="{ seen: showColumns[column.key] }" v-for="column in mouseColumns" :key="column.key">
                        <n-checkbox v-model:checked="showColumns[column.key]">{{ column.label }}</n-checkbox>
                        <AppIcon v-if="showColumns[column.key]" name="visibility" />
                        <AppIcon v-else name="visibility_off" />
                    </div>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div v-if="selectedSetting" class="form-group-row">
                <n-button type="primary" @click="saveDisplaySettings">
                    <AppIcon  name="save" /> 保存设置
                </n-button>
                <n-button quaternary @click="resetToDefault(selectedSetting)">
                    <AppIcon  name="refresh" /> 恢复默认
                </n-button>
            </div>
        </n-card>

        <!-- 重置设置 -->
        <n-card size="small" class="reset-section">
            <h4>重置设置</h4>
            <p>这将重置所有显示设置为默认值，此操作不可撤销。</p>
            <n-button type="error" @click="confirmReset">
                <AppIcon  name="warning" /> 重置所有设置
            </n-button>
        </n-card>
    </n-space>
    </n-tab-pane>

    </n-tabs>
    
    <!-- 编辑基因位点对话框 -->
    <n-modal v-model:show="editLocusDialogVisible" preset="card" title="编辑基因位点" style="width: 520px; max-width: 95vw;">
        <n-form label-placement="top">
            <n-form-item label="基因符号">
                <n-input v-model:value="editingLocus.symbol" />
            </n-form-item>
            <n-form-item label="描述">
                <n-input type="textarea" v-model:value="editingLocus.description" />
            </n-form-item>
        </n-form>
        <template #action>
            <n-space class="dialog-buttons" justify="end">
                <n-button quaternary @click="editLocusDialogVisible = false">取消</n-button>
                <n-button type="primary" @click="saveGeneLocus">保存</n-button>
            </n-space>
        </template>
    </n-modal>

    <!-- 编辑等位基因对话框 -->
    <n-modal v-model:show="editAlleleDialogVisible" preset="card" title="编辑等位基因" style="width: 520px; max-width: 95vw;">
        <n-form label-placement="top">
            <n-form-item label="符号">
                <n-input v-model:value="editingAllele.symbol" />
            </n-form-item>
            <n-form-item label="描述">
                <n-input v-model:value="editingAllele.description" />
            </n-form-item>
            <n-form-item label="是否为野生型">
                <n-checkbox v-model:checked="editingAllele.is_wildtype" />
            </n-form-item>
        </n-form>
        <template #action>
            <n-space class="dialog-buttons" justify="end">
                <n-button quaternary @click="editAlleleDialogVisible = false">取消</n-button>
                <n-button type="primary" @click="saveAllele">保存</n-button>
            </n-space>
        </template>
    </n-modal>
    
    <!-- 编辑位置对话框 -->
    <n-modal v-model:show="editLocationDialogVisible" preset="card" title="编辑位置" style="width: 520px; max-width: 95vw;">
        <n-form label-placement="top">
            <n-form-item label="位置标识">
                <n-input v-model:value="editingLocation.identifier" />
            </n-form-item>
            <n-form-item label="描述">
                <n-input v-model:value="editingLocation.description" />
            </n-form-item>
        </n-form>
        <template #action>
            <n-space class="dialog-buttons" justify="end">
                <n-button quaternary @click="editLocationDialogVisible = false">取消</n-button>
                <n-button type="primary" @click="saveLocation">保存</n-button>
            </n-space>
        </template>
    </n-modal>
    
    <!-- 导入结果对话框 -->
    <n-modal v-model:show="importResultDialogVisible" preset="card" title="导入结果" style="width: 680px; max-width: 95vw;">
        <div class="import-result">
        <div class="result-item success">
            <AppIcon  name="check_circle" />
            <span>成功导入: {{ importResult.successCount }} 条记录</span>
        </div>
        <div class="result-item warning">
            <AppIcon  name="warning" />
            <span>跳过重复: {{ importResult.skippedCount }} 条记录</span>
        </div>
        <div class="result-item error" v-if="importResult.errors.length > 0">
            <AppIcon  name="error" />
            <span>错误: {{ importResult.errors.length }} 条记录</span>
        </div>
        
        <div v-if="importResult.errors.length > 0" class="error-details">
            <h4>错误详情:</h4>
            <ul>
            <li v-for="(error, index) in importResult.errors" :key="index">
                行 {{ error.row }}: {{ error.message }}
            </li>
            </ul>
        </div>
        </div>
        <n-space class="dialog-buttons" justify="end">
        <n-button type="primary" @click="importResultDialogVisible = false">确定</n-button>
        </n-space>
    </n-modal>

    <!-- 数据库导入结果对话框 -->
    <n-modal v-model:show="dbImportResultDialogVisible" preset="card" title="导入数据库" style="width: 760px; max-width: 95vw;" @mask-click="cancelImportDatabase">
        <div class="import-options">
        <div class="file-upload" @dragover.prevent @drop="handleDbDrop">
            <div class="upload-area" :class="{ 'dragover': isDbDragging }">
            <AppIcon  name="cloud_upload" />
            <p v-if="!selectedDbFile">点击或拖拽数据库文件(.db)到此处上传</p>
            <p v-else class="file-info">
                <span>{{ selectedDbFile.name }}</span>
                <span>({{ formatFileSize(selectedDbFile.size) }})</span>
            </p>
            <n-upload
                accept=".db"
                :show-file-list="false"
                :default-upload="false"
                @change="handleNaiveDbFileChange"
            >
                <n-button quaternary>选择数据库文件</n-button>
            </n-upload>
            <n-button v-if="selectedDbFile" quaternary @click="clearDbFile">清除</n-button>
            </div>
        </div>

        <div v-if="selectedDbFile" class="warning-message">
            <AppIcon  name="warning" />
            <span>警告：导入数据库将添加到数据库列表中！</span>
        </div>
        
        <div v-if="selectedDbFile">
            <h2>编辑数据库信息</h2>
            <n-form label-placement="top">
                <n-form-item label="项目名称 *">
                    <n-input v-model:value="editingDatabase.projectName" />
                </n-form-item>
                <n-form-item label="开始时间">
                    <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="editingDatabase.startAt" />
                </n-form-item>
                <n-form-item label="结束时间">
                    <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="editingDatabase.endAt" />
                </n-form-item>
                <n-form-item label="只读模式">
                    <n-checkbox v-model:checked="editingDatabase.readOnly">启用只读模式</n-checkbox>
                </n-form-item>
                <n-form-item label="数据库升级">
                    <n-checkbox v-model:checked="editingDatabase.databaseUpdate">从V2.X版本升级（基因型无法更新）</n-checkbox>
                </n-form-item>
            </n-form>
        </div>
        </div>
        <n-space class="dialog-buttons" justify="end">
            <n-button type="primary" @click="handleDbImportComplete">确定</n-button>
            <n-button quaternary @click="cancelImportDatabase">取消</n-button>
        </n-space>
    </n-modal>
</div>
</template>

<script setup>
import { h, ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import { NButton, NSpace, NTag, NInput, NSelect, NCheckbox, useDialog, useMessage } from 'naive-ui'
import api from '@/utils/api'
import { normalizeDateValue } from '@/utils/format'
import IdGroupingManager from '@/components/IdGroupingManager.vue'

import { useGeneStore, useCageStore, useExperimentStore, useSettingStore } from '@/stores'
import { storeToRefs } from 'pinia'

const geneStore = useGeneStore()
const cageStore = useCageStore()
const experimentStore = useExperimentStore()
const settingStore = useSettingStore()
const dialog = useDialog()
const message = useMessage()

const { genotypes, selectedGenes, alleleSuggestions, mice } = storeToRefs(geneStore)
const { loadGenotypes, colors, onFormLocusChange, onFormAlleleChange, deleteGene, addGene, deleteGenes } = geneStore

const {locations, section_key} = storeToRefs(cageStore)
const {calculateCages, fetchCages} = cageStore

const {experiments, experimentPresets, predefinedGroups} = storeToRefs(experimentStore)
const {fetchExperiments, fetchPredefinedGroups} = experimentStore

const {showColumns, trueCurrentDatabase, databaseNotChanged, selectedSetting, settings} = storeToRefs(settingStore)
const {mouseColumns, resetToDefault, changeSettings} = settingStore

// UI状态
const activeTab = ref('genotype')
const displaySettingOptions = computed(() =>
    Object.entries(settings.value || {}).map(([value, label]) => ({
        label,
        value
    }))
)
const experimentPresetOptions = computed(() =>
    Object.entries(experimentPresets.value || {}).map(([value, preset]) => ({
        label: preset.name,
        value
    }))
)
const fieldDataTypeOptions = [
    { label: '整数', value: 'INTEGER' },
    { label: '小数', value: 'REAL' },
    { label: '文本', value: 'TEXT' },
    { label: '布尔值', value: 'BOOLEAN' },
    { label: '日期', value: 'DATE' }
]
const groupTypeOptions = [
    { label: '规则分组', value: 'rule' },
    { label: 'ID分组', value: 'id' }
]
const ruleTypeOptions = [
    { label: '基因型', value: 'genotype' },
    { label: '性别', value: 'sex' },
    { label: '品系', value: 'strain' },
    { label: '笼位', value: 'cage' },
    { label: '存活状态', value: 'live_status' },
    { label: '计划实验', value: 'test_planned' }
]
const groupExperimentOptions = computed(() => [
    { label: '不为实验预设分组', value: null },
    ...experiments.value.map((experiment) => ({
        label: experiment.name,
        value: experiment.id
    }))
])
const sexRuleOptions = [
    { label: '雄性', value: 'M' },
    { label: '雌性', value: 'F' }
]
const liveStatusRuleOptions = [
    { label: '存活', value: '1' },
    { label: '死亡', value: '0' },
    { label: '解剖', value: '2' },
    { label: '意外消失', value: '3' },
    { label: '丢弃', value: '4' }
]
const getLocusOptions = (index) =>
    (geneStore.locusSuggestions[index] || []).map((locus) => ({
        label: locus.symbol,
        value: locus.symbol
    }))
const getAlleleOptions = (index, alleleIndex) =>
    (alleleSuggestions.value[index]?.[alleleIndex] || []).map((allele) => ({
        label: allele.symbol,
        value: allele.id
    }))
const updateRuleArray = (rule, field, value, checked) => {
    if (!Array.isArray(rule[field])) {
        rule[field] = []
    }
    if (checked) {
        if (!rule[field].includes(value)) {
            rule[field].push(value)
        }
        return
    }
    rule[field] = rule[field].filter((item) => item !== value)
}
const getVisualizeTypeOptions = (dataType) => {
    const options = [{ label: '不进行可视化', value: '' }]
    if (['INTEGER', 'REAL', 'DATE'].includes(dataType)) {
        options.push({ label: '作为横坐标', value: 'x' })
    }
    if (['INTEGER', 'REAL'].includes(dataType)) {
        options.push({ label: '作为纵坐标', value: 'y' })
        options.push({ label: '作为柱状图', value: 'column' })
    }
    return options
}

// normalizeDateValue 已从 @/utils/format 导入

// 基因型相关状态
const newGeneLocus = reactive({ symbol: '', description: '' })
const newAllele = reactive({ symbol: '', description: '', is_wildtype: false })
const expandedLoci = ref([])
const editingLocus = reactive({ id: null, symbol: '', description: '' })
const editLocusDialogVisible = ref(false)
const editingAllele = reactive({ id: null, symbol: '', description: '', is_wildtype: false })
const editAlleleDialogVisible = ref(false)

// 位置相关状态
const newLocation = reactive({ identifier: '', description: '' })
const editingLocation = reactive({ id: null, identifier: '', description: '' })
const editLocationDialogVisible = ref(false)

// 导出设置相关状态
const exportOptionsVisible = ref(false)
const exportStartDate = ref(null)
const exportEndDate = ref(null)
const exportFormat = ref('xlsx')
const currentExportType = ref('')
const selectedExperiments = ref([])
const exportFormatOptions = computed(() => (
    currentExportType.value !== 'experiment'
        ? [
            { label: 'CSV', value: 'csv' },
            { label: 'Excel', value: 'xlsx' }
        ]
        : [{ label: 'Excel', value: 'xlsx' }]
))
const exportOptions = ref([
{ id: 'mice', title: '导出小鼠表' },
{ id: 'weights', title: '导出体重表' },
{ id: 'survival', title: '导出生存表' },
{ id: 'records', title: '导出状态信息表' },
{ id: 'experiment', title: '导出实验记录表' }
])

// 导入设置相关状态
const selectedFile = ref(null)
const isDragging = ref(false)
const importType = ref('mice')
const importConflictResolution = ref('skip')
const importTypeOptions = [
    { label: '小鼠信息', value: 'mice' },
    { label: '体重数据', value: 'weights' },
    { label: '小鼠状态记录数据', value: 'record' },
    { label: '血统关系', value: 'pedigree' }
]
const importConflictOptions = [
    { label: '跳过重复项', value: 'skip' },
    { label: '覆盖现有数据', value: 'overwrite' }
]
const isImporting = ref(false)
const importResultDialogVisible = ref(false)
const importResult = reactive({
successCount: 0,
skippedCount: 0,
errors: []
})

const importFormatColumns = [
    {
        title: '列名',
        key: 'column',
        render: (row) => h('span', { class: row.required ? 'required' : 'optional' }, row.column)
    },
    {
        title: '数据类型',
        key: 'dataType'
    },
    {
        title: '是否必填',
        key: 'requiredLabel',
        render: (row) => h('span', { class: row.required ? 'required' : 'optional' }, row.required ? '是' : '否')
    },
    {
        title: '说明',
        key: 'description'
    },
    {
        title: '示例',
        key: 'example',
        render: (row) => h('span', { class: 'example-row' }, row.example)
    }
]

const importFormatRowsByType = {
    mice: [
        { column: 'id', dataType: '字符串', required: true, description: '小鼠唯一标识', example: 'M001' },
        { column: 'genotype', dataType: '字符串', required: true, description: '基因型描述，格式为：{位点1}[等位基因1]/[等位基因2]&{位点2}[等位基因3]/[等位基因4]', example: '{Trp53}[KO]/[+]或{WT}' },
        { column: 'sex', dataType: '字符串', required: true, description: '性别：M/F', example: 'M' },
        { column: 'birth_date', dataType: '日期', required: true, description: '出生日期（YYYY-MM-DD）', example: '2023-05-15' },
        { column: 'live_status', dataType: '整数', required: true, description: '存活状态：1=存活，0=死亡，2=解剖，3=失踪，4=丢弃，5=处理后死亡', example: '1' },
        { column: 'death_date', dataType: '日期', required: false, description: '死亡日期（当live_status=0时必填）', example: '2023-10-20' },
        { column: 'cage_id', dataType: '字符串', required: false, description: '笼位名称', example: 'CAGE-01' },
        { column: 'location', dataType: '字符串', required: false, description: '区域名称', example: '本部动物房' },
        { column: 'strain', dataType: '字符串', required: false, description: '小鼠品系', example: 'C57BL/6J' },
        { column: 'record', dataType: '字符串', required: false, description: '导入时备注信息', example: '2025.1.1 被咬' }
    ],
    weights: [
        { column: 'id', dataType: '字符串', required: true, description: '小鼠唯一标识', example: 'M001' },
        { column: 'birth_date', dataType: '日期', required: true, description: '出生日期（YYYY-MM-DD）', example: '2023-05-15' },
        { column: 'weight', dataType: '数值', required: true, description: '体重值（克）', example: '25.3' },
        { column: 'record_date', dataType: '日期', required: true, description: '记录日期（YYYY-MM-DD）', example: '2023-06-15' }
    ],
    record: [
        { column: 'id', dataType: '字符串', required: true, description: '小鼠唯一标识', example: 'M001' },
        { column: 'birth_date', dataType: '日期', required: true, description: '出生日期（YYYY-MM-DD）', example: '2023-05-15' },
        { column: 'record', dataType: '字符串', required: true, description: '每条记录', example: '脱毛' },
        { column: 'record_date', dataType: '日期', required: true, description: '记录日期（YYYY-MM-DD）', example: '2023-06-15' }
    ],
    pedigree: [
        { column: 'mouse_id', dataType: '字符串', required: true, description: '小鼠唯一标识', example: 'M001' },
        { column: 'birth_date', dataType: '日期', required: true, description: '出生日期（YYYY-MM-DD）', example: '2023-05-15' },
        { column: 'father_id', dataType: '字符串', required: true, description: "父鼠ID（如不存在填'None'）", example: 'F001' },
        { column: 'mother_id', dataType: '字符串', required: true, description: "母鼠ID（如不存在填'None'）", example: 'M002' }
    ]
}

const importFormatNotesByType = {
    mice: [
        '列名一定要按照要求填写，否则无法识别',
        '日期格式必须为YYYY-MM-DD（例如：2023-05-15）',
        "性别字段只接受'M'（雄性）或'F'（雌性）",
        '基因型如果不存在会自动创建新基因型',
        '基因型的位点和等位基因中不能出现特殊字符，示例：{p53}[S46A]/[-]&{p21}[-]/[-]',
        '当live_status!=1（不为存活）时，必须提供death_date',
        '区域名称只有在存在笼位名称时才生效',
        '若无区域名称，新笼位自动添加到新创建的区域，后续可调整（通过笼位设置）'
    ],
    weights: [
        '列名一定要按照要求填写，否则无法识别',
        '日期格式必须为YYYY-MM-DD（例如：2023-05-15）',
        '体重值应为数值类型，最多保留两位小数',
        '记录日期必须晚于出生日期',
        '系统会自动计算生存天数 = (记录日期 - 出生日期)'
    ],
    record: [
        '列名一定要按照要求填写，否则无法识别',
        '日期格式必须为YYYY-MM-DD（例如：2023-05-15）',
        '记录日期必须晚于出生日期',
        '系统会自动计算生存天数 = (记录日期 - 出生日期)'
    ],
    pedigree: [
        '列名一定要按照要求填写，否则无法识别',
        '日期格式必须为YYYY-MM-DD（例如：2023-05-15）',
        "父鼠ID和母鼠ID如不存在，必须填写字符串'None'（区分大小写）",
        '所有小鼠ID必须已在系统中存在',
        '父鼠和母鼠的出生日期必须早于当前小鼠的出生日期'
    ]
}

const importFormatRows = computed(() => importFormatRowsByType[importType.value] || [])
const importFormatNotes = computed(() => importFormatNotesByType[importType.value] || [])

// 实验类型相关状态
const editingExperimentType = reactive({
id: null,
name: '',
description: '',
is_show: true,
fields: []
})
const selectedPreset = ref('')
const expandedExperimentType = ref(null)

// 数据库管理相关状态
const selectedDbFile = ref(null)
const isDbDragging = ref(false)
const isExportingLog = ref(false)
const dbImportResultDialogVisible = ref(false)
const deleteConfirmation = ref('')
const deleteConfirmationError = ref('')
const isClearingDb = ref(false)
const editingDatabase = ref({
projectName: '',
startAt: null,
endAt: null,
readOnly: false,
databaseUpdate: false
})
const currentDatabase = ref('')
const databases = ref({})
const addingDatabase = ref(false)

// 计算属性：检查是否确认删除
const isDeleteConfirmed = computed(() => {
  return deleteConfirmation.value === 'DELETE ALL DATA'
})

// 监听确认输入框的变化
watch(deleteConfirmation, (newValue) => {
    if (newValue && newValue !== 'DELETE ALL DATA') {
    deleteConfirmationError.value = '确认文字不匹配'
    } else {
    deleteConfirmationError.value = ''
    }
})

// 分组设置相关状态
const editingGroup = reactive({
    id: null,
    name: '',
    description: '',
    Gtype: '',
    experiment_id: null,
    rules: []
})
const expandedGroup = ref([])
const genotypeAddable = ref(false)
const candidateMice = ref([])//候选小鼠
const showIDList = ref(false)
const isSaving = ref(false)

const handleGroupUpdate = (updatedGroup) => {
    Object.assign(editingGroup, updatedGroup)
}

const toggleAlleles = (id) => {
    const index = expandedLoci.value.indexOf(id)
    if (index === -1) {
    expandedLoci.value.push(id)
    } else {
    expandedLoci.value.splice(index, 1)
    }
}

const genotypeLocusRows = computed(() => genotypes.value || [])

const expandedLocusDetails = computed(() => {
    const genotypeMap = new Map((genotypes.value || []).map((item) => [item.id, item]))
    return expandedLoci.value
        .map((id) => genotypeMap.get(id))
        .filter((item) => Boolean(item))
})

const genotypeLocusColumns = [
    {
        title: '基因符号',
        key: 'symbol'
    },
    {
        title: '描述',
        key: 'description'
    },
    {
        title: '等位基因数量',
        key: 'alleleCount',
        render: (row) => row.alleles?.length ?? 0
    },
    {
        title: '操作',
        key: 'actions',
        render: (row) => {
            if (row.symbol === 'WT') return null
            return h(NSpace, { size: 8 }, {
                default: () => [
                    h(
                        NButton,
                        {
                            size: 'small',
                            quaternary: true,
                            onClick: () => editGeneLocus(row)
                        },
                        { default: () => '编辑' }
                    ),
                    h(
                        NButton,
                        {
                            size: 'small',
                            type: 'error',
                            quaternary: true,
                            onClick: () => deleteGeneLocus(row.id)
                        },
                        { default: () => '删除' }
                    ),
                    h(
                        NButton,
                        {
                            size: 'small',
                            type: 'success',
                            quaternary: true,
                            onClick: () => toggleAlleles(row.id)
                        },
                        {
                            default: () => (expandedLoci.value.includes(row.id) ? '收起' : '展开并添加等位基因')
                        }
                    )
                ]
            })
        }
    }
]

const alleleColumns = [
    {
        title: '等位基因符号',
        key: 'symbol'
    },
    {
        title: '描述',
        key: 'description'
    },
    {
        title: '是否为野生型',
        key: 'is_wildtype',
        render: (row) => h(
            NTag,
            {
                type: row.is_wildtype ? 'success' : 'default',
                bordered: false,
                size: 'small'
            },
            { default: () => (row.is_wildtype ? '是' : '否') }
        )
    },
    {
        title: '操作',
        key: 'actions',
        render: (row) => h(NSpace, { size: 8 }, {
            default: () => [
                h(
                    NButton,
                    {
                        size: 'small',
                        quaternary: true,
                        onClick: () => editAllele(row)
                    },
                    { default: () => '编辑' }
                ),
                h(
                    NButton,
                    {
                        size: 'small',
                        type: 'error',
                        quaternary: true,
                        onClick: () => deleteAllele(row.id)
                    },
                    { default: () => '删除' }
                )
            ]
        })
    }
]

const locationColumns = [
    {
        title: '位置标识',
        key: 'identifier'
    },
    {
        title: '描述',
        key: 'description'
    },
    {
        title: '操作',
        key: 'actions',
        render: (row) => h(NSpace, { size: 8 }, {
            default: () => [
                h(
                    NButton,
                    {
                        size: 'small',
                        quaternary: true,
                        onClick: () => editLocation(row)
                    },
                    { default: () => '编辑' }
                ),
                h(
                    NButton,
                    {
                        size: 'small',
                        type: 'error',
                        quaternary: true,
                        onClick: () => deleteLocation(row.id)
                    },
                    { default: () => '删除' }
                )
            ]
        })
    }
]

const exportExperimentColumns = computed(() => [
    {
        title: '实验类型名称',
        key: 'name'
    },
    {
        title: '描述',
        key: 'description'
    },
    {
        title: '字段数量',
        key: 'field_count',
        render: (row) => (row.fields ? row.fields.length : 0)
    },
    {
        title: '操作',
        key: 'actions',
        render: (row) => h(
            NButton,
            {
                size: 'small',
                type: selectedExperiments.value.includes(row.id) ? 'warning' : 'info',
                quaternary: true,
                onClick: () => toggleSelect(row.id)
            },
            { default: () => (selectedExperiments.value.includes(row.id) ? '取消' : '选择') }
        )
    }
])

const selectedExperimentType = computed(() =>
    experiments.value.find((item) => item.id === expandedExperimentType.value) || null
)

const experimentTypeColumns = computed(() => [
    {
        title: '实验类型名称',
        key: 'name'
    },
    {
        title: '描述',
        key: 'description'
    },
    {
        title: '字段数量',
        key: 'field_count',
        render: (row) => (row.fields ? row.fields.length : 0)
    },
    {
        title: '是否展示',
        key: 'is_show',
        render: (row) => (row.is_show ? '是' : '否')
    },
    {
        title: '操作',
        key: 'actions',
        render: (row) => h(NSpace, { size: 8 }, {
            default: () => [
                h(NButton, { text: true, onClick: () => editExperimentType(row.id) }, { default: () => '编辑' }),
                h(NButton, { text: true, type: 'error', onClick: () => deleteExperimentType(row.id) }, { default: () => '删除' }),
                h(NButton, { text: true, onClick: () => duplicateExperimentType(row) }, { default: () => '复制' }),
                h(
                    NButton,
                    { text: true, type: 'info', onClick: () => toggleDetails(row.id) },
                    { default: () => (expandedExperimentType.value === row.id ? '收起' : '详情') }
                )
            ]
        })
    }
])

const fieldDefinitionColumns = computed(() => [
    {
        title: '字段名称',
        key: 'field_name',
        render: (row) => h(NInput, {
            value: row.field_name,
            placeholder: '字段名称',
            'onUpdate:value': (value) => {
                row.field_name = value
            }
        })
    },
    {
        title: '数据类型',
        key: 'data_type',
        render: (row) => h(NSelect, {
            value: row.data_type,
            options: fieldDataTypeOptions,
            'onUpdate:value': (value) => {
                row.data_type = value
                chooseDataType(row)
            }
        })
    },
    {
        title: '单位',
        key: 'unit',
        render: (row) => h(NInput, {
            value: row.unit,
            placeholder: '单位',
            'onUpdate:value': (value) => {
                row.unit = value
            }
        })
    },
    {
        title: '必填',
        key: 'is_required',
        width: 90,
        render: (row) => h(NCheckbox, {
            checked: row.is_required,
            'onUpdate:checked': (checked) => {
                row.is_required = checked
            }
        })
    },
    {
        title: '可视化',
        key: 'visualize_type',
        render: (row) => h(NSelect, {
            value: row.visualize_type,
            options: getVisualizeTypeOptions(row.data_type),
            'onUpdate:value': (value) => {
                row.visualize_type = value
            }
        })
    },
    {
        title: '操作',
        key: 'actions',
        width: 130,
        render: (_row, index) => h(NSpace, { size: 4 }, {
            default: () => [
                h(NButton, {
                    text: true,
                    type: 'error',
                    onClick: () => removeField(index)
                }, { default: () => '删' }),
                h(NButton, {
                    text: true,
                    disabled: index === 0,
                    onClick: () => moveFieldUp(index)
                }, { default: () => '上' }),
                h(NButton, {
                    text: true,
                    disabled: index === editingExperimentType.fields.length - 1,
                    onClick: () => moveFieldDown(index)
                }, { default: () => '下' })
            ]
        })
    }
])

const expandedGroupDetails = computed(() =>
    expandedGroup.value
        .map((id) => predefinedGroups.value.find((group) => group.id === id))
        .filter(Boolean)
)

const predefinedGroupColumns = computed(() => [
    {
        title: '分组名称',
        key: 'name'
    },
    {
        title: '描述',
        key: 'description'
    },
    {
        title: '分组类型',
        key: 'Gtype',
        render: (row) => h(
            NTag,
            {
                bordered: false,
                type: row.Gtype === 'id' ? 'info' : 'success'
            },
            { default: () => (row.Gtype === 'id' ? 'ID分组' : '规则分组') }
        )
    },
    {
        title: '小组数量',
        key: 'group_count',
        render: (row) => (row.rules ? row.rules.length : 0)
    },
    {
        title: '操作',
        key: 'actions',
        render: (row) => h(NSpace, { size: 8 }, {
            default: () => [
                h(NButton, { text: true, onClick: () => editGroup(row) }, { default: () => '编辑' }),
                h(NButton, { text: true, type: 'error', onClick: () => deleteGroup(row.id) }, { default: () => '删除' }),
                h(
                    NButton,
                    { text: true, type: 'info', onClick: () => toggleGroupDetails(row.id) },
                    { default: () => (expandedGroup.value.includes(row.id) ? '收起' : '详情') }
                )
            ]
        })
    }
])

const groupDetailColumns = (groupType) => [
    {
        title: '组名',
        key: 'name'
    },
    {
        title: '主题色',
        key: 'color',
        render: (row) => h('div', {
            style: {
                width: '24px',
                height: '14px',
                borderRadius: '4px',
                border: '1px solid var(--n-border-color)',
                backgroundColor: row.color || 'transparent'
            }
        })
    },
    {
        title: groupType === 'id' ? '组内小鼠数量' : '规则数量',
        key: 'count',
        render: (row) => (groupType === 'id' ? (row.mouseId?.length || 0) : (row.rules?.length || 0))
    }
]

const addGeneLocus = async () => {
    if (!newGeneLocus.symbol) {
    message.info('请填写基因位点名称')
    return
    }

    try {
    const response = await api.post('/gene', newGeneLocus)
    genotypes.value.push(response.data)
    newGeneLocus.symbol = ''
    newGeneLocus.description = ''
    message.success('添加基因位点成功')
    } catch (error) {
    console.error('添加基因位点失败:', error)
    message.error('添加基因位点失败，请重试')
    }
}

const addAllele = async (locus_id) => {
    if (!newAllele.symbol) {
    message.info('请填写基因位点修饰名称')
    return
    }

    try {
    await api.post(`/${locus_id}/gene_allele`, newAllele)
    await loadGenotypes()
    newAllele.symbol = ''
    newAllele.description = ''
    newAllele.is_wildtype = false
    message.success('添加基因位点编辑方式成功')
    } catch (error) {
    console.error('添加基因位点修饰失败:', error)
    message.error('添加基因位点修饰失败，请重试')
    }
}

const editGeneLocus = (genotype) => {
    Object.assign(editingLocus, { ...genotype })
    editLocusDialogVisible.value = true
}

const editAllele = (genotype) => {
    Object.assign(editingAllele, { ...genotype })
    editAlleleDialogVisible.value = true
}

const saveGeneLocus = async () => {
    try {
        await api.put(`/gene/${editingLocus.id}`, editingLocus)
        await loadGenotypes()
        editLocusDialogVisible.value = false
        message.success('修改基因位点成功')
    } catch (error) {
        console.error('更新基因位点失败:', error)
        message.error('更新基因位点失败，请重试')
    }
}

const saveAllele = async () => {
    try {
        await api.put(`/gene_allele/${editingAllele.id}`, editingAllele)
        await loadGenotypes()
        editAlleleDialogVisible.value = false
        message.success('修改基因位点编辑方式成功')
    } catch (error) {
        console.error('更新等位基因失败:', error)
        message.error('更新等位基因失败，请重试')
    }
}

const deleteGeneLocus = async (id) => {
    dialog.warning({
        title: '确认删除',
        content: '确定要删除这个基因位点吗？所有已经设定的该基因位点会消失',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await api.delete(`/gene/${id}`)
                genotypes.value = genotypes.value.filter(g => g.id !== id)
                message.success('删除基因位点成功')
            } catch (error) {
                console.error('删除基因型失败:', error)
                message.error('删除基因型失败，请重试')
            }
        }
    })
}

const deleteAllele = async (id) => {
    dialog.warning({
        title: '确认删除',
        content: '确定要删除这个基因型吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await api.delete(`/gene_allele/${id}`)
                await loadGenotypes()
                message.success('删除基因位点编辑方式成功')
            } catch (error) {
                console.error('删除基因型失败:', error)
                message.error('删除基因型失败，请重试')
            }
        }
    })
}

const addLocation = async () => {
    if (!newLocation.identifier) {
        message.info('请填写位置标识')
        return
    }

    try {
        const response = await api.post('/locations', newLocation)
        locations.value.push(response.data)
        newLocation.identifier = ''
        newLocation.description = ''
        section_key.value = true
        await fetchCages()
    } catch (error) {
        console.error('添加位置失败:', error)
        message.error('添加位置失败，请重试')
    }
}

const editLocation = (location) => {
    Object.assign(editingLocation, { ...location })
    editLocationDialogVisible.value = true
}

const saveLocation = async () => {
    try {
        const response = await api.put(`/locations/${editingLocation.id}`, editingLocation)
        const index = locations.value.findIndex(l => l.id === editingLocation.id)
    if (index !== -1) {
        locations.value[index] = response.data
    }
    message.success("区域编辑成功")
    editLocationDialogVisible.value = false
    section_key.value = true
    await fetchCages()
    } catch (error) {
        console.error('更新位置失败:', error)
        message.error('更新位置失败，请重试')
    }
}

const deleteLocation = async (id) => {
    dialog.warning({
        title: '确认删除',
        content: '确定要删除这个位置吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await api.delete(`/locations/${id}`)
                locations.value = locations.value.filter(l => l.id !== id)
                section_key.value = true
                await fetchCages()
            } catch (error) {
                console.error('删除位置失败:', error)
                message.error('删除位置失败，请重试')
            }
        }
    })
}

// 导出相关方法
const exportData = (type) => {
    currentExportType.value = type
    selectedExperiments.value = []
    exportOptionsVisible.value = true
}

const toggleSelect = (id) => {
    const index = selectedExperiments.value.indexOf(id)
    if (index === -1) {
        selectedExperiments.value.push(id)
    } else {
        selectedExperiments.value.splice(index, 1)
    }
}

const confirmExport = async () => {
    const params = {
        start_date: exportStartDate.value || undefined,
        end_date: exportEndDate.value || undefined,
        experiment_ids: selectedExperiments.value,
        format: exportFormat.value
    }

    try {
        const response = await api.get(`/export/${currentExportType.value}`, { 
            params,
            responseType: 'blob'
        })

        // 使用 PyWebview 的保存文件对话框
        if (window.pywebview && window.pywebview.api) {
            const filename = `${currentExportType.value}_export.${exportFormat.value}`
            const arrayBuffer = await response.data.arrayBuffer()
            const uint8array = new Uint8Array(arrayBuffer)
            const dataArray = Array.from(uint8array)
            const state = await window.pywebview.api.save_file_dialog(dataArray, filename)
            if(state.success){
                message.success(`导出成功，文件路径：${state.path}`)
            } else {
                message.info(state.message || "导出失败")
            }
        } else {
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `${currentExportType.value}_export.${exportFormat.value}`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            message.success("导出成功")
        }
    } catch (error) {
        console.error('导出数据失败:', error)
        message.error('导出数据失败，请重试')
    } finally {
        exportOptionsVisible.value = false
        currentExportType.value = ""
        exportStartDate.value = null
        exportEndDate.value = null
    }
}

// 导入相关方法
const handleFileUpload = (event) => {
    selectedFile.value = event.target.files[0]
    event.target.value = null
}

const handleNaiveFileChange = ({ file }) => {
    if (file && file.file) {
        selectedFile.value = file.file
    }
}

const handleDrop = (event) => {
    event.preventDefault()
    isDragging.value = false

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        selectedFile.value = event.dataTransfer.files[0]
    }
}

const clearFile = () => {
    selectedFile.value = null
}

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const importData = async () => {
    if (!selectedFile.value) {
        message.info('请选择要导入的文件')
        return
    }

    isImporting.value = true

    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('type', importType.value)
    formData.append('conflict_resolution', importConflictResolution.value)

    try {
        const response = await api.post('/import', formData, {
            headers: {
            'Content-Type': 'multipart/form-data'
            }
        })
        Object.assign(importResult, response.data)
        importResultDialogVisible.value = true
        if (importType.value === 'mice') {
            await geneStore.loadInitialData()
            await cageStore.loadInitialData()
        }
    } catch (error) {
        console.error('导入失败:', error)
        message.error(`导入失败: ${error.response?.data?.error || '服务器错误'}`)
    } finally {
        isImporting.value = false
    }
}

const addField = () => {
    editingExperimentType.fields.push({
    field_name: '',
    data_type: 'TEXT',
    unit: '',
    is_required: false,
    visualize_type: "",
    display_order: editingExperimentType.fields.length
    })
}

const removeField = (index) => {
    editingExperimentType.fields.splice(index, 1)
}

const saveExperimentType = async () => {
    if (!editingExperimentType.name) {
    message.info('请填写实验类型名称')
    return
    }

    if (editingExperimentType.fields.length === 0) {
    message.info('请至少添加一个字段')
    return
    }

    updateFieldOrders()

    // 验证字段
    for (let i = 0; i < editingExperimentType.fields.length; i++) {
    const field = editingExperimentType.fields[i]
    if (!field.field_name) {
        message.info(`第${i + 1}个字段缺少名称`)
        return
    }
    if (!field.data_type) {
        message.info(`字段"${field.field_name}"缺少数据类型`)
        return
    }
    }

    const doSave = async () => {
        const url = editingExperimentType.id 
        ? `/api/experiment-types/${editingExperimentType.id}`
        : '/api/experiment-types'

        const method = editingExperimentType.id ? 'put' : 'post'

        const dataToSend = {
        ...editingExperimentType,
        fields: editingExperimentType.fields.map((field, index) => ({
            ...field,
            display_order: field.display_order !== undefined ? field.display_order : index
        }))
        }

        try {
        await api[method](url, dataToSend)
        message.success('实验设置保存成功，请前往分组预设中设置分组')
        cancelEdit()
        await fetchExperiments()
        } catch (error) {
        console.error('保存实验类型失败:', error)
        message.error(error.response?.data?.error || '保存实验类型失败')
        }
    }

    if (editingExperimentType.id) {
        dialog.warning({
            title: '确认修改',
            content: '调整属性后，这个实验的分组不受影响，但已有数据会被删除（建议及时导出），是否继续？',
            positiveText: '继续',
            negativeText: '取消',
            onPositiveClick: doSave
        })
    } else {
        await doSave()
    }
}

const editExperimentType = (experimentID) => {
    // 深拷贝实验类型
    const experimentType = experiments.value.find(et => et.id === experimentID)
    const copy = JSON.parse(JSON.stringify(experimentType))

    Object.assign(editingExperimentType, copy)
    selectedPreset.value = ''

    // 滚动到表单顶部
    nextTick(() => {
    const formElement = document.querySelector('.form-section')
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' })
    }
    })
}

const cancelEdit = () => {
editingExperimentType.id = null
editingExperimentType.name = ''
editingExperimentType.description = ''
editingExperimentType.is_show = true
editingExperimentType.fields = []
}

const deleteExperimentType = async (id) => {
    dialog.warning({
        title: '确认删除',
        content: '确定要删除这个实验类型吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await api.delete(`/experiment-types/${id}`)
                message.success('删除成功')
                await fetchExperiments()
            } catch (error) {
                console.error('删除实验类型失败:', error)
                message.error(error.response?.data?.error || '删除实验类型失败')
            }
        }
    })
}

const applyPreset = () => {
    if (selectedPreset.value && experimentPresets.value[selectedPreset.value]) {
    const preset = experimentPresets.value[selectedPreset.value]

    // 保留当前已编辑的内容，只添加预设的字段
    const currentFields = editingExperimentType.fields || []
    const presetFields = JSON.parse(JSON.stringify(preset.fields))

    // 设置显示顺序
    const maxOrder = currentFields.length > 0 ? 
        Math.max(...currentFields.map(f => f.display_order)) : -1

    presetFields.forEach((field, index) => {
        field.display_order = maxOrder + index + 1
    })

    // 合并字段
    editingExperimentType.fields = [...currentFields, ...presetFields]

    // 如果名称和描述为空，则使用预设的值
    if (!editingExperimentType.name) {
        editingExperimentType.name = preset.name
    }
    if (!editingExperimentType.description) {
        editingExperimentType.description = preset.description
    }
    editingExperimentType.is_show = preset.is_show
    }
}

const resetForm = () => {
    if (editingExperimentType.id) {
        editExperimentType(editingExperimentType.id)
    } else {
        editingExperimentType.id = null
        editingExperimentType.name = ''
        editingExperimentType.description = ''
        editingExperimentType.fields = []
        editingExperimentType.is_show = true
        selectedPreset.value = ''
    }
}

const chooseDataType = (field) => {
    field.visualize_type = ''
}

const moveFieldUp = (index) => {
if (index > 0) {
const fields = editingExperimentType.fields
;[fields[index], fields[index - 1]] = [fields[index - 1], fields[index]]
updateFieldOrders()
}
}

const moveFieldDown = (index) => {
if (index < editingExperimentType.fields.length - 1) {
const fields = editingExperimentType.fields
;[fields[index], fields[index + 1]] = [fields[index + 1], fields[index]]
updateFieldOrders()
}
}

const updateFieldOrders = () => {
editingExperimentType.fields.forEach((field, index) => {
field.display_order = index
})
}

const duplicateExperimentType = (experimentType) => {
// 深拷贝实验类型
const copy = JSON.parse(JSON.stringify(experimentType))
copy.id = null
copy.name = copy.name + ' (副本)'

Object.assign(editingExperimentType, copy)
selectedPreset.value = ''

// 滚动到表单顶部
nextTick(() => {
const formElement = document.querySelector('.form-section')
if (formElement) {
    formElement.scrollIntoView({ behavior: 'smooth' })
}
})
}

const toggleDetails = (id) => {
if (expandedExperimentType.value === id) {
expandedExperimentType.value = null
} else {
expandedExperimentType.value = id
}
}

// 数据库管理相关方法
const handleDbFileUpload = (event) => {
  selectedDbFile.value = event.target.files[0]
  event.target.value = null
}

const handleNaiveDbFileChange = ({ file }) => {
    if (file && file.file) {
        if (file.file.name.endsWith('.db')) {
            selectedDbFile.value = file.file
        } else {
            message.error('请选择.db格式的数据库文件')
        }
    }
}

const handleDbDrop = (event) => {
  event.preventDefault()
  isDbDragging.value = false

  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file.name.endsWith('.db')) {
      selectedDbFile.value = file
    } else {
      message.error('请选择.db格式的数据库文件')
    }
  }
}

const clearDbFile = () => {
  selectedDbFile.value = null
}

const importDatabase = () => {
    dbImportResultDialogVisible.value = true
    selectedDbFile.value = null
    editingDatabase.value = {
        projectName: '',
        startAt: null,
        endAt: null,
        readOnly: false,
        databaseUpdate: false
    }
}

const cancelImportDatabase = () => {
    dbImportResultDialogVisible.value = false
    selectedDbFile.value = null
    editingDatabase.value = {
        projectName: '',
        startAt: null,
        endAt: null,
        readOnly: false,
        databaseUpdate: false
    }
}

const handleDbImportComplete = async () => {
    if (!selectedDbFile.value) {
        message.info('请选择要导入的数据库文件')
        return
    }
    dbImportResultDialogVisible.value = false
    const formData = new FormData()
    formData.append('file', selectedDbFile.value)
    formData.append('project_info', JSON.stringify(editingDatabase.value))

    try {
        const response = await api.post('/database/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
        })
        
        message.success('数据库导入成功，请重启软件')
    } catch (error) {
        console.error('数据库导入失败:', error)
        message.error('数据库导入失败')
    }
    selectedDbFile.value = null
}

const exportDatabase = async (key) => {
    const db = databases.value[key]
    if (!db) return

    try {
        const response = await api.get(`/database/export/${key}`, {
            responseType: 'blob'
        })

    // 使用 PyWebview 的保存文件对话框
    if (window.pywebview && window.pywebview.api) {
        const filename = `${db.projectName}_backup_${new Date().toISOString().split('T')[0]}.db`
        const arrayBuffer = await response.data.arrayBuffer()
        const uint8array = new Uint8Array(arrayBuffer)
        const dataArray = Array.from(uint8array)
        const state = await window.pywebview.api.save_file_dialog(dataArray, filename)
        if(state.success){
            message.success(`数据库导出成功，文件路径：${state.path}`)
        } else {
            message.info(state.message || "导出失败")
        }
    } else {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${db.projectName}_backup_${new Date().toISOString().split('T')[0]}.db`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        message.success("数据库导出成功")
    }
    } catch (error) {
        console.error('导出数据库失败:', error)
        message.error('导出数据库失败，请重试')
    }
}

const exportLogFile = async () => {
    isExportingLog.value = true

    try {
        const response = await api.get('/database/export-log', {
            responseType: 'blob'
        })

        // 使用 PyWebview 的保存文件对话框
        if (window.pywebview && window.pywebview.api) {
            const filename = `app_log_${new Date().toISOString().split('T')[0]}.log`
            const arrayBuffer = await response.data.arrayBuffer()
            const uint8array = new Uint8Array(arrayBuffer)
            const dataArray = Array.from(uint8array)
            const state = await window.pywebview.api.save_file_dialog(dataArray, filename)
            if(state.success){
                message.success(`日志文件导出成功，文件路径：${state.path}`)
            } else {
                message.info(state.message || "导出失败")
            }
        } else {
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `app_log_${new Date().toISOString().split('T')[0]}.log`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            message.success("日志文件导出成功")
        }
    } catch (error) {
        console.error('导出日志文件失败:', error)
        message.error('导出日志文件失败，请重试')
    } finally {
        isExportingLog.value = false
    }
}

const refreshDbInfo = async () => {
    try {
        const response = await api.get('/database/info')
        const dbInfo = {
            ...response.data,
            startAt: normalizeDateValue(response.data?.startAt),
            endAt: normalizeDateValue(response.data?.endAt)
        }
        
        if (databaseNotChanged.value) {
            databases.value[currentDatabase.value] = {...databases.value[currentDatabase.value], ...dbInfo}
        } else {
            databases.value[trueCurrentDatabase.value] = {...databases.value[trueCurrentDatabase.value], ...dbInfo}
        }
    } catch (error) {
        console.error('获取数据库信息失败:', error)
        message.error('获取数据库信息失败')
    }
}

// 清空数据库方法
const clearDatabase = async () => {
    if (!isDeleteConfirmed.value) {
        deleteConfirmationError.value = '请正确输入确认文字'
        return
    }
    
    dialog.warning({
        title: '最后确认',
        content: '最后确认：这将永久删除所有数据，此操作不可逆！确定要继续吗？',
        positiveText: '继续',
        negativeText: '取消',
        onPositiveClick: async () => {
            isClearingDb.value = true
            deleteConfirmationError.value = ''
            
            try {
                const response = await api.post('/database/clear')
                message.success('数据库清空成功')
                deleteConfirmation.value = ''
                
                // 刷新数据库信息
                await refreshDbInfo()
                
            } catch (error) {
                console.error('清空数据库失败:', error)
                const errorMsg = error.response?.data?.error || '清空数据库失败'
                message.error(errorMsg)
            } finally {
                isClearingDb.value = false
            }
        }
    })
}

// 编辑状态
const editingIndex = ref('')
const editingField = ref('')
const editingValue = ref(null)

// 创建数据库
const addDatabase = async () => {
    editingDatabase.value = {
        projectName: '',
        startAt: null,
        endAt: null,
        readOnly: false,
        databaseUpdate: false
    }
    addingDatabase.value = true
}

const createDatabase = async () => {
    const response = await api.post('/database/create', editingDatabase.value)
    editingDatabase.value = {
        projectName: '',
        startAt: null,
        endAt: null,
        readOnly: false,
        databaseUpdate: false
    }
    if (response.status === 201) {
        // 确保响应包含必要的数据
        if (response.data.key && response.data.database) {
            const updatedDatabases = { ...databases.value }
            updatedDatabases[response.data.key] = response.data.database
            databases.value = updatedDatabases
            message.success(response.data.message || '数据库创建成功')
        } else {
            message.error('服务器返回的数据格式不正确')
        }
    }
    addingDatabase.value = false
}

const cancelCreateDatabase = () => {
    editingDatabase.value = {
        projectName: '',
        startAt: null,
        endAt: null,
        readOnly: false,
        databaseUpdate: false
    }
    addingDatabase.value = false
}

// 双击编辑功能
const startEdit = (index, field, value) => {
    editingIndex.value = index
    editingField.value = field
    editingValue.value = ['startAt', 'endAt'].includes(field)
        ? normalizeDateValue(value)
        : value
}

const saveEdit = async (index) => {
    if (editingIndex.value === index && editingField.value) {
        databases.value = {
            ...databases.value,
            [index]: {
                ...databases.value[index],
                [editingField.value]: editingValue.value
            }
        }
        const response = await api.post(`/database/${index}`, databases.value[index])
        resetEdit()
        message.success('修改成功')
    }
}

const resetEdit = () => {
    editingIndex.value = ''
    editingField.value = ''
    editingValue.value = null
}

// 获取数据库状态文本
const getDatabaseStatus = (readOnly, key) => {
    if (currentDatabase.value === key) {
        return readOnly ? '当前(只读)' : '当前使用中'
    }
    return readOnly ? '只读' : '可用'
}

// 获取状态徽章的CSS类
const getStatusClasses = (db, key) => {
    const classes = {}
    if (currentDatabase.value === key) {
        classes.current = true
        classes.readonly = db.readOnly
    } else {
        if (db.readOnly) {
            classes['readonly-only'] = true
        } else {
            classes.available = true
        }
    }
    return classes
}

// 选择数据库
const selectDatabase = async (key) => {
    trueCurrentDatabase.value = currentDatabase.value
    currentDatabase.value = key
    await api.put(`/database/${key}`)
    message.success('数据库切换成功，重新启动应用后生效')
    databaseNotChanged.value = false
}

// 切换只读状态
const toggleReadOnly = async (key) => {
    const db = databases.value[key]
    if (db) {
        if (currentDatabase.value === key) {
            const message = db.readOnly 
                ? "当前数据库正在使用中，确定要将其设为可写吗？" 
                : "当前数据库正在使用中，确定要将其设为只读吗？设为只读后可能无法进行写操作。（功能尚未实装）"
            
            dialog.warning({
                title: '确认切换',
                content: message,
                positiveText: '确定',
                negativeText: '取消',
                onPositiveClick: async () => {
                    db.readOnly = !db.readOnly
                    const response = await api.post(`/database/${key}`, db)
                    message.success(`数据库已设为${db.readOnly ? '只读' : '可写'}`)
                }
            })
            return
        }
        
        db.readOnly = !db.readOnly
        const response = await api.post(`/database/${key}`, db)
        message.success(`数据库已设为${db.readOnly ? '只读' : '可写'}`)
    }
}

// 删除数据库
const deleteDatabase = async (key) => {
    if (currentDatabase.value === key) {
        message.error('不能删除当前正在使用的数据库')
        return
    }
    
    dialog.warning({
        title: '确认删除',
        content: '确定要删除这个数据库吗？此操作不可恢复！',
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: async () => {
            delete databases.value[key];
            await api.delete(`/database/${key}`)
            message.success('数据库删除成功')
        }
    })
}

const fetchDbInfo = async () => {
    try {
        const response = await api.get('/database')
        const rawDatabases = response.data.databases || {}
        databases.value = Object.fromEntries(
            Object.entries(rawDatabases).map(([key, db]) => [
                key,
                {
                    ...db,
                    startAt: normalizeDateValue(db?.startAt),
                    endAt: normalizeDateValue(db?.endAt)
                }
            ])
        )
        currentDatabase.value = response.data.current_database
    } catch (error) {
        console.error('获取数据库列表失败:', error)
        message.error('获取数据库列表失败')
    }
}

// 删除分组
const removeGroup = (index) => {
    editingGroup.rules.splice(index, 1)
}

// 分组设置相关方法
const addGroup = () => {
    // 找到一个未使用的颜色
    const usedColors = new Set(editingGroup.rules.map(g => g.color))
    const availableColor = colors.find(color => !usedColors.has(color)) || colors[0]

    editingGroup.rules.push({name: `新分组${editingGroup.rules.length + 1}`, color: availableColor, rules:[], expanded: true})
    genotypeAddable.value = true
}

const changeGroupExperiment = async (experimentID) => {
    editingGroup.Gtype = ''
    editingGroup.rules = []
    showIDList.value = false
    editingGroup.Gtype = 'id'
    editingGroup.name = (experiments.value.find(et => et.id === experimentID)?.name || "未知实验") + "-分组"
    if (editingGroup.experiment_id) {
        const miceExperiment = await api.get(`/experiments/${editingGroup.experiment_id}/mice`)
        candidateMice.value = miceExperiment.data
    }
}

const changeGroupType = async () => {
    if (editingGroup.Gtype === 'id') {
        candidateMice.value = mice.value
    } else if (editingGroup.Gtype === 'rule') {
        showIDList.value = false
        selectedGenes.value = []
        alleleSuggestions.value = []
        genotypeAddable.value = true
    }
    editingGroup.rules = []
    showIDList.value = false
}

const toggleSubgroupRules = (subgroupIndex) => {
    editingGroup.rules[subgroupIndex].expanded = !editingGroup.rules[subgroupIndex].expanded
}

const addRule = (subgroupIndex) => {
    editingGroup.rules[subgroupIndex].rules.push({
        Rtype: 'genotype',
        genes:[],
    })
}

const removeRule = (subgroupIndex, index) => {
    editingGroup.rules[subgroupIndex].rules.splice(index, 1)
}

const removeGeneSelection = (subgroupIndex, ruleIndex, geneIndex) => {
    editingGroup.rules[subgroupIndex].rules[ruleIndex].genes.splice(geneIndex, 1)
}

const addGenotype = (subgroupIndex, ruleIndex) => {
    editingGroup.rules[subgroupIndex].rules[ruleIndex].genes.push([])
    genotypeAddable.value = false
}

const saveGenes = (subgroupIndex, ruleIndex, index) => {
    if (selectedGenes.value.some(g=> !g.locus)) {
        message.info("请完善基因型")
        return
    }
    editingGroup.rules[subgroupIndex].rules[ruleIndex].genes[index] = {
        gene: [...selectedGenes.value],
        selectedGeneName: geneStore.selectedGeneName
    }
    selectedGenes.value = []
    alleleSuggestions.value = []
    genotypeAddable.value = true
}

const reviewRules = async () => {
    candidateMice.value = mice.value
    if (editingGroup.rules.length === 0) {
        message.info("预览前请设定组别")
        return 
    }
    const response = await api.post(`/groups/predefined/review`, { editing : editingGroup, candidate: candidateMice.value.map(m => m.tid)})
    response.data.forEach((g, gIndex) => {
        if (editingGroup.rules[gIndex]) {
            Object.assign(editingGroup.rules[gIndex], { mouseId: g })
        }
    })
    showIDList.value = true
    editingGroup.rules.forEach(g => g.expanded = false)
}

const reviewRulesClose = () => {
    showIDList.value = false
    editingGroup.rules.forEach(g => g.expanded = true)
}

const saveGroup = async () => {
    if (selectedGenes.value && selectedGenes.value.length !== 0) {
        message.info('请完成基因选择')
        return
    }

    if (!editingGroup.name) {
        message.info('请填写预设分组名称')
        return
    }

    if(!editingGroup.id && predefinedGroups.value.some(g => g.name == editingGroup.name)) {
        message.info('预设分组不能重名')
        return
    }

    if(predefinedGroups.value?.some(g => {
        if (g?.experiment_id) {
            g?.experiment_id == editingGroup?.experiment_id
        }}) ?? false) {
        message.info('同一实验只能有一个预设分组')
        return
    }

    isSaving.value = true
    const url = editingGroup.id 
        ? `/api/groups/predefined/${editingGroup.id}`
        : '/api/groups/predefined'

    const method = editingGroup.id ? 'put' : 'post'

    try {
        if (editingGroup.Gtype === 'id') {
            await axios[method](url, editingGroup)
            message.success('预设ID分组保存成功')
        } else {
            await axios[method](url, editingGroup)
            message.success('预设规则分组保存成功')
        }
        cancelEditGroup()
        fetchPredefinedGroups()
    } catch (error) {
        console.error('保存分组失败:', error)
        message.error(error.response?.data?.error || '保存分组失败')
    } finally {
        isSaving.value = false
    }
}

const editGroup = (group) => {
    cancelEditGroup()
    Object.assign(editingGroup, group)
    const tempRules = editingGroup.rules
    changeGroupType()
    editingGroup.rules = tempRules
}

const cancelEditGroup = () => {
    editingGroup.id = null
    editingGroup.name = ''
    editingGroup.description = ''
    editingGroup.Gtype = ''
    editingGroup.experiment_id = null
    editingGroup.rules = []
    showIDList.value = false
}

const deleteGroup = async (id) => {
    dialog.warning({
        title: '确认删除',
        content: '确定要删除这个分组吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await api.delete(`/groups/predefined/${id}`)
                message.success('删除成功')
                fetchPredefinedGroups()
                cancelEditGroup()
            } catch (error) {
                console.error('删除分组失败:', error)
                message.error('删除分组失败')
            }
        }
    })
}

const resetRuleValues = (rule) => {
    // 根据规则类型重置值
    if (rule.Rtype === 'genotype') {
        rule.genes = []
        genotypeAddable.value = true
    } else if (rule.Rtype === 'sex') {
        rule.value = 'M'
    } else if (rule.Rtype === 'strain') {
        rule.value = ''
    } else if (rule.Rtype === 'cage') {
        rule.cages = []
    } else if (rule.Rtype === 'live_status') {
        rule.value = '1'
    } else if (rule.Rtype === 'test_planned') {
        rule.test_planned = []
    }
}

const toggleGroupDetails = (groupId) => {
    const index = expandedGroup.value.indexOf(groupId)
    if (index === -1) {
        expandedGroup.value.push(groupId)
    } else {
        expandedGroup.value.splice(index, 1)
    }
}

// 保存显示设置
const saveDisplaySettings = () => {
    changeSettings(selectedSetting.value)
    message.success('设置保存成功')
}

const applyDisplayPreset = () => {
    if (selectedSetting.value) {
        changeSettings(selectedSetting.value)
    }
}

// 确认重置
const confirmReset = () => {
    dialog.warning({
        title: '确认重置',
        content: '确定要重置所有显示设置吗？此操作不可撤销。',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => {
            Object.keys(settings.value).forEach(s => {
                resetToDefault(s)
                changeSettings(s)
            })
            message.success("重置所有显示设置")
        }
    })
}

// 初始化数据
onMounted(() => {
    fetchDbInfo()
    refreshDbInfo()
})
</script>

<style scoped>
.main-content {
--primary: var(--n-primary-color);
--secondary: var(--n-success-color);
--danger: var(--n-error-color);
--warning: var(--n-warning-color);
--light: var(--n-color);
--light-embedded: var(--n-color-embedded);
--dark: var(--n-text-color);
--border: var(--n-border-color);
--header-height: 60px;
--footer-height: 25px;
}

.content-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 20px;
}

.page-title {
font-size: 1.5rem;
font-weight: 600;
}

.setting-tabs {
margin-bottom: 20px;
}

.form-container {
background: var(--light);
padding: 20px;
border-radius: 8px;
box-shadow: var(--n-box-shadow-1);
border: 1px solid var(--border);
}

.section-description {
color: var(--n-text-color-3);
margin-bottom: 20px;
}

.form-section {
margin-bottom: 30px;
}

.form-container :deep(.n-card.form-section),
.form-container :deep(.n-card.reset-section) {
margin-bottom: 0;
}

.form-section h3 {
font-size: 1.1rem;
margin-bottom: 15px;
color: var(--n-text-color-1);
font-weight: 500;
}

.form-group-row {
display: flex;
flex-wrap: wrap;
gap: 15px;
margin-bottom: 20px;
align-items: flex-end;
}

.form-group {
flex: 1;
min-width: 250px;
}

.form-group label {
display: block;
margin-bottom: 8px;
font-weight: 500;
color: var(--n-text-color-1);
}

.form-group input, .form-group select {
width: 100%;
padding: 10px;
border: 1px solid var(--n-border-color);
border-radius: 4px;
font-size: 14px;
}

.form-group input:focus, .form-group select:focus {
border-color: var(--primary);
outline: none;
box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 25%, transparent);
}

.table-container {
overflow-x: auto;
border: 1px solid var(--border);
border-radius: 8px;
background: var(--light);
}

.settings-table {
width: 100%;
border-collapse: collapse;
margin-top: 15px;
background: var(--light);
}

.settings-table th, 
.settings-table td {
padding: 12px 15px;
text-align: left;
border-bottom: 1px solid var(--n-border-color);
}

.settings-table th {
background-color: var(--n-color-embedded);
font-weight: 600;
position: sticky;
top: 0;
}

.settings-table tbody tr:hover {
background-color: var(--n-hover-color);
}

.settings-table tbody tr.selected {
background-color: var(--n-success-color-suppl);
}

.action-cell {
white-space: nowrap;
}

.btn-group {
display: flex;
gap: 15px;
}

.group-actions-row {
display: flex;
align-items: center;
gap: 12px;
}

.file-upload {
margin-top: 15px;
}

.file-upload input[type="file"] {
display: none;
}

.upload-area {
border: 2px dashed var(--n-border-color);
border-radius: 8px;
padding: 30px;
text-align: center;
cursor: pointer;
transition: all 0.3s;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
min-height: 150px;
}

.upload-area.dragover {
border-color: var(--primary);
background-color: color-mix(in srgb, var(--n-primary-color) 8%, transparent);
}

.upload-area i {
font-size: 48px;
color: var(--n-text-color-3);
margin-bottom: 15px;
}

.upload-area p {
color: var(--n-text-color-3);
margin: 5px 0;
}

.file-info {
display: flex;
flex-direction: column;
align-items: center;
margin-top: 10px;
}

.file-info span:first-child {
font-weight: 500;
margin-bottom: 5px;
}

.import-options, .export-options {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--n-color-embedded);
  border-radius: 8px;
}

.export-options .export-form {
  margin-top: 15px;
}

.date-range {
display: flex;
align-items: center;
gap: 10px;
}

.date-range :deep(.n-date-picker) {
flex: 1;
}

.dialog-overlay {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background-color: color-mix(in srgb, var(--n-text-color) 50%, transparent);
display: flex;
justify-content: center;
align-items: center;
z-index: 1000;
}

.dialog-container {
background-color: var(--n-color);
padding: 25px;
border-radius: 8px;
width: 450px;
max-width: 100%;
max-height: 80%;
box-shadow: var(--n-box-shadow-3);
overflow-y: auto;
}

.dialog-container h2 {
margin-top: 0;
margin-bottom: 20px;
font-size: 1.3rem;
}

.dialog-buttons {
display: flex;
justify-content: flex-end;
gap: 10px;
margin-top: 20px;
}

.import-result {
margin: 15px 0;
}

.result-item {
display: flex;
align-items: center;
padding: 10px;
border-radius: 4px;
margin-bottom: 10px;
}

.format-hint {
    background: var(--n-info-color-suppl);
    border-left: 4px solid var(--n-primary-color);
    border-radius: 4px;
    padding: 20px;
    margin-top: 25px;
    margin-bottom: 20px;
}

.format-hint h4 {
    color: var(--n-text-color-1);
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
}

.format-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    font-size: 14px;
}

.format-table th {
    background: var(--n-info-color-suppl);
    padding: 12px 15px;
    text-align: left;
    font-weight: 600;
    color: var(--n-text-color-1);
    border-bottom: 1px solid var(--n-border-color);
}

.format-table td {
    padding: 12px 15px;
    border-bottom: 1px solid var(--n-border-color);
}

.format-table tr:nth-child(even) {
    background: var(--n-color-embedded);
}

.format-table tr:hover {
    background: var(--n-info-color-suppl);
}

.required {
    color: var(--n-error-color);
    font-weight: 600;
}

.optional {
    color: var(--n-text-color-3);
}

.note {
    margin-top: 15px;
    padding: 15px;
    background: var(--n-warning-color-suppl);
    border-left: 4px solid var(--n-warning-color);
    border-radius: 4px;
    font-size: 14px;
}

.note-title {
    font-weight: 600;
    margin-bottom: 5px;
    color: var(--n-text-color-1);
}

.note-content {
    color: var(--n-text-color-3);
}

.note-content p {
    margin-bottom: 5px;
}

.example-row {
    font-family: monospace;
    font-size: 14px;
    color: var(--n-primary-color);
}

.preset-selector {
display: flex;
align-items: center;
gap: 10px;
margin-bottom: 15px;
flex-wrap: wrap;
}

.preset-selector select {
width: 200px;
padding: 8px;
border: 1px solid var(--n-border-color);
border-radius: 4px;
}

.preset-description {
color: var(--n-text-color-3);
font-style: italic;
}

.fields-section {
margin-top: 20px;
padding: 15px;
border: 1px solid var(--n-border-color);
border-radius: 5px;
background-color: var(--n-color-embedded);
}

.fields-section h4 {
margin-top: 0;
margin-bottom: 15px;
color: var(--n-text-color-1);
}

.field-actions {
margin-top: 15px;
}

.settings-table input[type="text"],
.settings-table input[type="number"],
.settings-table select {
width: 100%;
padding: 5px;
border: 1px solid var(--n-border-color);
border-radius: 3px;
}

/* 详情展开区域样式 */
.detail-row {
    background-color: var(--n-color-embedded);
}

.detail-content {
    padding: 20px;
    border-top: 1px solid var(--n-border-color);
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.detail-title {
    font-size: 1.1rem;
    color: var(--n-text-color-1);
    font-weight: 500;
}

.detail-section {
    margin-bottom: 20px;
}

.detail-section h4 {
    font-size: 1rem;
    color: var(--n-text-color-1);
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--n-border-color);
}

.field-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
}

.field-item {
    background: var(--n-color);
    padding: 15px;
    border-radius: 6px;
    border: 1px solid var(--n-border-color);
    box-shadow: var(--n-box-shadow-1);
}

.field-name {
    font-weight: 600;
    color: var(--n-text-color-1);
    margin-bottom: 5px;
}

.field-props {
    display: flex;
    justify-content: space-between;
    color: var(--n-text-color-3);
    font-size: 0.9rem;
}

.required-badge {
    background-color: var(--n-warning-color-suppl);
    color: var(--n-warning-color);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.8rem;
}

.no-fields {
    grid-column: 1 / -1;
    text-align: center;
    padding: 20px;
    color: var(--n-text-color-3);
    background: var(--n-color-embedded);
    border-radius: 6px;
    border: 1px dashed var(--n-border-color);
}

.btn-info {
    background-color: var(--n-primary-color);
    color: var(--n-base-color);
}

.btn-info:hover {
    background-color: var(--n-primary-color-hover);
}

/* 可视化徽章样式 */
.visualized-badge {
    background-color: var(--n-success-color-suppl);
    color: var(--n-success-color);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.8rem;
    margin-left: 8px;
}

.not-visualized-badge {
    background-color: var(--n-error-color-suppl);
    color: var(--n-error-color);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.8rem;
    margin-left: 8px;
}

/* 数据库管理特定样式 */
.warning-message {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: var(--n-warning-color-suppl);
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  margin: 15px 0;
  color: var(--n-warning-color);
}

.warning-message i {
  margin-right: 10px;
  color: var(--n-warning-color);
}

.error-details pre {
  background-color: var(--n-color-embedded);
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.warning-text {
  color: var(--n-error-color);
  font-weight: 500;
  background-color: var(--n-error-color-suppl);
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid var(--n-error-color);
}

.confirmation-input {
  margin-bottom: 15px;
}

.confirmation-field {
  width: 100%;
  padding: 10px;
  border: 2px solid var(--n-border-color);
  border-radius: 4px;
  font-size: 14px;
  margin-top: 5px;
}

.confirmation-field.error {
  border-color: var(--n-error-color);
  background-color: var(--n-error-color-suppl);
}

.confirmation-field:focus {
  outline: none;
  border-color: var(--n-primary-color);
}

.confirmation-input label {
  font-weight: 500;
  color: var(--n-text-color-1);
}

.confirmation-input label strong {
  color: var(--n-error-color);
}

.error-message {
  color: var(--n-error-color);
  font-size: 12px;
  margin-top: 5px;
}

/* 基因位点行样式 */
.locus-row {
  background-color: var(--n-color-embedded);
  font-weight: bold;
}

/* 等位基因子表格容器 */
.alleles-subtable {
  background-color: var(--n-info-color-suppl);
}

.subtable-container {
  padding: 15px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 5px;
  margin: 10px 0;
}

/* 子表格样式 */
.subtable {
  width: 100%;
  margin-bottom: 15px;
}

.subtable th {
    background-color: var(--n-color-embedded);
}

.subtable tr:nth-child(even) {
  background-color: var(--n-color-embedded);
}

/* 添加等位基因表单 */
.add-allele-form {
  background-color: var(--n-color-embedded);
  padding: 15px;
  border-radius: 5px;
  border: 1px dashed var(--n-border-color);
}

.add-allele-form h4 {
  margin-top: 0;
  color: var(--n-text-color-3);
}

.database-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.database-card {
    background-color: var(--n-color-embedded);
    border-radius: 8px;
    padding: 15px;
    box-shadow: var(--n-box-shadow-1);
    transition: all 0.3s ease;
    border: 1px solid var(--n-border-color);
}

.database-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--n-box-shadow-2);
}

.database-card.current {
    border: 2px solid var(--primary);
    background-color: var(--n-success-color-suppl);
}

.database-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.database-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.database-name:hover {
    background-color: var(--n-info-color-suppl);
}

.info-value {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.status-badge:hover {
    opacity: 0.9;
    transform: scale(1.05);
}

.status-badge.current {
    background-color: var(--n-success-color);
    color: var(--n-base-color);
}

.status-badge.readonly {
    background-color: var(--n-warning-color);
    color: var(--n-base-color);
}

.status-badge.available {
    background-color: var(--n-primary-color);
    color: var(--n-base-color);
}

.status-badge.readonly-only {
    background-color: var(--n-text-color-disabled);
    color: var(--n-base-color);
}

.status-icon {
    margin-right: 4px;
    font-size: 14px;
}

.database-details {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.detail-label {
    font-size: 12px;
    color: var(--n-text-color-3);
    margin-bottom: 2px;
}

.detail-value {
    font-size: 14px;
    color: var(--n-text-color-1);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    transition: background-color 0.2s;
}

.detail-value:hover {
    background-color: var(--n-hover-color);
}

.actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.action-btn.primary {
    background-color: var(--n-primary-color);
    color: var(--n-base-color);
}

.action-btn.secondary {
    background-color: var(--n-color-embedded);
    color: var(--n-text-color-1);
}

.action-btn:disabled {
    background-color: var(--n-color-embedded);
    color: var(--n-text-color-disabled);
    cursor: not-allowed;
}

.editing-input {
    width: 100%;
    padding: 4px;
    border: 1px solid var(--n-border-color);
    border-radius: 4px;
    font-size: 14px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--n-border-color);
}

.section-header h3 {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0;
}

/* 分组设置特定样式 */
.rules-container {
    margin-top: 15px;
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 20px;
    align-items: center;
}

.rule-item {
    border: 1px solid var(--n-border-color);
    border-radius: 6px;
    margin-bottom: 15px;
    background: var(--n-color-embedded);
    width: 45%;
}

.rule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: var(--n-info-color-suppl);
    border-bottom: 1px solid var(--n-border-color);
    font-weight: 600;
    color: var(--n-text-color-1);
}

.rule-content {
    padding: 15px;
}

.allele-requirements {
    margin-top: 8px;
}

.allele-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.allele-item select {
    flex: 1;
}

.allele-item .btn {
    padding: 4px 8px;
    min-width: auto;
}

/* 规则详情样式 */
.rules-list {
    display: grid;
    gap: 10px;
}

.rule-detail {
    background: var(--n-color);
    padding: 12px 15px;
    border-radius: 4px;
    border-left: 4px solid var(--n-primary-color);
    box-shadow: var(--n-box-shadow-1);
}

.rule-type {
    font-weight: 600;
    color: var(--n-text-color-1);
    margin-bottom: 5px;
    font-size: 14px;
}

.rule-conditions {
    color: var(--n-text-color-3);
    font-size: 13px;
    line-height: 1.4;
}

.no-rules {
    text-align: center;
    padding: 30px;
    color: var(--n-text-color-3);
    background: var(--n-color-embedded);
    border-radius: 6px;
    border: 1px dashed var(--n-border-color);
}

/* 测试区域样式 */
.test-section {
    background: var(--n-color-embedded);
    padding: 15px;
    border-radius: 6px;
    border: 1px solid var(--n-border-color);
}

.test-result {
    margin-top: 15px;
    padding: 15px;
    background: var(--n-color);
    border-radius: 4px;
    border: 1px solid var(--n-border-color);
}

.result-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 10px;
}

.result-indicator.success {
    background-color: var(--n-success-color-suppl);
    color: var(--n-success-color);
    border: 1px solid var(--n-border-color);
}

.result-indicator.error {
    background-color: var(--n-error-color-suppl);
    color: var(--n-error-color);
    border: 1px solid var(--n-border-color);
}

.result-indicator i {
    font-size: 18px;
}

/* 分组表格样式增强 */
.settings-table tr:hover .rule-detail {
    background-color: var(--n-info-color-suppl);
}

/* 动画效果 */
.rule-item {
    transition: all 0.3s ease;
}

.rule-item-enter-active, .rule-item-leave-active {
    transition: all 0.3s ease;
}

.rule-item-enter-from, .rule-item-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}


/* 小组管理样式 */
.subgroups-container {
    margin-top: 20px;
}

.subgroup-item {
    border: 1px solid var(--n-border-color);
    border-radius: 8px;
    margin-bottom: 20px;
    background: var(--n-color-embedded);
}

.subgroup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: var(--n-info-color-suppl);
    border-bottom: 1px solid var(--n-border-color);
}

.subgroup-title {
    display: flex;
    align-items: center;
    gap: 15px;
}

.subgroup-title h5 {
    margin: 0;
    color: var(--n-text-color-1);
    font-size: 16px;
}

.subgroup-name-input {
    padding: 8px 12px;
    border: 1px solid var(--n-border-color);
    border-radius: 4px;
    font-size: 14px;
    min-width: 200px;
}

.subgroup-actions {
    display: flex;
    gap: 10px;
}

.subgroup-rules {
    padding: 15px;
    background: var(--n-color);
}

.add-subgroup-btn {
    width: 30%;
    padding: 12px;
    margin-top: 10px;
}

/* 详情展示样式 */
.subgroups-list {
    display: grid;
    gap: 15px;
}

.subgroup-detail {
    background: var(--n-color);
    border: 1px solid var(--n-border-color);
    border-radius: 6px;
    padding: 15px;
}

.subgroup-header-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--n-border-color);
}

.subgroup-header-detail h5 {
    margin: 0;
    color: var(--n-text-color-1);
}

.rule-count {
    background: var(--n-primary-color);
    color: var(--n-base-color);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.no-subgroups {
    text-align: center;
    padding: 40px;
    color: var(--n-text-color-3);
    background: var(--n-color-embedded);
    border-radius: 6px;
    border: 1px dashed var(--n-border-color);
}

.matched-info {
    background: var(--n-success-color-suppl);
    padding: 10px;
    border-radius: 4px;
    margin: 10px 0;
    border-left: 4px solid var(--n-success-color);
}

.matched-info h5 {
    margin: 0;
    color: var(--n-success-color-hover);
}

.group-type-selector {
    display: flex;
    gap: 20px;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.radio-custom {
    width: 16px;
    height: 16px;
    border: 2px solid var(--n-border-color);
    border-radius: 50%;
    display: inline-block;
    position: relative;
}

.radio-label input:checked + .radio-custom {
    border-color: var(--n-primary-color);
}

.radio-label input:checked + .radio-custom::after {
    content: '';
    width: 8px;
    height: 8px;
    background: var(--n-primary-color);
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
}

.group-type-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.group-type-badge.rule-group {
    background: var(--n-info-color-suppl);
    color: var(--n-primary-color);
}

.group-type-badge.id-group {
    background: var(--n-info-color-suppl);
    color: var(--n-info-color);
}

.color-picker-container {
    display: flex;
    align-items: center;
    gap: 10px;
}

.color-input {
    width: 30px;
    height: 30px;
    border: none;
    cursor: pointer;
}

.btn-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--n-text-color-3) !important;
    padding: 2px;
}

.btn-remove:hover {
    color: var(--n-error-color);
}

.preview-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--n-border-color);
    display: flex;
    gap: 10px;
}

.add-id-group-btn {
    width: 100%;
    margin-top: 10px;
}

.gene-form-group {
    width: 100%;
    padding: 10px 15px;
    border-radius: 8px;
    border: 1px solid var(--n-border-color);
    background: var(--n-color);
    font-size: 1rem;
    color: var(--n-text-color-1);
    appearance: none;
    background-position: right 15px center;
    background-size: 16px;
    transition: all 0.2s;
}

.form-group-location {
margin-bottom: 1rem;
}

.form-section-rule {
    padding: 10px;
    background: var(--n-color-embedded);
}

.action-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.btn i {
  margin-right: 5px;
}

.column-category {
    margin-bottom: 20px;
    padding: 15px;
    background-color: var(--n-color-embedded);
    border-radius: 8px;
    border-left: 4px solid var(--n-primary-color);
}

.column-category h4 {
    margin-bottom: 10px;
    color: var(--n-text-color-1);
    font-weight: 600;
}

.column-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.column-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 15px;
    background-color: var(--n-color);
    border-radius: 6px;
    border: 1px solid var(--n-border-color);
    user-select: none;
}

.column-item.seen{
    background-color: var(--n-hover-color);
}

.column-item :deep(.n-checkbox) {
    flex: 1;
}

.column-item .n-icon {
    color: var(--n-text-color-3);
}


</style>