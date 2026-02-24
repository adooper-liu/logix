.PHONY: help tsdb-up tsdb-down tsdb-logs tsdb-restart tsdb-clean tsdb-info tsdb-db prod-up prod-down prod-logs build rebuild clean logs restart health backup restore

# 默认目标
help:
	@echo "LogiX TimescaleDB Docker 管理命令"
	@echo ""
	@echo "TimescaleDB 开发环境:"
	@echo "  make tsdb-up     - 启动 TimescaleDB 开发环境"
	@echo "  make tsdb-down   - 停止 TimescaleDB 开发环境"
	@echo "  make tsdb-logs   - 查看 TimescaleDB 日志"
	@echo "  make tsdb-db     - 进入 TimescaleDB 数据库"
	@echo "  make tsdb-info   - 查看 TimescaleDB 统计信息"
	@echo "  make tsdb-restart - 重启 TimescaleDB 服务"
	@echo "  make tsdb-clean  - 清理 TimescaleDB 数据 (危险!)"
	@echo ""
	@echo "生产环境:"
	@echo "  make prod-up    - 启动生产环境"
	@echo "  make prod-down  - 停止生产环境"
	@echo "  make prod-logs  - 查看生产环境日志"
	@echo ""
	@echo "数据库操作:"
	@echo "  make db-migrate  - 运行数据库迁移"
	@echo "  make db-reset    - 重置数据库 (危险!)"
	@echo ""
	@echo "通用操作:"
	@echo "  make build       - 构建所有镜像"
	@echo "  make rebuild     - 重新构建所有镜像"
	@echo "  make clean       - 清理所有容器、卷和网络"
	@echo "  make logs        - 查看所有服务日志"
	@echo "  make restart     - 重启所有服务"
	@echo ""
	@echo "监控:"
	@echo "  make health       - 检查所有服务健康状态"
	@echo "  make backup       - 备份数据库"
	@echo "  make restore      - 恢复数据库"

# ========== TimescaleDB 开发环境 ==========

tsdb-up:
	@echo "启动 TimescaleDB 开发环境..."
	docker-compose -f docker-compose.timescaledb.yml up -d
	@echo "等待服务启动..."
	@sleep 10
	docker-compose -f docker-compose.timescaledb.yml ps
	@echo ""
	@echo "TimescaleDB 开发环境已启动!"
	@echo "后端 API: http://localhost:3001"
	@echo "数据库:   localhost:5432"
	@echo "Redis:    localhost:6379"
	@echo "Grafana:  http://localhost:3000 (admin/admin)"
	@echo "Prometheus: http://localhost:9090"

tsdb-down:
	@echo "停止 TimescaleDB 开发环境..."
	docker-compose -f docker-compose.timescaledb.yml down

tsdb-logs:
	@echo "查看 TimescaleDB 开发环境日志..."
	docker-compose -f docker-compose.timescaledb.yml logs -f backend

tsdb-db:
	@echo "进入 TimescaleDB 数据库..."
	docker-compose -f docker-compose.timescaledb.yml exec -it postgres psql -U logix_user -d logix_db

tsdb-info:
	@echo "查看 TimescaleDB 统计信息..."
	docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db -c "SELECT hypertable_name, num_dimensions, num_chunks, chunk_time_interval FROM timescaledb_information.hypertables;" && \
	docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db -c "SELECT table_name, status, job_id FROM timescaledb_information.jobs;" && \
	docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db -c "SELECT hypertable_name, compression_status FROM timescaledb_information.compression_settings;"

tsdb-restart:
	@echo "重启 TimescaleDB 开发环境..."
	docker-compose -f docker-compose.timescaledb.yml restart
	@echo "TimescaleDB 开发环境已重启!"

tsdb-clean:
	@echo "警告: 这将删除所有 TimescaleDB 数据!"
	@read -p "确认继续? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose -f docker-compose.timescaledb.yml down -v; \
		docker-compose -f docker-compose.timescaledb.yml up -d; \
		@sleep 10; \
		echo "TimescaleDB 数据已清理!"; \
	else \
		echo "操作已取消"; \
	fi

# ========== 生产环境 ==========

prod-up:
	@echo "构建并启动生产环境..."
	docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d --build
	@echo "等待服务启动..."
	@sleep 15
	docker-compose -f docker-compose.timescaledb.prod.yml ps
	@echo ""
	@echo "生产环境已启动!"

prod-down:
	@echo "停止生产环境..."
	docker-compose -f docker-compose.timescaledb.prod.yml down

prod-logs:
	@echo "查看生产环境日志..."
	docker-compose -f docker-compose.timescaledb.prod.yml logs -f backend

# ========== 数据库操作 ==========

db-migrate:
	@echo "运行数据库迁移..."
	docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db < backend/scripts/migrate-container-loading-records.sql
	@echo "迁移完成!"

db-reset:
	@echo "警告: 这将删除所有数据!"
	@read -p "确认继续? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose -f docker-compose.timescaledb.yml down -v; \
		docker-compose -f docker-compose.timescaledb.yml up -d postgres; \
		@sleep 10; \
		docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db < backend/scripts/init-database.sql; \
		docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db < backend/scripts/init-timescaledb.sql; \
		echo "数据库已重置"; \
	else \
		echo "操作已取消"; \
	fi

# ========== 通用操作 ==========

build:
	@echo "构建所有 Docker 镜像..."
	docker-compose -f docker-compose.timescaledb.yml build

rebuild:
	@echo "重新构建所有 Docker 镜像 (无缓存)..."
	docker-compose -f docker-compose.timescaledb.yml build --no-cache

up:
	docker-compose -f docker-compose.timescaledb.yml up -d

down:
	docker-compose -f docker-compose.timescaledb.yml down

restart:
	docker-compose -f docker-compose.timescaledb.yml restart

logs:
	docker-compose -f docker-compose.timescaledb.yml logs -f

clean:
	@echo "清理所有容器、卷和网络..."
	docker-compose -f docker-compose.timescaledb.yml down -v --remove-orphans
	docker system prune -f
	@echo "清理完成!"

# ========== 健康检查 ==========

health:
	@echo "检查所有服务健康状态..."
	docker-compose -f docker-compose.timescaledb.yml ps
	@echo ""
	@echo "检查 TimescaleDB..."
	docker-compose -f docker-compose.timescaledb.yml exec postgres pg_isready -U logix_user || echo "TimescaleDB 不可用"
	@echo ""
	@echo "检查后端服务..."
	docker-compose -f docker-compose.timescaledb.yml exec backend curl -s http://localhost:3001/health || echo "后端服务不可用"

# ========== 备份 ==========

backup:
	@echo "备份数据库..."
	docker-compose -f docker-compose.timescaledb.yml exec postgres pg_dump -U logix_user logix_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "备份完成!"

restore:
	@read -p "输入备份文件名: " backup; \
	if [ -f "$$backup" ]; then \
		docker-compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user logix_db < "$$backup"; \
		echo "恢复完成!"; \
	else \
		echo "备份文件不存在: $$backup"; \
	fi
