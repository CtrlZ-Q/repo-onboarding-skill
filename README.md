# repo-onboarding-skill

一个 Claude Code Skill：用于快速理解陌生代码库，并生成面向开发者和 AI Agent 的项目入门报告。

## 能解决什么问题

进入一个新仓库时，Claude 或开发者经常需要先弄清楚：

- 项目是什么
- 用什么技术栈
- 怎么安装依赖
- 怎么启动
- 怎么测试
- 主要代码在哪里
- 核心执行流是什么
- 哪些文件不能乱改
- 后续改动应该如何验证

这个 skill 会把这些信息整理成一份 `project-onboarding` 报告。

## 目录结构

```text
repo-onboarding-skill/
  SKILL.md
  README.md
  scripts/
    scan-project.mjs
  templates/
    project-onboarding-template.md
  references/
    project-patterns.md
```

## 安装方式

把整个文件夹复制到 Claude skills 目录：

```text
C:\Users\xiaobai\.claude\skills\repo-onboarding\
```

安装后：

```text
C:\Users\xiaobai\.claude\skills\repo-onboarding\SKILL.md
```

在 Claude Code 中使用：

```text
/repo-onboarding
```

如果当前环境不会自动识别新 skill，重启 Claude Code 会话。

## 深度模式

| 模式 | 适用场景 | 内容 |
|---|---|---|
| Quick | "快速看一下" | 根目录、技术栈、常用命令、核心目录 |
| Standard（默认） | 完整 onboarding | 完整报告含架构、执行流、测试、风险、下一步 |
| Deep | 大型改动前深入摸底 | Standard + 依赖边界、CI/部署、持久化、测试质量、维护风险 |

## 手动使用脚本

在任意项目根目录运行：

```bash
node C:/Users/xiaobai/.claude/skills/repo-onboarding/scripts/scan-project.mjs
```

或从桌面路径直接运行：

```bash
node C:/Users/xiaobai/Desktop/repo-onboarding-skill/scripts/scan-project.mjs
```

脚本输出初步扫描结果，Claude 再基于该结果和项目文档生成最终报告。

## 推荐输出文件

- 如果项目有 `docs/`：`docs/project-onboarding.md`
- 否则：`PROJECT_ONBOARDING.md`

## 设计原则

- 只做项目理解，不修改业务代码
- 不默认覆盖 `CLAUDE.md`
- 不读取 `.env`、私钥、token 等敏感文件
- 不把猜测写成事实
- 遇到 README、lockfile、CI 配置冲突时明确说明
- 命令标注状态：已验证 / 已配置 / 仅文档 / 推测
- 输出要能指导后续 Claude 安全开发
