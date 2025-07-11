(()=>{"use strict";var t={registration:function(t,e){var a=new Date(t.dataset.date.replace("年","-").replace("月","-").replace("日",""));return new Date(e.dataset.date.replace("年","-").replace("月","-").replace("日",""))-a},acquisition:function(t,e){return parseInt(t.dataset.index,10)-parseInt(e.dataset.index,10)},journal:function(t,e){return t.dataset.journal.localeCompare(e.dataset.journal)},publication:function(t,e){var a=new Date(t.dataset.publicationDate||t.dataset.date);return new Date(e.dataset.publicationDate||e.dataset.date)-a}},e={currentSortType:"registration",currentCategory:"教育・労働経済学",isArchive:!1};function a(){var a=document.querySelector(".papers-grid"),r=Array.from(a.children),n=r.filter((function(t){return function(t,e){return!e||"all"===e||t.dataset.category===e}(t,e.currentCategory)})),c=(e.isArchive?r:n).sort(t[e.currentSortType]||t.registration);r.forEach((function(t){t.style.display="none"})),c.forEach((function(t){t.style.display="",a.appendChild(t)})),function(){var t=document.querySelectorAll(".date-header");t.forEach((function(t){t.style.display="none"}));var e=Array.from(document.querySelectorAll(".paper-card")).filter((function(t){return"none"!==t.style.display})),a=new Set;e.forEach((function(t){var e=t.dataset.date;e&&a.add(e)})),t.forEach((function(t){var e=t.textContent.trim();Array.from(a).some((function(t){return t.includes(e)}))&&(t.style.display="")}))}()}document.addEventListener("DOMContentLoaded",(function(){var t,r,n,c,o,i;document.querySelectorAll(".sort-btn").forEach((function(t){var e=t.textContent.trim();e.includes("登録日付順")?t.dataset.sortType="registration":e.includes("取得順")?t.dataset.sortType="acquisition":e.includes("ジャーナル別")?t.dataset.sortType="journal":e.includes("出版日別")?t.dataset.sortType="publication":e.includes("アーカイブ")&&(t.dataset.sortType="archive")})),i=document.querySelectorAll(".sort-btn"),document.querySelector(".papers-grid"),i.forEach((function(t){t.addEventListener("click",(function(r){r.preventDefault(),i.forEach((function(t){return t.classList.remove("active")})),t.classList.add("active");var n=t.dataset.sortType;e.currentSortType=n,e.isArchive="archive"===n,a()}))})),(t=document.querySelectorAll(".filter-btn")).forEach((function(r){r.addEventListener("click",(function(){t.forEach((function(t){return t.classList.remove("active")})),r.classList.add("active");var n=r.textContent.trim();e.currentCategory=n,a()}))})),r=document.querySelectorAll(".paper-card"),n=document.querySelector(".modal-overlay"),c=document.querySelector(".modal-container"),o=document.querySelector(".close-btn"),r.forEach((function(t){t.addEventListener("click",(function(){var e=t.querySelector(".paper-title").textContent,a=t.dataset.abstract,r=t.dataset.authors,o=t.dataset.journal,i=t.dataset.url,s=t.dataset.translatedTitle,d=t.dataset.translatedAbstract;document.querySelector(".modal-content").innerHTML="\n        <h2>".concat(e,"</h2>\n        ").concat(s?"<h3>日本語タイトル: ".concat(s,"</h3>"):"","\n        <p><strong>著者:</strong> ").concat(r,"</p>\n        <p><strong>ジャーナル:</strong> ").concat(o,"</p>\n        ").concat(i?'<p><a href="'.concat(i,'" target="_blank">論文リンク</a></p>'):"","\n        <h3>Abstract</h3>\n        <p>").concat(a,"</p>\n        ").concat(d?"<h3>日本語要約</h3><p>".concat(d,"</p>"):"","\n      "),n.classList.add("active"),c.classList.add("active")}))})),o.addEventListener("click",(function(){n.classList.remove("active"),c.classList.remove("active")})),n.addEventListener("click",(function(t){t.target===n&&(n.classList.remove("active"),c.classList.remove("active"))})),a()}))})();