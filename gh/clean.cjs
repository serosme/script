const { exec } = require("child_process");
const { promisify } = require("util");
const readline = require("readline");
const execP = promisify(exec);

const CONCURRENCY = 10;

function askYN(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, a => { rl.close(); resolve(a.trim().toLowerCase() === "y"); }));
}

async function batchRun(items, fn) {
  let i = 0;
  const results = [];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { results.push({ status: "ok", value: await fn(items[idx], idx) }); }
      catch (e) { results.push({ status: "err", error: e.message }); }
    }
  }));
  return results;
}

async function fetchAll(repo) {
  const fetchPage = async (endpoint) => {
    let items = [], page = 1;
    while (true) {
      const { stdout } = await execP(`gh api "repos/${repo}/actions/${endpoint}?per_page=100&page=${page}"`);
      const data = JSON.parse(stdout);
      const list = data.artifacts || data.workflow_runs || [];
      items.push(...list.map(a => ({ id: a.id })));
      if (list.length < 100) break;
      page++;
    }
    return items;
  };
  const [runs, artifacts] = await Promise.all([fetchPage("runs"), fetchPage("artifacts")]);
  return { repo, runs, artifacts };
}

(async () => {
  try {
    const { stdout } = await execP("gh repo list --limit 1000 --json nameWithOwner");
    const summaries = await batchRun(JSON.parse(stdout), ({ nameWithOwner }) => fetchAll(nameWithOwner));

    const totalRuns = summaries.reduce((s, r) => s + (r.status === "ok" ? r.value.runs.length : 0), 0);
    const totalArts = summaries.reduce((s, r) => s + (r.status === "ok" ? r.value.artifacts.length : 0), 0);

    if (totalRuns === 0 && totalArts === 0) { console.log("Nothing to clean."); return; }

    console.log(`Runs: ${totalRuns}, Artifacts: ${totalArts}`);
    if (!(await askYN("Delete all? (y/N): "))) { console.log("Cancelled."); return; }

    const allRuns = summaries.flatMap(s => s.status === "ok" ? s.value.runs.map(r => ({ id: r.id, repo: s.value.repo })) : []);
    const allArts = summaries.flatMap(s => s.status === "ok" ? s.value.artifacts.map(a => ({ id: a.id, repo: s.value.repo })) : []);

    const failedArts = (await batchRun(allArts, ({ id, repo }) => execP(`gh api repos/${repo}/actions/artifacts/${id} --method DELETE --silent`))).filter(r => r.status === "err");
    const failedRuns = (await batchRun(allRuns, ({ id, repo }) => execP(`gh run delete ${id} --repo ${repo}`))).filter(r => r.status === "err");

    if (failedArts.length || failedRuns.length) console.log(`${failedArts.length} artifacts, ${failedRuns.length} runs failed to delete.`);
    else console.log("Done.");
  } catch (e) { console.error("Failed:", e.message); process.exit(1); }
})();
