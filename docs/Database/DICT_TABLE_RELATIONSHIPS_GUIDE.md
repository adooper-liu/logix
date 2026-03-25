# 数据库字典表关系与建表顺序指南

## 📚 目录

1. [字典表概览](#字典表概览)
2. [外键依赖关系图](#外键依赖关系图)
3. [建表先后逻辑](#建表先后逻辑)
4. [数据录入顺序](#数据录入顺序)
5. [前端下拉框关联规则](#前端下拉框关联规则)
6. [完整的数据流示例](#完整的数据流示例)

---

## 🎯 字典表概览

### 核心字典表（16 个）

| 序号 | 表名 | 中文名 | 主键 | 用途 |
|------|------|--------|------|------|
| 1 | `dict_countries` | 国家表 | `code` | ISO 国家代码 |
| 2 | `dict_customer_types` | 客户类型表 | `type_code` | 客户分类 |
| 3 | `dict_container_types` | 箱型表 | `type_code` | 集装箱类型 |
| 4 | `dict_overseas_companies` | 海外分公司表 | `company_code` | 海外分公司 |
| 5 | `dict_customs_brokers` | 报关行表 | `broker_code` | 报关服务商 |
| 6 | `dict_freight_forwarders` | 货代表 | `forwarder_code` | 货运代理 |
| 7 | `dict_shipping_companies` | 船公司表 | `company_code` | 航运公司 |
| 8 | `dict_ports` | 港口表 | `port_code` | UN/LOCODE 港口 |
| 9 | `dict_warehouses` | 仓库表 | `warehouse_code` | 海外仓库 |
| 10 | `dict_trucking_companies` | 车队表 | `company_code` | 卡车运输公司 |
| 11 | `dict_yards` | 堆场表 | `yard_code` | 集装箱堆场 |
| 12 | `dict_scheduling_config` | 排产配置表 | - | 智能排产参数 |
| 13 | `dict_trucking_port_mapping` | 港口 - 车队映射 | 复合主键 | 港口与车队的关联 |
| 14 | `dict_warehouse_trucking_mapping` | 仓库 - 车队映射 | 复合主键 | 仓库与车队的关联 |
| 15 | `dict_port_warehouse_mapping` | 港口 - 仓库映射 | 复合主键 | 港口与仓库的关联 |
| 16 | `dict_universal_mapping` | 通用映射表 | - | 万能映射关系 |

---

## 🔗 外键依赖关系图

### Level 1 - 基础表（无外键依赖）

这些表是**最底层的基础数据**，可以独立创建：

```sql
-- ✅ 第 1 级：完全独立的表
dict_countries              -- 国家（被 6 个表引用）
dict_customer_types         -- 客户类型（被 1 个表引用）
dict_container_types        -- 箱型（被 1 个表引用）
```

### Level 2 - 初级表（仅依赖 Level 1）

```sql
-- ✅ 第 2 级：只依赖 Level 1
dict_overseas_companies     -- 海外分公司 → dict_countries.country
dict_customs_brokers        -- 报关行 → dict_countries.country
dict_freight_forwarders     -- 货代 → (可选)
dict_shipping_companies     -- 船公司 → (可选)
dict_ports                  -- 港口 → dict_countries.country
dict_warehouses             -- 仓库 → dict_overseas_companies.company_code
dict_trucking_companies     -- 车队 → dict_countries.country
dict_yards                  -- 堆场 → (可选)
```

### Level 3 - 中级表（依赖 Level 1 + Level 2）

```sql
-- ✅ 第 3 级：依赖 Level 1 和 Level 2
dict_trucking_port_mapping        -- 港口 - 车队映射 
                                   → dict_trucking_companies.company_code
                                   → dict_ports.port_code (可选)
                                   → dict_countries.country

dict_warehouse_trucking_mapping   -- 仓库 - 车队映射
                                   → dict_trucking_companies.company_code
                                   → dict_warehouses.warehouse_code
                                   → dict_countries.country

dict_port_warehouse_mapping       -- 港口 - 仓库映射
                                   → dict_ports.port_code
                                   → dict_warehouses.warehouse_code
```

### Level 4 - 业务表（依赖所有字典表）

```sql
-- ✅ 第 4 级：业务表，依赖上述所有表
biz_customers                     -- 客户
                                   → dict_countries.country
                                   → dict_customer_types.type_code
                                   → dict_overseas_companies.company_code

biz_containers                    -- 货柜
                                   → dict_container_types.type_code
                                   → process_sea_freight.bill_of_lading_number

biz_replenishment_orders          -- 补货订单
                                   → biz_containers.container_number
                                   → biz_customers.customer_code

process_sea_freight               -- 海运主表
                                   → dict_ports.port_code (装货港、卸货港、中转港)
                                   → dict_shipping_companies.company_code
                                   → dict_freight_forwarders.forwarder_code

process_trucking_transport        -- 卡车运输
                                   → dict_trucking_companies.company_code
                                   → biz_containers.container_number

process_warehouse_operations      -- 仓库操作
                                   → dict_warehouses.warehouse_code
                                   → biz_containers.container_number

process_port_operations           -- 港口操作
                                   → dict_ports.port_code
                                   → dict_customs_brokers.broker_code
                                   → biz_containers.container_number
```

---

## 📋 建表先后逻辑

### 阶段一：基础架构表（Level 1）

**执行顺序**：
```sql
-- 1. 国家表（最基础）
CREATE TABLE dict_countries (
    code VARCHAR(50) PRIMARY KEY,
    name_cn VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    -- ... 其他字段
);

-- 2. 客户类型表
CREATE TABLE dict_customer_types (
    type_code VARCHAR(50) PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    -- ... 其他字段
);

-- 3. 箱型表
CREATE TABLE dict_container_types (
    type_code VARCHAR(50) PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    length NUMERIC,
    width NUMERIC,
    height NUMERIC,
    -- ... 其他字段
);
```

**关键点**：
- ✅ 这 3 个表**没有任何外键依赖**
- ✅ 可以**最先创建**
- ✅ 被其他表**广泛引用**

---

### 阶段二：主数据表（Level 2）

**执行顺序**：
```sql
-- 4. 海外分公司表
CREATE TABLE dict_overseas_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    country VARCHAR(50) REFERENCES dict_countries(code),
    -- ... 其他字段
);

-- 5. 报关行表
CREATE TABLE dict_customs_brokers (
    broker_code VARCHAR(50) PRIMARY KEY,
    broker_name VARCHAR(100) NOT NULL,
    country VARCHAR(50) REFERENCES dict_countries(code),
    -- ... 其他字段
);

-- 6. 港口表
CREATE TABLE dict_ports (
    port_code VARCHAR(50) PRIMARY KEY,
    port_name VARCHAR(50) NOT NULL,
    port_name_en VARCHAR(100),
    country VARCHAR(50) REFERENCES dict_countries(code),
    -- ... 其他字段
);

-- 7. 仓库表
CREATE TABLE dict_warehouses (
    warehouse_code VARCHAR(50) PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) REFERENCES dict_overseas_companies(company_code),
    country VARCHAR(50) REFERENCES dict_countries(code),
    -- ... 其他字段
);

-- 8. 车队表
CREATE TABLE dict_trucking_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    country VARCHAR(50) REFERENCES dict_countries(code),
    daily_capacity INTEGER DEFAULT 10,
    has_yard BOOLEAN DEFAULT false,
    -- ... 其他字段
);

-- 9. 货代表（可选外键）
CREATE TABLE dict_freight_forwarders (
    forwarder_code VARCHAR(50) PRIMARY KEY,
    forwarder_name VARCHAR(100) NOT NULL,
    -- ... 其他字段
);

-- 10. 船公司表（可选外键）
CREATE TABLE dict_shipping_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    -- ... 其他字段
);

-- 11. 堆场表（可选外键）
CREATE TABLE dict_yards (
    yard_code VARCHAR(50) PRIMARY KEY,
    yard_name VARCHAR(100) NOT NULL,
    -- ... 其他字段
);
```

**关键点**：
- ✅ 依赖 **Level 1** 的表（`dict_countries`）
- ✅ 建立公司的**核心主数据**
- ✅ 为映射表提供**数据源**

---

### 阶段三：映射关系表（Level 3）

**执行顺序**：
```sql
-- 12. 港口 - 车队映射
CREATE TABLE dict_trucking_port_mapping (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) REFERENCES dict_countries(code),
    port_code VARCHAR(50) REFERENCES dict_ports(port_code),
    trucking_company_id VARCHAR(50) REFERENCES dict_trucking_companies(company_code),
    yard_capacity NUMERIC(10,2),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(country, port_code, trucking_company_id)
);

-- 13. 仓库 - 车队映射
CREATE TABLE dict_warehouse_trucking_mapping (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) REFERENCES dict_countries(code),
    warehouse_code VARCHAR(50) REFERENCES dict_warehouses(warehouse_code),
    trucking_company_id VARCHAR(50) REFERENCES dict_trucking_companies(company_code),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(country, warehouse_code, trucking_company_id)
);

-- 14. 港口 - 仓库映射
CREATE TABLE dict_port_warehouse_mapping (
    id SERIAL PRIMARY KEY,
    port_code VARCHAR(50) REFERENCES dict_ports(port_code),
    warehouse_code VARCHAR(50) REFERENCES dict_warehouses(warehouse_code),
    distance_km NUMERIC(10,2),
    transit_time_days INTEGER,
    UNIQUE(port_code, warehouse_code)
);
```

**关键点**：
- ✅ 依赖 **Level 1 + Level 2** 的所有表
- ✅ 建立**多对多关系**
- ✅ 支持**智能排产算法**

---

### 阶段四：业务表（Level 4+）

**业务表不在此详述**，但它们依赖所有字典表。

---

## 📝 数据录入顺序

### 手工建基础数据的正确顺序

#### 第 1 步：录入国家（dict_countries）

```
必须第一个录入！所有其他国家代码都依赖它。

示例数据：
code | name_cn | name_en     | continent
-----|---------|-------------|----------
CN   | 中国    | China       | 亚洲
US   | 美国    | United States| 北美洲
GB   | 英国    | United Kingdom| 欧洲
DE   | 德国    | Germany     | 欧洲
```

**前端实现**：
```vue
<!-- 国家选择器 - 所有涉及国家的字段都从这里获取 -->
<a-select v-model="formData.country">
  <a-select-option 
    v-for="country in countries" 
    :key="country.code" 
    :value="country.code">
    {{ country.name_cn }} ({{ country.code }})
  </a-select-option>
</a-select>
```

---

#### 第 2 步：录入海外分公司（dict_overseas_companies）

```
依赖：dict_countries

示例数据：
company_code                      | company_name      | country
----------------------------------|-------------------|--------
AOSOM_CANADA_INC                  | Aosom Canada Inc. | CA
AOSOM_ITALY_SRL                   | Aosom Italy SRL   | IT
MH_STAR_UK_LTD                    | MH Star UK Ltd    | GB
```

**前端实现**：
```vue
<!-- 分公司选择器 -->
<a-select v-model="formData.overseasCompanyCode">
  <a-select-option 
    v-for="company in overseasCompanies" 
    :key="company.company_code" 
    :value="company.company_code">
    {{ company.company_name }}
  </a-select-option>
</a-select>

<!-- 国家字段自动从选择的分公司带出 -->
<a-input :value="getCountryName(selectedCompany.country)" disabled />
```

---

#### 第 3 步：录入港口（dict_ports）

```
依赖：dict_countries

示例数据：
port_code | port_name | port_name_en | country | state | city
----------|-----------|--------------|---------|-------|----------
CNSHG     | 上海      | Shanghai     | CN      | SH    | Shanghai
GBFXT     | 费利克斯托 | Felixstowe  | GB      | ENG   | Felixstowe
USLAX     | 洛杉矶    | Los Angeles  | US      | CA    | Los Angeles
```

**前端实现**：
```vue
<!-- 港口选择器 -->
<a-select v-model="formData.portCode">
  <a-select-option 
    v-for="port in ports" 
    :key="port.port_code" 
    :value="port.port_code">
    {{ port.port_name }} / {{ port.port_name_en }}
  </a-select-option>
</a-select>

<!-- 国家自动显示 -->
<span>{{ getCountryName(port.country) }}</span>
```

---

#### 第 4 步：录入仓库（dict_warehouses）

```
依赖：dict_countries, dict_overseas_companies

示例数据：
warehouse_code | warehouse_name      | company_code        | country
---------------|--------------------|--------------------|--------
UK_LON_001     | London Warehouse   | MH_STAR_UK_LTD     | GB
US_LA_001      | LA Distribution Ctr| AOSOM_USA_INC      | US
```

**前端实现**：
```vue
<!-- 仓库选择器 -->
<a-select v-model="formData.warehouseCode">
  <a-select-option 
    v-for="wh in warehouses" 
    :key="wh.warehouse_code" 
    :value="wh.warehouse_code">
    {{ wh.warehouse_name }}
  </a-select-option>
</a-select>

<!-- 所属分公司 - 下拉选择 -->
<a-select v-model="formData.companyCode">
  <a-select-option 
    v-for="company in overseasCompanies" 
    :key="company.company_code" 
    :value="company.company_code">
    {{ company.company_name }}
  </a-select-option>
</a-select>

<!-- 国家自动从分公司带出 -->
<a-input :value="getCountryName(selectedCompany.country)" disabled />
```

---

#### 第 5 步：录入车队（dict_trucking_companies）

```
依赖：dict_countries

示例数据：
company_code     | company_name           | country | daily_capacity | has_yard
-----------------|------------------------|---------|----------------|----------
YUNEXPRESS_UK_LTD| YunExpress UK Ltd      | GB      | 10             | true
CEVA_FREIGHT__UK | CEVA Freight UK Ltd    | GB      | 15             | true
```

**前端实现**：
```vue
<!-- 车队选择器 -->
<a-select v-model="formData.truckingCompanyId">
  <a-select-option 
    v-for="tc in truckingCompanies" 
    :key="tc.company_code" 
    :value="tc.company_code">
    {{ tc.company_name }}
  </a-select-option>
</a-select>

<!-- 国家选择 -->
<a-select v-model="formData.country">
  <a-select-option 
    v-for="country in countries" 
    :key="country.code" 
    :value="country.code">
    {{ country.name_cn }}
  </a-select-option>
</a-select>
```

---

#### 第 6 步：配置映射关系（Mapping Tables）

这是**最关键的一步**，将前面录入的主数据关联起来！

##### 6a. 港口 - 车队映射（dict_trucking_port_mapping）

```
依赖：dict_countries, dict_ports, dict_trucking_companies

示例数据：
country | port_code | trucking_company_id  | yard_capacity
--------|-----------|---------------------|--------------
GB      | GBFXT     | YUNEXPRESS_UK_LTD   | 200
GB      | GBFXT     | CEVA_FREIGHT__UK    | 150
```

**前端实现**：
```vue
<template>
  <a-form>
    <!-- 国家选择 -->
    <a-form-item label="国家">
      <a-select v-model="formData.country" @change="onCountryChange">
        <a-select-option 
          v-for="c in countries" 
          :key="c.code" 
          :value="c.code">
          {{ c.name_cn }}
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 港口选择 - 根据国家过滤 -->
    <a-form-item label="港口">
      <a-select v-model="formData.portCode">
        <a-select-option 
          v-for="port in filteredPorts" 
          :key="port.port_code" 
          :value="port.port_code">
          {{ port.port_name }}
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 车队选择 - 根据国家过滤 -->
    <a-form-item label="车队">
      <a-select v-model="formData.truckingCompanyId">
        <a-select-option 
          v-for="tc in filteredTruckingCompanies" 
          :key="tc.company_code" 
          :value="tc.company_code">
          {{ tc.company_name }}
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 堆场容量 -->
    <a-form-item label="堆场容量">
      <a-input-number v-model="formData.yardCapacity" :min="0" />
    </a-form-item>

    <a-button @click="saveMapping">保存映射</a-button>
  </a-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        country: '',
        portCode: '',
        truckingCompanyId: '',
        yardCapacity: 0
      }
    };
  },
  computed: {
    // 根据选择的国家过滤港口
    filteredPorts() {
      if (!this.formData.country) return [];
      return this.ports.filter(p => p.country === this.formData.country);
    },
    // 根据选择的国家过滤车队
    filteredTruckingCompanies() {
      if (!this.formData.country) return [];
      return this.truckingCompanies.filter(tc => tc.country === this.formData.country);
    }
  },
  methods: {
    onCountryChange() {
      // 清空下级选择
      this.formData.portCode = '';
      this.formData.truckingCompanyId = '';
    },
    async saveMapping() {
      // 验证并保存映射关系
      await this.$api.saveTruckingPortMapping(this.formData);
    }
  }
};
</script>
```

##### 6b. 仓库 - 车队映射（dict_warehouse_trucking_mapping）

```
依赖：dict_countries, dict_warehouses, dict_trucking_companies

示例数据：
country | warehouse_code | trucking_company_id
--------|----------------|--------------------
GB      | UK_LON_001     | YUNEXPRESS_UK_LTD
GB      | UK_LON_001     | CEVA_FREIGHT__UK
```

**前端实现**：
```vue
<template>
  <a-form>
    <!-- 国家选择 -->
    <a-form-item label="国家">
      <a-select v-model="formData.country" @change="onCountryChange">
        <a-select-option 
          v-for="c in countries" 
          :key="c.code" 
          :value="c.code">
          {{ c.name_cn }}
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 仓库选择 - 根据国家过滤 -->
    <a-form-item label="仓库">
      <a-select v-model="formData.warehouseCode">
        <a-select-option 
          v-for="wh in filteredWarehouses" 
          :key="wh.warehouse_code" 
          :value="wh.warehouse_code">
          {{ wh.warehouse_name }}
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 车队选择 - 根据国家过滤 -->
    <a-form-item label="车队">
      <a-select v-model="formData.truckingCompanyId">
        <a-select-option 
          v-for="tc in filteredTruckingCompanies" 
          :key="tc.company_code" 
          :value="tc.company_code">
          {{ tc.company_name }}
        </a-select-option>
      </a-select>
    </a-form-item>

    <a-button @click="saveMapping">保存映射</a-button>
  </a-form>
</template>

<script>
export default {
  computed: {
    // 根据选择的国家过滤仓库
    filteredWarehouses() {
      if (!this.formData.country) return [];
      return this.warehouses.filter(w => w.country === this.formData.country);
    },
    // 根据选择的国家过滤车队
    filteredTruckingCompanies() {
      if (!this.formData.country) return [];
      return this.truckingCompanies.filter(tc => tc.country === this.formData.country);
    }
  }
};
</script>
```

---

## 🖥️ 前端下拉框关联规则

### 级联选择模式

#### 模式 1：国家 → 港口 → 车队

```
用户操作流程：
1. 选择国家（如：英国 GB）
   ↓
2. 港口下拉框只显示该国家的港口（如：GBFXT 费利克斯托）
   ↓
3. 车队下拉框只显示该国家的车队（如：YunExpress UK Ltd）
   ↓
4. 保存映射关系
```

**Vue 组件示例**：
```vue
<template>
  <div class="cascading-selector">
    <!-- Level 1: 国家 -->
    <a-select 
      v-model="selectedCountry" 
      placeholder="选择国家"
      @change="onCountryChange">
      <a-select-option 
        v-for="c in countries" 
        :key="c.code" 
        :value="c.code">
        {{ c.name_cn }} ({{ c.code }})
      </a-select-option>
    </a-select>

    <!-- Level 2: 港口（依赖国家） -->
    <a-select 
      v-model="selectedPort" 
      placeholder="选择港口"
      :disabled="!selectedCountry"
      @change="onPortChange">
      <a-select-option 
        v-for="port in filteredPorts" 
        :key="port.port_code" 
        :value="port.port_code">
        {{ port.port_name }}
      </a-select-option>
    </a-select>

    <!-- Level 3: 车队（依赖国家） -->
    <a-select 
      v-model="selectedTruckingCompany" 
      placeholder="选择车队"
      :disabled="!selectedCountry">
      <a-select-option 
        v-for="tc in filteredTruckingCompanies" 
        :key="tc.company_code" 
        :value="tc.company_code">
        {{ tc.company_name }}
      </a-select-option>
    </a-select>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedCountry: '',
      selectedPort: '',
      selectedTruckingCompany: '',
      countries: [],
      ports: [],
      truckingCompanies: []
    };
  },
  computed: {
    filteredPorts() {
      if (!this.selectedCountry) return [];
      return this.ports.filter(p => p.country === this.selectedCountry);
    },
    filteredTruckingCompanies() {
      if (!this.selectedCountry) return [];
      return this.truckingCompanies.filter(tc => tc.country === this.selectedCountry);
    }
  },
  methods: {
    onCountryChange() {
      // 清空下级选择
      this.selectedPort = '';
      this.selectedTruckingCompany = '';
    },
    onPortChange() {
      // 可以在这里添加更多逻辑
    }
  }
};
</script>
```

#### 模式 2：国家 → 分公司 → 仓库

```vue
<template>
  <div class="warehouse-selector">
    <!-- Level 1: 国家 -->
    <a-select v-model="country" placeholder="选择国家">
      <a-select-option v-for="c in countries" :key="c.code" :value="c.code">
        {{ c.name_cn }}
      </a-select-option>
    </a-select>

    <!-- Level 2: 分公司（依赖国家） -->
    <a-select v-model="companyCode" placeholder="选择分公司" :disabled="!country">
      <a-select-option v-for="co in filteredCompanies" :key="co.company_code" :value="co.company_code">
        {{ co.company_name }}
      </a-select-option>
    </a-select>

    <!-- Level 3: 仓库（依赖分公司） -->
    <a-select v-model="warehouseCode" placeholder="选择仓库" :disabled="!companyCode">
      <a-select-option v-for="wh in filteredWarehouses" :key="wh.warehouse_code" :value="wh.warehouse_code">
        {{ wh.warehouse_name }}
      </a-select-option>
    </a-select>
  </div>
</template>

<script>
export default {
  computed: {
    filteredCompanies() {
      if (!this.country) return [];
      return this.overseasCompanies.filter(c => c.country === this.country);
    },
    filteredWarehouses() {
      if (!this.companyCode) return [];
      return this.warehouses.filter(w => w.company_code === this.companyCode);
    }
  }
};
</script>
```

---

## 🔄 完整的数据流示例

### 场景：英国业务初始化

#### Step 1: 录入英国国家代码
```sql
INSERT INTO dict_countries (code, name_cn, name_en, continent)
VALUES ('GB', '英国', 'United Kingdom', '欧洲');
```

#### Step 2: 录入英国分公司
```sql
INSERT INTO dict_overseas_companies (company_code, company_name, country)
VALUES ('MH_STAR_UK_LTD', 'MH Star UK Ltd', 'GB');
```

#### Step 3: 录入英国港口
```sql
INSERT INTO dict_ports (port_code, port_name, port_name_en, country, state, city)
VALUES ('GBFXT', '费利克斯托', 'Felixstowe', 'GB', 'ENG', 'Felixstowe');
```

#### Step 4: 录入英国仓库
```sql
INSERT INTO dict_warehouses (warehouse_code, warehouse_name, company_code, country)
VALUES ('UK_LON_001', 'London Warehouse', 'MH_STAR_UK_LTD', 'GB');
```

#### Step 5: 录入英国车队
```sql
INSERT INTO dict_trucking_companies (company_code, company_name, country, daily_capacity, has_yard)
VALUES 
  ('YUNEXPRESS_UK_LTD', 'YunExpress UK Ltd', 'GB', 10, true),
  ('CEVA_FREIGHT__UK__LTD', 'CEVA Freight (UK) Ltd', 'GB', 15, true);
```

#### Step 6: 配置港口 - 车队映射
```sql
INSERT INTO dict_trucking_port_mapping (country, port_code, trucking_company_id, yard_capacity)
VALUES 
  ('GB', 'GBFXT', 'YUNEXPRESS_UK_LTD', 200),
  ('GB', 'GBFXT', 'CEVA_FREIGHT__UK__LTD', 150);
```

#### Step 7: 配置仓库 - 车队映射
```sql
INSERT INTO dict_warehouse_trucking_mapping (country, warehouse_code, trucking_company_id)
VALUES 
  ('GB', 'UK_LON_001', 'YUNEXPRESS_UK_LTD'),
  ('GB', 'UK_LON_001', 'CEVA_FREIGHT__UK__LTD');
```

---

### 前端界面效果

#### 智能排柜 - 车队选择界面

```
┌─────────────────────────────────────────┐
│  排产配置                               │
├─────────────────────────────────────────┤
│  国家：[英国 (GB) ▼]                    │
│                                         │
│  目的港：[费利克斯托 (GBFXT) ▼]         │
│                                         │
│  候选车队：                             │
│  ☑ YunExpress UK Ltd (容量：10)         │
│  ☑ CEVA Freight (UK) Ltd (容量：15)     │
│                                         │
│  堆场信息：                             │
│  • YunExpress UK Ltd: 200 TEU           │
│  • CEVA Freight (UK) Ltd: 150 TEU       │
│                                         │
│  [开始排产]                             │
└─────────────────────────────────────────┘
```

**数据来源**：
- 国家列表 ← `SELECT * FROM dict_countries`
- 港口列表 ← `SELECT * FROM dict_ports WHERE country = 'GB'`
- 车队列表 ← `SELECT * FROM dict_trucking_companies WHERE country = 'GB'`
- 堆场容量 ← `SELECT * FROM dict_trucking_port_mapping WHERE port_code = 'GBFXT'`

---

## 📊 依赖关系矩阵图

```
┌──────────────────────┬─────────┬─────────┬─────────┬─────────┐
│ 表名                 │ Level 1 │ Level 2 │ Level 3 │ Level 4 │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┤
│ dict_countries       │    ✓    │         │         │         │
│ dict_customer_types  │    ✓    │         │         │         │
│ dict_container_types │    ✓    │         │         │         │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┤
│ dict_overseas_co     │    →    │    ✓    │         │         │
│ dict_customs_brk     │    →    │    ✓    │         │         │
│ dict_ports           │    →    │    ✓    │         │         │
│ dict_warehouses      │    →    │    ✓    │         │         │
│ dict_trucking_co     │    →    │    ✓    │         │         │
│ dict_freight_fwd     │         │    ✓    │         │         │
│ dict_shipping_co     │         │    ✓    │         │         │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┤
│ dict_truck_port_map  │    →    │    →    │    ✓    │         │
│ dict_wh_truck_map    │    →    │    →    │    ✓    │         │
│ dict_port_wh_map     │    →    │    →    │    ✓    │         │
├──────────────────────┼─────────┼─────────┼─────────┼─────────┤
│ biz_customers        │    →    │    →    │    →    │    ✓    │
│ biz_containers       │    →    │    →    │    →    │    ✓    │
│ process_*            │    →    │    →    │    →    │    ✓    │
└──────────────────────┴─────────┴─────────┴─────────┴─────────┘

箭头 → 表示依赖关系
```

---

## ✅ 检查清单

### 建表前检查

- [ ] 是否已创建 `dict_countries`？
- [ ] 是否已创建 `dict_customer_types`？
- [ ] 是否已创建 `dict_container_types`？

### 录入主数据前检查

- [ ] 国家代码是否已完整录入？
- [ ] 是否了解各字段的依赖关系？
- [ ] 是否准备了基础数据 Excel？

### 配置映射前检查

- [ ] 港口数据是否已录入？
- [ ] 仓库数据是否已录入？
- [ ] 车队数据是否已录入？
- [ ] 国家代码是否统一为 ISO 标准？

### 前端开发检查

- [ ] 国家选择器是否已实现？
- [ ] 级联过滤逻辑是否正确？
- [ ] 下拉框数据源 API 是否已开发？
- [ ] 表单验证规则是否完善？

---

## 🎯 最佳实践总结

### 1. 严格遵守建表顺序

```
❌ 错误：先创建映射表，再创建主数据表
✅ 正确：Level 1 → Level 2 → Level 3 → Level 4
```

### 2. 使用外键约束

```sql
-- ✅ 推荐：明确定义外键
CREATE TABLE dict_warehouses (
    warehouse_code VARCHAR(50) PRIMARY KEY,
    company_code VARCHAR(50) REFERENCES dict_overseas_companies(company_code),
    country VARCHAR(50) REFERENCES dict_countries(code)
);

-- ❌ 不推荐：不使用外键
CREATE TABLE dict_warehouses (
    warehouse_code VARCHAR(50) PRIMARY KEY,
    company_code VARCHAR(50),  -- 无约束
    country VARCHAR(50)        -- 无约束
);
```

### 3. 前端级联选择

```vue
// ✅ 推荐：级联过滤，用户体验好
computed: {
  filteredPorts() {
    if (!this.selectedCountry) return [];
    return this.ports.filter(p => p.country === this.selectedCountry);
  }
}

// ❌ 不推荐：显示所有数据，让用户手动筛选
```

### 4. 数据完整性验证

```sql
-- 定期检查外键完整性
SELECT 'Orphan records in mapping tables' as issue
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_trucking_companies tc ON tc.company_code = tpm.trucking_company_id
WHERE tc.company_code IS NULL;
```

---

## 📚 相关文档

- `scripts/COUNTRY_CODE_STANDARDIZATION_FINAL_SUMMARY.md` - 国家代码规范化
- `scripts/PORT_STANDARDIZATION_REPORT.md` - 港口信息规范化
- `scripts/TRUCKING_COMPANY_CODE_STANDARDIZATION.md` - 车队公司代码规范化
- `scripts/TRUCKING_YARD_INFO_SYNC.md` - 车队堆场信息同步

---

**文档版本**: v1.0  
**最后更新**: 2026-03-24  
**维护者**: SOLO Coder
