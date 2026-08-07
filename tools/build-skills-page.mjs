import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const skillsPath = path.join(publicDir, "skills.json");
const authorRankPath = path.join(publicDir, "author-rank.json");
const htmlPath = path.join(publicDir, "skills", "index.html");
const llmsPath = path.join(publicDir, "llms.txt");
const skillsSiteUrl = "https://skills.summerai.cc/";

const categoryLabels = {
  office: "办公演示",
  writing: "文字处理",
  info: "信息获取",
  design: "设计视觉",
  product: "产品协作",
  research: "研究分析",
  dev: "开发工具"
};

const levelLabels = {
  high: "高",
  "medium-high": "较高",
  medium: "中",
  watchlist: "观察"
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function readOptionalJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return readJson(file);
}

function sortAuthorsByRank(authors, rankData) {
  const rankItems = rankData?.authors || [];
  const rankMap = new Map(rankItems.map((item, index) => [
    item.login,
    {
      sourceClicks: Number(item.source_clicks || 0),
      rankIndex: index
    }
  ]));

  return [...(authors || [])].sort((a, b) => {
    const ar = rankMap.get(a.login);
    const br = rankMap.get(b.login);
    const clickDiff = (br?.sourceClicks || 0) - (ar?.sourceClicks || 0);
    if (clickDiff) return clickDiff;

    const aRank = ar?.rankIndex ?? Number.MAX_SAFE_INTEGER;
    const bRank = br?.rankIndex ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;

    return 0;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sourceLabel(skill) {
  const source = skill.source_repository || skill.source_url || "";
  if (source.includes("clawhub.ai")) return "ClawHub";
  if (source.includes("open.feishu.cn") || source.includes("docs.") || source.includes("anthropic")) return "官方文档";
  if (source.includes("gist.github.com")) return "Gist";
  return "GitHub";
}

function skillUrl(skill) {
  return skill.source_url || skill.source_repository;
}

function codeBlock(lines) {
  return escapeHtml((lines || []).join("\n"));
}

function listItems(items) {
  return (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderAuthor(author) {
  return `      <button class="author-card" data-author="${escapeHtml(author.login)}" aria-pressed="false"><img src="${escapeHtml(author.avatar_url)}" alt="${escapeHtml(author.name)} 头像" loading="lazy"><span><strong>${escapeHtml(author.name)}</strong><small>${escapeHtml(author.summary)}</small></span></button>`;
}

function renderSkill(skill) {
  const cats = skill.category || [];
  const labelPills = [];
  if (skill.topic_tag) labelPills.push(skill.topic_tag);
  for (const cat of cats) {
    const label = categoryLabels[cat] || cat;
    if (!labelPills.includes(label)) labelPills.push(label);
  }
  const text = [
    skill.name,
    skill.summary,
    skill.author?.login,
    skillUrl(skill),
    ...cats,
    skill.topic_tag
  ].filter(Boolean).join(" ").toLowerCase();

  return `      <article class="skill-card" id="${escapeHtml(skill.id)}" data-category="${escapeHtml(cats.join(" "))}" data-author="${escapeHtml(skill.author?.login || "")}" data-text="${escapeHtml(text)}">
        <div class="skill-title"><img src="${escapeHtml(skill.author?.avatar_url || "")}" alt="${escapeHtml(skill.author?.login || skill.name)} 头像" loading="lazy"><h2>${escapeHtml(skill.name)}</h2></div>
        <div class="meta"><span class="pill level">推荐：${escapeHtml(levelLabels[skill.recommendation_level] || skill.recommendation_level)}</span>${labelPills.map((label) => `<span class="pill">${escapeHtml(label)}</span>`).join("")}<span class="pill source-pill">作者：${escapeHtml(skill.author?.login || "")}</span><span class="pill source-pill">来源：${escapeHtml(sourceLabel(skill))}</span></div>
        <p class="summary">${escapeHtml(skill.summary)}</p>
        <div><p class="section-title">适合场景</p><ul>${listItems(skill.use_when)}</ul></div>
        <div><p class="section-title">输入 / 输出</p><ul>${listItems(skill.inputs_outputs)}</ul></div>
        <div><p class="section-title">注意事项</p><ul>${listItems(skill.limitations)}</ul></div>
        <div><p class="section-title">安装（Windows PowerShell）</p><pre class="install"><code>${codeBlock(skill.install?.windows_powershell)}</code></pre></div>
        <div><p class="section-title">安装（macOS / Linux）</p><pre class="install"><code>${codeBlock(skill.install?.macos_linux)}</code></pre></div>
        <div><p class="section-title">调用示例</p><pre class="invoke"><code>${escapeHtml(skill.example_prompt)}</code></pre></div>
        <div><p class="section-title">来源</p><p class="source-url"><a class="source-link" href="${escapeHtml(skillUrl(skill))}" target="_blank" rel="noopener noreferrer" data-author="${escapeHtml(skill.author?.login || "")}" data-skill-id="${escapeHtml(skill.id)}" data-source-url="${escapeHtml(skillUrl(skill))}">${escapeHtml(skillUrl(skill))}</a></p></div>
      </article>`;
}

function extractStyles() {
  if (!fs.existsSync(htmlPath)) return "";
  const current = fs.readFileSync(htmlPath, "utf8");
  return (current.match(/  <style[\s\S]*?<\/style>/g) || []).join("\n");
}

function renderHtml(data) {
  const authorRank = readOptionalJson(authorRankPath, { authors: [] });
  const authors = sortAuthorsByRank(data.authors, authorRank);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "SummerAI Skill 推荐库",
    itemListElement: data.skills.map((skill, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: skill.name,
      url: `${skillsSiteUrl}#${skill.id}`
    }))
  };
  const filters = Object.entries(categoryLabels)
    .map(([key, label]) => `<button data-filter="${key}" aria-pressed="false">${label}</button>`)
    .join("");
  const styles = extractStyles();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>好用Skill 推荐</title>
  <meta name="description" content="精选好用的 AI agent skills，面向人类阅读，也方便 agent 检索、安装和调用。">
  <link rel="canonical" href="${skillsSiteUrl}">
  <meta property="og:title" content="好用Skill 推荐">
  <meta property="og:description" content="精选好用的 AI agent skills，包含 GitHub 仓库、官方文档来源、安装命令和调用示例。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${skillsSiteUrl}">
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
${styles}
</head>
<body>
  <header><div class="shell nav"><a class="brand" href="./" aria-label="返回 Skill 推荐库首页"><span><strong>好用Skill 推荐</strong></span></a><nav class="nav-links" aria-label="站点导航"><a href="./">Skill 推荐库</a><a href="../skills.json">skills.json</a><a href="../llms.txt">llms.txt</a></nav></div></header>
  <main class="shell">
    <section class="source-strip"><p>当前收录 <strong>${data.skills.length}</strong> 个 skill，来源覆盖 GitHub、官方文档和候选作者库。</p><p>入选标准：可安装、用途明确、依赖透明、风险可说明。</p></section>
    <section class="intro">
      <div class="intro-copy"><h1>好用的 agent skill，要能被人理解，也要能被 agent 搜到。</h1><p class="lead">这里滚动收录经过人工筛选的实用 skill 来源：包括 GitHub 仓库、官方文档和可信候选。每个条目都保留来源、适用场景、限制和安装命令。</p></div>
      <aside class="agent-box"><h2>Agent 读取入口</h2><p>优先读取结构化数据，再进入页面查看完整说明。</p><div class="agent-actions"><a class="data-link" href="../skills.json">skills.json</a><a class="data-link" href="../llms.txt">llms.txt</a></div></aside>
    </section>
    <div class="content-layout">
      <aside class="authors-panel">
        <div class="sidebar-title">作者仓库</div>
        <section class="authors" aria-label="作者仓库筛选">
${authors.map(renderAuthor).join("\n")}
        </section>
      </aside>
      <section class="skill-pane">
        <section class="toolbar"><div class="filters" aria-label="分类筛选"><button data-filter="all" aria-pressed="true">全部</button>${filters}</div><input class="search" type="search" placeholder="搜索 skill、作者、场景或来源" aria-label="搜索 skill"></section>
        <section class="grid" aria-live="polite">
${data.skills.map(renderSkill).join("\n")}
          <div class="empty">没有匹配的 skill，换个关键词或分类试试。</div>
        </section>
      </section>
    </div>
  </main>
  <footer><div class="shell">最后更新：${escapeHtml(data.updated_at)} · 共 ${data.skills.length} 个 skill · 公开页面不包含私钥、token 或本地隐私路径。</div></footer>
  <script>
    const search = document.querySelector('.search');
    const cards = [...document.querySelectorAll('.skill-card')];
    const empty = document.querySelector('.empty');
    const filterButtons = [...document.querySelectorAll('[data-filter]')];
    const authorButtons = [...document.querySelectorAll('.author-card[data-author]')];
    let currentFilter = 'all';
    let currentAuthor = '';
    function applyFilters() {
      const q = search.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const inCategory = currentFilter === 'all' || card.dataset.category.split(' ').includes(currentFilter);
        const inAuthor = !currentAuthor || card.dataset.author === currentAuthor;
        const inSearch = !q || card.dataset.text.toLowerCase().includes(q);
        const show = inCategory && inAuthor && inSearch;
        card.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      empty.style.display = visible ? 'none' : 'block';
    }
    search.addEventListener('input', applyFilters);
    filterButtons.forEach(btn => btn.addEventListener('click', () => { currentFilter = btn.dataset.filter; filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn))); applyFilters(); }));
    authorButtons.forEach(btn => btn.addEventListener('click', () => { currentAuthor = currentAuthor === btn.dataset.author ? '' : btn.dataset.author; authorButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.author === currentAuthor))); applyFilters(); }));
    document.querySelectorAll('.source-link').forEach(link => link.addEventListener('click', () => {
      const payload = {
        author: link.dataset.author || '',
        skill_id: link.dataset.skillId || '',
        source_url: link.dataset.sourceUrl || link.href || ''
      };
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track-source-click', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track-source-click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    }));
  </script>
</body>
</html>
`;
}

function renderLlms(data) {
  const lines = [
    "# 好用Skill 推荐",
    "",
    data.purpose,
    "",
    `Updated: ${data.updated_at}`,
    `Site: ${data.site}`,
    "",
    "## 入选标准",
    "- 可安装：必须能定位到明确的 GitHub 仓库、官方文档或可复制安装入口。",
    "- 用途明确：说明适合场景、输入输出和调用示例。",
    "- 依赖透明：标注需要的脚本、CLI、包管理器、API 或账号依赖。",
    "- 风险可说明：写清楚权限边界、账号风险、平台限制和不适合场景。",
    "",
    "## Skills"
  ];

  for (const skill of data.skills) {
    lines.push(
      "",
      `### ${skill.name}`,
      `- id: ${skill.id}`,
      `- author: ${skill.author?.login || ""}`,
      `- category: ${(skill.category || []).join(", ")}`,
      `- recommendation: ${skill.recommendation_level}`,
      `- source: ${skillUrl(skill)}`,
      `- summary: ${skill.summary}`,
      `- use_when: ${(skill.use_when || []).join("；")}`,
      `- limitations: ${(skill.limitations || []).join("；")}`,
      `- invocation_example: ${skill.example_prompt || ""}`
    );
  }
  return `${lines.join("\n")}\n`;
}

const data = readJson(skillsPath);
fs.writeFileSync(htmlPath, renderHtml(data), "utf8");
fs.writeFileSync(llmsPath, renderLlms(data), "utf8");
console.log(`Built ${data.skills.length} skills into public/skills/index.html and public/llms.txt`);
