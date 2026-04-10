<template>
  <div class="main-content">
    <div class="section">
      <!-- 顶部统计区 -->
      <div class="header-bar">
        <div class="header-left">
          <h2>小鼠管理</h2>
          <span class="stats-text">
            共 <strong>{{filteredMice.length}}</strong> 只
            （♂ {{filteredMice.filter(m=>m.sex==='M').length}} / ♀ {{filteredMice.filter(m=>m.sex==='F').length}}）
          </span>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
      
      <!-- 筛选区 -->
      <div class="filter-section">
        <!-- 第一行：核心搜索 -->
        <div class="filter-row filter-row-search">
          <n-button @click="openModal('add')" type="success">
            <template #icon><AppIcon name="add" /></template>
            添加新小鼠
          </n-button>
          <n-input 
            v-model:value="searchTerm" 
            placeholder="搜索小鼠ID或基因型" 
            @keyup.enter="applyFilters" 
            clearable 
            class="search-input"
          />
          <n-button @click="applyFilters" type="primary">
            <template #icon><AppIcon name="search" /></template>
            搜索
          </n-button>
          <n-button @click="resetSearch" secondary>
            <template #icon><AppIcon name="refresh" /></template>
            重置
          </n-button>
        </div>

        <!-- 第二行：基础属性 -->
        <div class="filter-row filter-row-basic">
          <div class="filter-item" v-if="showColumns.id">
            <n-input v-model:value="filters.id" @update:value="applyFilters" placeholder="筛选ID" clearable />
          </div>
          <div class="filter-item filter-item-location" v-if="showColumns.cage">
            <n-select
              v-model:value="filters.location"
              :options="[
                { label: '所有区域', value: '' },
                { label: '未分配', value: 'unassigned' },
                ...locations.map(location => ({ label: location.identifier, value: location.identifier }))
              ]"
              @update:value="onLocationChange"
              placeholder="选择区域"
            />
            <n-select
              v-if="filters.location && filters.location !== 'unassigned'"
              v-model:value="filters.cage"
              :options="[{ label: '所有笼位', value: null }, ...locationCages.map(cage => ({ label: cage.cage_id, value: cage.id }))]"
              @update:value="applyFilters"
              placeholder="选择笼位"
            />
          </div>
          <div class="filter-item filter-item-genotype" v-if="showColumns.genotype">
            <n-select
              v-model:value="filters.genotypeLocus"
              :options="[{ label: '所有位点', value: '' }, ...genotypes.map(locus => ({ label: locus.symbol, value: locus.symbol }))]"
              @update:value="onLocusChange"
              placeholder="选择位点"
            />
            <n-select
              v-if="filters.genotypeLocus && filters.genotypeLocus !== 'WT'"
              v-model:value="filters.genotypeAllele"
              :options="[{ label: '所有等位基因', value: '' }, ...filteredAlleles.map(allele => ({ label: allele.symbol, value: allele.symbol }))]"
              @update:value="onAlleleChange"
              :disabled="!filters.genotypeLocus"
              placeholder="选择等位基因"
            />
            <n-select
              v-if="filters.genotypeLocus && filters.genotypeLocus !== 'WT' && filters.genotypeAllele"
              v-model:value="filters.genotypeHomo"
              :options="[
                { label: '所有形式', value: '' },
                { label: '纯合', value: 'homo' },
                { label: '杂合', value: 'hetero' }
              ]"
              @update:value="applyFilters"
              :disabled="!filters.genotypeLocus || !filters.genotypeAllele"
              placeholder="选择形式"
            />
          </div>
          <div class="filter-item" v-if="showColumns.strain">
            <n-input v-model:value="filters.strain" @update:value="applyFilters" placeholder="筛选品系" clearable />
          </div>
          <div class="filter-item" v-if="showColumns.sex">
            <n-select
              v-model:value="filters.sex"
              :options="[
                { label: '全部性别', value: '' },
                { label: '雄性', value: 'M' },
                { label: '雌性', value: 'F' }
              ]"
              @update:value="applyFilters"
              placeholder="请选择"
            />
          </div>
          <div class="filter-item" v-if="showColumns.live_status">
            <n-select
              v-model:value="filters.live_status"
              :options="[
                { label: '全部状态', value: -1 },
                { label: '存活', value: 1 },
                { label: '死亡', value: 0 },
                { label: '解剖', value: 2 },
                { label: '意外消失', value: 3 },
                { label: '丢弃', value: 4 }
              ]"
              @update:value="applyFilters"
              placeholder="请选择"
            />
          </div>
        </div>

        <!-- 第三行：时间与年龄 -->
        <div class="filter-row filter-row-time">
          <div class="filter-item" v-if="showColumns.birth_date">
            <n-date-picker 
              type="date" 
              value-format="yyyy-MM-dd" 
              v-model:formatted-value="filters.birth_date" 
              @update:formatted-value="applyFilters" 
              placeholder="出生日期"
              clearable
            />
          </div>
          <div class="filter-item range-item" v-if="showColumns.days_old">
            <n-input-number 
              v-model:value="filters.days_old_min" 
              @update:value="applyFilters" 
              placeholder="最小日龄" 
              :min="0" 
              style="width: 100%;" 
            />
            <span class="range-separator">-</span>
            <n-input-number 
              v-model:value="filters.days_old_max" 
              @update:value="applyFilters" 
              placeholder="最大日龄" 
              :min="0" 
              style="width: 100%;" 
            />
          </div>
          <div class="filter-item range-item" v-if="showColumns.weeks_old">
            <n-input-number 
              v-model:value="filters.weeks_old_min" 
              @update:value="applyFilters" 
              placeholder="最小周龄" 
              :min="0" 
              style="width: 100%;" 
            />
            <span class="range-separator">-</span>
            <n-input-number 
              v-model:value="filters.weeks_old_max" 
              @update:value="applyFilters" 
              placeholder="最大周龄" 
              :min="0" 
              style="width: 100%;" 
            />
          </div>
        </div>
      </div>

      <!-- 小鼠列表表格 -->
      <div class="table-scroll">
        <n-data-table
          ref="dataTableRef"
          :columns="miceColumns"
          :data="filteredMice"
          :pagination="false"
          :bordered="false"
          :single-line="false"
          :row-key="(row) => row.tid"
          :row-props="rowProps"
          @update:sorter="handleSorterChange"
          :sorter="sorterState"
          @update:checked-row-keys="handleCheckedRowKeysChange"
          :checked-row-keys="checkedRowKeys"
        />
      </div>
      
      <!-- 批量操作栏 -->
      <div class="batch-actions" v-if="checkedRowKeys.length > 0">
        <div class="batch-info">
          <span>已选择 <strong>{{ checkedRowKeys.length }}</strong> 只小鼠</span>
        </div>
        <div class="batch-buttons">
          <div class="custom-select" :class="{ 'is-open': showTestsDoneDropdown }">
            <div class="select-header" @click="toggleTestsDoneDropdown">
              <div class="select-content">
                <div class="selected-tags">
                  <span v-for="(experiment, index) in batchSelectedTests" :key="experiment.id" class="tag">
                    {{ experiment.name }}
                    <span class="tag-remove" @click.stop="removeTest('batch', index)">×</span>
                  </span>
                </div>
                <span class="placeholder" v-if="batchSelectedTests.length === 0">选择要操作的实验...</span>
              </div>
              <div class="select-arrow">▼</div>
            </div>
            <div class="select-options" v-if="showTestsDoneDropdown">
              <div 
                v-for="experiment in experiments" 
                :key="experiment.id" 
                class="select-option"
                :class="{is_show: experiment.is_show}"
                @click="selectTest('batch', experiment)"
              >
                {{ experiment.id }}-{{ experiment.name }}
              </div>
            </div>
          </div>
          <n-button @click="batchAddExperiment('计划实验')" secondary type="primary" :disabled="batchSelectedTests.length === 0">
            批量计划实验
          </n-button>
          <n-button @click="batchAddExperiment('完成实验')" type="primary" :disabled="batchSelectedTests.length === 0">
            批量完成实验
          </n-button>
          <n-button @click="batchDeleteMice" type="error">
            批量删除
          </n-button>
          <n-button @click="clearSelection" quaternary>
            取消选择
          </n-button>
        </div>
      </div>
      
      <!-- 右键上下文菜单 -->
      <div v-if="contextMenu.visible" 
          class="context-menu" 
          :style="{top: contextMenu.y + 'px', left: contextMenu.x + 'px'}"
          @click.stop>
        <ul>
          <li @click="openMouseDetail(contextMenu.mouse.tid)">
            <AppIcon  name="visibility" /> 查看详情
          </li>
          <li @click="openModal('edit', contextMenu.mouse)">
            <AppIcon  name="edit" /> 编辑信息
          </li>
          <li @click="openModal('template', contextMenu.mouse)">
            <AppIcon  name="playlist_add" /> 以此为模板批量创建小鼠
          </li>
          <li @click="deleteMouse(contextMenu.mouse.tid)" class="danger">
            <AppIcon  name="delete" /> 删除小鼠
          </li>
        </ul>
      </div>
      
      <!-- 空状态 -->
      <div v-if="filteredMice.length === 0 && !loading" class="empty-state">
        <p>没有找到小鼠记录</p>
        <n-button @click="openModal('add')" type="primary">添加新小鼠</n-button>
      </div>
    </div>
    
    <!-- 添加小鼠详情浮层组件 -->
    <MouseDetailModal 
      v-if="showMouseDetail" 
      :mouse-id="selectedMouseId" 
      @close="showMouseDetail = false" 
    />

    <!-- 统一的小鼠编辑/添加模态框 -->
    <n-modal v-model:show="showModal" v-if="modalMode !== 'template'" :mask-closable="false">
      <n-card class="modal-content" :bordered="false" role="dialog" aria-modal="true">
        <n-space justify="space-between" align="center" class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <n-button class="close-btn" quaternary circle @click="closeModal">
            <AppIcon  name="close" />
          </n-button>
        </n-space>
        <div class="form-body">
          <!-- 小鼠ID字段（仅在添加模式显示） -->
          <div class="form-group" v-if="modalMode === 'add'">
            <n-form-item label="小鼠 ID *" label-placement="top">
              <n-input v-model:value="formData.id" />
            </n-form-item>
          </div>
          <!-- 显示小鼠ID（仅在编辑模式显示） -->
          <div class="form-group" v-if="modalMode === 'edit'">
            <n-form-item label="小鼠 ID" label-placement="top">
              <span>{{ formData.id }}</span>
            </n-form-item>
          </div>          
          <!-- 基因型选择 -->
          <div class="form-group">
            <div class="form-header">
              <div class="n-form-item-label">基因型:
                <span class="selected-gene" v-html="geneStore.selectedGeneName"></span>
              </div>
              <n-button type="primary" @click="addGene" :disabled="!geneStore.addable">
                <AppIcon  name="add" />
                添加
              </n-button>
            </div>

            <div v-for="(gene, index) in selectedGenes" class="genotype-select-container" :key="gene">
              <div class="locus-control">
                <div class="locus-select">
                <n-select
                  v-model:value="gene.locus"
                  :options="geneStore.locusSuggestions[index].map(locus => ({ label: locus.symbol, value: locus.symbol }))"
                  @update:value="onFormLocusChange(index, gene.locus)"
                />
                </div>
                <n-button tertiary type="error" @click="deleteGene(index)">
                  <AppIcon  name="delete" />
                </n-button>
              </div>

              <div class="allele-controls">
                <div class="allele-group" v-if="gene.locus && gene.locus !== 'WT'">
                  <div class="n-form-item-label">等位基因 1</div>
                <n-select
                  v-model:value="gene.allele1"
                  :disabled="!gene.locus"
                  :options="alleleSuggestions[index][0].map(allele => ({ label: allele.symbol, value: allele.id }))"
                  @update:value="onFormAlleleChange(true, index, gene.allele1)"
                />
                </div>
                <div class="allele-group" v-if="gene.locus && gene.locus !== 'WT'">
                  <div class="n-form-item-label">等位基因 2</div>
                <n-select
                  v-model:value="gene.allele2"
                  :disabled="!gene.locus"
                  :options="alleleSuggestions[index][1].map(allele => ({ label: allele.symbol, value: allele.id }))"
                  @update:value="onFormAlleleChange(false, index, gene.allele2)"
                />
                </div>
              </div>
            </div>
            <n-button v-if="selectedGenes.length>0" type="error" secondary @click="deleteGenes">
              <AppIcon  name="delete_forever" />
              全部删除
            </n-button>
          </div>

          <div class="form-group">
            <n-form-item label="品系" label-placement="top">
              <n-input v-model:value="formData.strain" placeholder="如：C57BL/6J" />
            </n-form-item>
          </div>
          
          <div class="form-group">
            <n-form-item label="性别" label-placement="top">
              <n-select
                v-model:value="formData.sex"
                :options="[
                  { label: '雄性', value: 'M' },
                  { label: '雌性', value: 'F' }
                ]"
              />
            </n-form-item>
          </div>

          <div class="form-group">
            <n-form-item label="出生日期" label-placement="top">
              <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="formData.birth_date" />
            </n-form-item>
          </div>

          <!-- 生存状态（仅在编辑模式显示） -->
          <div class="form-group" v-if="modalMode === 'edit'">
            <n-form-item label="生存状态" label-placement="top">
              <n-select
                v-model:value="formData.live_status"
                :options="[
                  { label: '存活', value: 1 },
                  { label: '死亡', value: 0 },
                  { label: '解剖', value: 2 },
                  { label: '意外消失', value: 3 },
                  { label: '丢弃', value: 4 }
                ]"
              />
            </n-form-item>
          </div>
          <!-- 死亡日期（仅在编辑且非存活状态显示） -->
          <div class="form-group" v-if="modalMode === 'edit' && formData.live_status != 1">
            <n-form-item label="死亡日期" label-placement="top">
              <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="formData.death_date" />
            </n-form-item>
          </div>        

          <!-- 父本选择 -->
          <div class="form-group">
            <div class="n-form-item-label">父本 ID</div>
            <div class="autocomplete">
              <n-input
                v-model:value="fatherQuery"
                placeholder="输入父本ID搜索..."
                @focus="showFatherSuggestions = true"
                @blur="onBlur"
                clearable
              />
              <ul v-if="showFatherSuggestions && fatherSuggestions.length" class="suggestions">
                <li
                  v-for="mouse in fatherSuggestions"
                  :key="mouse.tid"
                  @click="selectParent('father', mouse)"
                >
                  {{ mouse.id }} ({{ formatDate(mouse.birth_date) }}) - <span v-html="mouse.genotype.symbol"></span>
                </li>
              </ul>
            </div>
            <div class="selected-parents" v-if="selectedFathers.length">
              <div class="selected-parent" v-for="(father, index) in selectedFathers" :key="father.tid">
                <span>{{ father.id }} ({{ formatDate(father.birth_date) }}) - <span v-html="father.genotype.symbol"></span></span>
                <n-button attr-type="button" class="remove-btn" tertiary type="error" @click="removeParent('father', index)">移除</n-button>
              </div>
            </div>
            <p class="info-text" v-else>未选择父本</p>
          </div>

          <!-- 母本选择 -->
          <div class="form-group">
            <div class="n-form-item-label">母本 ID</div>
            <div class="autocomplete">
              <n-input
                v-model:value="motherQuery"
                placeholder="输入母本ID搜索..."
                @focus="showMotherSuggestions = true"
                @blur="onBlur"
                clearable
              />
              <ul v-if="showMotherSuggestions && motherSuggestions.length" class="suggestions">
                <li
                  v-for="mouse in motherSuggestions"
                  :key="mouse.tid"
                  @click="selectParent('mother', mouse)"
                >
                  {{ mouse.id }} ({{ formatDate(mouse.birth_date) }}) - <span v-html="mouse.genotype.symbol"></span>
                </li>
              </ul>
            </div>
            <div class="selected-parents" v-if="selectedMothers.length">
              <div class="selected-parent" v-for="(mother, index) in selectedMothers" :key="mother.tid">
                <span>{{ mother.id }} ({{ formatDate(mother.birth_date) }}) - <span v-html="mother.genotype.symbol"></span></span>
                <n-button attr-type="button" class="remove-btn" tertiary type="error" @click="removeParent('mother', index)">移除</n-button>
              </div>
            </div>
            <p class="info-text" v-else>未选择母本</p>
          </div>

        <!-- 已完成测试 -->
        <div class="form-group"  v-if="modalMode === 'edit'">
          <div class="n-form-item-label">已完成测试</div>
          <div class="tags-input-container">
            <!-- 下拉选择框 -->
            <div class="custom-select" :class="{ 'is-open': showTestsDoneDropdown }">
              <div class="select-header" @click="toggleTestsDoneDropdown">
                <div class="select-content">
                <!-- 显示已选标签 -->
                <div class="selected-tags">
                  <span v-for="(experiment, index) in selectedTestsDone" :key="experiment.id" class="tag">
                    {{ experiment.name }}
                    <span class="tag-remove" @click="removeTest('done', index)">×</span>
                  </span>
                </div>
                <span class="placeholder" v-if="selectedTestsDone.length === 0">选择已完成测试...</span>
                </div>
                <div class="select-arrow">▼</div>
              </div>
              
              <div class="select-options" v-if="showTestsDoneDropdown">
                <div 
                  v-for="experiment in availableTestsDone" 
                  :key="experiment.id" 
                  class="select-option"
                  :class="{is_show: experiment.is_show}"
                  @click="selectTest('done', experiment)"
                >
                  {{ experiment.id }}-{{ experiment.name }}
                </div>
                <div v-if="availableTestsDone.length === 0" class="select-option disabled">
                  没有可选的测试
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 计划进行测试 -->
        <div class="form-group">
          <div class="n-form-item-label">计划进行测试</div>
          <div class="tags-input-container">
            <!-- 下拉选择框 -->
            <div class="custom-select" :class="{ 'is-open': showTestsPlanDropdown }">
              <div class="select-header" @click="toggleTestsPlanDropdown">
                <div class="select-content">
                <!-- 显示已选标签 -->
                <div class="selected-tags">
                  <span v-for="(experiment, index) in selectedTestsPlanned" :key="experiment.id" class="tag">
                    {{ experiment.name }}
                    <span class="tag-remove" @click="removeTest('plan', index)">×</span>
                  </span>
                </div>
                <span class="placeholder" v-if="selectedTestsPlanned.length === 0">选择计划测试...</span>                
                </div>
                <div class="select-arrow">▼</div>
              </div>
              
              <div class="select-options" v-if="showTestsPlanDropdown">
                <div 
                  v-for="experiment in availableTestsPlan" 
                  :key="experiment.id" 
                  class="select-option"
                  :class="{is_show: experiment.is_show}"
                  @click="selectTest('plan', experiment)"
                >
                  {{ experiment.id }}-{{ experiment.name }}
                </div>
                <div v-if="availableTestsPlan.length === 0" class="select-option disabled">
                  没有可选的测试
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 笼位选择 -->
        <div class="form-group">
          <div class="n-form-item-label">笼位名称</div>
          <div class="autocomplete">
            <n-input
              v-model:value="cageQuery"
              @input="searchCage()"
              placeholder="输入笼位名称搜索..."
              @focus="showCageSuggestions = true"
              @blur="onBlur"
              clearable
            />
            <ul v-if="showCageSuggestions && cageSuggestions.length" class="suggestions">
              <li
                v-for="cage in cageSuggestions"
                :key="cage.id"
                @click="selectCage(cage)"
              >
                {{ cage.cage_id }} - {{ cage.section }}
              </li>
            </ul>
          </div>
        </div>
        </div>
        <n-space justify="end" class="button-group">
          <n-button @click="saveMouse" :disabled="saving" type="primary">
            <AppIcon  :name="modalMode === 'add' ? 'add' : 'save'" />
            <span v-if="saving">{{ modalMode === 'add' ? '添加中...' : '保存中...' }}</span>
            <span v-else>{{ modalMode === 'add' ? '添加' : '保存' }}</span>
          </n-button>
          <n-button @click="closeModal" secondary>
            <AppIcon  name="cancel" />
            取消
          </n-button>
        </n-space>
      </n-card>
    </n-modal>

    <!-- 批量添加小鼠模态框 -->
    <n-modal v-model:show="showModal" v-if="modalMode === 'template' && templateMouse" :mask-closable="false">
      <n-card class="modal-content" :bordered="false" role="dialog" aria-modal="true">
        <n-space justify="space-between" align="center" class="modal-header">
          <h3>基于模板批量创建小鼠</h3>
          <n-button class="close-btn" quaternary circle @click="closeModal">
            <AppIcon  name="close" />
          </n-button>
        </n-space>
        <div class="form-body">
        <div class="template-info">
          <h3><AppIcon  name="pets" /> 模板小鼠信息</h3>
          <div class="template-details">
            <div class="detail-item">
              <span class="detail-label">小鼠ID</span>
              <span class="detail-value">{{ templateMouse.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">基因型</span>
              <span class="detail-value" v-html="templateMouse.genotype.symbol"></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">品系</span>
              <span class="detail-value">{{ templateMouse.strain }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">性别</span>
              <span class="mouse-sex" :class="templateMouse.sex === 'F' ? 'sex-female' : 'sex-male'">
                {{ templateMouse.sex === 'F' ? '♀' : '♂' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">出生日期</span>
              <span class="detail-value">{{ formatDate(templateMouse.birth_date) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">存活状态</span>
              <span class="detail-value">
                {{ 
                  templateMouse.live_status === 0 ? '死亡' : 
                  templateMouse.live_status === 1 ? '存活' : 
                  templateMouse.live_status === 2 ? '解剖' : 
                  templateMouse.live_status === 3 ? '意外消失' : 
                  templateMouse.live_status === 4 ? '丢弃' : 
                  '未知状态' 
                }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">笼位</span>
              <span class="detail-value">{{ templateMouse.cage }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">父本</span>
              <span class="detail-value" v-for="father in selectedFathers" :key="father.tid">{{ father.id }} </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">母本</span>
              <span class="detail-value" v-for="mother in selectedMothers" :key="mother.tid">{{ mother.id }} </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">已完成测试</span>
              <span class="detail-value" v-for="(test_done) in templateMouse.tests_done" :key="tests_done">{{ experiments.find(e => e.id === test_done).name }} </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">计划测试</span>
              <span class="detail-value" v-for="(test_planned) in templateMouse.tests_planned" :key="tests_planned">{{ experiments.find(e => e.id === test_planned).name }} </span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <span style="margin-right: 20px;">创建数量：{{ newMice.length }}</span>
          <n-button @click="addInputField" quaternary circle>
            <AppIcon  name="add" />
          </n-button>
        </div>
        <div v-for="(m, index) in newMice" :key="index" class="input-row">
          <n-input v-model:value="m.id" placeholder="ID" />
          <n-select
            v-model:value="m.sex"
            :options="[
              { label: '雄性', value: 'M' },
              { label: '雌性', value: 'F' }
            ]"
          />
          <n-button attr-type="button" class="remove-btn" tertiary type="error" @click="removeField(index)">移除</n-button>
        </div>
        </div>
        <n-space justify="end" class="button-group">
          <n-button @click="saveTemplateMice" :disabled="saving" type="primary">
            <AppIcon  name="save" />
            <span v-if="saving">保存中...</span>
            <span v-else>保存</span>
          </n-button>
          <n-button @click="closeModal" secondary>
            <AppIcon  name="cancel" />
            取消
          </n-button>
        </n-space>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { h, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import api from '@/utils/api'
import { formatDate, renderEmpty, normalizeDateValue } from '@/utils/format'
import { fuzzySearch } from '@/utils/search'
import MouseDetailModal from './MouseDetailView.vue'
import { useGeneStore, useCageStore, useExperimentStore, useSettingStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useDialog, useMessage } from 'naive-ui'

const geneStore = useGeneStore()
const { mice, loading, genotypes, selectedGenes, alleleSuggestions } = storeToRefs(geneStore)
const { loadMice, onFormLocusChange, onFormAlleleChange, deleteGene, addGene, deleteGenes } = geneStore

const cageStore = useCageStore()
const { cages, locations } = storeToRefs(cageStore)
const { fetchCages } = cageStore

const experimentStore = useExperimentStore()
const { experiments } = storeToRefs(experimentStore)

const settingStore = useSettingStore()
const dialog = useDialog()
const message = useMessage()
const {showColumns} = storeToRefs(settingStore)


// 响应式数据
const filteredMice = ref([])
const searchTerm = ref('')
const saving = ref(false)
const showMouseDetail = ref(false)
const selectedMouseId = ref(null)
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  mouse: null
})

// Naive UI原生选择功能
const dataTableRef = ref(null)
const checkedRowKeys = ref([])
const batchSelectedTests = ref([])

// 处理选择变化
const handleCheckedRowKeysChange = (keys) => {
  checkedRowKeys.value = keys
}

// 模态框相关
const showModal = ref(false)
const modalMode = ref('') // 'add', 'edit', 'template'
const templateMouse = ref(null)
const newMice = ref([])
const locationCages = computed(() => {
  if (!filters.location) return cages.value
  return cages.value.filter(cage => cage.section === filters.location)
})
const mouseCageMap = computed(() => {
  const map = new Map()
  // 预先构建老鼠ID到笼子的反向映射
  const cageByMouseId = new Map()
  // 只遍历一次笼子数组
  cages.value.forEach(cage => {
    cage.mice.forEach(mouse => {
      cageByMouseId.set(mouse.tid, cage)
    })
  })
  // 然后构建结果
  mice.value.forEach(mouse => {
    const cage = cageByMouseId.get(mouse.tid)
    if (cage) {
      map.set(mouse.tid, [cage.id, cage.section, cage.section+'-'+cage.cage_id])
    } else {
      map.set(mouse.tid, null)
    }
  })
  return map
})

// normalizeDateValue 已从 @/utils/format 导入

// Naive UI原生排序状态
const sorterState = ref({
  columnKey: 'birth_date',
  order: 'descend'
})

const handleSorterChange = (sorter) => {
  sorterState.value = sorter
  if (sorter.columnKey) {
    sortField.value = sorter.columnKey
    sortDirection.value = sorter.order === 'ascend' ? 'asc' : 'desc'
  } else {
    sortField.value = 'birth_date'
    sortDirection.value = 'desc'
  }
  applyFilters()
}

const formatLiveStatus = (status) => {
  return status === 0 ? '死亡' :
    status === 1 ? '存活' :
    status === 2 ? '解剖' :
    status === 3 ? '意外消失' :
    status === 4 ? '丢弃' :
    '未知状态'
}

// renderEmpty 已从 @/utils/format 导入

const miceColumns = computed(() => {
  const columns = [
    // 添加选择列
    {
      type: 'selection',
      disabled: () => false,
      options: ['all', 'none', 'page']
    }
  ]
  if (showColumns.value.id) {
    columns.push({ 
      title: '小鼠ID', 
      key: 'id',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'id' ? sorterState.value.order : false
    })
  }
  if (showColumns.value.genotype) {
    columns.push({
      title: '基因型',
      key: 'genotype',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'genotype' ? sorterState.value.order : false,
      render: (row) => h('span', { innerHTML: row.genotype?.symbol || '-' })
    })
  }
  if (showColumns.value.strain) {
    columns.push({ 
      title: '品系', 
      key: 'strain',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'strain' ? sorterState.value.order : false,
      render: (row) => renderEmpty(row.strain)
    })
  }
  if (showColumns.value.sex) {
    columns.push({
      title: '性别',
      key: 'sex',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'sex' ? sorterState.value.order : false,
      render: (row) => h('div', {
        class: ['mouse-sex', row.sex === 'F' ? 'sex-female' : 'sex-male']
      }, row.sex === 'F' ? '♀' : '♂')
    })
  }
  if (showColumns.value.birth_date) {
    columns.push({ 
      title: '出生日期', 
      key: 'birth_date',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'birth_date' ? sorterState.value.order : false,
      className: 'col-align-right',
      render: (row) => renderEmpty(row.birth_date)
    })
  }
  if (showColumns.value.death_date) {
    columns.push({ 
      title: '死亡日期', 
      key: 'death_date',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'death_date' ? sorterState.value.order : false,
      className: 'col-align-right',
      render: (row) => renderEmpty(row.death_date)
    })
  }
  if (showColumns.value.days_old) {
    columns.push({ 
      title: '日龄', 
      key: 'days_old',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'days_old' ? sorterState.value.order : false,
      className: 'col-align-center',
      render: (row) => row.days_old != null ? `${row.days_old}天` : '-'
    })
  }
  if (showColumns.value.weeks_old) {
    columns.push({ 
      title: '周龄', 
      key: 'weeks_old',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'weeks_old' ? sorterState.value.order : false,
      className: 'col-align-center',
      render: (row) => row.weeks_old != null ? `${row.weeks_old}周` : '-'
    })
  }
  if (showColumns.value.live_status) {
    columns.push({
      title: '存活状态',
      key: 'live_status',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'live_status' ? sorterState.value.order : false,
      render: (row) => formatLiveStatus(row.live_status)
    })
  }
  if (showColumns.value.cage) {
    columns.push({
      title: '笼位',
      key: 'cage',
      sorter: true,
      sortOrder: sorterState.value.columnKey === 'cage' ? sorterState.value.order : false,
      render: (row) => (mouseCageMap.value.get(row.tid) ? mouseCageMap.value.get(row.tid)[2] : '-')
    })
  }
  if (showColumns.value.tests_planned) {
    columns.push({
      title: '计划实验',
      key: 'tests_planned',
      render: (row) => (row.tests_planned?.length > 0 ? row.tests_planned.join(', ') : '-')
    })
  }
  if (showColumns.value.tests_done) {
    columns.push({
      title: '完成实验',
      key: 'tests_done',
      render: (row) => (row.tests_done?.length > 0 ? row.tests_done.join(', ') : '-')
    })
  }
  return columns
})

// rowClassName 已移除（始终返回空字符串）

const rowProps = (row, index) => ({
  onDblclick: () => openMouseDetail(row.tid),
  onContextmenu: (event) => {
    event.preventDefault()
    showContextMenu(event, row)
  }
})

// 表单数据
const formData = reactive({
  id: '',
  genotype: {},
  sex: 'M',
  birth_date: null,
  death_date: null,
  days_old: null,
  weeks_old: null,
  father: [],
  mother: [],
  live_status: null,
  strain: '',
  tests_done: [],
  tests_planned: [],
  cage_id: null
})

// 筛选和排序
const sortField = ref('birth_date')
const sortDirection = ref('desc')
const filters = reactive({
  id: '',
  genotypeLocus: '',
  genotypeAllele: '',
  genotypeHomo: '',
  strain: '',
  sex: '',
  birth_date: null,
  death_date: null,
  days_old_min: null,
  days_old_max: null,
  weeks_old_min: null,
  weeks_old_max: null,
  live_status: 1,
  tests_done: null,
  tests_planned: null,
  location: '',
  cage:null
})
const filteredAlleles = ref([])

// 父本母本选择
const fatherQuery = ref('')
const motherQuery = ref('')
const showFatherSuggestions = ref(false)
const showMotherSuggestions = ref(false)
const selectedFathers = ref([])
const selectedMothers = ref([])

// 控制下拉框显示
const showTestsDoneDropdown = ref(false)
const showTestsPlanDropdown = ref(false)

const selectedTestsDone = ref([])
const selectedTestsPlanned = ref([])

const cageQuery = ref('')
const showCageSuggestions = ref(false)
const cageSuggestions = ref([])

// 计算可用的测试（过滤掉已选的计划测试和已完成测试）
const availableTestsPlan = computed(() => {
  return experiments.value.filter(exp => 
    !selectedTestsPlanned.value.some(selected => selected.id === exp.id) &&
    !selectedTestsDone.value.some(selected => selected.id === exp.id)
  )
})

// 计算可用的完成测试（过滤掉已选的）
const availableTestsDone = computed(() => {
  return selectedTestsPlanned.value.filter(exp => 
    !selectedTestsDone.value.some(selected => selected.id === exp.id)
  )
})

const modalTitle = computed(() => {
  switch (modalMode.value) {
    case 'add': return '添加新小鼠'
    case 'edit': return '编辑小鼠信息'
    case 'template': return '基于模板批量创建小鼠'
    default: return ''
  }
})

// 父亲建议列表
const fatherSuggestions = computed(() => {
  let candidates = mice.value.filter(mouse =>
    mouse.sex === 'M' &&
    !selectedFathers.value?.some(m => m.tid === mouse.tid)
  )
  if (modalMode.value === 'edit' && formData.tid) {
    candidates = candidates.filter(mouse => mouse.tid !== formData.tid)
  }
  return fuzzySearch(candidates, fatherQuery.value, 'id')
})

// 母亲建议列表
const motherSuggestions = computed(() => {
  let candidates = mice.value.filter(mouse =>
    mouse.sex === 'F' &&
    !selectedMothers.value?.some(m => m.tid === mouse.tid)
  )
  if (modalMode.value === 'edit' && formData.tid) {
    candidates = candidates.filter(mouse => mouse.tid !== formData.tid)
  }
  return fuzzySearch(candidates, motherQuery.value, 'id')
})

// 方法
// createAxiosInstance 已移除，使用统一的 api 实例

// sortBy / sortIconClass / sortIconName 已移除（排序由 NDataTable 原生处理）

const resetSearch = () => {
  searchTerm.value = ''
  Object.assign(filters, {
    id: '',
    genotypeLocus: '',
    genotypeAllele: '',
    genotypeHomo: '',
    strain:'',
    sex: '',
    birth_date: null,
    death_date: null,
    days_old_min: null,
    days_old_max: null,
    weeks_old_min: null,
    weeks_old_max: null,
    live_status: -1,
    tests_done: null,
    tests_planned: null,
    location: '',
    cage:null
  })
  applyFilters()
}

const onLocusChange = () => {
  // 重置下级筛选条件
  filters.genotypeAllele = '';
  filters.genotypeHomo = '';
  
  // 更新可选的等位基因列表
  if (filters.genotypeLocus) {
    filteredAlleles.value = genotypes.value.find(g => g.symbol === filters.genotypeLocus).alleles
  } else {
    filteredAlleles.value = []
  }
  applyFilters()
}

const onAlleleChange = () => {
  // 重置下级筛选条件
  filters.genotypeHomo = '';
  applyFilters()
}

const onLocationChange = () => {
  filters.cage = null
  applyFilters()
}

const applyFilters = () => {
  let result = [...mice.value]
  
  // 应用文本筛选
  if (searchTerm.value) {
    const lowerTerm = searchTerm.value.toLowerCase()
    result = result.filter(mouse => 
      (mouse.id && String(mouse.id).toLowerCase().includes(lowerTerm)) || 
      (mouse.genotype.symbol && mouse.genotype.symbol.toLowerCase().includes(lowerTerm))
    )
  }
  
  // 应用列筛选
  if (filters.id) {
    result = result.filter(m => m.id.includes(filters.id))
  }
  if (filters.genotypeLocus) {
    result = result.filter(m => m.genotype.genes.some(g => g.genotypeLocus === filters.genotypeLocus))
    if (filters.genotypeAllele) {
      result = result.filter(m => m.genotype.genes.some(g => g.genotypeAllele.includes(filters.genotypeAllele)))
      if (filters.genotypeHomo) {
        result = result.filter(m => m.genotype.genes.some(g => g.genotypeHomo === filters.genotypeHomo))
      }
    }
  }
  if (filters.strain) {
    result = result.filter(m => (m.strain || '').includes(filters.strain))
  }
  if (filters.sex) {
    result = result.filter(m => m.sex === filters.sex)
  }
  if (filters.birth_date) {
    result = result.filter(m => m.birth_date === filters.birth_date)
  }
  if (filters.death_date) {
    result = result.filter(m => m.death_date === filters.death_date)
  }
  if (filters.days_old_min) {
    result = result.filter(m => m.days_old >= filters.days_old_min)
  }
  if (filters.days_old_max) {
    result = result.filter(m => m.days_old <= filters.days_old_max)
  }
  if (filters.weeks_old_min) {
    result = result.filter(m => m.weeks_old >= filters.weeks_old_min)
  }
  if (filters.weeks_old_max) {
    result = result.filter(m => m.weeks_old <= filters.weeks_old_max)
  }
  if (filters.live_status >= 0) {
    result = result.filter(m => m.live_status === filters.live_status)
  }
  if (filters.location) {
    if (filters.location === 'unassigned') {
      // 筛选未分配笼子的老鼠
      result = result.filter(m => {
        const cageInfo = mouseCageMap.value.get(m.tid)
        return !cageInfo
      })
    } else {
      result = result.filter(m => {
        const mCage = mouseCageMap.value.get(m.tid)
        if (mCage) {
          return mCage[1] === filters.location
        }
      })
    }
  }
  if (filters.cage) {
    result = result.filter(m => {
      const mCage = mouseCageMap.value.get(m.tid)
      if (mCage) {
        return mCage[0] === filters.cage
      }
    })
  }
  if (filters.tests_done) {
    result = result.filter(m => m.tests_done.includes(filters.tests_done))
  }
  if (filters.tests_planned) {
    result = result.filter(m => m.tests_planned.includes(filters.tests_planned))
  }
  
  // 应用排序
  result.sort((a, b) => {
    let modifier = sortDirection.value === 'asc' ? 1 : -1
    
    // 处理日期排序
    if (['birth_date', 'death_date'].includes(sortField.value)) {
      const dateA = a[sortField.value] ? new Date(a[sortField.value]) : 0
      const dateB = b[sortField.value] ? new Date(b[sortField.value]) : 0
      return (dateA - dateB) * modifier
    }
    
    // 处理数字排序
    if (['days_old', 'weeks_old'].includes(sortField.value)) {
      return ((a[sortField.value] || 0) - (b[sortField.value] || 0)) * modifier
    }

    if (sortField.value === 'genotype') {
      const geneA = a['genotype']['symbol']
      const geneB = b['genotype']['symbol']
      return (geneA > geneB ? 1 : geneA < geneB ? -1 : 0) * modifier
    }

    if (sortField.value === 'cage') {
      const [cageA = null, locationA = null] = mouseCageMap.value.get(a.tid) || []
      const [cageB = null, locationB = null] = mouseCageMap.value.get(b.tid) || []
      
      // 先按location排序，再按cage排序，null值排最后
      return (
        (locationA === null ? 1 : locationB === null ? -1 : 0) ||  // null处理
        (locationA > locationB ? 1 : locationA < locationB ? -1 : 0) ||  // location比较
        (cageA === null ? 1 : cageB === null ? -1 : 0) ||  // cage null处理
        (cageA > cageB ? 1 : cageA < cageB ? -1 : 0)  // cage比较
      ) * modifier
    }
    
    // 默认排序
    if (a[sortField.value] < b[sortField.value]) return -1 * modifier
    if (a[sortField.value] > b[sortField.value]) return 1 * modifier
    return 0
  })
  filteredMice.value = result
}

// 清除选择
const clearSelection = () => {
    checkedRowKeys.value = [];
    batchSelectedTests.value = [];
}

const batchDeleteMice = async () => {
    dialog.warning({
      title: '确认批量删除',
      content: `确认要删除选中的 ${checkedRowKeys.value.length} 只小鼠吗？注意删除后，小鼠无法恢复！`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await api.delete('/mice', {params: { miceIds: checkedRowKeys.value }})
          checkedRowKeys.value.forEach(mid => {
            const index = mice.value.findIndex(m => m.tid === mid)
            if (index !== -1) {
              mice.value.splice(index, 1)
            }
          })
          await fetchCages()
          applyFilters()
          message.success(`批量删除${checkedRowKeys.value.length}只小鼠`)
        } catch (error) {
          console.error('批量删除小鼠失败:', error)
        } finally {
          clearSelection()
        }
      }
    })
}

const batchAddExperiment = async (batchTest) => {
  if (batchSelectedTests.value.length === 0) {
    message.warning('请先选择要操作的实验')
    return
  }
  dialog.warning({
    title: '确认批量修改',
    content: `确认要为选中的 ${checkedRowKeys.value.length} 只小鼠批量修改实验 ${batchTest} 吗？注意，未选择的实验会被清除！对应小鼠在其中的数据也会被清除！`,
    positiveText: '继续',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.put('/mice/experiments', {
          batchTest: batchTest,
          miceIds: checkedRowKeys.value,
          testIds: batchSelectedTests.value.map(e => e.id)
        })
        await loadMice()
        applyFilters()
        message.success("批量修改" + batchTest +"成功")
      } catch (error) {
        console.error('批量修改实验小鼠失败:', error)
      } finally {
        clearSelection()
      }
    }
  })
}

const validateMouse = (mouse) => {
  if (!mouse.id && modalMode.value === 'add') {
    message.warning('小鼠编号不能为空')
    return false
  }
  return true
}

const openModal = async (mode, mouse = null) => {
  modalMode.value = mode
  if (mouse){
    if (mouse.genotype.symbol && mouse.genotype.genes.length > 0) {
      selectedGenes.value = mouse.genotype.geneEntity
      alleleSuggestions.value = selectedGenes.value.map(sg => {
        const matchedLocus = genotypes.value.find(g => g.symbol === sg.locus)
        if (matchedLocus) {
          return [matchedLocus.alleles, matchedLocus.alleles]
        } else{
          return [[], []]
        }
      })
    }
    const mCage = mouseCageMap.value.get(mouse.tid)
    if (mCage) {
      mouse = { ...mouse, cage_id: mCage[0] }
    } else {
      mouse = { ...mouse, cage_id: null }
    }
    // 设置父本母本
    if (mouse.father && mouse.father.length > 0) {
      selectedFathers.value = mouse.father.map(tid => mice.value.find(m => m.tid === tid)).filter(Boolean)
    }
    if (mouse.mother && mouse.mother.length > 0) {
      selectedMothers.value = mouse.mother.map(tid => mice.value.find(m => m.tid === tid)).filter(Boolean)
    }
    if (mode === 'template') {
      if (mCage) {
        templateMouse.value = { ...mouse, cage: mCage[2] }
      } else {
        templateMouse.value = { ...mouse, cage: '未分配' }
      }
      newMice.value = [{ id: '', sex: mouse.sex }]
      return
    }
  }
  
  showModal.value = true
  
  // 重置表单数据
  Object.assign(formData, {
    id: '',
    genotype: {},
    sex: 'M',
    birth_date: null,
    death_date: null,
    days_old: null,
    weeks_old: null,
    father: [],
    mother: [],
    live_status: null,
    strain: '',
    tests_done: [],
    tests_planned: [],
    cage_id: null
  })
  cageSuggestions.value = []
  
  if (mode === 'edit' && mouse) {
    // 填充编辑数据
    Object.assign(formData, { ...mouse })
    formData.birth_date = normalizeDateValue(formData.birth_date)
    formData.death_date = normalizeDateValue(formData.death_date)
    
    // 设置测试
    if (mouse.tests_done && mouse.tests_done.length > 0) {
      selectedTestsDone.value = mouse.tests_done.map(id => experiments.value.find(e => e.id === id)).filter(Boolean)
    }
    if (mouse.tests_planned && mouse.tests_planned.length > 0) {
      selectedTestsPlanned.value = mouse.tests_planned.map(id => experiments.value.find(e => e.id === id)).filter(Boolean)
    }

    if (mouse.cage_id) {
      const ctemp = cages.value.find(cage => cage.id === mouse.cage_id)
      cageQuery.value = `${ctemp.cage_id} - ${ctemp.section}`
    }
  }
}

const closeModal = () => {
  showModal.value = false
  modalMode.value = ''
  templateMouse.value = null
  newMice.value = []
  fatherQuery.value = ''
  motherQuery.value = ''
  alleleSuggestions.value = []
  selectedGenes.value = []
  selectedFathers.value = []
  selectedMothers.value = []
  selectedTestsDone.value = []
  selectedTestsPlanned.value = []
  cageQuery.value = ''
  formData.birth_date = null
  formData.death_date = null
}

const saveMouse = async () => {
  if (!validateMouse(formData)) return
  
  if (selectedGenes.value.length > 1 && selectedGenes.value.some(g => g.locus === "WT")) {
    message.error("野生型不能添加基因型")
    return
  }

  let existingLocus = []
  // 检查必填字段
  for (const gene of selectedGenes.value) {
    if (existingLocus.includes(gene.locus)) {
      message.error(`基因位点 ${gene.locus} 出现重复`)
      return false
    } else {
      existingLocus.push(gene.locus)
    }
    if (gene.locus && gene.locus !== "WT") {
      if (!gene.allele1 || !gene.allele2) {
        message.error(`基因 ${gene.locus} 的等位基因必须完整`)
        return false
      }
    }
  }
  // 准备提交数据
  const submitData = {
    ...formData,
    genotype: selectedGenes.value,
    father: selectedFathers.value.map(t => t.tid),
    mother: selectedMothers.value.map(t => t.tid),
    tests_done: selectedTestsDone.value.map(e => e.id),
    tests_planned: selectedTestsPlanned.value.map(e => e.id)
  }
  
  saving.value = true
  try {
    
    if (modalMode.value === 'add') {
      const response = await api.post('/mice', submitData)
      mice.value.push(response.data)
      message.success(`小鼠 ${submitData.id} 添加成功！`)
    } else if (modalMode.value === 'edit') {
      await api.put(`/mice/${formData.tid}`, submitData)
      await loadMice()
      message.success(`小鼠 ${formData.id} 信息已更新！`)
    }
    applyFilters()
    closeModal()
    fetchCages()
  } catch (error) {
    console.error('保存小鼠失败:', error)
    
    if (error.response) {
      if (error.response.status === 400) {
        message.error(`请求格式错误: ${error.response.data.error || '请检查输入数据'}`)
      } else if (error.response.status === 500) {
        message.error('服务器内部错误，请稍后再试')
      } else {
        message.error(`保存失败: ${error.response.data.error || '未知错误'}`)
      }
    } else {
      message.error(`保存失败: ${error.message || '网络错误'}`)
    }
  } finally {
    saving.value = false
  }
}

const openMouseDetail = (mouseId) => {
  selectedMouseId.value = mouseId
  showMouseDetail.value = true
  closeContextMenu()
}

const deleteMouse = async (mouseId) => {
  try {
    await api.delete(`/mice/${mouseId}`)
    
    // 更新本地数据
    const index = mice.value.findIndex(m => m.tid === mouseId)
    if (index !== -1) {
      message.success(`小鼠 ${mice.value[index].id} 已删除！`)
      mice.value.splice(index, 1)
      applyFilters()
    }
    const cageIndex = cages.value.findIndex(c => c.mice.some(m => m.tid === mouseId))
    if (cageIndex !== -1) {
      const cage = cages.value[cageIndex]
      cage.mice = cage.mice.filter(m => m.tid !== mouseId)
    }
    closeContextMenu()
  } catch (error) {
    console.error('删除小鼠失败:', error)
    
    if (error.response) {
      if (error.response.status === 404) {
        message.error('未找到该小鼠记录')
      } else {
        message.error(`删除失败: ${error.response.data.error || '服务器错误'}`)
      }
    } else {
      message.error(`删除失败: ${error.message || '网络错误'}`)
    }
  }
}

const showContextMenu = (event, mouse) => {
  contextMenu.visible = true
  contextMenu.mouse = mouse
  contextMenu.x = event.pageX
  contextMenu.y = event.pageY
  
  // 在下一个tick中获取实际菜单尺寸并调整位置
  nextTick(() => {
    const menu = document.querySelector('.context-menu')
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // 垂直方向避让
      if (event.pageY + rect.height > viewportHeight) {
        contextMenu.y = event.pageY - rect.height
      }
      
      // 水平方向避让
      if (event.pageX + rect.width > viewportWidth) {
        contextMenu.x = event.pageX - rect.width
      }
    }
  })
}

const closeContextMenu = () => {
  contextMenu.visible = false
}

const selectParent = (type, mouse) => {
  if (type === 'father') {
    selectedFathers.value.push(mouse)
    fatherQuery.value = ''
    showFatherSuggestions.value = false
  } else {
    selectedMothers.value.push(mouse)
    motherQuery.value = ''
    showMotherSuggestions.value = false
  }
}

const removeParent = (type, index) => {
  if (type === 'father') selectedFathers.value.splice(index, 1)
  else selectedMothers.value.splice(index, 1)
}

// 切换下拉框显示
const toggleTestsDoneDropdown = () => {
  showTestsDoneDropdown.value = !showTestsDoneDropdown.value
}
const toggleTestsPlanDropdown = () => {
  showTestsPlanDropdown.value = !showTestsPlanDropdown.value
}


const selectTest = (type, experiment) => {
  if (type === 'done') {
    selectedTestsDone.value.push(experiment)
    const index = selectedTestsPlanned.value.findIndex(p => p.id === experiment.id)
    if (index !== -1) {
      selectedTestsPlanned.value.splice(index, 1)
    }
    showTestsDoneDropdown.value = false
  } else if (type === 'plan') {
    selectedTestsPlanned.value.push(experiment)
    const index = selectedTestsDone.value.findIndex(p => p.id === experiment.id)
    if (index !== -1) {
      selectedTestsDone.value.splice(index, 1)
    }
    showTestsPlanDropdown.value = false
  } else if (type === 'batch') {
    const index = batchSelectedTests.value.findIndex(p => p.id === experiment.id)
    if (index !== -1) {
      message.info("请勿选择重复实验")
      return
    }
    batchSelectedTests.value.push(experiment)
    showTestsDoneDropdown.value = false
  }
}

// 监听selectedTestsDone的变化，确保与selectedTestsPlanned互斥
watch(selectedTestsDone, (newTestsDone) => {
  // 从计划测试中移除所有已完成的测试
  selectedTestsPlanned.value = selectedTestsPlanned.value.filter(
    plannedTest => !newTestsDone.some(doneTest => doneTest.id === plannedTest.id)
  )
})

const removeTest = (type, index) => {
  if (type === 'done') {selectedTestsDone.value.splice(index, 1)}
  else if (type === 'plan') {selectedTestsPlanned.value.splice(index, 1)}
  else if (type === 'batch') {batchSelectedTests.value.splice(index, 1)}
}

const searchCage = () => {
  formData.cage_id = null
  const thisQuery = cageQuery.value.split(" - ")[0]
  cageSuggestions.value = fuzzySearch(cages.value, thisQuery, 'cage_id')
}

const selectCage = (cage) => {
  formData.cage_id = cage.id
  cageQuery.value = `${cage.cage_id} - ${cage.section}`
  showCageSuggestions.value = false
}

// 点击外部关闭下拉框
const handleClickOutside = (event) => {
  if (!event.target.closest('.custom-select')) {
    showTestsDoneDropdown.value = false
    showTestsPlanDropdown.value = false
  }
}

const onBlur = () => {
  setTimeout(() => {
    showFatherSuggestions.value = false
    showMotherSuggestions.value = false
    showCageSuggestions.value = false
  }, 200)
}

// formatDate 已从 @/utils/format 导入

const addInputField = () => {
  newMice.value.push({ id: '', sex: templateMouse.value.sex })
}

const removeField = (index) => {
  newMice.value.splice(index, 1)
}

const saveTemplateMice = async () => {
  // 检查是否存在ID为空的小鼠
  const hasEmptyId = newMice.value.some(mouse => {
    return mouse.id === null || mouse.id === undefined || mouse.id === ''
  })

  if (hasEmptyId) {
    message.error("存在ID为空的小鼠")
    return
  }
  
  saving.value = true
  try {
    await api.post(`/mice/${templateMouse.value.tid}`, newMice.value)
    
    message.success(`按模板添加${newMice.value.length}只小鼠！`)
    await loadMice()
    applyFilters()
    if (templateMouse.value.cage_id) {
      closeModal()
      fetchCages()
    } else {
      closeModal()
    }
  } catch (error) {
    console.error('批量添加小鼠失败:', error)
    
    if (error.response) {
      if (error.response.status === 404) {
        message.error('未找到该小鼠记录')
      } else if (error.response.status === 400) {
        message.error(`请求格式错误: ${error.response.data.error || '请检查输入数据'}`)
      } else {
        message.error(`添加失败: ${error.response.data.error || '服务器错误'}`)
      }
    } else {
      message.error(`添加失败: ${error.message || '网络错误'}`)
    }
  } finally {
    saving.value = false
  }
}

// 监听器
watch(searchTerm, (newVal) => {
  if (!newVal) applyFilters()
})

// 生命周期
onMounted(async () => {
  applyFilters()
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.section {
  margin-bottom: 30px;
  padding: 25px;
  background: var(--n-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--n-text-color) 5%, transparent);
  position: relative;
  overflow: hidden;
}

/* 顶部统计与操作区 */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.header-left h2 {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--n-text-color-1);
  margin: 0;
}

.stats-text {
  font-size: 0.9rem;
  color: var(--n-text-color-3);
}

.stats-text strong {
  color: var(--n-text-color-1);
  font-weight: 600;
}

/* 筛选区样式 */
.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--n-color-embedded);
  border-radius: 10px;
  border: 1px solid var(--n-border-color);
}

