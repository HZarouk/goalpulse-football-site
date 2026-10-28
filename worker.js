const LEAGUES = new Set([39, 140, 2, 135, 78, 61, 200]);
const LEAGUE_NAMES = {39:'Premier League',140:'La Liga',2:'UEFA Champions League',135:'Serie A',78:'Bundesliga',61:'Ligue 1',200:'Botola Pro'};
const SLUG_IDS = {'premier-league':39,'english-premier-league':39,'la-liga':140,'laliga':140,'spanish-la-liga':140,'uefa-champions-league':2,'champions-league':2,'serie-a':135,'serie-a-italy':135,'italian-serie-a':135,'bundesliga':78,'german-bundesliga':78,'ligue-1':61,'ligue-1-france':61,'french-ligue-1':61,'botola-pro':200,'botola':200};
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json; charset=utf-8' };
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:cors});
function seasonFor(dateText) { const d = dateText ? new Date(dateText+'T12:00:00Z') : new Date(); return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear()-1; }
function mapFixture(x) {
 const f=x.fixture||{}, t=x.teams||{}, g=x.goals||{}, l=x.league||{};
 return { id:f.id, slug:String(f.id||''), time:f.date, status:f.status?.long || f.status?.short || 'Scheduled', status_text:f.status?.short || f.status?.long || 'Scheduled', home:t.home?.name||'Home', away:t.away?.name||'Away', home_score:g.home, away_score:g.away, home_logo:t.home?.logo||'', away_logo:t.away?.logo||'', competition:{name:l.name||'Football',slug:String(l.id||'')}, league:l.name||'Football', league_id:l.id, league_slug:String(l.id||'') };
}
function mapStandings(data) {
 const rows=data?.response?.[0]?.league?.standings?.flat?.() || [];
 return rows.map(r=>({rank:r.rank,team:{name:r.team?.name,logo:r.team?.logo},played:r.all?.played,wins:r.all?.win,draws:r.all?.draw,losses:r.all?.lose,goals_for:r.all?.goals?.for,goals_against:r.all?.goals?.against,goal_difference:r.goalsDiff,points:r.points}));
}
function mapScorers(data) { return (data?.response||[]).map(r=>({player:{name:r.player?.name},team:{name:r.statistics?.[0]?.team?.name},goals:r.statistics?.[0]?.goals?.total})).filter(r=>r.player.name && r.goals!==null && r.goals!==undefined); }
export default {
 async fetch(request, env) {
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url), path=url.pathname;
  if (!env.API_FOOTBALL_KEY) return json({error:'API_FOOTBALL_KEY secret is not configured'},500);
  const isFixturePath = path==='/api/v1/fixtures/' || path==='/api/widget/matches/';
  const rawLeague=url.searchParams.get('league') || url.searchParams.get('slug') || (isFixturePath ? 'all' : '39');
  const leagueRaw = SLUG_IDS[String(rawLeague).toLowerCase()] || rawLeague;
  const league=Number(leagueRaw);
  const season=Number(url.searchParams.get('season')) || seasonFor(url.searchParams.get('date'));
  const date=url.searchParams.get('date') || new Date().toISOString().slice(0,10);
  const api=async (endpoint,params={})=>{
    const u=new URL('https://v3.football.api-sports.io/'+endpoint);
    for(const [k,v] of Object.entries(params)) if(v!==undefined && v!==null && v!=='') u.searchParams.set(k,String(v));
    const res=await fetch(u,{headers:{'x-apisports-key':env.API_FOOTBALL_KEY}});
    const body=await res.json().catch(()=>({}));
    if(!res.ok || (body.errors && Object.keys(body.errors).length)) return {error:body.errors||`API-Football HTTP ${res.status}`,status:res.status||502};
    return {body,headers:res.headers};
  };
  try {
   if(path==='/health') return json({ok:true,provider:'API-Football',keyConfigured:true});
   if(path==='/api/v1/fixtures/' || path==='/api/widget/matches/') {
    const isLive=path==='/api/widget/matches/';
    const params=isLive?{live:'all'}:{date,season};
    if(leagueRaw!=='all' && LEAGUES.has(league)) params.league=league;
    if(!isLive && leagueRaw==='all') { /* date-wide fixtures; no league filter */ }
    const result=await api('fixtures',params); if(result.error) return json({error:result.error},result.status||502);
    let rows=(result.body.response||[]).map(mapFixture);
    if(leagueRaw!=='all' && LEAGUES.has(league)) rows=rows.filter(m=>Number(m.league_id)===league);
    return json({matches:rows,fixtures:rows,results:rows, response:rows, meta:{provider:'API-Football',season,league:leagueRaw,remaining:result.headers?.get('x-ratelimit-requests-remaining')}});
   }
   if(path==='/api/widget/standings/' || path==='/api/v1/standings/') {
    if(!LEAGUES.has(league)) return json({error:'Unsupported league ID'},400);
    const result=await api('standings',{league,season}); if(result.error) return json({error:result.error},result.status||502);
    const rows=mapStandings(result.body); return json({standings:rows,table:rows,rows,meta:{provider:'API-Football',season,league}});
   }
   if(path==='/api/widget/topscorers/' || path==='/api/v1/topscorers/') {
    if(!LEAGUES.has(league)) return json({error:'Unsupported league ID'},400);
    const result=await api('players/topscorers',{league,season}); if(result.error) return json({error:result.error},result.status||502);
    const rows=mapScorers(result.body); return json({topscorers:rows,top_scorers:rows,players:rows,rows,meta:{provider:'API-Football',season,league}});
   }
   if(path==='/api/widget/match/') {
    const id=url.searchParams.get('slug')||url.searchParams.get('id'); if(!id || !/^\d+$/.test(id)) return json({error:'A valid fixture ID is required'},400);
    const result=await api('fixtures',{id}); if(result.error) return json({error:result.error},result.status||502);
    const item=result.body.response?.[0]; if(!item) return json({error:'Fixture not found'},404);
    const m=mapFixture(item); return json({match:{...m,events:[],timeline:[],statistics:[],lineups:[],note:'Detailed events/lineups require additional API coverage.'}});
   }
   return json({error:'Not found',available:['/health','/api/v1/fixtures/','/api/widget/matches/','/api/widget/standings/','/api/widget/topscorers/','/api/widget/match/']},404);
  } catch(e) { return json({error:'Proxy failure',message:String(e?.message||e)},502); }
 }
};
