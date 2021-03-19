import css from './style.css';

async function request(url, options) {
  const res = await new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      url,
      ...options,
      onload: resolve,
      onerror: reject,
    });
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
  const buffer = await request(url, { responseType: 'arraybuffer' });
  const items = await loadTarball(buffer);
  return items;
}

class UrlProvider {
  metaUrl(fullname) {
    return `${this.baseUrl}/${fullname}`;
  }
}

// class TaobaoUrlProvider extends UrlProvider {
//   baseUrl = 'https://registry.npm.taobao.org';
//
//   tarballUrl(fullname, version) {
//     return `${this.baseUrl}/${fullname}/download/${fullname}-${version}.tgz`;
//   }
// }

class TencentUrlProvider extends UrlProvider {
  baseUrl = 'https://mirrors.cloud.tencent.com/npm';

  tarballUrl(fullname, version) {
    const basename = fullname.split('/').pop();
    return `${this.baseUrl}/${fullname}/-/${basename}-${version}.tgz`;
  }
}

// class NpmUrlProvider extends UrlProvider {
//   baseUrl = 'https://registry.npmjs.org';
//
//   tarballUrl(fullname, version) {
//     const basename = fullname.split('/').pop();
//     return `${this.baseUrl}/${fullname}/-/${basename}-${version}.tgz`;
//   }
// }

const urlProvider = new TencentUrlProvider();

async function getLatestVersion(fullname) {
  const meta = await request(urlProvider.metaUrl(fullname), { responseType: 'json' });
  const version = meta['dist-tags'].latest;
  return version;
}

async function loadData() {
  const toast = VM.showToast('Loading...', {
    duration: 0,
  });
  const fullname = matches[1];
  const version = matches[2] || await getLatestVersion(fullname);
  const url = urlProvider.tarballUrl(fullname, version);
  items = await loadTarballByUrl(url);
  items.sort((a, b) => {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  });
  toast.close();
  panel.setContent((
    <>
      <header>
        <a onClick={handleClose} innerHTML="&cross;" />
      </header>
      <div className="body">
        <div className="left">
          <ul ref={list => { panel.list = list; }}>
            {items.map((item, i) => (
              <li><a data-index={i} onClick={handleSelect}>{item.name}</a></li>
            ))}
          </ul>
        </div>
        <div className="right">
          <pre ref={pre => { panel.pre = pre; }} />
        </div>
      </div>
    </>
  ));
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
  panel = VM.getPanel({ css, shadow: true });
  panel.wrapper.classList.add('wrapper');
  GM_registerMenuCommand('Explore tarball', main);
}
