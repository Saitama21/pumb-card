# TURN·MILL PRO — Tengyue CK52PT-Y

Production root for https://saitama21.github.io/pumb-card/ . Replaces the old XZFORM 3D working tree; previous release remains in Git history at commit 62cc2973715a598758f89f4ae5ce1f7ef1ec768a.

Modules: X/Z contour editor with browser storage + JSON export, machining RPM and feed calculator, face bolt-circle geometry, 15-position tool library, 2D point preview, light/dark modes, offline-first PWA shell.

Legacy Aaa1 tools including bundled OCCT STEP CAD viewer are linked externally via https://saitama21.github.io/Aaa1/#menu and are NOT bundled in this repository. Their offline availability depends on independent installation/cache of Aaa1.

SAFETY: no NC ShopTurn postprocessor, material-removal simulation or collision checking. The coordinate calculator uses geometric U/V, NOT the machine's verified X/Y/C kinematics. Check setup, tool offsets and spindle limits on the real machine.

No build dependencies. Serve over HTTPS or localhost, run UI and offline-install tests before treating this as a verified production release.
