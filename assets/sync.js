/* =========================================================
   ĐỒNG BỘ ONLINE (Firebase Firestore)
   Dữ liệu vẫn lưu trong máy như cũ; khi có mạng, mỗi lần save() thì phần
   thay đổi được gửi lên, và thay đổi từ máy khác được gộp về bằng mergeData().
   - lopta/lop          : nội dung của giáo viên (đề, bộ từ, giao bài, cài đặt)
   - lopta_hv/{id học viên} : hồ sơ + tiến độ của từng học viên
   Mỗi tài liệu lưu một chuỗi JSON ở trường j.
   ========================================================= */
(function(){
 const CFG=window.FB_CONFIG;
 const S=window.SYNC={on:false,ready:false,dirty(){},del(){}};
 if(!CFG||!CFG.projectId)return;
 S.on=true;
 const VER='10.12.2',BASE='https://www.gstatic.com/firebasejs/'+VER+'/';
 const COL='lopta',CDOC='lop',HCOL='lopta_hv';
 let F=null,db=null,timer=null;const got={c:false,h:false};
 const last={};        // chuỗi JSON đã biết trên máy chủ, theo khóa 'c' hoặc 'h:'+id
 const rate={};        // chống ghi lặp vô hạn
 const BUSY=new Set(['t-review','test','exam','writing','speaking','flash','quiz','spell','match','review','fullrun','fullbuild']);

 // JSON chuẩn hóa: khóa xếp theo bảng chữ cái, mảng có id xếp theo id, để hai máy cùng nội dung ra cùng chuỗi
 const canon=o=>JSON.stringify(o,(k,v)=>{
  if(Array.isArray(v)){if(v.length&&v.every(x=>x&&typeof x==='object'&&typeof x.id==='string'))return v.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);return v}
  if(v&&typeof v==='object')return Object.keys(v).sort().reduce((a,x)=>(a[x]=v[x],a),{});
  return v});

 const isTeacher=()=>U&&U.role==='teacher';
 const tomb=()=>{D.deleted=D.deleted||{};return D.deleted};
 function classDoc(){return {settings:D.settings,teacherPin:D.teacherPin,sets:D.sets,tests:D.tests,assignments:D.assignments,wprompts:D.wprompts||[],wcat:D.wcat||{},sp1:D.sp1||[],sp2:D.sp2||[],fulls:(D.fulls||[]).filter(f=>f.by==='teacher'),deleted:D.deleted||{}}}
 function hvDoc(sid){return {student:D.students.find(s=>s.id===sid),progress:D.progress[sid]||null,fulls:(D.fulls||[]).filter(f=>f.by===sid)}}

 function write(key,ref,obj){
  const j=canon(obj);if(last[key]===j)return;
  if(j.length>900000){console.warn('sync: tài liệu quá lớn',key,j.length);toast('Dữ liệu quá lớn để đồng bộ, hãy báo giáo viên');return}
  const now=Date.now(),r=rate[key]=(rate[key]||[]).filter(t=>now-t<60000);if(r.length>=20){console.warn('sync: ghi quá nhiều',key);return}r.push(now);
  last[key]=j;
  F.setDoc(ref,{j,t:now,by:U?(U.role==='teacher'?'teacher':U.id):'guest'}).catch(e=>{console.warn('sync: lỗi ghi',key,e);delete last[key];S.err=e});
 }
 function push(){
  timer=null;if(!db||!got.c||!got.h)return;
  if(isTeacher())write('c',F.doc(db,COL,CDOC),classDoc());
  const dead=new Set(tomb().students||[]);
  D.students.forEach(s=>{if(!dead.has(s.id))write('h:'+s.id,F.doc(db,HCOL,s.id),hvDoc(s.id))});
 }
 S.dirty=()=>{if(!timer)timer=setTimeout(push,1200)};
 S.del=id=>{const t=tomb();t.students=t.students||[];if(!t.students.includes(id))t.students.push(id);if(db)F.deleteDoc(F.doc(db,HCOL,id)).catch(e=>console.warn('sync: lỗi xóa',e))};

 function dropStudent(id){
  if(!D.students.some(s=>s.id===id))return false;
  D.students=D.students.filter(s=>s.id!==id);delete D.progress[id];
  D.assignments.forEach(a=>{if(Array.isArray(a.to))a.to=a.to.filter(x=>x!==id)});
  if(U&&U.role==='student'&&U.id===id){U=null;setSession(null);R={v:'login'}}
  return true;
 }
 function applyTombs(){const t=tomb();
  ['sets','tests','assignments','wprompts','sp1','sp2','fulls'].forEach(k=>{const ids=new Set(t[k]||[]);if(ids.size&&D[k])D[k]=D[k].filter(x=>!ids.has(x.id))});
  (t.students||[]).forEach(dropStudent);
 }
 function unionTombs(inc){const t=tomb();for(const k in (inc||{})){t[k]=[...new Set([...(t[k]||[]),...(inc[k]||[])])]}}

 function applyClass(x){
  mergeData({app:'lopta',kind:'class-pack',settings:x.settings,sets:x.sets,tests:x.tests,assignments:x.assignments,wprompts:x.wprompts,wcat:x.wcat,sp1:x.sp1,sp2:x.sp2,fulls:x.fulls,deleted:x.deleted});
  if(x.settings)D.settings=Object.assign({},D.settings,x.settings);
  if(x.teacherPin)D.teacherPin=x.teacherPin;
  unionTombs(x.deleted);applyTombs();
 }
 function applyHv(id,x){
  if((tomb().students||[]).includes(id)){if(isTeacher())F.deleteDoc(F.doc(db,HCOL,id)).catch(()=>{});return}
  const s=x.student;
  if(s){const ex=D.students.find(y=>y.id===id);
   if(ex)Object.assign(ex,s,{lastLogin:Math.max(ex.lastLogin||0,s.lastLogin||0)||undefined});
   else D.students.push(s)}
  mergeData({app:'lopta',progress:x.progress?{[id]:x.progress}:{},fulls:x.fulls||[]});
 }

 function after(){
  save();
  if(!U){const ss=getSession();if(ss&&ss.role==='student'){const st=D.students.find(y=>y.id===ss.id);if(st){U={role:'student',id:st.id,name:st.name,code:st.code};R={v:'home'};render();return}}}
  const a=document.activeElement,typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  const busy=typing||($('#modal')&&$('#modal').innerHTML)||R.running||BUSY.has(R.v);
  if(!busy)render();
 }
 function markReady(k){if(got[k])return;got[k]=true;if(got.c&&got.h){S.ready=true;S.dirty();if(!U&&R.v==='login')after()}}

 // Mở app lúc không có mạng thì chưa tải được Firebase: thử lại khi có mạng trở lại.
 // Kết quả làm lúc offline vẫn nằm trong máy và được đẩy lên ngay khi kết nối được.
 let loading=false;
 function start(){
  if(F||loading)return;loading=true;
  // Thử tải bằng fetch trước: trình duyệt nhớ lần import() thất bại, nên chỉ import() khi chắc là có mạng
  fetch(BASE+'firebase-app.js',{mode:'no-cors',cache:'no-store'}).then(()=>Promise.all([import(BASE+'firebase-app.js'),import(BASE+'firebase-firestore.js')])).then(([A,FS])=>{
  F=FS;const app=A.initializeApp(CFG);db=FS.getFirestore(app);if(CFG.emulator)FS.connectFirestoreEmulator(db,CFG.emulator.host,CFG.emulator.port);
  FS.onSnapshot(FS.doc(db,COL,CDOC),snap=>{
   if(snap.metadata.hasPendingWrites)return;
   if(snap.exists()){const j=snap.data().j;last.c=j;try{applyClass(JSON.parse(j));after()}catch(e){console.warn('sync: lỗi đọc lớp',e)}}
   markReady('c');
  },e=>{console.warn('sync: không đọc được dữ liệu lớp',e);S.err=e});
  FS.onSnapshot(FS.collection(db,HCOL),snap=>{
   let changed=false;
   snap.docChanges().forEach(ch=>{
    const id=ch.doc.id,key='h:'+id;
    if(ch.type==='removed'){delete last[key];if(dropStudent(id))changed=true;return}
    if(ch.doc.metadata.hasPendingWrites)return;
    const j=ch.doc.data().j;last[key]=j;
    try{applyHv(id,JSON.parse(j));changed=true}catch(e){console.warn('sync: lỗi đọc học viên',id,e)}
   });
   if(changed)after();
   markReady('h');
  },e=>{console.warn('sync: không đọc được danh sách học viên',e);S.err=e});
 }).catch(e=>{console.warn('sync: không tải được Firebase',e);S.err=e;loading=false});
 }
 start();
 addEventListener('online',start);
 setInterval(()=>{if(!F)start()},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)start()});
})();
