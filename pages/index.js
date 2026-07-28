import { useState, useEffect } from 'react'
import Head from 'next/head'

const G='#1B7A68',GD='#0F5E50',GL='#E8F5F2',BG='#F6F3EC',TX='#1C1B1F',MU='#5A5857',BD='#E2DDD6'
const RISK={High:{bg:'#FCEBEB',text:'#A32D2D'},Medium:{bg:'#FAEEDA',text:'#854F0B'},Low:{bg:'#EAF3DE',text:'#3B6D11'},None:{bg:'#F1EFE8',text:'#5F5E5A'}}

function ContactModal({isOpen,onClose}){
  const [form,setForm]=useState({name:'',email:'',inquiry:'',message:''})
  const [status,setStatus]=useState(null)
  if(!isOpen)return null
  const submit=async(e)=>{
    e.preventDefault();setStatus('sending')
    try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});if(!r.ok)throw new Error();setStatus('success')}catch{setStatus('error')}
  }
  return(<>
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,backdropFilter:'blur(2px)'}}/>
    <div style={{position:'fixed',bottom:0,left:0,right:0,background:'white',borderRadius:'16px 16px 0 0',padding:'36px 40px 48px',zIndex:201,maxWidth:560,margin:'0 auto',boxShadow:'0 -8px 40px rgba(0,0,0,0.15)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div><div style={{fontFamily:'Syne',fontSize:20,fontWeight:700,color:TX}}>Contact the Architect</div><div style={{fontSize:13,color:MU,marginTop:4}}>RN Collins · Aloha AI Consulting</div></div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:MU}}>✕</button>
      </div>
      {status==='success'?(<div style={{textAlign:'center',padding:'32px 0'}}><div style={{fontSize:32,marginBottom:12}}>✓</div><div style={{fontFamily:'Syne',fontSize:16,fontWeight:600,color:TX,marginBottom:8}}>Message received</div><div style={{fontSize:14,color:MU,lineHeight:1.6}}>I'll be in touch within 48 hours. Check your inbox for a confirmation.</div><button onClick={onClose} style={{marginTop:24,padding:'10px 24px',background:G,border:'none',borderRadius:6,fontFamily:'Syne',fontSize:13,fontWeight:600,color:'white',cursor:'pointer'}}>Close</button></div>):(
        <form onSubmit={submit}>
          {[{k:'name',l:'Name',t:'text',p:'Your name'},{k:'email',l:'Email',t:'email',p:'your@email.com'}].map(f=>(<div key={f.k} style={{marginBottom:16}}><label style={{display:'block',fontFamily:'Syne',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:MU,marginBottom:6}}>{f.l}</label><input type={f.t} required placeholder={f.p} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{width:'100%',padding:'10px 14px',border:`1px solid ${BD}`,borderRadius:6,fontFamily:'Manrope',fontSize:14,color:TX,background:BG,outline:'none'}}/></div>))}
          <div style={{marginBottom:16}}><label style={{display:'block',fontFamily:'Syne',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:MU,marginBottom:6}}>Inquiry type</label><select required value={form.inquiry} onChange={e=>setForm(p=>({...p,inquiry:e.target.value}))} style={{width:'100%',padding:'10px 14px',border:`1px solid ${BD}`,borderRadius:6,fontFamily:'Manrope',fontSize:14,color:TX,background:BG,appearance:'none',outline:'none'}}><option value="">Select...</option>{['Build a tool','Consulting','Speaking','Other'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div style={{marginBottom:24}}><label style={{display:'block',fontFamily:'Syne',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:MU,marginBottom:6}}>Message</label><textarea required rows={4} placeholder="What are you working on?" value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} style={{width:'100%',padding:'10px 14px',border:`1px solid ${BD}`,borderRadius:6,fontFamily:'Manrope',fontSize:14,color:TX,background:BG,outline:'none',resize:'vertical'}}/></div>
          {status==='error'&&<div style={{fontSize:13,color:'#A32D2D',marginBottom:16}}>Something went wrong. Please try again.</div>}
          <button type="submit" disabled={status==='sending'} style={{width:'100%',padding:14,background:status==='sending'?'#9BBFBA':G,border:'none',borderRadius:8,fontFamily:'Syne',fontSize:15,fontWeight:600,color:'white',cursor:status==='sending'?'not-allowed':'pointer'}}>{status==='sending'?'Sending...':'Send message'}</button>
        </form>
      )}
    </div>

{/* Contact the Architect */}
<div style={{position:'fixed',bottom:'1.5rem',right:'1.5rem',zIndex:9999}}>
  <button onClick={()=>document.getElementById('ca-modal').style.display='flex'}
    style={{fontSize:'.65rem',textTransform:'uppercase',letterSpacing:'.08em',background:'#B8842A',
    color:'#fff',border:'none',padding:'.55rem 1.1rem',borderRadius:'2rem',cursor:'pointer',
    boxShadow:'0 2px 12px rgba(0,0,0,.35)'}}>Contact the Architect</button>
</div>
<div id="ca-modal" role="dialog" aria-modal="true"
  style={{display:'none',position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.8)',
  alignItems:'center',justifyContent:'center'}}>
  <div style={{background:'#fff',maxWidth:420,width:'90%',padding:'2rem',borderRadius:4}}>
    <h2 style={{margin:'0 0 1rem'}}>Contact the Architect</h2>
    <input id="ca-name" placeholder="Name (optional)"
      style={{width:'100%',padding:'.6rem',marginBottom:'.75rem',border:'1px solid #ccc',boxSizing:'border-box'}}/>
    <input id="ca-email" type="email" placeholder="Email (required)"
      style={{width:'100%',padding:'.6rem',marginBottom:'.75rem',border:'1px solid #ccc',boxSizing:'border-box'}}/>
    <textarea id="ca-msg" rows={3} placeholder="Message"
      style={{width:'100%',padding:'.6rem',marginBottom:'.75rem',border:'1px solid #ccc',boxSizing:'border-box',resize:'vertical'}}></textarea>
    <div style={{display:'flex',gap:'.75rem',justifyContent:'flex-end'}}>
      <button onClick={()=>document.getElementById('ca-modal').style.display='none'}
        style={{background:'none',border:'1px solid #ccc',padding:'.5rem 1rem',cursor:'pointer'}}>Cancel</button>
      <button onClick={()=>{
        const e=document.getElementById('ca-email').value;
        if(!e){alert('Email is required');return;}
        fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({name:document.getElementById('ca-name').value,email:e,
          message:document.getElementById('ca-msg').value,source:'contact-architect-aloha-culture-monitor'})})
        .then(()=>{document.getElementById('ca-modal').style.display='none';alert('Sent!');})
        .catch(()=>alert('Error. Please try again.'));
      }} style={{background:'#1B7A68',color:'#fff',border:'none',padding:'.5rem 1rem',cursor:'pointer'}}>Send</button>
    </div>
  </div>
