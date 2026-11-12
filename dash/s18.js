var ATLASLIB=(()=>{var Nn=Object.defineProperty;var Ae=Object.getOwnPropertyDescriptor;var Ce=Object.getOwnPropertyNames;var Ne=Object.prototype.hasOwnProperty;var _e=(t,n)=>{for(var e in n)Nn(t,e,{get:n[e],enumerable:!0})},qe=(t,n,e,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let o of Ce(n))!Ne.call(t,o)&&o!==e&&Nn(t,o,{get:()=>n[o],enumerable:!(r=Ae(n,o))||r.enumerable});return t};var Le=t=>qe(Nn({},"__esModule",{value:!0}),t);var Ro={};_e(Ro,{feature:()=>vr,geoArea:()=>zn,geoBounds:()=>Fn,geoCentroid:()=>On,geoContains:()=>Jn,geoNaturalEarth1:()=>hr,geoPath:()=>ur,mesh:()=>Er});var $=class{constructor(){this._partials=new Float64Array(32),this._n=0}add(n){let e=this._partials,r=0;for(let o=0;o<this._n&&o<32;o++){let a=e[o],u=n+a,l=Math.abs(n)<Math.abs(a)?n-(u-a):a-(u-n);l&&(e[r++]=l),n=u}return e[r]=n,this._n=r+1,this}valueOf(){let n=this._partials,e=this._n,r,o,a,u=0;if(e>0){for(u=n[--e];e>0&&(r=u,o=n[--e],u=r+o,a=o-(u-r),!a););e>0&&(a<0&&n[e-1]<0||a>0&&n[e-1]>0)&&(o=a*2,r=u+o,o==r-u&&(u=r))}return u}};function*Ie(t){for(let n of t)yield*n}function Mt(t){return Array.from(Ie(t))}var P=1e-6,Et=1e-12,_=Math.PI,J=_/2,At=_/4,X=_*2,Y=180/_,w=_/180,A=Math.abs,Sr=Math.atan,H=Math.atan2,x=Math.cos;var Vt=Math.hypot;var S=Math.sin,yr=Math.sign||function(t){return t>0?1:t<0?-1:0},W=Math.sqrt;function wr(t){return t>1?0:t<-1?_:Math.acos(t)}function ot(t){return t>1?J:t<-1?-J:Math.asin(t)}function I(){}function jt(t,n){t&&Rr.hasOwnProperty(t.type)&&Rr[t.type](t,n)}var Pr={Feature:function(t,n){jt(t.geometry,n)},FeatureCollection:function(t,n){for(var e=t.features,r=-1,o=e.length;++r<o;)jt(e[r].geometry,n)}},Rr={Sphere:function(t,n){n.sphere()},Point:function(t,n){t=t.coordinates,n.point(t[0],t[1],t[2])},MultiPoint:function(t,n){for(var e=t.coordinates,r=-1,o=e.length;++r<o;)t=e[r],n.point(t[0],t[1],t[2])},LineString:function(t,n){_n(t.coordinates,n,0)},MultiLineString:function(t,n){for(var e=t.coordinates,r=-1,o=e.length;++r<o;)_n(e[r],n,0)},Polygon:function(t,n){Mr(t.coordinates,n)},MultiPolygon:function(t,n){for(var e=t.coordinates,r=-1,o=e.length;++r<o;)Mr(e[r],n)},GeometryCollection:function(t,n){for(var e=t.geometries,r=-1,o=e.length;++r<o;)jt(e[r],n)}};function _n(t,n,e){var r=-1,o=t.length-e,a;for(n.lineStart();++r<o;)a=t[r],n.point(a[0],a[1],a[2]);n.lineEnd()}function Mr(t,n){var e=-1,r=t.length;for(n.polygonStart();++e<r;)_n(t[e],n,1);n.polygonEnd()}function U(t,n){t&&Pr.hasOwnProperty(t.type)?Pr[t.type](t,n):jt(t,n)}var Ft=new $,bt=new $,Ar,Cr,qn,Ln,In,at={point:I,lineStart:I,lineEnd:I,polygonStart:function(){Ft=new $,at.lineStart=ze,at.lineEnd=Ge},polygonEnd:function(){var t=+Ft;bt.add(t<0?X+t:t),this.lineStart=this.lineEnd=this.point=I},sphere:function(){bt.add(X)}};function ze(){at.point=Fe}function Ge(){Nr(Ar,Cr)}function Fe(t,n){at.point=Nr,Ar=t,Cr=n,t*=w,n*=w,qn=t,Ln=x(n=n/2+At),In=S(n)}function Nr(t,n){t*=w,n*=w,n=n/2+At;var e=t-qn,r=e>=0?1:-1,o=r*e,a=x(n),u=S(n),l=In*u,h=Ln*a+l*x(o),p=l*r*S(o);Ft.add(H(p,h)),qn=t,Ln=a,In=u}function zn(t){return bt=new $,U(t,at),bt*2}function St(t){return[H(t[1],t[0]),ot(t[2])]}function it(t){var n=t[0],e=t[1],r=x(e);return[r*x(n),r*S(n),S(e)]}function Tt(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]}function dt(t,n){return[t[1]*n[2]-t[2]*n[1],t[2]*n[0]-t[0]*n[2],t[0]*n[1]-t[1]*n[0]]}function tn(t,n){t[0]+=n[0],t[1]+=n[1],t[2]+=n[2]}function $t(t,n){return[t[0]*n,t[1]*n,t[2]*n]}function yt(t){var n=W(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]);t[0]/=n,t[1]/=n,t[2]/=n}var D,tt,O,rt,wt,Ir,zr,Ct,Bt,gt,ht,mt={point:Gn,lineStart:_r,lineEnd:qr,polygonStart:function(){mt.point=Fr,mt.lineStart=Te,mt.lineEnd=$e,Bt=new $,at.polygonStart()},polygonEnd:function(){at.polygonEnd(),mt.point=Gn,mt.lineStart=_r,mt.lineEnd=qr,Ft<0?(D=-(O=180),tt=-(rt=90)):Bt>P?rt=90:Bt<-P&&(tt=-90),ht[0]=D,ht[1]=O},sphere:function(){D=-(O=180),tt=-(rt=90)}};function Gn(t,n){gt.push(ht=[D=t,O=t]),n<tt&&(tt=n),n>rt&&(rt=n)}function Gr(t,n){var e=it([t*w,n*w]);if(Ct){var r=dt(Ct,e),o=[r[1],-r[0],0],a=dt(o,r);yt(a),a=St(a);var u=t-wt,l=u>0?1:-1,h=a[0]*Y*l,p,i=A(u)>180;i^(l*wt<h&&h<l*t)?(p=a[1]*Y,p>rt&&(rt=p)):(h=(h+360)%360-180,i^(l*wt<h&&h<l*t)?(p=-a[1]*Y,p<tt&&(tt=p)):(n<tt&&(tt=n),n>rt&&(rt=n))),i?t<wt?nt(D,t)>nt(D,O)&&(O=t):nt(t,O)>nt(D,O)&&(D=t):O>=D?(t<D&&(D=t),t>O&&(O=t)):t>wt?nt(D,t)>nt(D,O)&&(O=t):nt(t,O)>nt(D,O)&&(D=t)}else gt.push(ht=[D=t,O=t]);n<tt&&(tt=n),n>rt&&(rt=n),Ct=e,wt=t}function _r(){mt.point=Gr}function qr(){ht[0]=D,ht[1]=O,mt.point=Gn,Ct=null}function Fr(t,n){if(Ct){var e=t-wt;Bt.add(A(e)>180?e+(e>0?360:-360):e)}else Ir=t,zr=n;at.point(t,n),Gr(t,n)}function Te(){at.lineStart()}function $e(){Fr(Ir,zr),at.lineEnd(),A(Bt)>P&&(D=-(O=180)),ht[0]=D,ht[1]=O,Ct=null}function nt(t,n){return(n-=t)<0?n+360:n}function Be(t,n){return t[0]-n[0]}function Lr(t,n){return t[0]<=t[1]?t[0]<=n&&n<=t[1]:n<t[0]||t[1]<n}function Fn(t){var n,e,r,o,a,u,l;if(rt=O=-(D=tt=1/0),gt=[],U(t,mt),e=gt.length){for(gt.sort(Be),n=1,r=gt[0],a=[r];n<e;++n)o=gt[n],Lr(r,o[0])||Lr(r,o[1])?(nt(r[0],o[1])>nt(r[0],r[1])&&(r[1]=o[1]),nt(o[0],r[1])>nt(r[0],r[1])&&(r[0]=o[0])):a.push(r=o);for(u=-1/0,e=a.length-1,n=0,r=a[e];n<=e;r=o,++n)o=a[n],(l=nt(r[1],o[0]))>u&&(u=l,D=o[0],O=r[1])}return gt=ht=null,D===1/0||tt===1/0?[[NaN,NaN],[NaN,NaN]]:[[D,tt],[O,rt]]}var Dt,nn,rn,en,on,an,fn,un,Tn,$n,Bn,Br,Dr,K,Q,V,ft={sphere:I,point:Dn,lineStart:Tr,lineEnd:$r,polygonStart:function(){ft.lineStart=ke,ft.lineEnd=Xe},polygonEnd:function(){ft.lineStart=Tr,ft.lineEnd=$r}};function Dn(t,n){t*=w,n*=w;var e=x(n);Ot(e*x(t),e*S(t),S(n))}function Ot(t,n,e){++Dt,rn+=(t-rn)/Dt,en+=(n-en)/Dt,on+=(e-on)/Dt}function Tr(){ft.point=De}function De(t,n){t*=w,n*=w;var e=x(n);K=e*x(t),Q=e*S(t),V=S(n),ft.point=Oe,Ot(K,Q,V)}function Oe(t,n){t*=w,n*=w;var e=x(n),r=e*x(t),o=e*S(t),a=S(n),u=H(W((u=Q*a-V*o)*u+(u=V*r-K*a)*u+(u=K*o-Q*r)*u),K*r+Q*o+V*a);nn+=u,an+=u*(K+(K=r)),fn+=u*(Q+(Q=o)),un+=u*(V+(V=a)),Ot(K,Q,V)}function $r(){ft.point=Dn}function ke(){ft.point=Ye}function Xe(){Or(Br,Dr),ft.point=Dn}function Ye(t,n){Br=t,Dr=n,t*=w,n*=w,ft.point=Or;var e=x(n);K=e*x(t),Q=e*S(t),V=S(n),Ot(K,Q,V)}function Or(t,n){t*=w,n*=w;var e=x(n),r=e*x(t),o=e*S(t),a=S(n),u=Q*a-V*o,l=V*r-K*a,h=K*o-Q*r,p=Vt(u,l,h),i=ot(p),f=p&&-i/p;Tn.add(f*u),$n.add(f*l),Bn.add(f*h),nn+=i,an+=i*(K+(K=r)),fn+=i*(Q+(Q=o)),un+=i*(V+(V=a)),Ot(K,Q,V)}function On(t){Dt=nn=rn=en=on=an=fn=un=0,Tn=new $,$n=new $,Bn=new $,U(t,ft);var n=+Tn,e=+$n,r=+Bn,o=Vt(n,e,r);return o<Et&&(n=an,e=fn,r=un,nn<P&&(n=rn,e=en,r=on),o=Vt(n,e,r),o<Et)?[NaN,NaN]:[H(e,n)*Y,ot(r/o)*Y]}function kt(t,n){function e(r,o){return r=t(r,o),n(r[0],r[1])}return t.invert&&n.invert&&(e.invert=function(r,o){return r=n.invert(r,o),r&&t.invert(r[0],r[1])}),e}function kn(t,n){return A(t)>_&&(t-=Math.round(t/X)*X),[t,n]}kn.invert=kn;function Zr(t,n,e){return(t%=X)?n||e?kt(Xr(t),Yr(n,e)):Xr(t):n||e?Yr(n,e):kn}function kr(t){return function(n,e){return n+=t,A(n)>_&&(n-=Math.round(n/X)*X),[n,e]}}function Xr(t){var n=kr(t);return n.invert=kr(-t),n}function Yr(t,n){var e=x(t),r=S(t),o=x(n),a=S(n);function u(l,h){var p=x(h),i=x(l)*p,f=S(l)*p,s=S(h),c=s*e+i*r;return[H(f*o-c*a,i*e-s*r),ot(c*o+f*a)]}return u.invert=function(l,h){var p=x(h),i=x(l)*p,f=S(l)*p,s=S(h),c=s*o-f*a;return[H(f*o+s*a,i*e+c*r),ot(c*e-i*r)]},u}function Hr(t,n,e,r,o,a){if(e){var u=x(n),l=S(n),h=r*e;o==null?(o=n+r*X,a=n-h/2):(o=Wr(u,o),a=Wr(u,a),(r>0?o<a:o>a)&&(o+=r*X));for(var p,i=o;r>0?i>a:i<a;i-=h)p=St([u,-l*x(i),-l*S(i)]),t.point(p[0],p[1])}}function Wr(t,n){n=it(n),n[0]-=t,yt(n);var e=wr(-n[1]);return((-n[2]<0?-e:e)+X-P)%X}function ln(){var t=[],n;return{point:function(e,r,o){n.push([e,r,o])},lineStart:function(){t.push(n=[])},lineEnd:I,rejoin:function(){t.length>1&&t.push(t.pop().concat(t.shift()))},result:function(){var e=t;return t=[],n=null,e}}}function Nt(t,n){return A(t[0]-n[0])<P&&A(t[1]-n[1])<P}function sn(t,n,e,r){this.x=t,this.z=n,this.o=e,this.e=r,this.v=!1,this.n=this.p=null}function cn(t,n,e,r,o){var a=[],u=[],l,h;if(t.forEach(function(d){if(!((y=d.length-1)<=0)){var y,g=d[0],q=d[y],E;if(Nt(g,q)){if(!g[2]&&!q[2]){for(o.lineStart(),l=0;l<y;++l)o.point((g=d[l])[0],g[1]);o.lineEnd();return}q[0]+=2*P}a.push(E=new sn(g,d,null,!0)),u.push(E.o=new sn(g,null,E,!1)),a.push(E=new sn(q,d,null,!1)),u.push(E.o=new sn(q,null,E,!0))}}),!!a.length){for(u.sort(n),Ur(a),Ur(u),l=0,h=u.length;l<h;++l)u[l].e=e=!e;for(var p=a[0],i,f;;){for(var s=p,c=!0;s.v;)if((s=s.n)===p)return;i=s.z,o.lineStart();do{if(s.v=s.o.v=!0,s.e){if(c)for(l=0,h=i.length;l<h;++l)o.point((f=i[l])[0],f[1]);else r(s.x,s.n.x,1,o);s=s.n}else{if(c)for(i=s.p.z,l=i.length-1;l>=0;--l)o.point((f=i[l])[0],f[1]);else r(s.x,s.p.x,-1,o);s=s.p}s=s.o,i=s.z,c=!c}while(!s.v);o.lineEnd()}}}function Ur(t){if(n=t.length){for(var n,e=0,r=t[0],o;++e<n;)r.n=o=t[e],o.p=r,r=o;r.n=o=t[0],o.p=r}}function Xn(t){return A(t[0])<=_?t[0]:yr(t[0])*((A(t[0])+_)%X-_)}function pn(t,n){var e=Xn(n),r=n[1],o=S(r),a=[S(e),-x(e),0],u=0,l=0,h=new $;o===1?r=J+P:o===-1&&(r=-J-P);for(var p=0,i=t.length;p<i;++p)if(s=(f=t[p]).length)for(var f,s,c=f[s-1],d=Xn(c),y=c[1]/2+At,g=S(y),q=x(y),E=0;E<s;++E,d=v,g=N,q=F,c=M){var M=f[E],v=Xn(M),C=M[1]/2+At,N=S(C),F=x(C),z=v-d,G=z>=0?1:-1,B=G*z,R=B>_,j=g*N;if(h.add(H(j*G*S(B),q*F+j*x(B))),u+=R?z+G*X:z,R^d>=e^v>=e){var k=dt(it(c),it(M));yt(k);var T=dt(a,k);yt(T);var m=(R^z>=0?-1:1)*ot(T[2]);(r>m||r===m&&(k[0]||k[1]))&&(l+=R^z>=0?1:-1)}}return(u<-P||u<P&&h<-Et)^l&1}function dn(t,n,e,r){return function(o){var a=n(o),u=ln(),l=n(u),h=!1,p,i,f,s={point:c,lineStart:y,lineEnd:g,polygonStart:function(){s.point=q,s.lineStart=E,s.lineEnd=M,i=[],p=[]},polygonEnd:function(){s.point=c,s.lineStart=y,s.lineEnd=g,i=Mt(i);var v=pn(p,r);i.length?(h||(o.polygonStart(),h=!0),cn(i,We,v,e,o)):v&&(h||(o.polygonStart(),h=!0),o.lineStart(),e(null,null,1,o),o.lineEnd()),h&&(o.polygonEnd(),h=!1),i=p=null},sphere:function(){o.polygonStart(),o.lineStart(),e(null,null,1,o),o.lineEnd(),o.polygonEnd()}};function c(v,C){t(v,C)&&o.point(v,C)}function d(v,C){a.point(v,C)}function y(){s.point=d,a.lineStart()}function g(){s.point=c,a.lineEnd()}function q(v,C){f.push([v,C]),l.point(v,C)}function E(){l.lineStart(),f=[]}function M(){q(f[0][0],f[0][1]),l.lineEnd();var v=l.clean(),C=u.result(),N,F=C.length,z,G,B;if(f.pop(),p.push(f),f=null,!!F){if(v&1){if(G=C[0],(z=G.length-1)>0){for(h||(o.polygonStart(),h=!0),o.lineStart(),N=0;N<z;++N)o.point((B=G[N])[0],B[1]);o.lineEnd()}return}F>1&&v&2&&C.push(C.pop().concat(C.shift())),i.push(C.filter(Ze))}}return s}}function Ze(t){return t.length>1}function We(t,n){return((t=t.x)[0]<0?t[1]-J-P:J-t[1])-((n=n.x)[0]<0?n[1]-J-P:J-n[1])}var Yn=dn(function(){return!0},He,Je,[-_,-J]);function He(t){var n=NaN,e=NaN,r=NaN,o;return{lineStart:function(){t.lineStart(),o=1},point:function(a,u){var l=a>0?_:-_,h=A(a-n);A(h-_)<P?(t.point(n,e=(e+u)/2>0?J:-J),t.point(r,e),t.lineEnd(),t.lineStart(),t.point(l,e),t.point(a,e),o=0):r!==l&&h>=_&&(A(n-r)<P&&(n-=r*P),A(a-l)<P&&(a-=l*P),e=Ue(n,e,a,u),t.point(r,e),t.lineEnd(),t.lineStart(),t.point(l,e),o=0),t.point(n=a,e=u),r=l},lineEnd:function(){t.lineEnd(),n=e=NaN},clean:function(){return 2-o}}}function Ue(t,n,e,r){var o,a,u=S(t-e);return A(u)>P?Sr((S(n)*(a=x(r))*S(e)-S(r)*(o=x(n))*S(t))/(o*a*u)):(n+r)/2}function Je(t,n,e,r){var o;if(t==null)o=e*J,r.point(-_,o),r.point(0,o),r.point(_,o),r.point(_,0),r.point(_,-o),r.point(0,-o),r.point(-_,-o),r.point(-_,0),r.point(-_,o);else if(A(t[0]-n[0])>P){var a=t[0]<n[0]?_:-_;o=e*a/2,r.point(-a,o),r.point(0,o),r.point(a,o)}else r.point(n[0],n[1])}function Jr(t){var n=x(t),e=2*w,r=n>0,o=A(n)>P;function a(i,f,s,c){Hr(c,t,e,s,i,f)}function u(i,f){return x(i)*x(f)>n}function l(i){var f,s,c,d,y;return{lineStart:function(){d=c=!1,y=1},point:function(g,q){var E=[g,q],M,v=u(g,q),C=r?v?0:p(g,q):v?p(g+(g<0?_:-_),q):0;if(!f&&(d=c=v)&&i.lineStart(),v!==c&&(M=h(f,E),(!M||Nt(f,M)||Nt(E,M))&&(E[2]=1)),v!==c)y=0,v?(i.lineStart(),M=h(E,f),i.point(M[0],M[1])):(M=h(f,E),i.point(M[0],M[1],2),i.lineEnd()),f=M;else if(o&&f&&r^v){var N;!(C&s)&&(N=h(E,f,!0))&&(y=0,r?(i.lineStart(),i.point(N[0][0],N[0][1]),i.point(N[1][0],N[1][1]),i.lineEnd()):(i.point(N[1][0],N[1][1]),i.lineEnd(),i.lineStart(),i.point(N[0][0],N[0][1],3)))}v&&(!f||!Nt(f,E))&&i.point(E[0],E[1]),f=E,c=v,s=C},lineEnd:function(){c&&i.lineEnd(),f=null},clean:function(){return y|(d&&c)<<1}}}function h(i,f,s){var c=it(i),d=it(f),y=[1,0,0],g=dt(c,d),q=Tt(g,g),E=g[0],M=q-E*E;if(!M)return!s&&i;var v=n*q/M,C=-n*E/M,N=dt(y,g),F=$t(y,v),z=$t(g,C);tn(F,z);var G=N,B=Tt(F,G),R=Tt(G,G),j=B*B-R*(Tt(F,F)-1);if(!(j<0)){var k=W(j),T=$t(G,(-B-k)/R);if(tn(T,F),T=St(T),!s)return T;var m=i[0],L=f[0],Z=i[1],b=f[1],et;L<m&&(et=m,m=L,L=et);var Gt=L-m,ct=A(Gt-_)<P,xt=ct||Gt<P;if(!ct&&b<Z&&(et=Z,Z=b,b=et),xt?ct?Z+b>0^T[1]<(A(T[0]-m)<P?Z:b):Z<=T[1]&&T[1]<=b:Gt>_^(m<=T[0]&&T[0]<=L)){var pt=$t(G,(-B+k)/R);return tn(pt,F),[T,St(pt)]}}}function p(i,f){var s=r?t:_-t,c=0;return i<-s?c|=1:i>s&&(c|=2),f<-s?c|=4:f>s&&(c|=8),c}return dn(u,l,a,r?[0,-t]:[-_,t-_])}function Kr(t,n,e,r,o,a){var u=t[0],l=t[1],h=n[0],p=n[1],i=0,f=1,s=h-u,c=p-l,d;if(d=e-u,!(!s&&d>0)){if(d/=s,s<0){if(d<i)return;d<f&&(f=d)}else if(s>0){if(d>f)return;d>i&&(i=d)}if(d=o-u,!(!s&&d<0)){if(d/=s,s<0){if(d>f)return;d>i&&(i=d)}else if(s>0){if(d<i)return;d<f&&(f=d)}if(d=r-l,!(!c&&d>0)){if(d/=c,c<0){if(d<i)return;d<f&&(f=d)}else if(c>0){if(d>f)return;d>i&&(i=d)}if(d=a-l,!(!c&&d<0)){if(d/=c,c<0){if(d>f)return;d>i&&(i=d)}else if(c>0){if(d<i)return;d<f&&(f=d)}return i>0&&(t[0]=u+i*s,t[1]=l+i*c),f<1&&(n[0]=u+f*s,n[1]=l+f*c),!0}}}}}var Xt=1e9,mn=-Xt;function Zn(t,n,e,r){function o(p,i){return t<=p&&p<=e&&n<=i&&i<=r}function a(p,i,f,s){var c=0,d=0;if(p==null||(c=u(p,f))!==(d=u(i,f))||h(p,i)<0^f>0)do s.point(c===0||c===3?t:e,c>1?r:n);while((c=(c+f+4)%4)!==d);else s.point(i[0],i[1])}function u(p,i){return A(p[0]-t)<P?i>0?0:3:A(p[0]-e)<P?i>0?2:1:A(p[1]-n)<P?i>0?1:0:i>0?3:2}function l(p,i){return h(p.x,i.x)}function h(p,i){var f=u(p,1),s=u(i,1);return f!==s?f-s:f===0?i[1]-p[1]:f===1?p[0]-i[0]:f===2?p[1]-i[1]:i[0]-p[0]}return function(p){var i=p,f=ln(),s,c,d,y,g,q,E,M,v,C,N,F={point:z,lineStart:j,lineEnd:k,polygonStart:B,polygonEnd:R};function z(m,L){o(m,L)&&i.point(m,L)}function G(){for(var m=0,L=0,Z=c.length;L<Z;++L)for(var b=c[L],et=1,Gt=b.length,ct=b[0],xt,pt,Qt=ct[0],Rt=ct[1];et<Gt;++et)xt=Qt,pt=Rt,ct=b[et],Qt=ct[0],Rt=ct[1],pt<=r?Rt>r&&(Qt-xt)*(r-pt)>(Rt-pt)*(t-xt)&&++m:Rt<=r&&(Qt-xt)*(r-pt)<(Rt-pt)*(t-xt)&&--m;return m}function B(){i=f,s=[],c=[],N=!0}function R(){var m=G(),L=N&&m,Z=(s=Mt(s)).length;(L||Z)&&(p.polygonStart(),L&&(p.lineStart(),a(null,null,1,p),p.lineEnd()),Z&&cn(s,l,m,a,p),p.polygonEnd()),i=p,s=c=d=null}function j(){F.point=T,c&&c.push(d=[]),C=!0,v=!1,E=M=NaN}function k(){s&&(T(y,g),q&&v&&f.rejoin(),s.push(f.result())),F.point=z,v&&i.lineEnd()}function T(m,L){var Z=o(m,L);if(c&&d.push([m,L]),C)y=m,g=L,q=Z,C=!1,Z&&(i.lineStart(),i.point(m,L));else if(Z&&v)i.point(m,L);else{var b=[E=Math.max(mn,Math.min(Xt,E)),M=Math.max(mn,Math.min(Xt,M))],et=[m=Math.max(mn,Math.min(Xt,m)),L=Math.max(mn,Math.min(Xt,L))];Kr(b,et,t,n,e,r)?(v||(i.lineStart(),i.point(b[0],b[1])),i.point(et[0],et[1]),Z||i.lineEnd(),N=!1):Z&&(i.lineStart(),i.point(m,L),N=!1)}E=m,M=L,v=Z}return F}}var Wn,Hn,hn,gn,_t={sphere:I,point:I,lineStart:Ke,lineEnd:I,polygonStart:I,polygonEnd:I};function Ke(){_t.point=Ve,_t.lineEnd=Qe}function Qe(){_t.point=_t.lineEnd=I}function Ve(t,n){t*=w,n*=w,Hn=t,hn=S(n),gn=x(n),_t.point=je}function je(t,n){t*=w,n*=w;var e=S(n),r=x(n),o=A(t-Hn),a=x(o),u=S(o),l=r*u,h=gn*e-hn*r*a,p=hn*e+gn*r*a;Wn.add(H(W(l*l+h*h),p)),Hn=t,hn=e,gn=r}function Qr(t){return Wn=new $,U(t,_t),+Wn}var Un=[null,null],be={type:"LineString",coordinates:Un};function vn(t,n){return Un[0]=t,Un[1]=n,Qr(be)}var Vr={Feature:function(t,n){return xn(t.geometry,n)},FeatureCollection:function(t,n){for(var e=t.features,r=-1,o=e.length;++r<o;)if(xn(e[r].geometry,n))return!0;return!1}},jr={Sphere:function(){return!0},Point:function(t,n){return br(t.coordinates,n)},MultiPoint:function(t,n){for(var e=t.coordinates,r=-1,o=e.length;++r<o;)if(br(e[r],n))return!0;return!1},LineString:function(t,n){return te(t.coordinates,n)},MultiLineString:function(t,n){for(var e=t.coordinates,r=-1,o=e.length;++r<o;)if(te(e[r],n))return!0;return!1},Polygon:function(t,n){return ne(t.coordinates,n)},MultiPolygon:function(t,n){for(var e=t.coordinates,r=-1,o=e.length;++r<o;)if(ne(e[r],n))return!0;return!1},GeometryCollection:function(t,n){for(var e=t.geometries,r=-1,o=e.length;++r<o;)if(xn(e[r],n))return!0;return!1}};function xn(t,n){return t&&jr.hasOwnProperty(t.type)?jr[t.type](t,n):!1}function br(t,n){return vn(t,n)===0}function te(t,n){for(var e,r,o,a=0,u=t.length;a<u;a++){if(r=vn(t[a],n),r===0||a>0&&(o=vn(t[a],t[a-1]),o>0&&e<=o&&r<=o&&(e+r-o)*(1-Math.pow((e-r)/o,2))<Et*o))return!0;e=r}return!1}function ne(t,n){return!!pn(t.map(to),re(n))}function to(t){return t=t.map(re),t.pop(),t}function re(t){return[t[0]*w,t[1]*w]}function Jn(t,n){return(t&&Vr.hasOwnProperty(t.type)?Vr[t.type]:xn)(t,n)}var Yt=t=>t;var Kn=new $,Qn=new $,ee,oe,Vn,jn,vt={point:I,lineStart:I,lineEnd:I,polygonStart:function(){vt.lineStart=no,vt.lineEnd=eo},polygonEnd:function(){vt.lineStart=vt.lineEnd=vt.point=I,Kn.add(A(Qn)),Qn=new $},result:function(){var t=Kn/2;return Kn=new $,t}};function no(){vt.point=ro}function ro(t,n){vt.point=ie,ee=Vn=t,oe=jn=n}function ie(t,n){Qn.add(jn*t-Vn*n),Vn=t,jn=n}function eo(){ie(ee,oe)}var bn=vt;var qt=1/0,En=qt,Zt=-qt,Sn=Zt,oo={point:io,lineStart:I,lineEnd:I,polygonStart:I,polygonEnd:I,result:function(){var t=[[qt,En],[Zt,Sn]];return Zt=Sn=-(En=qt=1/0),t}};function io(t,n){t<qt&&(qt=t),t>Zt&&(Zt=t),n<En&&(En=n),n>Sn&&(Sn=n)}var Lt=oo;var tr=0,nr=0,Wt=0,yn=0,wn=0,It=0,rr=0,er=0,Ht=0,ue,le,lt,st,ut={point:Pt,lineStart:ae,lineEnd:fe,polygonStart:function(){ut.lineStart=uo,ut.lineEnd=lo},polygonEnd:function(){ut.point=Pt,ut.lineStart=ae,ut.lineEnd=fe},result:function(){var t=Ht?[rr/Ht,er/Ht]:It?[yn/It,wn/It]:Wt?[tr/Wt,nr/Wt]:[NaN,NaN];return tr=nr=Wt=yn=wn=It=rr=er=Ht=0,t}};function Pt(t,n){tr+=t,nr+=n,++Wt}function ae(){ut.point=ao}function ao(t,n){ut.point=fo,Pt(lt=t,st=n)}function fo(t,n){var e=t-lt,r=n-st,o=W(e*e+r*r);yn+=o*(lt+t)/2,wn+=o*(st+n)/2,It+=o,Pt(lt=t,st=n)}function fe(){ut.point=Pt}function uo(){ut.point=so}function lo(){se(ue,le)}function so(t,n){ut.point=se,Pt(ue=lt=t,le=st=n)}function se(t,n){var e=t-lt,r=n-st,o=W(e*e+r*r);yn+=o*(lt+t)/2,wn+=o*(st+n)/2,It+=o,o=st*t-lt*n,rr+=o*(lt+t),er+=o*(st+n),Ht+=o*3,Pt(lt=t,st=n)}var or=ut;function Pn(t){this._context=t}Pn.prototype={_radius:4.5,pointRadius:function(t){return this._radius=t,this},polygonStart:function(){this._line=0},polygonEnd:function(){this._line=NaN},lineStart:function(){this._point=0},lineEnd:function(){this._line===0&&this._context.closePath(),this._point=NaN},point:function(t,n){switch(this._point){case 0:{this._context.moveTo(t,n),this._point=1;break}case 1:{this._context.lineTo(t,n);break}default:{this._context.moveTo(t+this._radius,n),this._context.arc(t,n,this._radius,0,X);break}}},result:I};var ar=new $,ir,ce,pe,Ut,Jt,Rn={point:I,lineStart:function(){Rn.point=co},lineEnd:function(){ir&&de(ce,pe),Rn.point=I},polygonStart:function(){ir=!0},polygonEnd:function(){ir=null},result:function(){var t=+ar;return ar=new $,t}};function co(t,n){Rn.point=de,ce=Ut=t,pe=Jt=n}function de(t,n){Ut-=t,Jt-=n,ar.add(W(Ut*Ut+Jt*Jt)),Ut=t,Jt=n}var fr=Rn;var me,Mn,he,ge,zt=class{constructor(n){this._append=n==null?ve:po(n),this._radius=4.5,this._=""}pointRadius(n){return this._radius=+n,this}polygonStart(){this._line=0}polygonEnd(){this._line=NaN}lineStart(){this._point=0}lineEnd(){this._line===0&&(this._+="Z"),this._point=NaN}point(n,e){switch(this._point){case 0:{this._append`M${n},${e}`,this._point=1;break}case 1:{this._append`L${n},${e}`;break}default:{if(this._append`M${n},${e}`,this._radius!==he||this._append!==Mn){let r=this._radius,o=this._;this._="",this._append`m0,${r}a${r},${r} 0 1,1 0,${-2*r}a${r},${r} 0 1,1 0,${2*r}z`,he=r,Mn=this._append,ge=this._,this._=o}this._+=ge;break}}}result(){let n=this._;return this._="",n.length?n:null}};function ve(t){let n=1;this._+=t[0];for(let e=t.length;n<e;++n)this._+=arguments[n]+t[n]}function po(t){let n=Math.floor(t);if(!(n>=0))throw new RangeError(`invalid digits: ${t}`);if(n>15)return ve;if(n!==me){let e=10**n;me=n,Mn=function(o){let a=1;this._+=o[0];for(let u=o.length;a<u;++a)this._+=Math.round(arguments[a]*e)/e+o[a]}}return Mn}function ur(t,n){let e=3,r=4.5,o,a;function u(l){return l&&(typeof r=="function"&&a.pointRadius(+r.apply(this,arguments)),U(l,o(a))),a.result()}return u.area=function(l){return U(l,o(bn)),bn.result()},u.measure=function(l){return U(l,o(fr)),fr.result()},u.bounds=function(l){return U(l,o(Lt)),Lt.result()},u.centroid=function(l){return U(l,o(or)),or.result()},u.projection=function(l){return arguments.length?(o=l==null?(t=null,Yt):(t=l).stream,u):t},u.context=function(l){return arguments.length?(a=l==null?(n=null,new zt(e)):new Pn(n=l),typeof r!="function"&&a.pointRadius(r),u):n},u.pointRadius=function(l){return arguments.length?(r=typeof l=="function"?l:(a.pointRadius(+l),+l),u):r},u.digits=function(l){if(!arguments.length)return e;if(l==null)e=null;else{let h=Math.floor(l);if(!(h>=0))throw new RangeError(`invalid digits: ${l}`);e=h}return n===null&&(a=new zt(e)),u},u.projection(t).digits(e).context(n)}function Kt(t){return function(n){var e=new lr;for(var r in t)e[r]=t[r];return e.stream=n,e}}function lr(){}lr.prototype={constructor:lr,point:function(t,n){this.stream.point(t,n)},sphere:function(){this.stream.sphere()},lineStart:function(){this.stream.lineStart()},lineEnd:function(){this.stream.lineEnd()},polygonStart:function(){this.stream.polygonStart()},polygonEnd:function(){this.stream.polygonEnd()}};function sr(t,n,e){var r=t.clipExtent&&t.clipExtent();return t.scale(150).translate([0,0]),r!=null&&t.clipExtent(null),U(e,t.stream(Lt)),n(Lt.result()),r!=null&&t.clipExtent(r),t}function cr(t,n,e){return sr(t,function(r){var o=n[1][0]-n[0][0],a=n[1][1]-n[0][1],u=Math.min(o/(r[1][0]-r[0][0]),a/(r[1][1]-r[0][1])),l=+n[0][0]+(o-u*(r[1][0]+r[0][0]))/2,h=+n[0][1]+(a-u*(r[1][1]+r[0][1]))/2;t.scale(150*u).translate([l,h])},e)}function xe(t,n,e){return cr(t,[[0,0],n],e)}function Ee(t,n,e){return sr(t,function(r){var o=+n,a=o/(r[1][0]-r[0][0]),u=(o-a*(r[1][0]+r[0][0]))/2,l=-a*r[0][1];t.scale(150*a).translate([u,l])},e)}function Se(t,n,e){return sr(t,function(r){var o=+n,a=o/(r[1][1]-r[0][1]),u=-a*r[0][0],l=(o-a*(r[1][1]+r[0][1]))/2;t.scale(150*a).translate([u,l])},e)}var ye=16,mo=x(30*w);function pr(t,n){return+n?go(t,n):ho(t)}function ho(t){return Kt({point:function(n,e){n=t(n,e),this.stream.point(n[0],n[1])}})}function go(t,n){function e(r,o,a,u,l,h,p,i,f,s,c,d,y,g){var q=p-r,E=i-o,M=q*q+E*E;if(M>4*n&&y--){var v=u+s,C=l+c,N=h+d,F=W(v*v+C*C+N*N),z=ot(N/=F),G=A(A(N)-1)<P||A(a-f)<P?(a+f)/2:H(C,v),B=t(G,z),R=B[0],j=B[1],k=R-r,T=j-o,m=E*k-q*T;(m*m/M>n||A((q*k+E*T)/M-.5)>.3||u*s+l*c+h*d<mo)&&(e(r,o,a,u,l,h,R,j,G,v/=F,C/=F,N,y,g),g.point(R,j),e(R,j,G,v,C,N,p,i,f,s,c,d,y,g))}}return function(r){var o,a,u,l,h,p,i,f,s,c,d,y,g={point:q,lineStart:E,lineEnd:v,polygonStart:function(){r.polygonStart(),g.lineStart=C},polygonEnd:function(){r.polygonEnd(),g.lineStart=E}};function q(z,G){z=t(z,G),r.point(z[0],z[1])}function E(){f=NaN,g.point=M,r.lineStart()}function M(z,G){var B=it([z,G]),R=t(z,G);e(f,s,i,c,d,y,f=R[0],s=R[1],i=z,c=B[0],d=B[1],y=B[2],ye,r),r.point(f,s)}function v(){g.point=q,r.lineEnd()}function C(){E(),g.point=N,g.lineEnd=F}function N(z,G){M(o=z,G),a=f,u=s,l=c,h=d,p=y,g.point=M}function F(){e(f,s,i,c,d,y,a,u,o,l,h,p,ye,r),g.lineEnd=v,v()}return g}}var vo=Kt({point:function(t,n){this.stream.point(t*w,n*w)}});function xo(t){return Kt({point:function(n,e){var r=t(n,e);return this.stream.point(r[0],r[1])}})}function Eo(t,n,e,r,o){function a(u,l){return u*=r,l*=o,[n+t*u,e-t*l]}return a.invert=function(u,l){return[(u-n)/t*r,(e-l)/t*o]},a}function we(t,n,e,r,o,a){if(!a)return Eo(t,n,e,r,o);var u=x(a),l=S(a),h=u*t,p=l*t,i=u/t,f=l/t,s=(l*e-u*n)/t,c=(l*n+u*e)/t;function d(y,g){return y*=r,g*=o,[h*y-p*g+n,e-p*y-h*g]}return d.invert=function(y,g){return[r*(i*y-f*g+s),o*(c-f*y-i*g)]},d}function dr(t){return So(function(){return t})()}function So(t){var n,e=150,r=480,o=250,a=0,u=0,l=0,h=0,p=0,i,f=0,s=1,c=1,d=null,y=Yn,g=null,q,E,M,v=Yt,C=.5,N,F,z,G,B;function R(m){return z(m[0]*w,m[1]*w)}function j(m){return m=z.invert(m[0],m[1]),m&&[m[0]*Y,m[1]*Y]}R.stream=function(m){return G&&B===m?G:G=vo(xo(i)(y(N(v(B=m)))))},R.preclip=function(m){return arguments.length?(y=m,d=void 0,T()):y},R.postclip=function(m){return arguments.length?(v=m,g=q=E=M=null,T()):v},R.clipAngle=function(m){return arguments.length?(y=+m?Jr(d=m*w):(d=null,Yn),T()):d*Y},R.clipExtent=function(m){return arguments.length?(v=m==null?(g=q=E=M=null,Yt):Zn(g=+m[0][0],q=+m[0][1],E=+m[1][0],M=+m[1][1]),T()):g==null?null:[[g,q],[E,M]]},R.scale=function(m){return arguments.length?(e=+m,k()):e},R.translate=function(m){return arguments.length?(r=+m[0],o=+m[1],k()):[r,o]},R.center=function(m){return arguments.length?(a=m[0]%360*w,u=m[1]%360*w,k()):[a*Y,u*Y]},R.rotate=function(m){return arguments.length?(l=m[0]%360*w,h=m[1]%360*w,p=m.length>2?m[2]%360*w:0,k()):[l*Y,h*Y,p*Y]},R.angle=function(m){return arguments.length?(f=m%360*w,k()):f*Y},R.reflectX=function(m){return arguments.length?(s=m?-1:1,k()):s<0},R.reflectY=function(m){return arguments.length?(c=m?-1:1,k()):c<0},R.precision=function(m){return arguments.length?(N=pr(F,C=m*m),T()):W(C)},R.fitExtent=function(m,L){return cr(R,m,L)},R.fitSize=function(m,L){return xe(R,m,L)},R.fitWidth=function(m,L){return Ee(R,m,L)},R.fitHeight=function(m,L){return Se(R,m,L)};function k(){var m=we(e,0,0,s,c,f).apply(null,n(a,u)),L=we(e,r-m[0],o-m[1],s,c,f);return i=Zr(l,h,p),F=kt(n,L),z=kt(i,F),N=pr(F,C),T()}function T(){return G=B=null,R}return function(){return n=t.apply(this,arguments),R.invert=n.invert&&j,k()}}function mr(t,n){var e=n*n,r=e*e;return[t*(.8707-.131979*e+r*(-.013791+r*(.003971*e-.001529*r))),n*(1.007226+e*(.015085+r*(-.044475+.028874*e-.005916*r)))]}mr.invert=function(t,n){var e=n,r=25,o;do{var a=e*e,u=a*a;e-=o=(e*(1.007226+a*(.015085+u*(-.044475+.028874*a-.005916*u)))-n)/(1.007226+a*(.015085*3+u*(-.044475*7+.028874*9*a-.005916*11*u)))}while(A(o)>P&&--r>0);return[t/(.8707+(a=e*e)*(-.131979+a*(-.013791+a*a*a*(.003971-.001529*a)))),e]};function hr(){return dr(mr).scale(175.295)}function gr(t){return t}function An(t){if(t==null)return gr;var n,e,r=t.scale[0],o=t.scale[1],a=t.translate[0],u=t.translate[1];return function(l,h){h||(n=e=0);var p=2,i=l.length,f=new Array(i);for(f[0]=(n+=l[0])*r+a,f[1]=(e+=l[1])*o+u;p<i;)f[p]=l[p],++p;return f}}function Pe(t,n){for(var e,r=t.length,o=r-n;o<--r;)e=t[o],t[o++]=t[r],t[r]=e}function vr(t,n){return typeof n=="string"&&(n=t.objects[n]),n.type==="GeometryCollection"?{type:"FeatureCollection",features:n.geometries.map(function(e){return Re(t,e)})}:Re(t,n)}function Re(t,n){var e=n.id,r=n.bbox,o=n.properties==null?{}:n.properties,a=Cn(t,n);return e==null&&r==null?{type:"Feature",properties:o,geometry:a}:r==null?{type:"Feature",id:e,properties:o,geometry:a}:{type:"Feature",id:e,bbox:r,properties:o,geometry:a}}function Cn(t,n){var e=An(t.transform),r=t.arcs;function o(i,f){f.length&&f.pop();for(var s=r[i<0?~i:i],c=0,d=s.length;c<d;++c)f.push(e(s[c],c));i<0&&Pe(f,d)}function a(i){return e(i)}function u(i){for(var f=[],s=0,c=i.length;s<c;++s)o(i[s],f);return f.length<2&&f.push(f[0]),f}function l(i){for(var f=u(i);f.length<4;)f.push(f[0]);return f}function h(i){return i.map(l)}function p(i){var f=i.type,s;switch(f){case"GeometryCollection":return{type:f,geometries:i.geometries.map(p)};case"Point":s=a(i.coordinates);break;case"MultiPoint":s=i.coordinates.map(a);break;case"LineString":s=u(i.arcs);break;case"MultiLineString":s=i.arcs.map(u);break;case"Polygon":s=h(i.arcs);break;case"MultiPolygon":s=i.arcs.map(h);break;default:return null}return{type:f,coordinates:s}}return p(n)}function xr(t,n){var e={},r={},o={},a=[],u=-1;n.forEach(function(p,i){var f=t.arcs[p<0?~p:p],s;f.length<3&&!f[1][0]&&!f[1][1]&&(s=n[++u],n[u]=p,n[i]=s)}),n.forEach(function(p){var i=l(p),f=i[0],s=i[1],c,d;if(c=o[f])if(delete o[c.end],c.push(p),c.end=s,d=r[s]){delete r[d.start];var y=d===c?c:c.concat(d);r[y.start=c.start]=o[y.end=d.end]=y}else r[c.start]=o[c.end]=c;else if(c=r[s])if(delete r[c.start],c.unshift(p),c.start=f,d=o[f]){delete o[d.end];var g=d===c?c:d.concat(c);r[g.start=d.start]=o[g.end=c.end]=g}else r[c.start]=o[c.end]=c;else c=[p],r[c.start=f]=o[c.end=s]=c});function l(p){var i=t.arcs[p<0?~p:p],f=i[0],s;return t.transform?(s=[0,0],i.forEach(function(c){s[0]+=c[0],s[1]+=c[1]})):s=i[i.length-1],p<0?[s,f]:[f,s]}function h(p,i){for(var f in p){var s=p[f];delete i[s.start],delete s.start,delete s.end,s.forEach(function(c){e[c<0?~c:c]=1}),a.push(s)}}return h(o,r),h(r,o),n.forEach(function(p){e[p<0?~p:p]||a.push([p])}),a}function Er(t){return Cn(t,Me.apply(this,arguments))}function Me(t,n,e){var r,o,a;if(arguments.length>1)r=yo(t,n,e);else for(o=0,r=new Array(a=t.arcs.length);o<a;++o)r[o]=o;return{type:"MultiLineString",arcs:xr(t,r)}}function yo(t,n,e){var r=[],o=[],a;function u(f){var s=f<0?~f:f;(o[s]||(o[s]=[])).push({i:f,g:a})}function l(f){f.forEach(u)}function h(f){f.forEach(l)}function p(f){f.forEach(h)}function i(f){switch(a=f,f.type){case"GeometryCollection":f.geometries.forEach(i);break;case"LineString":l(f.arcs);break;case"MultiLineString":case"Polygon":h(f.arcs);break;case"MultiPolygon":p(f.arcs);break}}return i(n),o.forEach(e==null?function(f){r.push(f[0].i)}:function(f){e(f[0].g,f[f.length-1].g)&&r.push(f[0].i)}),r}return Le(Ro);})();
var ATLAS_GEO0={"fazemodels.com":{"k":"kreuzbergstraß","p":[[52.48966,13.3781,"a"]]},"division.pl":{"k":"ulburakowska57","p":[[52.25437,20.97896,"a"]]},"establishedmodels.com":{"k":"floor4812broad","p":[[51.51401,-0.13492,"a"]]},"exilesmodels.com":{"k":"6fmarueibldg19","p":[[35.664352,139.701416,"a"]]},"tomorrowtokyo.com":{"k":"1500041東京都渋谷区神","p":[[35.664352,139.701416,"a"]]},"foxmodel.com.ua":{"k":"01601ukraineky","p":[[50.43739,30.53434,"a"]]},"hmodels.sk":{"k":"zadráhou219020","p":[[48.2788,17.26533,"a"]]},"image-tokyo.co.jp":{"k":"1070062東京都港区南青","p":[[35.668777,139.725967,"a"]]},"ivetfashion.com":{"k":"32tzarasenstr1","p":[[42.69141,23.31839,"a"]]},"lady-models.ru":{"k":"московскоешосс","p":[[53.20343,50.14592,"a"]]},"medusamodel.com":{"k":"ruadostatuis55","p":[[-22.93227,-42.48248,"a"]]},"modern-muse.com":{"k":"121sorangeaves","p":[[28.54118,-81.3789,"a"]]},"onemanagement.com":{"k":"42bondstreet2n","p":[[40.7264,-73.99343,"a","New York","United States"],[41.38713,2.16742,"a","Barcelona","Spain"]]},"satorujapan.co.jp":{"k":"1500001東京都渋谷区神","p":[[35.666138,139.706085,"a"]]},"stage-models.com":{"k":"rmblg4023517ki","p":[[35.665634,139.712769,"a"]]},"waymodel.com.br":{"k":"alamedasantos2","p":[[-23.55937,-46.66113,"a"]]},"wizardmodels.com":{"k":"5bfutababldg11","p":[[35.65659,139.697815,"a"]]},"yoomodels.com":{"k":"office404114аk","p":[[43.12165,131.92554,"a"]]},"bravomodels.net":{"k":"hillsideterrac","p":[[35.64771,139.70107,"a"]]},"azuremodels.com.br":{"k":"portoalegrerio","p":[[-30.0346,-51.2177,"c","Porto Alegre"]]},"tanksmanagement.com":{"k":"istanbulturkey","p":[[41.0082,28.9784,"c","Istanbul"]]},"mishelmodels.sumy.ua":{"k":"sumyukrainenos","p":[[50.9077,34.7981,"c","Sumy"]]}};
var ATLAS_CITY={"United Kingdom|London":[51.5085,-0.1257],"Czech Republic|Prague":[50.088,14.4208],"Canada|Montreal":[45.5088,-73.5878],"Brazil|Porto Alegre":[-30.0328,-51.2302],"Canada|Toronto":[43.7064,-79.3986],"Lithuania|Vilnius":[54.6892,25.2798],"Mexico|Mexico City":[19.4285,-99.1277],"Mexico|Guadalajara":[20.6774,-103.3475],"United Kingdom|Glasgow":[55.8651,-4.2576],"Turkey|Istanbul":[41.0138,28.9497],"Germany|Munich":[48.1374,11.5755],"Hungary|Budapest":[47.4984,19.0404],"Belgium|Brussels":[50.8505,4.3488],"Slovakia|Bratislava":[48.1482,17.1067],"Ukraine|Kyiv":[50.4547,30.5238],"Slovakia|Pezinok":[48.2899,17.2666],"Russia|Kaliningrad":[54.7064,20.511],"Russia|Vladivostok":[43.1056,131.8735],"Japan|Tokyo":[35.6895,139.6917],"Bulgaria|Sofia":[42.6975,23.3241],"United States|New York":[40.7143,-74.006],"United States|Austin":[30.2672,-97.7431],"Brazil|São Paulo":[-23.5475,-46.6361],"Canada|Vancouver":[49.2497,-123.1193],"Poland|Wroclaw":[51.1029,17.0301],"Australia|Sydney":[-33.8678,151.2073],"Canada|Calgary":[51.0501,-114.0853],"United States|Orlando":[28.5383,-81.3792],"Uruguay|Montevideo":[-34.9033,-56.1882],"Ireland|Dublin":[53.3331,-6.2489],"Romania|Bucharest":[44.4323,26.1063],"United States|Los Angeles":[34.0522,-118.2437],"United States|Chicago":[41.85,-87.65],"Spain|Barcelona":[41.3888,2.159],"France|Paris":[48.8534,2.3488],"Latvia|Riga":[56.946,24.1059],"United States|Las Vegas":[36.175,-115.1372],"Estonia|Tallinn":[59.437,24.7535],"Ukraine|Sumy":[50.9174,34.7991],"Brazil|Saquarema":[-22.8989,-42.4699],"Russia|Moscow":[55.752,37.6178],"Russia|Orenburg":[51.7671,55.0988],"Brazil|Salvador":[-12.9756,-38.491],"Russia|Saint Petersburg":[59.9386,30.3141],"Bulgaria|Varna":[43.2191,27.9102],"Bulgaria|Plovdiv":[42.1539,24.75],"Poland|Warsaw":[52.2298,21.0118],"South Korea|Seoul":[37.566,126.9784],"Germany|Berlin":[52.5244,13.4105],"Netherlands|Amsterdam":[52.3676,4.9041],"Netherlands|The Hague":[52.0705,4.3007],"Netherlands|Den Haag":[52.0705,4.3007],"Russia|Guangzhou":[23.1291,113.2644,"China"]};
/* ================= Atlas =================
   The continent widget opened out into a tab of its own. World, then a region, then a
   country - the map flies to each and the panel beside it lists what is there. Pins
   stand only where an address is on file: a street address is a solid pin on that
   building, a city with no street is a hollow one in the middle of the city. */
