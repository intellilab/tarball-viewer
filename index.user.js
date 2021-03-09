// ==UserScript==
// @name        Tarball viewer
// @namespace   https://gera2ld.space/
// @description View content of tarballs without download them.
// @match       *://www.npmjs.com/package/*
// @grant       GM_xmlhttpRequest
// @grant       GM_registerMenuCommand
// @version     0.1.0
// @author      Gerald <i@gerald.top>
// @require     https://cdn.jsdelivr.net/combine/npm/@violentmonkey/dom@1,npm/@violentmonkey/ui@0.5
// @require     https://cdn.jsdelivr.net/combine/npm/pako@2.0.3/dist/pako.min.js,npm/@gera2ld/tarjs@^0.1.2
// ==/UserScript==

(function () {
'use strict';

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

var css_248z = "header{text-align:right}a{cursor:pointer;color:#3182ce;color:rgba(49,130,206,var(--text-opacity))}a,a:hover{--text-opacity:1}a:hover{color:#2b6cb0;color:rgba(43,108,176,var(--text-opacity))}pre{white-space:pre-wrap;padding:.5rem}.wrapper{max-width:none;top:50%;left:50%;transform:translate(-50%,-50%)}.body{display:flex;--bg-opacity:1;background-color:#fff;background-color:rgba(255,255,255,var(--bg-opacity));max-width:1024px;width:90vw;height:80vh}.left{width:40%;max-width:360px;border-right:1px solid #ddd;overflow:auto}.left ul{margin:0;padding:0}.left li{list-style-type:none;border-radius:.25rem;padding-left:.25rem;padding-right:.25rem}.left li.active{--bg-opacity:1;background-color:#bee3f8;background-color:rgba(190,227,248,var(--bg-opacity))}.right{flex:1 1 0%;overflow:auto}";

async function request(url, options) {
  const res = await new Promise((resolve, reject) => {
    GM_xmlhttpRequest(_extends({
      url
    }, options, {
      onload: resolve,
      onerror: reject
    }));
  });
  return res.response;
}

async function loadTarball(buffer) {
  const arr = new Uint8Array(buffer);
  const tar = pako.inflate(arr);
  reader = new tarball.TarReader();
  const items = await reader.readFile(new Blob([tar]));
  return items;
}

async function loadTarballByUrl(url) {
  const buffer = await request(url, {
    responseType: 'arraybuffer'
  });
  const items = await loadTarball(buffer);
  return items;
}

class UrlProvider {
  metaUrl(fullname) {
    return `${this.baseUrl}/${fullname}`;
  }

}

class TaobaoUrlProvider extends UrlProvider {
  constructor(...args) {
    super(...args);
    this.baseUrl = 'https://registry.npm.taobao.org';
  }

  tarballUrl(fullname, basename, version) {
    return `${this.baseUrl}/${fullname}/download/${basename}-${version}.tgz`;
  }

} // class NpmUrlProvider extends UrlProvider {
//   baseUrl = 'https://registry.npmjs.org';
//
//   tarballUrl(fullname, basename, version) {
//     return `${this.baseUrl}/${fullname}/-/${basename}-${version}.tgz`;
//   }
// }


const urlProvider = new TaobaoUrlProvider();

async function getLatestVersion(fullname) {
  const meta = await request(urlProvider.metaUrl(fullname), {
    responseType: 'json'
  });
  const version = meta['dist-tags'].latest;
  return version;
}

async function loadData() {
  const toast = VM.showToast('Loading...', {
    duration: 0
  });
  const fullname = matches[1];
  const basename = fullname.split('/').pop();
  const version = matches[2] || (await getLatestVersion(fullname));
  const url = urlProvider.tarballUrl(fullname, basename, version);
  items = await loadTarballByUrl(url);
  items.sort((a, b) => {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  });
  toast.close();
  panel.setContent(VM.createElement(VM.Fragment, null, VM.createElement("header", null, VM.createElement("a", {
    onClick: handleClose,
    innerHTML: "&cross;"
  })), VM.createElement("div", {
    className: "body"
  }, VM.createElement("div", {
    className: "left"
  }, VM.createElement("ul", {
    ref: list => {
      panel.list = list;
    }
  }, items.map((item, i) => VM.createElement("li", null, VM.createElement("a", {
    "data-index": i,
    onClick: handleSelect
  }, item.name))))), VM.createElement("div", {
    className: "right"
  }, VM.createElement("pre", {
    ref: pre => {
      panel.pre = pre;
    }
  })))));
}

async function main() {
  if (!items) await loadData();
  panel.show();
}

function handleSelect(e) {
  if (active) {
    active.parentNode.classList.remove('active');
  }

  active = e.target;
  active.parentNode.classList.add('active');
  showContent();
}

function handleClose() {
  panel.hide();
}

function showContent() {
  const index = +active.dataset.index;
  panel.pre.textContent = reader.getTextFile(items[index].name);
}

let reader;
let items;
let panel;
let active;
const matches = window.location.pathname.match(/^\/package\/(.*?)(?:\/v\/([\d.]+))?$/);

if (matches) {
  panel = VM.getPanel({
    css: css_248z,
    shadow: true
  });
  panel.wrapper.classList.add('wrapper');
  GM_registerMenuCommand('Explore tarball', main);
}

}());