</div>
<div style={{textAlign:'center',padding:'.75rem 1rem',fontSize:'.7rem',borderTop:'1px solid rgba(0,0,0,.1)',marginTop:'2rem'}}>
  Built by <a href="https://rn-portfolio-khaki.vercel.app" target="_blank" rel="noopener"
  style={{color:'#1B7A68',textDecoration:'none'}}>RN Builds</a> — explore all AI tools and projects.
</div>
  </>)
}

export default function Home(){
  const [data,setData]=useState(null)
  const [error,setError]=useState(null)
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [contactOpen,setContactOpen]=useState(false)
  const load=async(force=false)=>{force?setRefreshing(true):setLoading(true);setError(null);try{const r=await fetch(`/api/signals${force?'?refresh=1':''}`);if(!r.ok)throw new Error();const d=await r.json();setData(d)}catch(e){setError('Unable to load signals. Please try again.')};setLoading(false);setRefreshing(false)}
  useEffect(()=>{load()},[])
  const fmtTime=ts=>ts?new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):''
  const riskC=lvl=>RISK[lvl]||RISK.None
  return(<>
    <Head><title>Culture Intelligence Monitor — Aloha AI Consulting</title><meta name="description" content="Live signal monitoring across film, television, and cultural moments driving real-world style, taste, and purchasing behavior &#x2014; with AI governance risk assessment on every signal."/><meta property="og:title" content="Culture Intelligence Monitor &#x2014; Aloha AI Consulting"/><meta property="og:description" content="Live signal monitoring across screen culture and consumer behavior, with AI governance risk assessment on every signal."/><meta property="og:type" content="website"/><meta property="og:url" content="https://aloha-culture-monitor.vercel.app"/><meta name="twitter:card" content="summary"/><meta name="twitter:title" content="Culture Intelligence Monitor &#x2014; Aloha AI Consulting"/><meta name="twitter:description" content="Live signal monitoring across screen culture and consumer behavior, with AI governance risk assessment on every signal."/><link rel="canonical" href="https://aloha-culture-monitor.vercel.app"/><link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=Manrope:wght@400;500&family=DM+Mono&display=swap" rel="stylesheet"/>      <link rel="sitemap" type="application/xml" href="/sitemap.xml"/>
      <meta name="robots" content="index, follow"/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {'@type':'Person','@id':'https://rn-portfolio-khaki.vercel.app/#rn-collins',
           'name':'RN Collins','jobTitle':'AI Educator & Consultant',
           'url':'https://rn-portfolio-khaki.vercel.app',
           'sameAs':['https://linkedin.com/in/rn-collins']},
          {'@type':'WebPage','name':'Aloha Culture Monitor — RN Collins',
           'url':'https://aloha-culture-monitor.vercel.app',
           'author':{'@id':'https://rn-portfolio-khaki.vercel.app/#rn-collins'}}
        ]
      })}} />
