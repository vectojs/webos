// The Playwright CLI invokes this named function from the file.
// oxlint-disable-next-line no-unused-vars
async function runReleaseMatrix(page) {
  const result = await page.evaluate(async () => {
    const api = window.webos;
    if (!api) throw new Error('window.webos is not available; use ?debug');

    const shell = api.shell;
    const apps = shell.config.apps.map((app) => ({
      id: app.id,
      minWidth: app.minWidth,
      minHeight: app.minHeight,
    }));
    const themes = ['aero', 'breeze', 'aqua', 'cloud', 'y2k', 'vaporwave', 'dreamcore'];
    const geometries = ['minimum', 'half', 'tile', 'maximized'];
    const failures = [];
    let auditCount = 0;

    const recordFailure = (check, detail) => failures.push({ check, detail });
    const cleanAudit = async (check) => {
      const findings = await api.audit();
      const relevant = findings.filter((finding) => {
        const text = JSON.stringify(finding).toLowerCase();
        return (
          finding.kind !== 'overlap' &&
          !text.includes('wallpaper') &&
          !text.includes('taskbar') &&
          !text.includes('resize')
        );
      });
      auditCount += 1;
      if (relevant.length > 0) recordFailure(`${check}:audit`, relevant);
    };
    const closeAll = () => shell.windowManager.closeAll();
    const openOne = (id) => {
      closeAll();
      const win = shell.open(id);
      if (!win) throw new Error(`failed to open ${id}`);
      return win;
    };

    for (const theme of themes) {
      api.applyTheme(theme);
      const stored = localStorage.getItem('webos:theme');
      if (stored !== theme) recordFailure('theme persistence', { theme, stored });
      for (const app of apps) {
        for (const geometry of geometries) {
          const win = openOne(app.id);
          const area = shell.layout.workArea(shell.layout.primary().id);
          if (geometry === 'minimum') {
            win.setGeometry(8, 8, app.minWidth, app.minHeight);
          } else if (geometry === 'half') {
            win.setGeometry(area.x, area.y, Math.floor(area.width / 2), area.height);
          } else if (geometry === 'tile') {
            win.setGeometry(area.x, area.y, area.width, Math.floor(area.height / 2));
          } else {
            win.maximize();
          }
          api.scene.step(16.67);
          await cleanAudit(`${theme}/${app.id}/${geometry}`);
        }
      }
    }

    closeAll();
    openOne('notes');
    const vfs = api.vfs;
    if (!vfs) {
      recordFailure('vfs', 'VFS is not configured');
    } else {
      const path = '/matrix-roundtrip.txt';
      const value = 'release matrix round trip';
      await vfs.write(path, value);
      const readback = await vfs.read(path);
      if (readback !== value) recordFailure('vfs round trip', { readback });
    }

    closeAll();
    return {
      browser: navigator.userAgent.includes('Firefox') ? 'firefox' : 'chromium',
      themes: themes.length,
      apps: apps.length,
      geometries: geometries.length,
      auditCount,
      failures,
    };
  });

  if (result.failures.length > 0) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  await page.getByRole('button', { name: 'Start' }).focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  const menuState = await page.evaluate(() => {
    const api = window.webos;
    const containsStartMenu = (nodes) =>
      nodes.some(
        (node) =>
          (node.role === 'menu' && node.label === 'Start menu') ||
          containsStartMenu(node.children ?? []),
      );
    return api ? containsStartMenu(api.scene.getA11yTree()) : false;
  });
  if (!menuState) throw new Error('keyboard start menu did not open');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  const beforeTerminal = await page.evaluate(() => window.webos.shell.windowManager.list().length);
  await page.keyboard.press('Control+Alt+T');
  await page.waitForTimeout(50);
  const terminalState = await page.evaluate(
    (before) => window.webos.shell.windowManager.list().length > before,
    beforeTerminal,
  );
  if (!terminalState) throw new Error('Ctrl+Alt+T did not open Terminal');
  await page.keyboard.press('Control+N');
  await page.waitForTimeout(50);
  const notesState = await page.evaluate(() =>
    window.webos.shell.windowManager.list().some((win) => win.appId === 'notes'),
  );
  if (!notesState) throw new Error('Ctrl+N did not open Notes');
  await page.evaluate(() => window.webos.shell.windowManager.closeAll());
  const keyboardAudit = await page.evaluate(() => window.webos.audit());
  const relevantKeyboardAudit = keyboardAudit.filter((finding) => {
    const text = JSON.stringify(finding).toLowerCase();
    return (
      finding.kind !== 'overlap' &&
      !text.includes('wallpaper') &&
      !text.includes('taskbar') &&
      !text.includes('resize')
    );
  });
  if (relevantKeyboardAudit.length > 0) throw new Error('keyboard flow audit was not clean');
  return result;
}
