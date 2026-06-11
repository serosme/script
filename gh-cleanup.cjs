const { exec } = require("child_process");
const { promisify } = require("util");
const readline = require("readline");
const execP = promisify(exec);

// ========== 配置 ==========
const CONCURRENCY = 10;

// ========== 交互 ==========

function askYN(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ========== 工具 ==========

async function batchRun(items, fn, concurrency = CONCURRENCY) {
  let index = 0;
  const total = items.length;
  const results = new Array(total);

  async function worker() {
    while (index < total) {
      const i = index++;
      try {
        results[i] = { status: "ok", value: await fn(items[i], i) };
      } catch (e) {
        results[i] = { status: "err", error: e.message };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return results;
}

// ========== 采集 ==========

async function fetchArtifacts(repo) {
  let artifacts = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { stdout } = await execP(
      `gh api "repos/${repo}/actions/artifacts?per_page=${perPage}&page=${page}"`
    );
    const data = JSON.parse(stdout);
    const list = data.artifacts || [];
    artifacts.push(...list.map(a => ({ id: a.id, name: a.name })));
    if (list.length < perPage) break;
    page++;
  }

  return artifacts;
}

async function fetchRuns(repo) {
  let runs = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { stdout } = await execP(
      `gh api "repos/${repo}/actions/runs?per_page=${perPage}&page=${page}"`
    );
    const data = JSON.parse(stdout);
    const list = data.workflow_runs || [];
    runs.push(...list.map(r => ({ id: r.id, name: r.name })));
    if (list.length < perPage) break;
    page++;
  }

  return runs;
}

// ========== 展示 ==========

function printSummary(summaries) {
  const W = 86;
  console.log("\n" + "─".repeat(W));
  console.log(` ${"仓库".padEnd(50)} ${"工作流运行".padStart(10)} ${"构件".padStart(8)}`);
  console.log("─".repeat(W));

  for (const s of summaries) {
    const name = s.repo.padEnd(50);
    const runs = String(s.runs.length).padStart(10);
    const arts = String(s.artifacts.length).padStart(8);
    console.log(` ${name} ${runs} ${arts}`);
  }

  console.log("─".repeat(W) + "\n");
}

// ========== 删除 ==========

async function deleteRuns(runs) {
  if (runs.length === 0) return;
  const results = await batchRun(runs, ({ id, repo }) => execP(`gh run delete ${id} --repo ${repo}`));
  const failed = results.filter(r => r.status === "err");
  if (failed.length > 0) {
    console.log(`${failed.length} 条运行记录删除失败:`);
    failed.forEach(r => console.log(`  ${r.error}`));
  }
}

async function deleteArtifacts(arts) {
  if (arts.length === 0) return;
  const results = await batchRun(arts, ({ id, repo }) =>
    execP(`gh api repos/${repo}/actions/artifacts/${id} --method DELETE --silent`)
  );
  const failed = results.filter(r => r.status === "err");
  if (failed.length > 0) {
    console.log(`${failed.length} 个构件删除失败:`);
    failed.forEach(r => console.log(`  ${r.error}`));
  }
}

// ========== 主流程 ==========

(async () => {
  try {
    // 1. 获取仓库列表
    const { stdout: repoOut } = await execP("gh repo list --limit 1000 --json nameWithOwner");
    const repos = JSON.parse(repoOut);

    // 2. 采集
    const summaryMap = new Map();

    await batchRun(repos, async ({ nameWithOwner: repo }) => {
      try {
        const [runs, artifacts] = await Promise.all([fetchRuns(repo), fetchArtifacts(repo)]);
        summaryMap.set(repo, { repo, runs, artifacts });
      } catch (e) {
        console.error(`获取 ${repo} 数据失败:`, e.message);
        summaryMap.set(repo, { repo, runs: [], artifacts: [] });
      }
    });

    const summaries = repos.map(r => summaryMap.get(r.nameWithOwner));
    const totalRuns = summaries.reduce((s, r) => s + r.runs.length, 0);
    const totalArts = summaries.reduce((s, r) => s + r.artifacts.length, 0);

    // 3. 汇总表格
    printSummary(summaries);

    if (totalRuns === 0 && totalArts === 0) {
      console.log("没有需要清理的内容。");
      return;
    }

    // 4. 确认
    const confirm = await askYN(`确认删除以上所有内容？(y/n): `);
    if (!confirm) {
      console.log("已取消。");
      return;
    }

    // 5. 删除
    const allRuns = summaries.flatMap(s => s.runs.map(r => ({ id: r.id, repo: s.repo })));
    const allArts = summaries.flatMap(s => s.artifacts.map(a => ({ id: a.id, repo: s.repo })));

    await deleteRuns(allRuns);
    await deleteArtifacts(allArts);

    console.log("删除完成。");
  } catch (e) {
    console.error("执行失败:", e.message);
    process.exit(1);
  }
})();
