-- 甘特图阶段/主任务快照落库（方案 A）
-- 说明：DDL 显示「0 行受影响」属正常。若工具报错，请只执行下面两条（勿单独执行空语句）。
-- 历史回填：在应用内跑 ContainerStatusService.batchUpdateStatuses 或对单柜 updateStatus，见 docs/Phase3/gantt-derived-implementation.md

ALTER TABLE biz_containers
ADD COLUMN IF NOT EXISTS gantt_derived JSONB DEFAULT NULL;

COMMENT ON COLUMN biz_containers.gantt_derived IS '甘特阶段/主任务/节点任务角色 JSON，ruleVersion 见 backend/src/utils/ganttDerivedBuilder.ts';
