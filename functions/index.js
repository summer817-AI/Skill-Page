const APEX_HOST = "summerai.cc";
const SKILLS_HOST = "skills.summerai.cc";
const SKILLS_URL = "https://skills.summerai.cc/";

function redirectToSkills(requestUrl) {
  const target = new URL(SKILLS_URL);
  target.search = requestUrl.search;
  return new Response(null, {
    status: 301,
    headers: { Location: target.toString() }
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === SKILLS_HOST) {
    url.pathname = "/skills/";
    return context.env.ASSETS.fetch(new Request(url, context.request));
  }

  if (url.hostname === APEX_HOST) {
    return redirectToSkills(url);
  }

  return context.next();
}