(function(){
  'use strict';
  const LIB = window.ATLASLIB;
  const W = 1000, H = 520;
  let ANT = null, ANTLO = null;
  const RB = {'North America': [-168, 7, -52, 72], 'South America': [-92, -56, -33, 13],
    'Europe': [-25, 34, 60, 71.5], 'Northern Europe': [-25, 49.5, 32, 71.5], 'Western Europe': [-5.5, 42.2, 17.5, 55.2],
    'Southern Europe': [-10, 34.5, 45, 47.5], 'Eastern Europe': [12, 41, 60, 70], 'Africa': [-19, -36, 53, 38], 'Asia': [25, -11, 150, 56],
    'Oceania': [110, -48, 180, -3]};
  /* a few countries whose outline carries far islands or territories - the map frames
     the part people mean */
  const CBOX = {'United States': [-125, 24, -66.5, 49.5], 
    'France': [-5.5, 41.2, 9.8, 51.3], 'Norway': [4.2, 57.8, 31.2, 71.3],
    'Netherlands': [3.2, 50.7, 7.3, 53.6], 'Spain': [-9.5, 35.8, 4.4, 43.9],
    'Portugal': [-9.6, 36.9, -6.1, 42.2], 'United Kingdom': [-8.3, 49.8, 1.9, 58.8],
    'New Zealand': [166, -47.4, 178.8, -34.2], 'Chile': [-76, -55.9, -66.3, -17.4],
    'Denmark': [8, 54.5, 15.3, 57.8], 'Ecuador': [-81.1, -5.1, -75.1, 1.5]};
  const ORDER = ['Northern Europe', 'Western Europe', 'Southern Europe', 'Eastern Europe', 'Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania'];
  const GEOX = new Map();         // pins set by hand, from the shared store
  /* each ID's own favourites and own running order, kept in the shared store under
     that ID (and in this browser until someone signs in) */
  let FAV = [], ORD = {};
  const PREFKEY = () => 'illum.atlas.' + ((typeof ME !== 'undefined' && ME) || 'anon');
  function prefLocal(){ try{ const v = JSON.parse(localStorage.getItem(PREFKEY()) || 'null'); if(v){ FAV = v.f || []; ORD = v.o || {}; } }catch(e){} }
  let prefWho = null;
  async function loadPref(){
    const who = (typeof ME !== 'undefined' && ME) || '';
    if(prefWho === who) return;
    prefWho = who; FAV = []; ORD = {};
    prefLocal();
    if(!who || typeof DB === 'undefined' || !DB) return;
    try{
      const v = docOf(await DB.doc('atlpref/' + who).get());
      if(v && (v.f || v.o)){ FAV = Array.isArray(v.f) ? v.f : []; ORD = v.o && typeof v.o === 'object' ? v.o : {}; }
      render();
      try{ if(typeof VIEW !== 'undefined' && VIEW === 'dir') refresh(); }catch(e){}
    }catch(e){}
  }
  let prefT = 0;
  function savePref(){
    try{ localStorage.setItem(PREFKEY(), JSON.stringify({f: FAV, o: ORD})); }catch(e){}
    clearTimeout(prefT);
    prefT = setTimeout(async () => {
      const who = (typeof ME !== 'undefined' && ME) || '';
      if(!who || typeof DB === 'undefined' || !DB) return;
      try{ await DB.doc('atlpref/' + who).set({f: FAV, o: ORD}); }catch(e){}
    }, 400);
  }
  /* a list in the order this ID set; names not yet placed follow, A to Z */
  function ordered(key, list){
    const o = ORD[key] || [];
    const at = new Map(o.map((d, i) => [d, i]));
    return list.slice().sort((a, b) => {
      const ia = at.has(a.d) ? at.get(a.d) : 1e6, ib = at.has(b.d) ? at.get(b.d) : 1e6;
      return ia - ib || a.nm.localeCompare(b.nm);
    });
  }
  let built = false, svg, gC, gP, wrap, side, tip, proj, path;
  let FE = [];                    // country features: {id, nm, rg, f, el, box}
  const FBYN = new Map();
  let VB = [0, 0, W, H], anim = 0, LAM = 0, gB, RS = [], BUBS = [];
  const S = {lv: 'world', r: '', c: '', sel: '', sp: null, tab: 'all'};
  const isC = () => S.lv === 'country' || S.lv === 'agency';
  const esc2 = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
  const nf = n => Number(n || 0).toLocaleString();
  const norm = s => Array.from(String(s || '').toLowerCase()).filter(ch => /[\p{L}\p{N}]/u.test(ch)).slice(0, 14).join('');
  const EUSUBM = (function(){ const m = new Map(); const add = (r, l) => l.forEach(c => m.set(c.toLowerCase(), r));
    add('Northern Europe', ['United Kingdom', 'UK', 'Great Britain', 'England', 'Scotland', 'Wales', 'Ireland', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Estonia', 'Latvia', 'Lithuania', 'Iceland', 'Faroe Islands', 'Åland Islands', 'Guernsey', 'Jersey', 'Isle of Man']);
    add('Western Europe', ['France', 'Germany', 'Netherlands', 'The Netherlands', 'Holland', 'Belgium', 'Switzerland', 'Austria', 'Luxembourg', 'Monaco', 'Liechtenstein']);
    add('Southern Europe', ['Italy', 'Spain', 'Portugal', 'Greece', 'Serbia', 'San Marino', 'Croatia', 'Malta', 'Slovenia', 'Turkey', 'Türkiye', 'Cyprus', 'N. Cyprus', 'Albania', 'Montenegro', 'North Macedonia', 'Macedonia', 'Bosnia and Herzegovina', 'Andorra', 'Kosovo', 'Vatican City']);
    add('Eastern Europe', ['Russia', 'Poland', 'Ukraine', 'Czech Republic', 'Czechia', 'Hungary', 'Romania', 'Bulgaria', 'Slovakia', 'Belarus', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan']);
    return m; })();
  const EU = (rg, c) => rg === 'Europe' ? (EUSUBM.get(String(c || '').trim().toLowerCase()) || 'Europe') : rg;
  const rgOf = nm => EU((typeof REGION !== 'undefined' && REGION[nm]) || (CT[nm] && CT[nm].rg) || '', nm);
  let CT = {};                    // country name -> {rg}

  /* ---------- data ---------- */
  function pinsOf(d){
    if(GEOX.has(d)){
      const g = GEOX.get(d), now = typeof ADDR !== 'undefined' ? (ADDR.get(d) || '') : '';
      if(g.a != null && now && norm(now) !== norm(g.a)) return null;   // moved again since the pin was set
      return g.p.map(p => ({lat: p[0], lng: p[1], pr: 'a', lb: p[2] || '', ct: p[3] || ''}));
    }
    const g = ATLAS_GEO0[d];
    if(!g) return [];
    const now = typeof ADDR !== 'undefined' ? (ADDR.get(d) || '') : '';
    if(now && norm(now) !== g.k) return null;     // the address changed after the pin was set
    return g.p.map(p => ({lat: p[0], lng: p[1], pr: p[2], lb: p[3] || '', ct: p[4] || ''}));
  }
  function cityPins(a){
    const out = [];
    for(const part of String(a.city || '').split('/').map(s => s.trim()).filter(Boolean)){
      const c = (window.ATLAS_CITY || {})[(a.country || '') + '|' + part];
      if(c) out.push({lat: c[0], lng: c[1], pr: 'c', lb: part, ct: c[2] || ''});
    }
    return out;
  }
  function rows(){
    const qv = (document.getElementById('q') || {}).value || '';
    const term = qv.trim().toLowerCase();
    const out = [];
    const DOMN = new Map();
    for(const a of (typeof AG !== 'undefined' ? AG : [])) DOMN.set(a.domain, (DOMN.get(a.domain) || 0) + 1);
    for(const a of (typeof AG !== 'undefined' ? AG : [])){
      const addr = typeof ADDR !== 'undefined' ? (ADDR.get(a.domain) || '') : '';
      if(term){
        const hay = (a.name + ' ' + (a.city || '') + ' ' + (a.country || '') + ' ' + a.domain + ' ' + addr).toLowerCase();
        if(!hay.includes(term)) continue;
      }
      let sx = {F: 0, M: 0, Q: 0};
      try{ sx = dirSexOf(a.boards || []); }catch(e){}
      let ex = pinsOf(a.domain);
      /* one website, several offices (ONE Management New York, Los Angeles, Spain…): each
         office takes only the address that is its own city, or the middle of its city */
      if(ex && ex.length && DOMN.get(a.domain) > 1){
        const c = String(a.city || '').toLowerCase().trim();
        ex = ex.filter(p => p.lb ? p.lb.toLowerCase() === c : (p.ct || a.country) === a.country && !c);
      }
      /* no street address: fall back to the city the agency names, in the middle of that city */
      const pins = ex && ex.length ? ex : cityPins(a);
      const loc = pins.some(p => p.pr === 'a') ? 'pin' : pins.length ? 'city' : 'none';
      out.push({a, d: a.domain, nm: a.name, ct: a.country || '', city: a.city || '',
        rg: EU(a.region || (typeof REGION !== 'undefined' && REGION[a.country]) || 'Unknown', a.country),
        sx, n: sx.F + sx.M + sx.Q, addr, pins, loc, stale: ex === null});
    }
    return out;
  }
  const sum = list => list.reduce((o, r) => (o.F += r.sx.F, o.M += r.sx.M, o.Q += r.sx.Q, o.n += r.n, o), {F: 0, M: 0, Q: 0, n: 0});

  /* ---------- map ---------- */
  function build(){
    if(built) return;
    built = true;
    const topo = JSON.parse(document.getElementById('atltopo').textContent);
    const ctab = JSON.parse(document.getElementById('atlctab').textContent);
    const fc = LIB.feature(topo, topo.objects.countries);
    const land = fc.features.filter(f => f.id !== '010');           // no Antarctica
    /* the whole globe fits the frame, so the world sits in the middle of it; Antarctica is
       drawn for balance only - nothing to click there */
    ANT = fc.features.find(f => f.id === '010') || null;
    proj = LIB.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], {type: 'Sphere'});
    path = LIB.geoPath(proj);
    for(const f of land){
      const t = ctab[f.id] || [String(f.id), ''];
      CT[t[0]] = {rg: t[1]};
    }
    let lo = new Map();
    try{
      const t2 = JSON.parse(document.getElementById('atltopo2').textContent);
      for(const f of LIB.feature(t2, t2.objects.countries).features) lo.set(String(f.id), f);
    }catch(e){}
    ANTLO = (ANT && lo.get('010')) || ANT;
    for(const f of land){
      const t = ctab[f.id] || [String(f.id), ''];
      const nm = t[0];
      const x = {id: f.id, nm, rg: rgOf(nm) || EU(t[1], nm), f, lo: lo.get(String(f.id)) || f, d: path(f), ll: LBL[nm] || labelPoint(f)};
      FE.push(x);
      /* a few islands share their country's number in the map data; the name belongs to the mainland */
      const had = FBYN.get(nm);
      if(!had || path.area(f) > path.area(had.f)) FBYN.set(nm, x);
    }
    wrap = document.getElementById('atlmap');
    side = document.getElementById('atlside');
    tip = document.getElementById('atltip');
    svg = wrap.querySelector('svg');
    svg.setAttribute('viewBox', VB.join(' '));
    svg.innerHTML = '<path class="atlsea" d="' + path({type: 'Sphere'}) + '"/>' +
      (ANT ? '<path class="atlant" d="' + path(ANT) + '"/>' : '') +
      '<g class="atlc">' + FE.map((x, i) => '<path data-i="' + i + '" d="' + x.d + '"/>').join('') + '</g>' +
      '<g class="atls"></g><g class="atll"></g><g class="atlb"></g><g class="atlp"></g>';
    gC = svg.querySelector('.atlc'); gP = svg.querySelector('.atlp'); gB = svg.querySelector('.atlb');
    FE.forEach((x, i) => { x.el = gC.children[i]; });
    wire();
    loadGeo();
  }
  const pj = (lng, lat) => proj([lng, lat]);
  /* where a country's count sits: the middle of its largest piece of land */
  const LBL = {'United States': [-98, 39.5], 'Russia': [44, 57], 'Canada': [-100, 55], 'Norway': [9, 61],
    'France': [2.4, 46.6], 'Netherlands': [5.6, 52.2], 'United Kingdom': [-1.8, 52.8], 'Japan': [138.5, 36.4]};
  function labelPoint(f){
    const g = f.geometry;
    if(!g) return [0, 0];
    let best = g, ba = -1;
    if(g.type === 'MultiPolygon') for(const c of g.coordinates){
      const p = {type: 'Polygon', coordinates: c};
      let a = LIB.geoArea(p);
      if(a > 2 * Math.PI) a = 4 * Math.PI - a;          // a ring wound the other way
      if(a > ba){ ba = a; best = p; }
    }
    return LIB.geoCentroid(best);
  }
  /* the globe turns: every outline and pin is drawn again for the new centre line.
     While it moves the coarse outlines are used, then the fine ones once it stops. */
  let loNow = false;
  function reproject(coarse){
    proj.rotate([LAM, 0]);
    for(const x of FE){ x.el.setAttribute('d', path(coarse ? x.lo : x.f)); }
    const an = svg && svg.querySelector('.atlant'); if(an && ANT) an.setAttribute('d', path(coarse ? ANTLO : ANT));
    loNow = !!coarse;
    for(const p of PINS){ const xy = pj(p.p.lng, p.p.lat); p.x = xy[0]; p.y = xy[1]; }
  }
  const wrapLam = l => ((l + 180) % 360 + 360) % 360 - 180;
  function atLam(l, fn){
    const o = proj.rotate();
    proj.rotate([l, 0]);
    try{ return fn(); } finally { proj.rotate(o); }
  }
  const LONC = {'Russia': 100};      // the middle of a country that runs over the 180° line
  function lonOf(nm){
    if(LONC[nm] != null) return LONC[nm];
    if(CBOX[nm]) return (CBOX[nm][0] + CBOX[nm][2]) / 2;
    const x = FBYN.get(nm);
    return x ? x.ll[0] : 0;
  }
  function boxLL(b){
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for(let i = 0; i <= 12; i++) for(let j = 0; j <= 12; j++){
      const p = pj(b[0] + (b[2] - b[0]) * i / 12, b[1] + (b[3] - b[1]) * j / 12);
      if(!p) continue;
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
    return [x0, y0, x1, y1];
  }
  function boxOfCountry(nm){
    if(CBOX[nm]) return boxLL(CBOX[nm]);
    const x = FBYN.get(nm);
    if(!x) return null;
    if(x.box && x.boxL === proj.rotate()[0]) return x.box;
    const g = x.f.geometry;
    const polys = g.type === 'MultiPolygon' ? g.coordinates.map(c => ({type: 'Polygon', coordinates: c})) : [g];
    const ar = polys.map(p => path.area(p));
    const big = Math.max(...ar);
    let b = [1e9, 1e9, -1e9, -1e9];
    polys.forEach((p, i) => {
      if(ar[i] < big * (nm === 'Russia' ? .0005 : 0.08)) return;   // Russia keeps Kaliningrad
      const q = path.bounds(p);
      b = [Math.min(b[0], q[0][0]), Math.min(b[1], q[0][1]), Math.max(b[2], q[1][0]), Math.max(b[3], q[1][1])];
    });
    x.boxL = proj.rotate()[0];
    return (x.box = b);
  }
  function fit(b, minW){
    let [x0, y0, x1, y1] = b;
    const mw = Math.max(minW || 4, ZMIN / 1.16);
    let w = Math.max(x1 - x0, mw), h = Math.max(y1 - y0, mw * .6);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    /* a long, low country (Russia, Chile) gets a tighter margin so it fills the width */
    const pad = (x1 - x0) / Math.max(y1 - y0, 1e-6) > 2 || (y1 - y0) / Math.max(x1 - x0, 1e-6) > 2 ? 1.1 : 1.16;
    w *= pad; h *= pad;
    const r = wrap.clientWidth / Math.max(1, wrap.clientHeight);
    if(w / h > r) h = w / r; else w = h * r;
    const hb = homeBox();
    if(w >= hb[2] * .98) return hb;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  /* the view never drifts off the map: zoomed all the way out it is the whole map,
     centred; zoomed in it can slide only as far as the map's own edges (or where it
     already is, if a place near the edge put it there) */
  function clampVB(v, ref){
    const h = homeBox();
    if(v[2] >= h[2] * .995) return h;
    const r0 = ref || v;
    const x0 = Math.min(h[0], r0[0]), x1 = Math.max(h[0] + h[2] - v[2], r0[0]);
    const y0 = Math.min(h[1], r0[1]), y1 = Math.max(h[1] + h[3] - v[3], r0[1]);
    return [Math.min(Math.max(v[0], x0), x1), Math.min(Math.max(v[1], y0), y1), v[2], v[3]];
  }
  function homeBox(){
    const r = wrap.clientWidth / Math.max(1, wrap.clientHeight);
    let w = W, h = H;
    if(w / h > r) h = w / r; else w = h * r;
    return [(W - w) / 2, (H - h) / 2, w, h];
  }
  /* The camera move. Going in, the globe first turns the place to the middle and the
     view closes in behind it; coming out, the view opens up first and the globe turns
     back after - so the eye can follow where it is going either way. */
  function fly(to, ms, toLam){
    cancelAnimationFrame(anim);
    FLYING = false; try{ wrap.classList.remove('atlfly'); }catch(e){}
    const from = VB.slice(), t0 = performance.now();
    const l0 = LAM, dl = toLam == null ? 0 : wrapLam(toLam - LAM);
    const big = Math.abs(dl) > 2 || Math.abs(Math.log(to[2] / from[2])) > .4;
    const dur = ms == null ? (big ? 720 : 420) : ms;
    if(!dur || matchMedia('(prefers-reduced-motion: reduce)').matches){
      VB = to; if(dl){ LAM = wrapLam(l0 + dl); } reproject(false); frame(); return;
    }
    FLYING = true; try{ wrap.classList.add('atlfly'); }catch(e){}
    const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2;
    const inward = to[2] < from[2] - 1e-6;
    const seg = (t, a, b) => ease((t - a) / (b - a));
    /* going in, the place itself is followed: the point that ends in the middle of the
       view glides there from wherever it sits now, while the globe turns and the view
       closes in around it */
    let P = null, s0 = null;
    if(inward){
      const toL = dl ? wrapLam(l0 + dl) : l0;
      P = atLam(toL, () => proj.invert([to[0] + to[2] / 2, to[1] + to[3] / 2]));
      const p0 = P && atLam(l0, () => proj(P));
      if(p0) s0 = [(p0[0] - from[0]) / from[2], (p0[1] - from[1]) / from[3]];
      else P = null;
    }
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      if(t >= 1){ FLYING = false; try{ wrap.classList.remove('atlfly'); }catch(e){} }
      if(P){
        const e = ease(t);
        const lw = Math.exp(Math.log(from[2]) + (Math.log(to[2]) - Math.log(from[2])) * e);
        const lh = lw * ((from[3] / from[2]) + ((to[3] / to[2]) - (from[3] / from[2])) * e);
        if(dl && (t >= 1 || (FLYN = (FLYN + 1) % 2) === 0)){ LAM = wrapLam(l0 + dl * e); reproject(t < 1); }
        const p = proj(P);
        const sx = s0[0] + (.5 - s0[0]) * e, sy = s0[1] + (.5 - s0[1]) * e;
        VB = t >= 1 ? to.slice() : [p[0] - sx * lw, p[1] - sy * lh, lw, lh];
        if(!dl && loNow && t >= 1) reproject(false);
        frame();
        if(t < 1) anim = requestAnimationFrame(step);
        return;
      }
      const er = !dl ? 1 : seg(t, .28, 1);
      const ez = seg(t, 0, dl ? .78 : 1);
      /* zoom in log space, so a jump from one city to the world does not rush the end */
      const lw = Math.exp(Math.log(from[2]) + (Math.log(to[2]) - Math.log(from[2])) * ez);
      const kk = Math.abs(to[2] - from[2]) < 1e-9 ? ez : (lw - from[2]) / (to[2] - from[2]);
      const cx = (from[0] + from[2] / 2) + ((to[0] + to[2] / 2) - (from[0] + from[2] / 2)) * kk;
      const cy = (from[1] + from[3] / 2) + ((to[1] + to[3] / 2) - (from[1] + from[3] / 2)) * kk;
      const ar = (from[3] / from[2]) + ((to[3] / to[2]) - (from[3] / from[2])) * ez;
      const lh = lw * ar;
      VB = [cx - lw / 2, cy - lh / 2, lw, lh];
      if(dl && (t >= 1 || (FLYN = (FLYN + 1) % 2) === 0)){ LAM = wrapLam(l0 + dl * er); reproject(t < 1); }
      else if(loNow && t >= 1) reproject(false);
      frame();
      if(t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  let FLYING = false, FLYN = 0;
  function frame(){
    svg.setAttribute('viewBox', VB.map(v => v.toFixed(4)).join(' '));
    if(FLYING) return;
    try{ drawStates(); drawCities(); }catch(e){}
    drawBubbles();
    drawPins();
  }
  /* ---------- states / provinces and cities inside the country in view ---------- */
  let DET = null, DETING = false, STKEY = '';
  function loadDetail(){
    if(DET || DETING) return;
    DETING = true;
    fetch('atl-detail.json').then(r => r.json()).then(j => {
      const fc = LIB.feature(j.s, j.s.objects[Object.keys(j.s.objects)[0]]);
      const st = new Map(), ci = new Map();
      for(const f of fc.features){ const c = f.properties.c; if(!c) continue; if(!st.has(c)) st.set(c, []); st.get(c).push(f); }
      for(const x of j.c){ if(!ci.has(x[4])) ci.set(x[4], []); ci.get(x[4]).push(x); }
      for(const l of ci.values()) l.sort((a, b) => a[3] - b[3] || b[5] - a[5]);
      DET = {st, ci}; STKEY = ''; frame();
    }).catch(() => {}).finally(() => { DETING = false; });
  }
  const curId = () => { const x = isC() && S.c ? FBYN.get(S.c) : null; return x ? String(x.id) : ''; };
  function drawStates(){
    const g = svg && svg.querySelector('.atls'); if(!g) return;
    const id = curId();
    if(!id){ if(STKEY){ g.innerHTML = ''; STKEY = ''; } return; }
    if(!DET){ loadDetail(); return; }
    const key = id + '|' + proj.rotate()[0].toFixed(3) + '|' + (loNow ? 'lo' : 'hi');
    if(key === STKEY) return;
    STKEY = key;
    const fs = DET.st.get(id) || [];
    g.innerHTML = fs.map((f, i) => '<path data-s="' + i + '" d="' + (path(f) || '') + '"><title>' + esc2(f.properties.n) + '</title></path>').join('');
    g.__fs = fs;
  }
  function drawCities(){
    const g = svg && svg.querySelector('.atll'); if(!g) return;
    const id = curId();
    if(!id || !DET){ g.innerHTML = ''; return; }
    const cw = wrap.clientWidth || 1, s = VB[2] / cw, z = homeBox()[2] / VB[2];
    const maxRank = z < 4 ? 2 : z < 9 ? 4 : z < 22 ? 6 : z < 60 ? 8 : 10;
    const taken = [], out = [];
    for(const c of (DET.ci.get(id) || [])){
      if(c[3] > maxRank) break;
      const xy = pj(c[0], c[1]); if(!xy) continue;
      if(xy[0] < VB[0] || xy[0] > VB[0] + VB[2] || xy[1] < VB[1] || xy[1] > VB[1] + VB[3]) continue;
      const w = (c[2].length * 6.2 + 10) * s, h = 13 * s;
      const bx = [xy[0] - 3 * s, xy[1] - h, xy[0] + w, xy[1] + 4 * s];
      if(taken.some(t => bx[0] < t[2] && bx[2] > t[0] && bx[1] < t[3] && bx[3] > t[1])) continue;
      taken.push(bx);
      out.push('<g class="atlcity' + (c[3] <= 2 ? ' big' : '') + '" transform="translate(' + xy[0].toFixed(4) + ',' + xy[1].toFixed(4) + ') scale(' + s.toFixed(6) + ')"><circle r="2"/><text x="5" y="-3">' + esc2(c[2]) + '</text></g>');
      if(out.length >= 80) break;
    }
    g.innerHTML = out.join('');
  }
  /* ---------- how many agencies in each country, whether or not they have an address ---------- */
  function locWords(l){
    const a = l.filter(r => r.loc === 'pin').length, c = l.filter(r => r.loc === 'city').length, n = l.length - a - c;
    return [a ? a + ' at an address' : '', c ? c + ' city only' : '', n ? n + ' no location' : ''].filter(Boolean);
  }
  function drawBubbles(){
    if(!gB) return;
    if(isC()){ gB.innerHTML = ''; return; }
    const cw = wrap.clientWidth || 1, s = VB[2] / cw;
    const cnt = new Map();
    for(const r of RS) if(r.ct) cnt.set(r.ct, (cnt.get(r.ct) || 0) + 1);
    const pts = [];
    for(const [nm, n] of cnt){
      const x = FBYN.get(nm);
      if(!x || (S.lv === 'region' && x.rg !== S.r)) continue;
      const p = pj(x.ll[0], x.ll[1]);
      if(p) pts.push({nm, n, x: p[0], y: p[1]});
    }
    /* counts that would sit on top of each other on screen add up into one */
    const rad = n => 9 + Math.sqrt(n) * 2.3;
    const grp = [];
    for(const p of pts.sort((a, b) => b.n - a.n)){
      const g = grp.find(g => Math.hypot(g.x - p.x, g.y - p.y) / s < (rad(g.n) + rad(p.n)) * .92);
      if(g){ g.n += p.n; g.m.push(p); }
      else grp.push({x: p.x, y: p.y, n: p.n, m: [p]});
    }
    BUBS = grp;
    gB.innerHTML = grp.map((g, i) => '<g class="atlbub' + (S.lv === 'region' ? ' sm' : '') + (g.m.length > 1 ? ' many' : '') + '" data-bub="' + i +
      '" transform="translate(' + g.x.toFixed(4) + ',' + g.y.toFixed(4) + ') scale(' + s.toFixed(6) + ')"><circle r="' + rad(g.n).toFixed(1) +
      '"/><text y="3.9">' + g.n + '</text></g>').reverse().join('');
  }
  /* ---------- pins ---------- */
  let PINS = [];
  function pinList(rs){
    const out = [];
    for(const r of rs) for(const p of r.pins){
      const xy = pj(p.lng, p.lat);
      if(!xy) continue;
      out.push({r, p, x: xy[0], y: xy[1], ct: p.ct || r.ct});
    }
    return out;
  }
  const PIN = 'M0,0C-1.6,-4.6 -7,-8.2 -7,-13.4A7,7 0 1 1 7,-13.4C7,-8.2 1.6,-4.6 0,0Z';
  const ZMIN = 6;                 // about a city across: the map has no streets to show closer
  function drawPins(){
    if(!gP) return;
    if(S.lv === 'world'){ gP.innerHTML = ''; gP.__cl = []; return; }
    const cw = wrap.clientWidth || 1, s = VB[2] / cw * 1.15;
    /* pins closer than a fingertip on screen share one marker with a count */
    const cl = [];
    const R = 20 * s;
    /* across a whole region the counts carry the city-only agencies; pins mark street addresses */
    const sorted = PINS.filter(p => S.lv !== 'region' || p.p.pr === 'a').sort((a, b) => (a.ct === S.c ? 0 : 1) - (b.ct === S.c ? 0 : 1));
    for(const p of sorted){
      let hit = null;
      for(const c of cl){ if(Math.hypot(c.x - p.x, c.y - p.y) < R){ hit = c; break; } }
      if(hit){ hit.m.push(p); }
      else cl.push({x: p.x, y: p.y, m: [p]});
    }
    /* a group that cannot be split by zooming (one city, one street) fans out instead,
       each agency on a short line from the spot, named */
    const fan = null;
    const lab = isC();
    gP.innerHTML = cl.map((c, i) => {
      const dim = isC() && !c.m.some(p => p.ct === S.c);
      if(c === fan){
        const n = c.m.length, rad = n <= 3 ? 46 : 46 + (n - 3) * 13;
        const city = (() => { const k = new Map(); for(const p of c.m){ const v = p.p.lb || p.r.city || ''; if(v) k.set(v, (k.get(v) || 0) + 1); }
          return [...k.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || ''; })();
        return '<g class="atlfan' + (dim ? ' dim' : '') + '" transform="translate(' + c.x.toFixed(4) + ',' + c.y.toFixed(4) + ') scale(' + s.toFixed(6) + ')">' +
          '<circle class="atlfc" r="' + (rad + 18) + '"/>' +
          c.m.map((p, k) => {
            const an = -Math.PI / 2 + k * 2 * Math.PI / n, x = Math.cos(an) * rad, y = Math.sin(an) * rad + 7;
            return '<line x1="0" y1="0" x2="' + x.toFixed(2) + '" y2="' + y.toFixed(2) + '"/>';
          }).join('') +
          '<circle class="atlfo" r="3.2"/>' + (city ? '<text class="atlct" y="17">' + esc2(city) + '</text>' : '') +
          c.m.map((p, k) => {
            const an = -Math.PI / 2 + k * 2 * Math.PI / n, x = Math.cos(an) * rad, y = Math.sin(an) * rad + 7;
            const cs = Math.cos(an), sn = Math.sin(an);
            /* names sit on the outside of the ring: beside the pin left and right, above it at the top, below it at the bottom */
            const lx = Math.abs(cs) < .3 ? 0 : cs > 0 ? 10 : -10, ly = Math.abs(cs) < .3 ? (sn < 0 ? -25 : 13) : -10;
            const anc = Math.abs(cs) < .3 ? 'middle' : cs > 0 ? 'start' : 'end';
            return '<g class="atlpin' + (p.p.pr === 'c' ? ' city' : '') + (p.r.d === S.sel ? ' sel' : '') + '" data-c="' + i + '" data-k="' + k +
              '" transform="translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ')"><ellipse class="atlsh" cx="0" cy="0" rx="4.2" ry="1.6"/>' +
              '<path d="' + PIN + '"/><circle class="atldot" cx="0" cy="-13.4" r="2.7"/>' +
              '<text class="atllb" x="' + lx + '" y="' + ly + '" text-anchor="' + anc + '">' + esc2(p.r.nm) + '</text></g>';
          }).join('') + '</g>';
      }
      const many = c.m.length > 1;
      const city = c.m.every(p => p.p.pr === 'c');
      const sel = S.sel && c.m.some(p => p.r.d === S.sel);
      return '<g class="atlpin' + (city ? ' city' : '') + (sel ? ' sel' : '') + (dim ? ' dim' : '') +
        '" data-c="' + i + '" transform="translate(' + c.x.toFixed(4) + ',' + c.y.toFixed(4) + ') scale(' + s.toFixed(6) + ')">' +
        '<ellipse class="atlsh" cx="0" cy="0" rx="4.2" ry="1.6"/>' +
        '<path d="' + PIN + '"/>' +
        (many ? '<circle class="atlbd" cx="7.5" cy="-20" r="6.6"/><text x="7.5" y="-17.4">' + c.m.length + '</text>'
              : '<circle class="atldot" cx="0" cy="-13.4" r="2.7"/>') +
        (lab && !many && !dim ? '<text class="atllb" x="10" y="-10">' + esc2(c.m[0].r.nm) + '</text>' : '') + '</g>';
    }).join('');
    gP.__cl = cl;
  }
  /* ---------- panel ---------- */
  const RKO = {'Africa':'아프리카','Asia':'아시아','Europe':'유럽','Northern Europe':'북유럽','Western Europe':'서유럽','Southern Europe':'남유럽','Eastern Europe':'동유럽','North America':'북미','Oceania':'오세아니아','South America':'남미','Unknown':'국가 미확인'};
  const isKo = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const rn = r => isKo() ? (RKO[r] || r) : (r === 'Unknown' ? 'Country not stated' : r);
  function sexPills(o){
    const one = (k, n, w) => '<span class="asx asx--' + k + (n ? '' : ' zero') + '"><i></i><b>' + nf(n) + '</b><em>' + w + '</em></span>';
    return '<span class="asxs">' + one('F', o.F, 'Female') + one('M', o.M, 'Male') + (o.Q ? one('Q', o.Q, 'Not stated') : '') + '</span>';
  }
  function bar(o){
    const t = o.F + o.M + o.Q || 1;
    return '<span class="asxbar"><i class="F" style="width:' + (o.F / t * 100).toFixed(1) + '%"></i><i class="M" style="width:' +
      (o.M / t * 100).toFixed(1) + '%"></i><i class="Q" style="width:' + (o.Q / t * 100).toFixed(1) + '%"></i></span>';
  }
  function crumbs(){
    const b = ['<button type="button" data-go="world"' + (S.lv === 'world' ? ' aria-current="true"' : '') + '>World</button>'];
    if(S.r) b.push('<button type="button" data-go="region"' + (S.lv === 'region' ? ' aria-current="true"' : '') + '>' + esc2(rn(S.r)) + '</button>');
    if(S.c) b.push('<button type="button" data-go="country"' + (S.lv === 'country' ? ' aria-current="true"' : '') + '>' + esc2(S.c) + '</button>');
    if(S.lv === 'agency'){ const a = (typeof AG !== 'undefined' ? AG : []).find(x => x.domain === S.ag); if(a) b.push('<button type="button" aria-current="true">' + esc2(a.name) + '</button>'); }
    return '<nav class="atlcr" aria-label="Where you are">' + b.join('<i aria-hidden="true">›</i>') + '</nav>';
  }
  function head(title, list, extra){
    const t = sum(list);
    return '<div class="atlhd"><h2>' + esc2(title) + '</h2>' +
      '<p class="atlst"><b>' + nf(list.length) + '</b> ' + (list.length === 1 ? 'agency' : 'agencies') +
      ' · <b>' + nf(t.n) + '</b> models' + (extra || '') + '</p>' + sexPills(t) + bar(t) + '</div>';
  }
  function groupRow(kind, key, label, list, sub){
    const t = sum(list);
    const lw = locWords(list);
    return '<button type="button" class="atlrow" data-' + kind + '="' + esc2(key) + '">' +
      '<span class="atlrt"><b>' + esc2(label) + '</b><s>' + nf(list.length) + (list.length === 1 ? ' agency' : ' agencies') +
      (sub ? ' · ' + sub : '') + '</s>' + (lw.length ? '<s class="atlloc">' + lw.join(' · ') + '</s>' : '') + '</span>' +
      '<span class="atlrn"><b>' + nf(t.n) + '</b><em>models</em></span>' +
      '<span class="atlrs">' + sexPills(t) + bar(t) + '</span><i class="atlgo" aria-hidden="true">›</i></button>';
  }
  function agRow(r, office, num, list){
    const st = r.stale ? 'stale' : r.loc;
    const word = st === 'pin' ? 'Street address' : st === 'city' ? 'City only'
      : st === 'stale' ? 'Address changed — pin needs setting' : 'No address or city on file';
    const addr = r.addr ? esc2(r.addr) : esc2([r.city, r.ct].filter(Boolean).join(', '));
    const can = typeof SIGNED === 'function' && SIGNED();
    const fav = FAV.includes(r.d);
    return '<div class="atlag' + (S.sel === r.d ? ' sel' : '') + (num ? ' ord' : '') + '" data-ag="' + esc2(r.d) + '"' +
      (list ? ' data-list="' + esc2(list) + '"' : '') + ' tabindex="0" role="button">' +
      (num ? '<span class="atlnum" title="Drag to change the order" aria-label="Number ' + num + '">' + num + '</span>'
           : '<span class="atlnum none"></span>') +
      '<span class="atlat"><b><span class="atlmk atlmk--' + st + '" title="' + word + '" aria-hidden="true"></span>' + esc2(r.nm) +
        (office ? ' <em class="atloff">office · ' + esc2(office) + '</em>' : '') + '</b>' +
      (addr ? '<s>' + addr + '</s>' : '') + (list === 'fav' && r.ct && !(r.addr || r.city || '').includes(r.ct) && r.addr ? '<s class="atlfct">' + esc2(r.ct) + '</s>' : '') + '</span>' +
      '<span class="atlrn"><b>' + nf(r.n) + '</b><em>models</em></span>' +
      heart(r.d, fav) +
      '<span class="atlrs">' + sexPills(r.sx) + bar(r.sx) + '</span>' +
      ((can && !office) || r.loc === 'pin' || list === 'fav' ? '<span class="atlset">' +
        /* 1.2.124 (user, 10 Nov 2026): on My favorites the agency's website is one press away, without opening the card */
        (list === 'fav' ? '<a class="atlsetb atlweb" target="_blank" rel="noopener" href="' + esc2('https://' + String(r.d).replace(/^https?:\/\//, '')) + '" title="Open ' + esc2(r.d) + ' in the browser">' + esc2(String(r.d).replace(/^https?:\/\//, '').replace(/^www\./, '')) + ' ↗</a>' : '') +
        (r.loc === 'pin' ? r.pins.map(p => '<a class="atlsetb" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' +
          p.lat + ',' + p.lng + '" title="See the building in Google Maps">Google Maps' + (r.pins.length > 1 && p.lb ? ' · ' + esc2(p.lb) : '') + ' ↗</a>').join('') : '') +
        (can && !office ? '<button type="button" class="atlsetb" data-set="' + esc2(r.d) + '">' + (r.loc === 'pin' ? 'Move pin' : 'Set pin') + '</button>' : '') +
        '</span>' : '') + '</div>';
  }
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.6-4.6-9.3-9.6C1.6 7.4 3.7 4.2 7 4.2c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.3 0 5.4 3.2 4.3 6.5-1.7 5-9.3 9.6-9.3 9.6z"/></svg>';
  function heart(d, on){
    return '<button type="button" class="atlheart' + (on ? ' on' : '') + '" data-fav="' + esc2(d) + '" aria-pressed="' + on +
      '" title="' + (on ? 'Remove from favorites' : 'Add to favorites') + '" aria-label="' + (on ? 'Remove from favorites' : 'Add to favorites') + '">' + HEART + '</button>';
  }
  const telOf = p => { const t = String(p || '').replace(/[^\d+]/g, ''); return t.replace(/\D/g, '').length >= 6 ? t : ''; };
  const TIERW = {newfaces: 'New faces', main: 'Main', development: 'Development', direct: 'Direct', commercial: 'Commercial', unlabelled: 'Unlabelled'};
  const SEXW = {F: 'Women', M: 'Men', '?': 'Not stated'};
  function agCard(r){
    const a = r.a, can = typeof SIGNED === 'function' && SIGNED();
    const st = r.stale ? 'stale' : r.loc;
    const word = st === 'pin' ? 'Street address' : st === 'city' ? 'City only'
      : st === 'stale' ? 'Address changed — pin needs setting' : 'No address or city on file';
    const bs = a.boards || [];
    const tiers = [...new Set(bs.map(b => b.t))].map(t => TIERW[t] || t);
    let cts = [];
    try{ cts = (typeof CONTACTS !== 'undefined' ? (CONTACTS.get(r.d) || []) : []).filter(c => c && (c.e || c.n || c.r || c.p)); }catch(e){}
    const site = 'https://' + String(r.d).replace(/^https?:\/\//, '');
    return '<article class="atlcard" data-card="' + esc2(r.d) + '">' +
      (S.tab === 'fav' ? '<button type="button" class="atlback" data-tab="fav">‹ My favorites</button>'
        : '<button type="button" class="atlback" data-go="country">‹ All agencies in ' + esc2(S.c || r.ct || 'this country') + '</button>') +
      '<div class="atlch"><h2>' + esc2(r.nm) + heart(r.d, FAV.includes(r.d)) + '</h2><p><a href="' + esc2(site) + '" target="_blank" rel="noopener">' + esc2(r.d) + ' ↗</a></p>' +
      '<p class="atlwhere">' + esc2([r.city, r.ct, r.rg !== 'Unknown' ? rn(r.rg) : ''].filter(Boolean).join(' · ')) + '</p></div>' +
      '<section><h3>Models</h3><div class="atlbig"><b>' + nf(r.n) + '</b><span>models on ' + bs.length + (bs.length === 1 ? ' board' : ' boards') + '</span></div>' +
        sexPills(r.sx) + bar(r.sx) + (tiers.length ? '<div class="atltiers">' + tiers.map(t => '<span>' + esc2(t) + '</span>').join('') + '</div>' : '') + '</section>' +
      '<section class="atlag atlbox" data-ag="' + esc2(r.d) + '"><h3>Location</h3>' +
        '<p class="atladdr">' + (r.addr ? esc2(r.addr) : '<i>No street address on file</i>') + '</p>' +
        '<p class="atlstat"><span class="atlmk atlmk--' + st + '"></span>' + word + '</p>' +
        '<span class="atlset">' + r.pins.map(p => '<a class="atlsetb" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' +
          (p.pr === 'a' ? p.lat + ',' + p.lng : encodeURIComponent((p.lb || '') + ', ' + (p.ct || r.ct))) + '">Google Maps' + (r.pins.length > 1 && p.lb ? ' · ' + esc2(p.lb) : '') + ' ↗</a>').join('') +
          (can ? '<button type="button" class="atlsetb" data-set="' + esc2(r.d) + '">' + (r.loc === 'pin' ? 'Move pin' : 'Set pin') + '</button>' : '') + '</span></section>' +
      '<section><h3>Contacts</h3>' + (cts.length ? '<ul class="atlcts">' + cts.map(c => {
          const t = telOf(c.p);
          return '<li><b>' + esc2(c.n || 'Contact') + '</b>' + (c.r ? '<s>' + esc2(c.r) + '</s>' : '') +
            (c.e ? '<a href="mailto:' + esc2(c.e) + '">' + esc2(c.e) + '</a>' : '') +
            (c.p ? (t ? '<a href="tel:' + esc2(t) + '">' + esc2(c.p) + '</a>' : '<span>' + esc2(c.p) + '</span>') : '') + '</li>';
        }).join('') + '</ul>' : '<p class="atlnone">No contacts on file yet — add them under Directory.</p>') + '</section>' +
      '<section><h3>Boards</h3><ul class="atlbds">' + bs.map(b => '<li><a href="' + esc2(b.u || site) + '" target="_blank" rel="noopener">' + esc2(b.d || b.u || 'board') + ' ↗</a>' +
        '<span>' + esc2(TIERW[b.t] || b.t || '') + ' · ' + (SEXW[b.g] || 'Not stated') + '</span><b>' + nf((b.m || []).length) + '</b></li>').join('') + '</ul></section>' +
      '<button type="button" class="atldir" data-dir="' + esc2(r.d) + '">Open in Directory</button>' +
      '</article>';
  }
  function paintSide(rs){
    let h = '<div class="atltabs" role="tablist"><button type="button" role="tab" data-tab="all" aria-selected="' + (S.tab !== 'fav') + '">Agencies</button>' +
      '<button type="button" role="tab" data-tab="fav" aria-selected="' + (S.tab === 'fav') + '">' + HEART + 'My favorites<b>' + FAV.length + '</b></button></div>';
    if(S.tab === 'fav' && S.lv !== 'agency'){
      const all = rows(), by = new Map(all.map(r => [r.d, r]));
      const l = FAV.map(d => by.get(d)).filter(Boolean);
      h += '<div class="atlhd"><h2>My favorites</h2><p class="atlst"><b>' + l.length + '</b> ' + (l.length === 1 ? 'agency' : 'agencies') +
        ' · drag a row to change the order</p></div>';
      h += '<div class="atllist">' + (l.length ? l.map((r, i) => agRow(r, '', i + 1, 'fav')).join('')
        : '<p class="atlnone">No favorites yet. Tap the heart on any agency and it is kept here, in the order you choose.</p>') + '</div>';
      side.innerHTML = h;
      return;
    }
    h += crumbs();
    if(S.lv === 'world'){
      h += head('Agencies by region', rs);
      h += '<div class="atllist">';
      for(const r of ORDER.concat(['Unknown'])){
        const l = rs.filter(x => x.rg === r);
        if(!l.length) continue;
        const nc = new Set(l.map(x => x.ct).filter(Boolean)).size;
        h += groupRow('rg', r, rn(r), l, nc ? nc + (nc === 1 ? ' country' : ' countries') : '');
      }
      h += '</div>';
    } else if(S.lv === 'region'){
      const l = rs.filter(x => x.rg === S.r);
      h += head(rn(S.r), l);
      h += '<div class="atllist">';
      if(S.r === 'Unknown') h += ordered('~Unknown', l).map((r, i) => agRow(r, '', i + 1, '~Unknown')).join('');
      else {
        const cs = [...new Set(l.map(x => x.ct || 'Unknown'))].sort((a, b) => a.localeCompare(b));
        for(const c of cs) h += groupRow('ct', c, c === 'Unknown' ? 'Country not stated' : c, l.filter(x => (x.ct || 'Unknown') === c));
      }
      h += '</div>';
    } else if(S.lv === 'agency'){
      const r = rs.find(x => x.d === S.ag) || rows().find(x => x.d === S.ag);
      if(r) h += agCard(r);
    } else {
      const l = rs.filter(x => x.ct === S.c);
      const off = [];
      for(const r of rs) if(r.ct !== S.c) for(const p of r.pins) if(p.ct === S.c) off.push([r, p.lb]);
      h += head(S.c, l);
      h += '<div class="atllist">' + ordered(S.c, l).map((r, i) => agRow(r, '', i + 1, S.c)).join('') +
        (off.length ? '<p class="atlsub">Offices here, head office elsewhere</p>' + off.map(([r, lb]) => agRow(r, lb)).join('') : '') +
        (!l.length && !off.length ? '<p class="atlnone">No agencies here' + ((document.getElementById('q') || {}).value ? ' match the search' : '') + '.</p>' : '') +
        '</div>';
    }
    h += '<p class="atlfoot"><span class="atlbubk"></span>agencies in a country <span class="atlmk atlmk--pin"></span>street address <span class="atlmk atlmk--city"></span>city only' +
      ' · drag left or right to turn the globe</p>';
    side.innerHTML = h;
  }
  /* ---------- the map's colours ---------- */
  function paintMap(rs){
    const cnt = new Map();
    for(const r of rs) if(r.ct) cnt.set(r.ct, (cnt.get(r.ct) || 0) + 1);
    const top = Math.max(1, ...cnt.values());
    for(const x of FE){
      const n = cnt.get(x.nm) || 0;
      const el = x.el;
      el.classList.toggle('has', !!n);
      el.style.setProperty('--k', n ? (0.22 + 0.62 * Math.log(n + 1) / Math.log(top + 1)).toFixed(3) : '0');
      el.classList.toggle('off', S.lv !== 'world' && S.r !== 'Unknown' && x.rg !== S.r);
      el.classList.toggle('sel', isC() && x.nm === S.c);
      el.classList.toggle('ot', isC() && x.nm !== S.c);
      el.dataset.n = n;
    }
  }
  function render(){
    if(!document.getElementById('pane-atl') || document.getElementById('pane-atl').hidden) return;
    build();
    const rs = rows();
    RS = rs;
    PINS = pinList(rs);
    paintMap(rs);
    paintSide(rs);
    const l = isC() ? rs.filter(r => r.ct === S.c && r.loc === 'none') : [];
    const note = document.getElementById('atlnote');
    if(note){ note.hidden = !l.length; note.textContent = l.length ? l.length + (l.length === 1 ? ' agency' : ' agencies') + ' in ' + S.c + ' with no address or city on file — listed in the panel' : ''; }
    drawBubbles();
    drawPins();
  }
  /* ---------- moving between levels ---------- */
  function go(lv, key, ms){
    try{ if(window.illuStreet) window.illuStreet.close(); }catch(e){}
    if(lv === 'world'){ S.lv = 'world'; S.r = ''; S.c = ''; S.sel = ''; }
    else if(lv === 'region'){ S.lv = 'region'; S.r = key || S.r; S.c = ''; S.sel = ''; }
    else if(lv === 'country'){ S.lv = 'country'; S.c = key || S.c; S.r = rgOf(S.c) || S.r; S.sel = ''; }
    S.sp = null;
    if(lv !== 'agency') S.tab = 'all';
    render();
    /* the globe turns so the place sits on the centre line, then the view closes in */
    let b = null, l = 0;
    if(S.lv === 'region' && RB[S.r]){ l = -(RB[S.r][0] + RB[S.r][2]) / 2; b = atLam(l, () => fit(boxLL(RB[S.r]))); }
    else if(S.lv === 'region') l = LAM;
    if(S.lv === 'country'){ l = -lonOf(S.c); const q = atLam(l, () => boxOfCountry(S.c)); if(q) b = fit(q, 10); }
    fly(b || homeBox(), ms, l);
    try{ side.scrollTop = 0; }catch(e){}
  }
  /* an agency opens its own card in the panel, and the map turns and closes in on it */
  function selectAg(d, zoom){
    const r = rows().find(x => x.d === d);
    if(!r) return;
    const keep = isC() && S.c && (S.c === r.ct || r.pins.some(p => p.ct === S.c));
    S.lv = 'agency'; S.c = keep ? S.c : r.ct; S.r = rgOf(S.c) || r.rg; S.sel = d; S.ag = d;
    render();
    try{ side.scrollTop = 0; }catch(e){}
    try{ if(window.illuStreet) window.illuStreet.onSelect(r); }catch(e){}
    if(zoom === false || !S.c) return;
    const l = -lonOf(S.c);
    const here = r.pins.filter(p => (p.ct || r.ct) === S.c), use = here.length ? here : r.pins;
    const b = atLam(l, () => {
      const ps = use.map(p => pj(p.lng, p.lat)).filter(Boolean);
      if(ps.length){
        const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
        return fit([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 22);
      }
      const q = boxOfCountry(S.c);
      return q ? fit(q, 10) : null;
    });
    fly(b || VB.slice(), null, l);
  }
  function scrollToAg(d){
    const el = side.querySelector('.atlag[data-ag="' + CSS.escape(d) + '"]');
    if(el) el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }
  function up(){
    if(S.lv === 'agency') go('country', S.c);
    else if(S.lv === 'country') go('region', S.r);
    else if(S.lv === 'region') go('world');
  }
  /* ---------- pins set by hand ---------- */
  async function loadGeo(){
    if(typeof DB === 'undefined' || !DB) return;
    try{
      const snap = await DB.collection('geo').limit(20000).get();
      const docs = (snap && snap.docs) ? snap.docs : (snap || []);
      for(const d of docs){
        const v = typeof docOf === 'function' ? docOf(d) : d;
        if(v && v.d && Array.isArray(v.p) && v.p.length) GEOX.set(v.d, {a: v.a == null ? null : String(v.a), p: v.p.map(p => [+p[0], +p[1], p[2] || '', p[3] || ''])});
      }
      render();
    }catch(e){}
  }
  function parseLL(s){
    s = String(s || '');
    let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
            s.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/);
    if(!m) return null;
    const lat = +m[1], lng = +m[2];
    if(!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
    return [lat, lng];
  }
  async function savePin(d, ll){
    const prev = GEOX.get(d);
    GEOX.set(d, {a: typeof ADDR !== 'undefined' ? (ADDR.get(d) || '') : '', p: [[ll[0], ll[1], '', '']]});
    render();
    if(typeof DB === 'undefined' || !DB) return true;
    try{
      await DB.doc('geo/' + String(d).replace(/[^A-Za-z0-9_.~:@+-]/g, '_').slice(0, 180)).set({d, p: [[ll[0], ll[1], '', '']],
        a: typeof ADDR !== 'undefined' ? (ADDR.get(d) || '') : '', by: typeof ME !== 'undefined' ? ME : ''});
      return true;
    }catch(e){ if(prev) GEOX.set(d, prev); else GEOX.delete(d); render(); return false; }
  }
  function openSet(d, btn){
    const box = btn.closest('.atlag');
    if(box.querySelector('.atlform')) return;
    box.insertAdjacentHTML('beforeend', '<form class="atlform"><label>Paste the coordinates or a Google Maps link for this address</label>' +
      '<span><input type="text" placeholder="35.6643, 139.7014  or  https://maps.google.com/…" autocomplete="off">' +
      '<button type="submit">Save pin</button><button type="button" class="atlx">Cancel</button></span><s></s></form>');
    const f = box.querySelector('.atlform'), inp = f.querySelector('input'), msg = f.querySelector('s');
    inp.focus();
    f.addEventListener('click', e => e.stopPropagation());
    f.addEventListener('keydown', e => e.stopPropagation());
    f.querySelector('.atlx').addEventListener('click', () => f.remove());
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const ll = parseLL(inp.value);
      if(!ll){ msg.textContent = 'That doesn’t read as a place. In Google Maps, right-click the building and click the numbers at the top to copy them.'; return; }
      msg.textContent = 'Saving…';
      const ok = await savePin(d, ll);
      if(!ok){ msg.textContent = 'Couldn’t save — check the connection and try again.'; return; }
      selectAg(d);
    });
  }
  /* ---------- dragging a row to a new place in the list ---------- */
  let DRAGJUST = false;
  function wireReorder(){
    let d = null;
    side.addEventListener('pointerdown', e => {
      if(e.button !== 0) return;
      const row = e.target.closest('.atlag.ord');
      if(!row || e.target.closest('button,a,input,form')) return;
      /* on a touch screen the number is the handle, so the list still scrolls under a finger */
      if(e.pointerType === 'touch' && !e.target.closest('.atlnum')) return;
      d = {row, id: e.pointerId, y: e.clientY, x: e.clientX, on: false, list: row.dataset.list};
    });
    side.addEventListener('pointermove', e => {
      if(!d || e.pointerId !== d.id) return;
      if(!d.on){
        if(Math.abs(e.clientY - d.y) < 6) return;
        d.on = true;
        try{ d.row.setPointerCapture(d.id); }catch(_){}
        d.row.classList.add('dragging');
        side.classList.add('reordering');
        d.top = d.row.getBoundingClientRect().top;
      }
      e.preventDefault();
      const box = d.row.parentElement;
      const sibs = [...box.querySelectorAll('.atlag.ord[data-list="' + CSS.escape(d.list) + '"]')].filter(x => x !== d.row);
      let before = null;
      for(const s of sibs){ const r = s.getBoundingClientRect(); if(e.clientY < r.top + r.height / 2){ before = s; break; } }
      const last = sibs[sibs.length - 1];
      if(before){ if(before.previousElementSibling !== d.row) box.insertBefore(d.row, before); }
      else if(last && last.nextElementSibling !== d.row) last.after(d.row);
      /* the row follows the pointer; the numbers say where it will land */
      const r = d.row.getBoundingClientRect(), natural = r.top - (d.ty || 0);
      d.ty = (e.clientY - d.y) - (natural - d.top);
      d.row.style.transform = 'translateY(' + d.ty + 'px)';
      [...box.querySelectorAll('.atlag.ord[data-list="' + CSS.escape(d.list) + '"]')].forEach((x, i) => {
        const n = x.querySelector('.atlnum'); if(n) n.textContent = i + 1;
      });
      /* near the panel's edges it scrolls */
      const sb = side.getBoundingClientRect();
      if(e.clientY < sb.top + 40) side.scrollTop -= 12; else if(e.clientY > sb.bottom - 40) side.scrollTop += 12;
    });
    const stop = e => {
      if(!d || (e && e.pointerId !== d.id)) return;
      const was = d.on, row = d.row, list = d.list;
      d = null;
      if(!was) return;
      DRAGJUST = true; setTimeout(() => { DRAGJUST = false; }, 0);
      row.classList.remove('dragging'); row.style.transform = ''; side.classList.remove('reordering');
      const ids = [...row.parentElement.querySelectorAll('.atlag.ord[data-list="' + CSS.escape(list) + '"]')].map(x => x.dataset.ag);
      if(list === 'fav') FAV = ids.concat(FAV.filter(x => !ids.includes(x)));
      else ORD[list] = ids;
      savePref();
      render();
    };
    side.addEventListener('pointerup', stop);
    side.addEventListener('pointercancel', stop);
  }
  /* ---------- pointer ---------- */
  function wire(){
    wireReorder();
    side.addEventListener('click', e => {
      if(e.target.closest('a[href]')) return;
      if(DRAGJUST){ DRAGJUST = false; return; }
      const hv = e.target.closest('[data-fav]');
      if(hv){
        e.stopPropagation();
        const d = hv.dataset.fav, i = FAV.indexOf(d);
        if(i >= 0) FAV.splice(i, 1); else FAV.push(d);
        savePref(); render();
        return;
      }
      const tb = e.target.closest('[data-tab]');
      if(tb){
        S.tab = tb.dataset.tab;
        if(S.lv === 'agency' && tb.classList.contains('atlback')){ S.lv = S.c ? 'country' : 'world'; S.sel = ''; }
        else if(S.lv === 'agency' && S.tab === 'fav'){ S.lv = S.c ? 'country' : 'world'; S.sel = ''; }
        render(); try{ side.scrollTop = 0; }catch(_){}
        return;
      }
      const od = e.target.closest('[data-dir]');
      if(od){
        const a = (typeof AG !== 'undefined' ? AG : []).find(x => x.domain === od.dataset.dir);
        const q = document.getElementById('q');
        if(a && q){ q.value = a.name; }
        try{ setView('dir'); }catch(_){}
        if(q) q.dispatchEvent(new Event('input', {bubbles: true}));
        return;
      }
      const s = e.target.closest('[data-set]');
      if(s){ e.stopPropagation(); openSet(s.dataset.set, s); return; }
      const c = e.target.closest('[data-go]');
      if(c){ go(c.dataset.go, c.dataset.go === 'region' ? S.r : c.dataset.go === 'country' ? S.c : ''); return; }
      const r = e.target.closest('[data-rg]');
      if(r){ go('region', r.dataset.rg); return; }
      const t = e.target.closest('[data-ct]');
      if(t){ if(t.dataset.ct !== 'Unknown') go('country', t.dataset.ct); return; }
      const a = e.target.closest('[data-ag]');
      if(a && !a.classList.contains('atlbox')) selectAg(a.dataset.ag);
    });
    side.addEventListener('keydown', e => {
      const a = e.target.closest('.atlag');
      if(a && !a.classList.contains('atlbox') && (e.key === 'Enter' || e.key === ' ') && e.target === a){ e.preventDefault(); selectAg(a.dataset.ag); }
    });
    side.addEventListener('pointerover', e => {
      const a = e.target.closest('[data-ag]');
      gP.querySelectorAll('.atlpin.hov').forEach(x => x.classList.remove('hov'));
      if(!a || !gP.__cl) return;
      gP.__cl.forEach((c, i) => { if(c.m.some(p => p.r.d === a.dataset.ag)) gP.children[i] && gP.children[i].classList.add('hov'); });
    });
    /* drag to pan, wheel or the buttons to zoom; a press that does not move is a click */
    let drag = null;
    const toUnits = (cx, cy) => {
      const r = svg.getBoundingClientRect();
      return [VB[0] + (cx - r.left) / r.width * VB[2], VB[1] + (cy - r.top) / r.height * VB[3]];
    };
    svg.addEventListener('pointerdown', e => {
      if(e.button !== 0) return;
      drag = {x: e.clientX, y: e.clientY, vb: VB.slice(), lam: LAM, moved: false, id: e.pointerId};
    });
    svg.addEventListener('pointermove', e => {
      if(drag){
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if(!drag.moved && Math.hypot(dx, dy) > 4){ drag.moved = true; try{ svg.setPointerCapture(drag.id); }catch(_){} wrap.classList.add('drag'); hideTip(); }
        if(drag.moved){
          cancelAnimationFrame(anim);
          const r = svg.getBoundingClientRect();
          /* left and right turn the globe round its axis; up and down slide the view */
          const upd = proj.scale() * Math.PI / 180 * 0.8707;
          drag.next = [wrapLam(drag.lam + dx / r.width * VB[2] / upd), drag.vb[1] - dy / r.height * VB[3]];
          if(!drag.raf) drag.raf = requestAnimationFrame(() => {
            if(!drag || !drag.next) return;
            drag.raf = 0;
            LAM = drag.next[0];
            VB = clampVB([VB[0], drag.next[1], VB[2], VB[3]], drag.vb);
            reproject(true); frame();
          });
          return;
        }
      }
      hover(e);
    });
    const end = e => {
      if(!drag) return;
      const was = drag.moved; if(drag.raf) cancelAnimationFrame(drag.raf);
      if(was && drag.next){ LAM = drag.next[0]; VB = clampVB([VB[0], drag.next[1], VB[2], VB[3]], drag.vb); }
      drag = null; wrap.classList.remove('drag');
      if(was){ reproject(false); frame(); return; }
      click(e);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', () => { drag = null; wrap.classList.remove('drag'); });
    svg.addEventListener('pointerleave', hideTip);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      zoomAt(Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), e.clientX, e.clientY, 0);
    }, {passive: false});
    function zoomAt(k, cx, cy, ms){
      const [ux, uy] = cx == null ? [VB[0] + VB[2] / 2, VB[1] + VB[3] / 2] : toUnits(cx, cy);
      const home = homeBox();
      if(k < 1 && VB[2] <= ZMIN * 1.05 && window.illuStreet){ const [ux0, uy0] = cx == null ? [VB[0] + VB[2] / 2, VB[1] + VB[3] / 2] : toUnits(cx, cy); const ll = proj.invert([ux0, uy0]); if(ll){ window.illuStreet.open(ll[0], ll[1], 11); return; } }
      let w = Math.min(home[2], Math.max(ZMIN, VB[2] * k));
      const kk = w / VB[2], h = VB[3] * kk;
      const to = clampVB([ux - (ux - VB[0]) * kk, uy - (uy - VB[1]) * kk, w, h], VB);
      if(ms) fly(to, ms); else { cancelAnimationFrame(anim); VB = to; frame(); }
    }
    wrap.querySelector('.atlzin').addEventListener('click', () => zoomAt(1 / 1.8, null, null, 260));
    wrap.querySelector('.atlzout').addEventListener('click', () => zoomAt(1.8, null, null, 260));
    wrap.querySelector('.atlzfit').addEventListener('click', () => { if(S.lv === 'agency' && S.sel) selectAg(S.sel); else go(S.lv, S.lv === 'region' ? S.r : S.c); });
    wrap.querySelector('.atlzup').addEventListener('click', up);
    /* enlarge: the map and its side panel take the whole screen, and back */
    const atlBox = wrap.closest('.atl');
    const mxBtn = wrap.querySelector('.atlzmax');
    const MXIN = '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', MXOUT = '<path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7"/>';
    function setMax(on){
      if(!atlBox || !mxBtn) return;
      atlBox.classList.toggle('atlmax', on); document.body.classList.toggle('atlmaxon', on);
      mxBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      mxBtn.title = on ? 'Back to the normal size (Esc)' : 'Enlarge the map to fill the screen';
      mxBtn.setAttribute('aria-label', on ? 'Back to the normal size' : 'Enlarge the map');
      mxBtn.querySelector('svg').innerHTML = on ? MXOUT : MXIN;
      requestAnimationFrame(() => { if(built) go(S.lv, S.lv === 'region' ? S.r : S.c, 0); });
    }
    window.atlasSetMax = setMax;
    const atlPane = document.getElementById('pane-atl');
    if(atlPane) new MutationObserver(() => { if(atlPane.hidden && atlBox.classList.contains('atlmax')) setMax(false); })
      .observe(atlPane, {attributes: true, attributeFilter: ['hidden']});
    if(mxBtn) mxBtn.addEventListener('click', () => setMax(!atlBox.classList.contains('atlmax')));
    document.addEventListener('keydown', e => {
      if(e.key !== 'Escape' || typeof VIEW === 'undefined' || VIEW !== 'atl') return;
      if(document.querySelector('.atlform input:focus')) return;
      if(S.lv !== 'world'){ e.preventDefault(); up(); }
      else if(atlBox && atlBox.classList.contains('atlmax')){ e.preventDefault(); setMax(false); }
    });
    addEventListener('resize', () => { if(VIEW === 'atl' && built) go(S.lv, S.lv === 'region' ? S.r : S.c, 0); });
  }
  function featAt(e){
    if(e.target.closest && e.target.closest('.atls path') && S.c) return FBYN.get(S.c) || null;
    const p = e.target.closest && e.target.closest('.atlc path');
    return p ? FE[+p.dataset.i] : null;
  }
  function pinAt(e){
    const g = e.target.closest && e.target.closest('.atlpin');
    if(!g || !gP.__cl) return null;
    const c = gP.__cl[+g.dataset.c];
    if(!c) return null;
    /* one pin of a fanned-out group stands for one agency only */
    return g.dataset.k != null ? {x: c.x, y: c.y, m: [c.m[+g.dataset.k]], fan: true} : c;
  }
  function bubAt(e){
    const g = e.target.closest && e.target.closest('.atlbub');
    return g ? BUBS[+g.dataset.bub] || null : null;
  }
  function click(e){
    const bn = bubAt(e);
    if(bn){
      if(bn.m.length === 1){ go('country', bn.m[0].nm); return; }
      /* several countries in one count: open them up */
      const xs = bn.m.map(p => p.x), ys = bn.m.map(p => p.y);
      const rg = new Set(bn.m.map(p => (FBYN.get(p.nm) || {}).rg));
      if(S.lv === 'world' && rg.size === 1){ go('region', [...rg][0]); return; }
      fly(fit([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 8));
      return;
    }
    const c = pinAt(e);
    if(c){
      const ds = [...new Set(c.m.map(p => p.r.d))];
      if(c.fan){ selectAg(ds[0], false); return; }
      if(ds.length === 1){ selectAg(ds[0]); return; }
      const xs = c.m.map(p => p.x), ys = c.m.map(p => p.y);
      const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const to = fit(b, .3);
      const spread = Math.max(b[2] - b[0], b[3] - b[1]) / to[2] * (wrap.clientWidth || 1);
      const r0 = c.m[0];
      if(!isC() || !c.m.some(p => p.ct === S.c)){ S.lv = 'country'; S.c = r0.ct; S.r = rgOf(S.c) || r0.r.rg; S.sel = ''; }
      /* still one spot even zoomed in as far as the map goes: fan them out */
      S.sp = null;
      if(spread < 26 && window.illuStreet && c.m.some(p => p.p.pr === 'a')){ const q = c.m.find(p => p.p.pr === 'a').p; render(); window.illuStreet.open(q.lng, q.lat, 14); return; }
      render();
      fly(to);
      return;
    }
    const stp = e.target.closest && e.target.closest('.atls path');
    if(stp && isC()){
      const sf = (svg.querySelector('.atls').__fs || [])[+stp.dataset.s];
      if(sf){ const q = path.bounds(sf); if(S.lv === 'agency'){ S.lv = 'country'; S.sel = ''; render(); } fly(fit([q[0][0], q[0][1], q[1][0], q[1][1]], 2)); return; }
    }
    if(e.target.closest && e.target.closest('.atlfc')) return;
    const f = featAt(e);
    /* a click outside the place in view opens the map back out to the whole world */
    const outside = !f || (S.lv === 'region' && f.rg !== S.r) || (isC() && f.nm !== S.c);
    /* a neighbouring country that has agencies: move the focus straight over to it */
    if(S.lv !== 'world' && outside && f && (+f.el.dataset.n || 0) > 0 && f.nm !== S.c){ S.sp = null; go('country', f.nm); return; }
    if(S.lv !== 'world' && outside){ go('world'); return; }
    if(S.lv === 'agency'){ S.lv = 'country'; S.sel = ''; S.sp = null; render(); return; }
    if(S.sp || S.sel){ S.sp = null; S.sel = ''; render(); }
    if(!f) return;
    const n = +f.el.dataset.n || 0;
    if(S.lv === 'world'){ if(f.rg && RB[f.rg]) go('region', f.rg); return; }
    if(S.lv === 'region' && n) go('country', f.nm);
  }
  function hover(e){
    const c = pinAt(e);
    let h = '';
    if(c){
      const seen = new Set();
      h = c.m.filter(p => !seen.has(p.r.d) && seen.add(p.r.d)).slice(0, 8).map(p =>
        '<b>' + esc2(p.r.nm) + (p.p.lb ? ' · ' + esc2(p.p.lb) : '') + '</b>' +
        '<s>' + (p.p.pr === 'c' ? 'City only — no street address published' : esc2(p.r.addr || '')) + '</s>' +
        '<em>' + nf(p.r.n) + ' models · ' + nf(p.r.sx.F) + ' female · ' + nf(p.r.sx.M) + ' male</em>').join('') +
        (seen.size > 8 ? '<em>and ' + (seen.size - 8) + ' more</em>' : '');
    } else if(bubAt(e)){
      const g = bubAt(e);
      h = g.m.slice(0, 9).map(p => {
        const l = RS.filter(r => r.ct === p.nm);
        return '<b>' + esc2(p.nm) + ' · ' + l.length + (l.length === 1 ? ' agency' : ' agencies') + '</b><s>' + locWords(l).join(' · ') + '</s>' +
          '<em>' + nf(sum(l).n) + ' models · ' + nf(sum(l).F) + ' female · ' + nf(sum(l).M) + ' male</em>';
      }).join('') + (g.m.length > 9 ? '<em>and ' + (g.m.length - 9) + ' more countries</em>' : '') +
        (g.m.length > 1 ? '<em>click to open these up</em>' : '');
    } else {
      const f = featAt(e);
      if(f){
        const n = +f.el.dataset.n || 0;
        h = '<b>' + esc2(f.nm) + '</b><em>' + (n ? n + (n === 1 ? ' agency' : ' agencies') : 'No agencies') +
          (S.lv === 'world' && f.rg ? ' · click for ' + esc2(rn(f.rg)) :
           ((S.lv === 'region' && f.rg !== S.r) || (isC() && f.nm !== S.c)) ? (n ? ' · click to go to ' + esc2(f.nm) : ' · click to open out to the whole world') : '') + '</em>';
        gC.querySelectorAll('.hov').forEach(x => x !== f.el && x.classList.remove('hov'));
        f.el.classList.add('hov');
      }
    }
    if(!h){ hideTip(); return; }
    tip.innerHTML = h; tip.hidden = false;
    const r = wrap.getBoundingClientRect();
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if(x + tw > r.width - 8) x = e.clientX - r.left - tw - 14;
    if(y + th > r.height - 8) y = e.clientY - r.top - th - 14;
    tip.style.transform = 'translate(' + Math.max(6, x) + 'px,' + Math.max(6, y) + 'px)';
  }
  function hideTip(){
    if(tip) tip.hidden = true;
    if(gC) gC.querySelectorAll('.hov').forEach(x => x.classList.remove('hov'));
  }
  /* ---------- the doors in ---------- */
  window.renderAtlas = render;
  /* the map's shapes, worked out ahead of time while nothing else is happening */
  window.atlasPrebuild = () => { if(!built && document.getElementById('atlmap')) build(); };
  /* opened from the widget, the map grows out of the widget onto the page, then flies
     to the continent that was clicked */
  window.atlasOpen = function(r){
    const wm = document.getElementById('wmap');
    const from = wm ? wm.getBoundingClientRect() : null;
    try{ setView('atl'); }catch(e){}
    go('world', '', 0);
    const m = document.getElementById('atlmap'), sd = document.getElementById('atlside');
    const to = m.getBoundingClientRect();
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(from && from.width && to.width && !calm && m.animate){
      m.style.zIndex = '60';
      const an = m.animate([
        {transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')', borderRadius: '18px', opacity: .55},
        {transform: 'none', borderRadius: '9px', opacity: 1}], {duration: 420, easing: 'cubic-bezier(.22,.8,.24,1)'});
      an.onfinish = an.oncancel = () => { m.style.zIndex = ''; };
      sd.animate([{opacity: 0, transform: 'translateX(28px)'}, {opacity: 1, transform: 'none'}],
        {duration: 280, delay: 200, easing: 'ease-out', fill: 'backwards'});
    }
    if(r) setTimeout(() => go('region', r), calm ? 0 : 400);
  };
  window.atlasShown = function(){
    build();
    loadPref();
    render();
    requestAnimationFrame(() => go(S.lv, S.lv === 'region' ? S.r : S.c, 0));
  };
  /* the same favourites, from the Directory tab: one list per ID, whichever tab set it */
  window.ATLFAV = {
    list: () => FAV.slice(),
    has: d => FAV.includes(d),
    toggle(d){ const i = FAV.indexOf(d); if(i >= 0) FAV.splice(i, 1); else FAV.push(d); savePref(); try{ render(); }catch(e){} return i < 0; },
    order(ids){ FAV = ids.concat(FAV.filter(x => !ids.includes(x))); savePref(); },
    load: () => loadPref()
  };
  window.ATLAS_STATE = S;
  window.ATLAS_PINS = () => (gP && gP.__cl || []).map(c => ({x: +c.x.toFixed(1), y: +c.y.toFixed(1), m: c.m.map(p => p.r.nm + ' [' + p.p.pr + '] ' + (p.p.lb || ''))}));
  window.atlasSelect = selectAg;
  window.ATLAS_API = {
    rows: () => rows(), pinsOf: d => pinsOf(d),
    addGeo(d, rec){ GEOX.set(d, {a: rec.a == null ? null : String(rec.a), p: rec.p.map(p => [+p[0], +p[1], p[2] || '', p[3] || ''])}); },
    redraw: () => { try{ render(); }catch(e){} },
    center: () => { try{ return proj.invert([VB[0] + VB[2] / 2, VB[1] + VB[3] / 2]); }catch(e){ return null; } }
  };
})();