.filter-row {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

/* 核心搜索行 */
.filter-row-search {
  grid-template-columns: auto 1fr auto auto;
}

.search-input {
  min-width: 200px;
}

/* 基础属性行 */
.filter-row-basic {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.filter-item {
  min-width: 0;
}

.filter-item-genotype {
  display: contents;
}

/* 时间与年龄行 */
.filter-row-time {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.range-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-item :deep(.n-input-number) {
  flex: 1;
}

.range-separator {
  color: var(--n-text-color-3);
  flex-shrink: 0;
}

.filter-item-location {
  display: contents;
}

/* 表格样式 */
.table-scroll {
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color);
}

.table-scroll :deep(.n-data-table) {
  min-width: 1200px;
  font-size: 0.9rem;
}

.table-scroll :deep(.n-data-table-th) {
  user-select: none;
  font-weight: 600;
}

/* 表格列对齐 */
.table-scroll :deep(.col-align-right) {
  text-align: right;
}

.table-scroll :deep(.col-align-center) {
  text-align: center;
}

.table-scroll :deep(.col-align-right .n-data-table-td-text),
.table-scroll :deep(.col-align-center .n-data-table-td-text) {
  display: block;
  text-align: inherit;
}

/* 空数据占位符样式 */
.table-scroll :deep(td) {
  color: var(--n-text-color-1);
}

.table-scroll :deep(td:has(span:only-child:not(.mouse-sex))) {
  white-space: nowrap;
}

/* 选中行样式 */
:deep(.n-data-table-tr.selected > td) {
  background-color: var(--n-info-color-suppl);
}

:deep(.n-data-table-tr.selected-multiple > td) {
  background-color: var(--n-info-color-suppl);
}

:deep(.n-data-table-tr.selected:hover > td) {
  background-color: color-mix(in srgb, var(--n-info-color) 35%, var(--n-color));
}

:deep(.n-data-table-tr.selected-multiple:hover > td) {
  background-color: color-mix(in srgb, var(--n-info-color) 30%, var(--n-color));
}

.modal-content {
  background: var(--n-color);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: 0 10px 25px color-mix(in srgb, var(--n-text-color) 20%, transparent);
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow: hidden; 
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0; /* 防止头部被压缩 */
  padding: 20px;
  border-bottom: 1px solid var(--n-border-color); /* 可选：添加分隔线 */
  background: var(--n-color); /* 确保背景色一致 */
  position: sticky; /* 粘性定位 */
  top: 0; /* 粘在顶部 */
  z-index: 11;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
}

.close-btn {
  flex-shrink: 0;
}

.form-body {
  overflow-y: auto;
  padding: 20px;
  flex-grow: 1;
}

.form-group {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--n-border-color);
  flex-shrink: 0;
  background: var(--n-color);
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--n-color) 80%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  border: 4px solid color-mix(in srgb, var(--n-text-color) 10%, transparent);
  border-left-color: var(--n-primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  color: var(--n-text-color-3);
}

.empty-state .n-icon {
  font-size: 60px;
  color: var(--n-border-color);
  margin-bottom: 15px;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 20px;
}

.empty-state button {
  padding: 10px 20px;
  background: var(--n-primary-color);
  color: var(--n-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.context-menu {
  position: fixed;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--n-text-color) 10%, transparent);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  /* 确保菜单不会超出视口 */
  max-width: 100vw;
  max-height: 100vh;
}

.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 5px 0;
  min-width: 150px;
}

