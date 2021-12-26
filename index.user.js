
// ==UserScript==
// @name        Tarball viewer
// @namespace   https://gera2ld.space/
// @description View content of tarballs without download them.
// @match       *://www.npmjs.com/package/*
// @version     0.1.3
// @author      Gerald <i@gerald.top>
// @require     https://cdn.jsdelivr.net/combine/npm/@violentmonkey/dom@2,npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/combine/npm/pako@2.0.4/dist/pako.min.js,npm/@gera2ld/tarjs@^0.1.2
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
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

var css_248z = "header{text-align:right}a{color:rgba(37,99,235,var(--tw-text-opacity));cursor:pointer}a,a:hover{--tw-text-opacity:1}a:hover{color:rgba(29,78,216,var(--tw-text-opacity))}pre{padding:.5rem;white-space:pre-wrap}.wrapper{left:50%;max-width:none;top:50%;transform:translate(-50%,-50%)}.body{--tw-bg-opacity:1;background-color:rgba(255,255,255,var(--tw-bg-opacity));display:flex;height:80vh;max-width:1024px;width:90vw}.left{border-right:1px solid #ddd;max-width:360px;overflow:auto;width:40%}.left ul{margin:0;padding:0}.left li{border-radius:.25rem;list-style-type:none;padding-left:.25rem;padding-right:.25rem}.left li.active{--tw-bg-opacity:1;background-color:rgba(191,219,254,var(--tw-bg-opacity))}.right{flex:1 1 0%;overflow:auto}";

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
  const reader = new tarball.TarReader();
  const items = await reader.readFile(new Blob([tar]));
  items.sort((a, b) => {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  });
  return items.map(item => ({
    name: item.name,
    content: reader.getTextFile(item.name)
  }));
}

async function loadTarballByUrl(url) {
  const buffer = await request(url, {
    responseType: 'arraybuffer'
  });
  const items = await loadTarball(buffer);
  return items;
}

class NpmUrlProvider {
  constructor() {
    this.baseUrl = 'https://registry.npmjs.org';
  }

  metaUrl(fullname) {
    return `${this.baseUrl}/${fullname}`;
  }

  tarballUrl(fullname, version) {
    const basename = fullname.split('/').pop();
    return `${this.baseUrl}/${fullname}/-/${basename}-${version}.tgz`;
  }

}

class TaobaoUrlProvider extends NpmUrlProvider {
  constructor(...args) {
    super(...args);
    this.baseUrl = 'https://registry.npm.taobao.org';
  }

  tarballUrl(fullname, version) {
    return `${this.baseUrl}/${fullname}/download/${fullname}-${version}.tgz`;
  }

}

class TencentUrlProvider extends NpmUrlProvider {
  constructor(...args) {
    super(...args);
    this.baseUrl = 'https://mirrors.cloud.tencent.com/npm';
  }

}

const providers = {
  npm: NpmUrlProvider,
  taobao: TaobaoUrlProvider,
  tencent: TencentUrlProvider
};

async function getLatestVersion(urlProvider, fullname) {
  const meta = await request(urlProvider.metaUrl(fullname), {
    responseType: 'json'
  });
  const version = meta['dist-tags'].latest;
  return version;
}

async function loadData(matches) {
  const toast = VM.showToast('Loading...', {
    duration: 0
  });
  const Provider = providers[GM_getValue('provider')] || providers.npm;
  const urlProvider = new Provider();
  const fullname = matches[1];
  const version = matches[2] || (await getLatestVersion(urlProvider, fullname));
  const url = urlProvider.tarballUrl(fullname, version);
  items = await loadTarballByUrl(url);
  toast.close();
  panel.setContent(VM.hm(VM.Fragment, null, VM.hm("header", null, VM.hm("a", {
    onClick: handleClose,
    innerHTML: "&cross;"
  })), VM.hm("div", {
    className: "body"
  }, VM.hm("div", {
    className: "left"
  }, VM.hm("ul", {
    ref: list => {
      panel.list = list;
    }
  }, items.map((item, i) => VM.hm("li", null, VM.hm("a", {
    "data-index": i,
    onClick: handleSelect
  }, item.name))))), VM.hm("div", {
    className: "right"
  }, VM.hm("pre", {
    ref: pre => {
      panel.pre = pre;
    }
  })))));
}

async function main() {
  const matches = window.location.pathname.match(/^\/package\/(.*?)(?:\/v\/([a-z0-9.-]+))?$/);

  if (!matches) {
    VM.showToast('Package not found');
    return;
  }

  if (!panel) {
    panel = VM.getPanel({
      style: css_248z,
      shadow: true
    });
    panel.wrapper.classList.add('wrapper');
  }

  await loadData(matches);
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
  active = null;
  items = null;
}

function showContent() {
  const index = +active.dataset.index;
  panel.pre.textContent = items[index].content;
}

let items;
let panel;
let active;
GM_registerMenuCommand('Explore tarball', main);

})();
