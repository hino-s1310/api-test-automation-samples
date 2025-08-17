.PHONY: help install test test-unit test-e2e test-all coverage lint format check clean dev run

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Environment setup
install: ## Install dependencies
	uv pip install -e ".[dev,test]"

install-hooks: ## Install pre-commit hooks
	uv run pre-commit install

# Testing
test: test-unit ## Run unit tests (default)

test-unit: ## Run unit tests
	uv run pytest tests/unit/ -v

test-services: ## Run service tests
	uv run pytest tests/unit/test_services.py -v

test-api: ## Run API tests
	uv run pytest tests/unit/test_api.py -v

test-e2e: ## Run E2E tests
	cd tests/e2e && pnpm test

test-all: test-unit test-e2e ## Run all tests

test-ci: ## Run tests like CI (with coverage)
	uv run pytest tests/unit/ \
		--cov=src \
		--cov-report=term-missing \
		--cov-report=xml \
		--cov-report=html \
		--junitxml=test-results.xml \
		-v

coverage: ## Generate coverage report
	uv run pytest tests/unit/ --cov=src --cov-report=html
	@echo "Coverage report generated in htmlcov/index.html"

# Code quality
lint: ## Run linting
	uv run flake8 src/ tests/
	uv run mypy src/

format: ## Format code
	uv run black src/ tests/
	uv run isort src/ tests/

check: ## Run all quality checks
	uv run black --check src/ tests/
	uv run isort --check-only src/ tests/
	uv run flake8 src/ tests/
	uv run mypy src/

# Development
dev: ## Start development server
	uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

run: ## Start production server
	uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Cleanup
clean: ## Clean up generated files
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf coverage.xml
	rm -rf test-results.xml
	rm -rf .pytest_cache/
	rm -rf __pycache__/
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Docker
docker-build: ## Build Docker image
	docker build -t api-test-automation .

docker-run: ## Run Docker container
	docker run -p 8000:8000 api-test-automation

docker-compose-up: ## Start with docker-compose
	docker-compose up -d

docker-compose-down: ## Stop docker-compose
	docker-compose down

# Documentation
docs: ## Generate documentation (if applicable)
	@echo "Documentation generation not yet implemented"

# Database
db-init: ## Initialize database
	uv run python -c "from src.api.database import db_manager; db_manager.initialize_database()"

db-reset: ## Reset database
	rm -f data/database.db
	mkdir -p data
	$(MAKE) db-init

# Utility
check-deps: ## Check dependency versions
	uv pip list --outdated

update-deps: ## Update dependencies
	uv pip install --upgrade -e ".[dev,test]"
