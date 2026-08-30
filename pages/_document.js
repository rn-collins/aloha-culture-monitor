import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script defer src="/_vercel/insights/script.js" />
        <script defer src="/_vercel/speed-insights/script.js" />
        <script dangerouslySetInnerHTML={{__html: `(function(){
  var p=new URLSearchParams(location.search),u={};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){if(p.get(k))u[k]=p.get(k);});
  if(Object.keys(u).length)sessionStorage.setItem('rn_utm',JSON.stringify(u));
  window._getUTM=function(){try{return JSON.parse(sessionStorage.getItem('rn_utm')||'{}')}catch(e){return{}}};
  window.addEventListener('load',function(){
    fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({event:'page_view',source:'aloha-culture-monitor',referrer:document.referrer||'direct',utm:window._getUTM()})
    }).catch(function(){});
  });
  var ms=[25,50,75,90],fired={};
  window.addEventListener('scroll',function(){
    var h=document.body.scrollHeight-window.innerHeight;if(h<=0)return;
    var pct=Math.round((window.scrollY/h)*100);
    ms.forEach(function(m){if(pct>=m&&!fired[m]){fired[m]=1;
      fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({event:'scroll_depth',source:'aloha-culture-monitor',depth:m+'%'})}).catch(function(){});
    }});
  },{passive:true});
})()`}} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
