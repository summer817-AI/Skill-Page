const MANAGED_HOSTS = new Set(["summerai.cc", "skills.summerai.cc"]);
const SKILLS_URL = "https://skills.summerai.cc/";

export function onRequest(context) {
  const url = new URL(context.request.url);

  if (!MANAGED_HOSTS.has(url.hostname)) {
    return context.next();
  }

  const target = new URL(SKILLS_URL);
  target.search = url.search;
  return new Response(null, {
    status: 301,
    headers: { Location: target.toString() }
  });
}
