// V4.5 resilient admin bootstrap. Keep this file classic so it can report module-load failures.
(function(){
  const main=()=>document.getElementById('admin-main');
  function esc(v){return String(v||'').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});}
  function showFailure(error){
    const el=main(); if(!el)return;
    const message=(error&&error.message)||String(error||'Unknown administrator loading error');
    el.innerHTML='<div class="admin-load-error card stack"><div class="status-orb warn">!</div><h2>No se pudo cargar la consola de administrador</h2><p class="muted">'+esc(message)+'</p><div class="button-grid"><button class="btn" id="admin-loader-retry">Intentar de nuevo</button><button class="btn secondary" id="admin-loader-back">Regresar a Church Hub</button></div></div>';
    document.getElementById('admin-loader-retry')?.addEventListener('click',function(){location.reload();});
    document.getElementById('admin-loader-back')?.addEventListener('click',function(){location.assign('/');});
  }
  window.addEventListener('error',function(e){if(e&&e.error)showFailure(e.error);});
  window.addEventListener('unhandledrejection',function(e){showFailure(e.reason);});
  import('/assets/admin.js?v=520').catch(showFailure);
})();