</Head>
    <ContactModal isOpen={contactOpen} onClose={()=>setContactOpen(false)}/>
    <a href="#main-content" style={{position:"absolute",left:"-9999px",top:"auto",width:"1px",height:"1px",overflow:"hidden"}} onFocus={e=>{e.target.style.left="8px";e.target.style.width="auto";e.target.style.height="auto"}}>Skip to main content</a>
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:BG}}>
      <header style={{background:G,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:6,background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne',fontSize:10,fontWeight:700,color:'white',letterSpacing:'.05em'}}>AAC</div>
          <div><div style={{fontFamily:'Syne',fontSize:14,fontWeight:600,color:'white'}}>Aloha AI Consulting</div><div style={{fontSize:11,color:'rgba(255,255,255,.6)'}}>Culture Intelligence Monitor</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {data?.meta?.updatedAt&&<span style={{fontFamily:'DM Mono',fontSize:11,color:'rgba(255,255,255,.6)'}}>Updated {fmtTime(data.meta.updatedAt)}</span>}
          <button onClick={()=>load(true)} disabled={refreshing||loading} style={{fontFamily:'Syne',fontSize:12,fontWeight:600,padding:'6px 14px',background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',borderRadius:4,color:'white',cursor:'pointer',opacity:(refreshing||loading)?0.5:1}}>{refreshing?'Refreshing...':'Refresh'}</button>
        </div>
      </header>
      <main id="main-content" role="main" style={{flex:1,maxWidth:1280,margin:'0 auto',padding:'48px 24px',width:'100%'}}>
        <div style={{marginBottom:40}}>
          <h1 style={{fontFamily:'Syne',fontSize:28,fontWeight:700,color:TX,marginBottom:10,letterSpacing:'-.02em'}}>Screen Culture → Consumer Behavior</h1>
          <p style={{fontSize:15,color:MU,lineHeight:1.65,maxWidth:680}}>Live signal monitoring across film, television, and cultural moments driving real-world style, taste, and purchasing behavior — with AI governance risk assessment on every signal. Data from Wikipedia, Reddit, and Google Trends. Updated daily.</p>
        </div>
        {loading&&(<div style={{display:'flex',alignItems:'center',gap:12,padding:'60px 0',color:MU,fontSize:14}}><div style={{width:12,height:12,borderRadius:'50%',background:G,animation:'pulse 1.2s ease-in-out infinite'}}/>Fetching live signals...<style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}`}</style></div>)}
        {!loading&&error&&(<div style={{padding:"40px 0",textAlign:"center"}} role="alert"><p style={{fontSize:15,color:"#A32D2D",marginBottom:16}}>{error}</p><button onClick={()=>load()} style={{fontFamily:"Syne",fontSize:13,fontWeight:600,padding:"8px 20px",background:G,border:"none",borderRadius:6,color:"white",cursor:"pointer"}}>Try again</button></div>)}
        {!loading&&data?.signals&&(<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16,marginBottom:32}}>
            {[{num:data.signals.length,label:'Active signals'},{num:data.signals.filter(s=>s.riskLevel==='High').length,label:'High governance risk'},{num:data.signals.filter(s=>s.riskLevel==='Medium').length,label:'Medium risk'},{num:data.signals.filter(s=>['Low','None'].includes(s.riskLevel)).length,label:'Low / no risk'}].map((s,i)=>(<div key={i} style={{background:'white',border:`1px solid ${BD}`,borderRadius:8,padding:'20px 24px'}}><div style={{fontFamily:'Syne',fontSize:32,fontWeight:700,color:G,lineHeight:1,marginBottom:4}}>{s.num}</div><div style={{fontSize:12,color:MU}}>{s.label}</div></div>))}
          </div>
          <div style={{background:'white',border:`1px solid ${BD}`,borderRadius:10,overflow:'hidden',overflowX:'auto'}}>
            <table aria-label="Culture signals with governance risk assessment" style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead style={{background:'#F9F7F2',borderBottom:`1px solid ${BD}`}}><tr>{['Signal','Category','Wikipedia views (7d)','Trend & news','Governance risk'].map((h,i)=>(<th key={i} scope="col" style={{fontFamily:'Syne',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:i===4?GD:MU,padding:'14px 20px',textAlign:'left',whiteSpace:'nowrap',background:i===4?GL:undefined,borderLeft:i===4?`2px solid ${GL}`:undefined}}>{h}</th>))}</tr></thead>
              <tbody>{data.signals.map((s,i)=>{const rc=riskC(s.riskLevel);return(<tr key={i} style={{borderBottom:`1px solid #F0EDE8`}}><td style={{padding:'18px 20px',minWidth:180,verticalAlign:'top'}}><div style={{fontFamily:'Syne',fontSize:14,fontWeight:600,color:TX,marginBottom:4}}>{s.title}</div><div style={{fontFamily:'DM Mono',fontSize:11,color:'#8A8784'}}>{s.source}</div></td><td style={{padding:'18px 20px',verticalAlign:'top'}}><span style={{display:'inline-block',fontFamily:'Syne',fontSize:11,fontWeight:600,padding:'4px 10px',background:GL,color:GD,borderRadius:4}}>{s.category}</span></td><td style={{padding:'18px 20px',verticalAlign:'top',minWidth:160}}>{s.wikiViews?(<div><div style={{fontFamily:'Syne',fontSize:16,fontWeight:700,color:G}}>{s.wikiViews.daily?.toLocaleString()}</div><div style={{fontSize:12,color:MU}}>avg daily views</div><div style={{fontSize:12,color:'#8A8784',marginTop:2}}>{s.wikiViews.total?.toLocaleString()} total, {s.wikiViews.days}d</div></div>):<span style={{fontSize:13,color:'#8A8784'}}>—</span>}</td><td style={{padding:'18px 20px',verticalAlign:'top',minWidth:160}}>{(s.trendsSignal||s.newsSignal)?(<div>{s.trendsSignal?.score!=null&&(<div><div style={{fontFamily:'Syne',fontSize:16,fontWeight:700,color:G}}>{s.trendsSignal.score}<span style={{fontSize:12,fontWeight:400,marginLeft:6,color:s.trendsSignal.direction==='rising'?'#3B6D11':s.trendsSignal.direction==='falling'?'#A32D2D':MU}}>{s.trendsSignal.direction==='rising'?'↑ rising':s.trendsSignal.direction==='falling'?'↓ falling':'→ stable'}</span></div><div style={{fontSize:12,color:MU}}>trend score /100</div></div>)}{s.newsSignal?.count>0&&(<div style={{marginTop:s.trendsSignal?.score!=null?6:0,fontSize:12,color:MU}}>{s.newsSignal.count} news stories{s.newsSignal.topSource?' · '+s.newsSignal.topSource:''}</div>)}</div>):<span style={{fontSize:13,color:'#8A8784'}}>—</span>}</td><td style={{padding:'18px 20px',verticalAlign:'top',minWidth:200,background:'#FAFFF9'}}><span style={{display:'inline-block',padding:'4px 10px',borderRadius:4,fontFamily:'Syne',fontSize:11,fontWeight:700,letterSpacing:'0.04em',background:rc.bg,color:rc.text,marginBottom:6}}>{s.riskLevel}</span><p style={{fontSize:12,color:MU,lineHeight:1.5,maxWidth:200,margin:0}}>{s.riskNote}</p></td></tr>)})}</tbody>
            </table>
          </div>
        </>)}
      </main>
      <footer style={{background:TX,padding:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,flexWrap:'wrap'}}>
        <div><div style={{fontFamily:'Syne',fontSize:13,fontWeight:600,color:'white'}}>RN Collins</div><div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:2}}>Neuroscientist · JD Candidate, Northeastern · AI Governance Researcher, Brown University AISLE Project</div></div>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <a href="https://linkedin.com/in/rn-collins" target="_blank" rel="noreferrer" aria-label="RN Collins on LinkedIn (opens in new tab)" style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>LinkedIn</a>
          <button onClick={()=>setContactOpen(true)} style={{fontFamily:'Syne',fontSize:12,fontWeight:600,padding:'8px 18px',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.25)',borderRadius:6,color:'white',cursor:'pointer',letterSpacing:'0.02em'}}>Contact the Architect</button>
        </div>
      </footer>
    </div>
  </>)
}