.context-menu li {
  padding: 8px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu li:hover {
  background-color: var(--n-hover-color);
}

.context-menu li.danger {
  color: var(--n-error-color);
}

.context-menu li i {
  font-size: 18px;
}

/* 父本母本选择样式 */
.autocomplete {
  position: relative;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 6px color-mix(in srgb, var(--n-text-color) 10%, transparent);
}

.suggestions li {
  padding: 10px;
  cursor: pointer;
}

.suggestions li:hover {
  background-color: var(--n-info-color-suppl);
}

.selected-parents {
  margin-top: 10px;
}

.selected-parent {
  background: var(--n-info-color-suppl);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--n-error-color);
  cursor: pointer;
  padding: 4px;
}

.remove-btn:hover {
  color: var(--n-error-color-hover);
}

.info-text {
  color: var(--n-text-color-3);
  font-size: 0.9rem;
  margin: 5px 0 0;
}

.template-info {
  background: var(--n-color-embedded);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid var(--n-primary-color);
}

.template-info h3 {
  font-size: 1.1rem;
  color: var(--n-text-color-2);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 0.85rem;
  color: var(--n-text-color-3);
  margin-bottom: 3px;
}

.detail-value {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--n-text-color-1);
}

.input-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.input-row input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  font-size: 1rem;
}

