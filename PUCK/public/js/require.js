!function(a){var b=function(m,f){var t,r,v,o,d,l,g,w=document,n="body",q=function(){},e=q,p={},c=0,k=10;g=!m.pop?[m]:m;l=f||q;function u(x,z,y){var j=w.createElement("script"),i=0;c++;j.onload=j.onreadystatechange=function(C){var B,A;if(!i&&(!this.readyState||this.readyState==="complete")){i=1;if(!y){h(z)}else{(B=function(){(y in a)?h(z):setTimeout(B,k);(A>k)?errorCounter++:A++})()}}};j.async=true;j.src=x;w[n].appendChild(j)}function h(i){i();if(!--c){l()}return true}(function s(){if(!w[n]){return setTimeout(s,k)}d=w.getElementsByTagName("script");for(t in d){if(!!d[t].src){p[d[t].src]=t}}for(t in g){if(!!g[t].pop){v=g[t][0];e=g[t][1]||e;o=g[t][2]||o}else{v=g[t]}(!p[v])?(u(v,e,o)):(e())}if(!c){l()}})()};a.require=b}(this);