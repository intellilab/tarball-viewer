async function main() {
  const matches = window.location.pathname.match(
    /^\/package\/(.*?)(?:\/v\/([a-z0-9.-]+))?$/
  );
  if (!matches) {
    VM.showToast('Package not found');
    return;
  }
  const [, pkgName, version] = matches;
  const name = [pkgName, version].filter(Boolean).join('@');
  const qs = new URLSearchParams({
    r: `npm:${name}`,
  });
  GM_openInTab(`https://webfs.gera2ld.space/#${qs}`);
}

GM_registerMenuCommand('Explore tarball', main);