.tags-input-container {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  padding: 8px;
  background: var(--n-color);
  min-height: 42px;
}

.select-content {
  flex-grow: 1;
  margin-right: 8px;
  overflow-x: auto;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background-color: var(--n-info-color-suppl);
  border: 1px solid var(--n-info-color-suppl);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 14px;
  color: var(--n-primary-color);
}

.tag-remove {
  margin-left: 6px;
  cursor: pointer;
  font-weight: bold;
  color: var(--n-primary-color);
}

.tag-remove:hover {
  color: var(--n-error-color);
}

.custom-select {
  position: relative;
}

.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  cursor: pointer;
  background: var(--n-color);
  min-height: 42px;
}

.select-header:hover {
  border-color: var(--n-text-color-disabled);
}

.placeholder {
  color: var(--n-text-color-disabled);
}

.select-arrow {
  transition: transform 0.3s;
  flex-shrink: 0;
}

.is-open .select-arrow {
  transform: rotate(180deg);
}

.select-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--n-text-color) 10%, transparent);
}

.select-option {
  padding: 8px 12px;
  cursor: pointer;
}

.select-option:hover {
  background-color: var(--n-hover-color);
}

.select-option.disabled {
  color: var(--n-text-color-disabled);
  cursor: not-allowed;
}

.select-option.disabled:hover {
  background-color: transparent;
}

