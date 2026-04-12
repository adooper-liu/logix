-- ============================================================
-- 添加 dict_shipping_companies.api_provider 字段
-- Add api_provider column to dict_shipping_companies
-- ============================================================
-- 用途: 修复生产环境中缺少的 api_provider 字段
-- Usage: Fix missing api_provider column in production database
-- ============================================================

-- 检查字段是否存在,如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'dict_shipping_companies'
        AND column_name = 'api_provider'
    ) THEN
        ALTER TABLE dict_shipping_companies
        ADD COLUMN api_provider VARCHAR(100);

        RAISE NOTICE 'Added api_provider column to dict_shipping_companies';
    ELSE
        RAISE NOTICE 'api_provider column already exists in dict_shipping_companies';
    END IF;
END $$;

-- 显示成功信息
COMMENT ON COLUMN dict_shipping_companies.api_provider IS 'API提供商 (MSK/CMA/COSCO等)';
