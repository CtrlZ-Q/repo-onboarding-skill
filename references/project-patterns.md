# Project Patterns

repo-onboarding 用于判断项目类型、命令和风险点的参考规则。

## 包管理器判断

优先级：

1. `pnpm-lock.yaml` -> pnpm
2. `yarn.lock` -> yarn
3. `package-lock.json` -> npm
4. `bun.lockb` / `bun.lock` -> bun
5. `uv.lock` -> uv
6. `poetry.lock` -> poetry
7. `Pipfile.lock` -> pipenv
8. `Cargo.lock` + `Cargo.toml` -> cargo
9. `go.mod` -> go
10. `pom.xml` -> maven
11. `build.gradle` / `build.gradle.kts` -> gradle

如果多个 lockfile 同时存在，报告中必须列出冲突，不要静默选择。

## 常见前端框架信号

- React：依赖包含 `react`、入口有 `src/main.tsx` / `src/index.tsx`
- Vite：存在 `vite.config.*` 或依赖包含 `vite`
- Next.js：存在 `next.config.*` 或依赖包含 `next`
- Nuxt：存在 `nuxt.config.*` 或依赖包含 `nuxt`
- Vue：依赖包含 `vue`
- SvelteKit：存在 `svelte.config.*` 或依赖包含 `@sveltejs/kit`

## 常见后端框架信号

- FastAPI：Python 依赖包含 `fastapi`，常见入口 `app/main.py`
- Django：存在 `manage.py` 或依赖包含 `django`
- Flask：依赖包含 `flask`
- Express：依赖包含 `express`
- NestJS：依赖包含 `@nestjs/core`
- Spring Boot：`pom.xml` / Gradle 依赖包含 `spring-boot`
- Go HTTP 服务：`cmd/*/main.go`、`internal/`、`go.mod`
- Rust 服务：`Cargo.toml`，依赖可能包含 `axum`、`actix-web`、`rocket`

## 常见测试框架信号

- Vitest：`vitest.config.*` 或依赖 `vitest`
- Jest：`jest.config.*` 或依赖 `jest`
- Playwright：`playwright.config.*` 或依赖 `@playwright/test`
- Cypress：`cypress.config.*` 或目录 `cypress/`
- pytest：`pytest.ini`、`conftest.py` 或依赖 `pytest`
- unittest：Python `tests/` 中出现 `unittest`
- cargo test：Rust 项目默认支持
- go test：Go 项目默认支持

## 生成代码 / 不应手改目录信号

这些路径需要在报告中提示谨慎：

- `generated/`
- `src/generated/`
- `app/generated/`
- `dist/`
- `build/`
- `.next/`
- `.nuxt/`
- `coverage/`
- `node_modules/`
- `vendor/`
- `target/`
- `__generated__/`
- `graphql/generated/`

## 敏感文件

不要读取这些文件内容：

- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- `*.pem`
- `*.key`
- `id_rsa`
- `id_ed25519`
- `credentials.json`
- `secrets.*`

可以读取：

- `.env.example`
- `.env.sample`
- `.env.template`

## 冲突处理原则

如果 README 与配置冲突：

- 不要直接覆盖事实；
- 报告中写明两个来源；
- 给出推荐，但标记需要人工确认。

示例：

> README 使用 `npm run dev`，但仓库存在 `pnpm-lock.yaml`。建议优先使用 pnpm；如果失败，再按 README 使用 npm。