.select-option.is_show {
  background-color: var(--n-warning-color-suppl);
}

/* 批量操作栏样式 */
.batch-actions {
  margin: 16px 0;
  padding: 16px;
  background-color: var(--n-info-color-suppl);
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--n-info-color) 30%, transparent);
}

.batch-info {
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: var(--n-text-color-2);
}

.batch-info strong {
  color: var(--n-info-color);
  font-size: 1.1rem;
}

.batch-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.batch-buttons .custom-select {
  flex: 1 1 260px;
  min-width: 200px;
  max-width: 400px;
}

.mouse-sex {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 12px;
  color: var(--n-color);
  font-weight: bold;
  flex-shrink: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.sex-female {
  background-color: var(--n-error-color);
}

.sex-male {
  background-color: var(--n-info-color);
}

.custom-select {
  flex: 1 1 260px;
  min-width: 240px;
}

@media (max-width: 992px) {
  .batch-actions {
    padding: 12px;
  }
  
  .batch-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .batch-buttons .custom-select {
    max-width: none;
  }
}

@media (max-width: 992px) {
  .filter-row-search {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-row-basic,
  .filter-row-time {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .section {
    padding: 16px;
  }

  .header-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-row-search {
    grid-template-columns: 1fr;
  }

  .filter-row-basic,
  .filter-row-time {
    grid-template-columns: 1fr;
  }

  .filter-item-genotype,
  .filter-item-location {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .range-item {
    flex-wrap: wrap;
  }

  .table-scroll :deep(.n-data-table) {
    min-width: 1040px;
  }
}
</style>