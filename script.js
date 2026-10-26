const matches = [
 {league:"Premier League",region:"international",time:"Today · 17:30",home:"Arsenal",abbrH:"ARS",away:"Liverpool",abbrA:"LIV",score:"VS",status:"UPCOMING",venue:"Sample fixture"},
 {league:"La Liga",region:"international",time:"Today · 20:00",home:"Barcelona",abbrH:"FCB",away:"Real Madrid",abbrA:"RMA",score:"VS",status:"UPCOMING",venue:"Sample fixture"},
 {league:"Botola Pro",region:"morocco",time:"Today · 19:00",home:"Raja CA",abbrH:"RCA",away:"Wydad AC",abbrA:"WAC",score:"VS",status:"UPCOMING",venue:"Casablanca derby · sample"},
 {league:"Premier League",region:"international",time:"Tomorrow · 16:00",home:"Man City",abbrH:"MCI",away:"Chelsea",abbrA:"CHE",score:"VS",status:"UPCOMING",venue:"Sample fixture"},
 {league:"Botola Pro",region:"morocco",time:"Tomorrow · 18:00",home:"AS FAR",abbrH:"FAR",away:"RS Berkane",abbrA:"RSB",score:"VS",status:"UPCOMING",venue:"Sample fixture"},
 {league:"International",region:"morocco",time:"Coming soon",home:"Morocco",abbrH:"MAR",away:"Opponent TBC",abbrA:"TBC",score:"VS",status:"SCHEDULE TBC",venue:"Check official schedules"}
];
const tables = {
 premier:{title:"Premier League",rows:[["1","Arsenal","28","20","5","3","65"],["2","Liverpool","28","19","7","2","64"],["3","Man City","28","19","6","3","63"],["4","Aston Villa","28","17","4","7","55"],["5","Tottenham","27","16","5","6","53"]]},
 laliga:{title:"La Liga",rows:[["1","Real Madrid","28","21","6","1","69"],["2","Barcelona","28","18","7","3","61"],["3","Girona","28","19","5","4","62"],["4","Atlético Madrid","28","17","4","7","55"],["5","Athletic Club","28","15","8","5","53"]]},
 botola:{title:"Botola Pro",rows:[["1","Raja CA","—","—","—","—","DEMO"],["2","AS FAR","—","—","—","—","DEMO"],["3","RS Berkane","—","—","—","—","DEMO"],["4","Wydad AC","—","—","—","—","DEMO"],["5","FUS Rabat","—","—","—","—","DEMO"]]},
 ucl:{title:"Champions League",rows:[["1","Real Madrid","—","—","—","—","DEMO"],["2","Man City","—","—","—","—","DEMO"],["3","Bayern Munich","—","—","—","—","DEMO"],["4","Paris SG","—","—","—","—","DEMO"],["5","Arsenal","—","—","—","—","DEMO"]]}
};
const stories=[
 {category:"TACTICAL NOTEBOOK",title:"What makes a modern pressing system work?",desc:"A beginner-friendly look at pressing triggers, team shape and the spaces teams try to close.",icon:"♟",number:"ANALYSIS / 01",time:"5 min read"},
 {category:"MOROCCO WATCH",title:"Moroccan talent: following the next generation",desc:"A placeholder for original reporting on players, pathways and the clubs developing talent.",icon:"🇲🇦",number:"MOROCCO / 02",time:"4 min read"},
 {category:"MATCHDAY GUIDE",title:"How to prepare for a big European fixture",desc:"Form, availability, recent performance and context to check before kick-off.",icon:"🏆",number:"GUIDE / 03",time:"3 min read"}
];
function renderMatches(filter="all",query=""){
 const grid=document.getElementById("matchGrid"); const q=query.trim().toLowerCase();
 const filtered=matches.filter(m=>(filter==="all"||m.region===filter)&&(!q||[m.league,m.home,m.away,m.region].join(" ").toLowerCase().includes(q)));
 grid.innerHTML=filtered.length?filtered.map(m=>`<article class="match-card"><div class="match-card-top"><span class="match-league"><i class="league-bullet"></i>${m.league}</span><span class="demo-pill">DEMO</span></div><div class="teams"><div class="team"><span class="team-crest">${m.abbrH}</span><strong>${m.home}</strong><small>Home</small></div><div class="match-score">${m.score}<small>${m.status}</small></div><div class="team"><span class="team-crest">${m.abbrA}</span><strong>${m.away}</strong><small>Away</small></div></div><div class="match-card-bottom"><span>${m.time}</span><span>${m.venue}</span></div></article>`).join(""):`<div class="empty-state">No demo fixtures match that search. Try another team or choose “All matches”.</div>`;
}
function renderTable(key){const data=tables[key];document.getElementById("tableTitle").textContent=data.title;document.getElementById("standingsBody").innerHTML=data.rows.map((r,i)=>`<tr><td>${r[0].padStart? r[0]:""}</td><td><span class="club-cell"><span class="club-mini">${r[1].split(" ").map(w=>w[0]).join("").slice(0,3).toUpperCase()}</span>${r[1]}</span></td>${r.slice(2,6).map(v=>`<td>${v}</td>`).join("")}<td>${r[6]}</td></tr>`).join("");}
function renderNews(query=""){const q=query.trim().toLowerCase();const grid=document.getElementById("newsGrid");const filtered=stories.filter(s=>!q||[s.category,s.title,s.desc].join(" ").toLowerCase().includes(q));grid.innerHTML=filtered.map(s=>`<article class="news-card"><div class="news-art"><span class="art-number">${s.number}</span><span class="art-icon">${s.icon}</span></div><div class="news-content"><span class="news-category">${s.category}</span><h3>${s.title}</h3><p>${s.desc}</p><div class="news-meta"><span>${s.time}</span><span>Preview ↗</span></div></div></article>`).join("")||`<p class="disclaimer">No demo stories match that search.</p>`;}
document.querySelectorAll(".segment").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".segment").forEach(b=>b.classList.remove("active"));btn.classList.add("active");renderMatches(btn.dataset.filter,document.getElementById("siteSearch").value)}));
document.querySelectorAll(".league-select").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".league-select").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");renderTable(btn.dataset.league)}));
document.getElementById("searchToggle").addEventListener("click",()=>{document.getElementById("searchStrip").classList.toggle("open");if(document.getElementById("searchStrip").classList.contains("open"))document.getElementById("siteSearch").focus()});
document.getElementById("siteSearch").addEventListener("input",e=>{const q=e.target.value;const active=document.querySelector(".segment.active").dataset.filter;renderMatches(active,q);renderNews(q);document.getElementById("searchHint").textContent=q?`Filtering demo matches and stories for “${q}”`:"Try “Morocco”, “Arsenal” or “Botola”"});
document.getElementById("menuToggle").addEventListener("click",()=>document.querySelector(".desktop-nav").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>document.querySelector(".desktop-nav").classList.remove("open")));
document.getElementById("newsletterForm").addEventListener("submit",e=>{e.preventDefault();document.getElementById("newsletterNote").textContent="Demo only — email was not sent or saved.";});
document.getElementById("year").textContent=new Date().getFullYear();
renderMatches();renderTable("premier");renderNews();
