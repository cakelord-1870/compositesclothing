!function(n,e){n.ajax({type:"GET",url:e.BerlutiDynamicHeaderFooterUrl,dataType:"json",success:function(e){var a,t;e&&(a=e.header?e.header.replace(/\n/g,""):"",t=e.footer?e.footer.replace(/\n/g,""):"",n("#lf_header").append(a),n("#lf_footer").append(t),0===n("meta[name=viewport]").length&&n("head").append("<meta name='viewport' content='width=device-width, initial-scale=1'>"))}})}(jQuery,window);