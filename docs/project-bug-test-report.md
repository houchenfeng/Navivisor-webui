# Navivisor 全项目 Bug 核查与修复记录

> 核查日期：2026-09-12
> 当前基线：`main@41897e2`（PR #3 与四模块工作目录迁移之后）
> 方法：逐条对照当前代码、定向测试、生产构建与浏览器冒烟。
> 旧版报告基于更早分支，其中多项结论已过期；以下为当前事实。

## 1. 本轮结论

原报告 22 个 Bug 的复核结果：

- 此前已解决：B01、B08、B09、B10、B17、B18、B20、B21，以及 B02 的“四模块完全不共享项目”部分。
- 本轮确认真实并修复：B03、B04、B05、B06、B07、B11、B13、B14、B15、B16。
- 仍部分完成或属于产品缺口：B02、B12、B22。
- B19 已随 WebUI 部署鉴权移除而失效；远程投稿 API 若需鉴权，应使用它自己的凭证，不能复用已取消的 WebUI token。

## 2. 逐条核查

| ID | 结果 | 当前证据 / 修复 |
|---|---|---|
| B01 | 已解决 | 写作生成和翻译使用共享 research project store 的 `projectId`，不再创建 `Navivisor Writing`。 |
| B02 | 部分解决 | 四模块按共享 `projectId` 水合；实时开题 task 尚未自动登记成 workspace run/artifact。 |
| B03 | 本轮修复并实装 | 新增 SSH runner API 与 WebUI：使用临时密码连接、上传实验文档/程序、自动选择首个低占用 GPU（无则 CPU）、执行并回传版本化产物。对指定服务器的真实连接在 TCP/SSH 建连前超时，未伪造远端成功结果。 |
| B04 | 本轮修复 | 实验步骤条和页脚统一按 intake、方案确认、免责声明、配置完整性和执行状态门禁。 |
| B05 | 本轮修复 | 默认真实目录自动使用当前论文 `rootPath/experiment/{code,datasets,results}`，不覆盖用户自定义值。 |
| B06 | 本轮修复 | 查看成果模板不再写 `completed=true`；结果页显示“成果模板（未执行）”。 |
| B07 | 本轮修复 | 顶栏区分 Workspace 模拟、离线 Demo 和真实运行；运行页展示 queued/connecting/running/downloading/completed/failed 状态及可打开的产物。 |
| B08 | 已解决 | 首页恢复项目后同步规范化路径和标题。 |
| B09 | 已解决 | 工作目录图片通过受控 blob/object URL 加载。 |
| B10 | 已解决 | 填入实验素材不再修改实验完成状态或免责声明。 |
| B11 | 本轮修复 | 无 PDF 时 AI Assist 禁用并显示原因；处理函数也保留防御性提示。 |
| B12 | 部分解决 | 后端已有 move/copy/scan API；首页仍缺完整迁移 UI。 |
| B13 | 本轮修复 | 删除 `paperCount ± 3` 假统计，仅展示真实总数；PDF 状态以 `pdf_path`/manifest 为准。 |
| B14 | 本轮修复 | 开题 Step2/3 根据检索、候选题和 Demo 状态启用，不能直接跳过。 |
| B15 | 本轮修复 | persist `partialize` 强制清空 `apiKeyHint`，不写 localStorage。 |
| B16 | 本轮修复 | 仅在 BibTeX 文本变化时重新解析；用户手动删改不会因数量不同被覆盖。 |
| B17 | 已解决 | 写作项目选择已集中到共享 helper/store。 |
| B18 | 已解决 | 投稿模块持续披露本地模拟及 workspace 模拟来源。 |
| B19 | 已失效 | WebUI 部署鉴权已取消；远程投稿仍为显式 opt-in。 |
| B20 | 已解决 | RunPage 完成 effect 包含稳定的 `setFields` 依赖。 |
| B21 | 已解决 | 遗留服务为空导出，不存在实际 `localhost:3001`/cpolar 请求。 |
| B22 | 部分过期 | 开题 Step2/3 已由 PR #3 实装；SSH 确定性实验 runner 已接入，但真实模型训练和正式 CVPR LaTeX worker 仍缺。 |

## 3. Windows 测试项

| ID | 判断 | 说明 |
|---|---|---|
| T1 | 测试夹具问题 | FilesService 允许根包含用户目录时，“home 外”假设不成立；需为测试注入独立允许根。 |
| T2 | 环境限制 | Windows 未开启开发者模式时创建 symlink 返回 EPERM；不能据此认定生产删除逻辑失败。 |

本轮不通过跳过测试制造全绿；跨平台夹具仍需单独修正。

## 4. 验证记录

| 检查 | 结果 |
|---|---|
| `pnpm --dir web test` | 20 files / 195 tests 通过 |
| `pnpm --dir web build` | 通过（Vite 生产构建；仅既有大 chunk 警告） |
| 后端相关测试 | 6 files / 31 tests 通过（topic、workflow、WebSocket） |
| 浏览器冒烟 | 1440×900：开题 Step2/3 初始禁用；实验未确认时配置/下一步禁用；选择真实模式并确认后显示“runner 未接入”且只开放配置步骤 |
| 浏览器控制台 | 无 error / warn |
| `git diff --check` | 通过 |

### 2026-09-12 SSH runner 增量验证

- 新增 `research-ssh-runner.service.ts`、controller、命令安全/调度单测和 `research-tools/ssh-experiment/run_navivisor_experiment.py`。
- 后端 `pnpm build` 通过；前端 `pnpm --dir web build` 通过；runner 定向测试 2/2 通过。
- 本机 CPU 实际执行生成 1,200 行合成输入、原始指标 CSV、run.json、实验结果报告和算法细节报告；指标由逐样本计算得到，不是固定返回值。
- 指定主机 `10.61.48.10:22` 的 OpenSSH 连接在认证前超时；因此没有在远端创建目录、占用 GPU 或复制结果。本项状态为网络阻塞，而非代码成功。
- 密码只存在前端内存与一次请求/连接对象中，persist 强制清空；未写入源码、文档、工作目录或日志。

## 5. 剩余真实风险

1. 实时开题检索、候选题和核心文献任务尚未完整进入统一 workspace 版本链。
2. 首页缺少完整目录复制/迁移 UI，后端能力已有。
3. SSH 执行与产物回传 runner 已完成；真实数据/模型训练尚未完成，且指定服务器当前网络不可达。合法 CVPR 模板与隔离 LaTeX worker 仍未完成。
4. FilesService 的 Windows 测试夹具仍需修正。
