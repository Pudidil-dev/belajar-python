// test views (not in the film): window.__testView selects a view
SC['_test'] = {
  draw(c, t) {
    const v = window.__testView || 0;
    const views = [{ yaw: 0, pitch: 0.05 }, { yaw: 0.52, pitch: 0.12 }, { yaw: 1.5708, pitch: 0 }, { yaw: -0.6, pitch: 0.3 }, { yaw: 0.3, pitch: 0.25, clipZ: 18 }, { yaw: 2.6, pitch: 0.2 }];
    const big = v >= 10, o = { cx: 135, cy: big ? 250 : 230, s: big ? 1.7 : 1.0, ...views[v % 10 % views.length] };
    PIX.rect(c, 0, 0, 270, 480, 'n0');
    const img = K.pbegin(c); SKULL.render(img, o); K.pend(c, img);
  },
};

SC['_ct'] = {
  draw(c, t) {
    const v = window.__testView || 0;
    PIX.rect(c, 0, 0, 270, 480, 'k');
    if (v === 0) {           // phantom HU (brain window), full recon, unfiltered
      CT.drawSlice(c, CT.HUP, 70, 70, 0.6, { hu: true, L: 40, W: 90 });
      CT.drawSlice(c, CT.full(), 200, 70, 0.6, { L: 40, W: 90 });
      CT.drawSlice(c, CT.blurry(), 70, 200, 0.6, { L: 40, W: 300 });
      CT.drawSlice(c, CT.full(), 200, 200, 0.6, { L: 500, W: 2000 });
      // sinogram
      CT.blit(c, CT.ND, CT.NA, { M: [240 / CT.ND, 0, 0, 200 / CT.NA, 15, 270], val: i => CT.SINO[i] / CT.PMAX, ramp: CT.ramps().blue });
    } else {                 // progressive
      const ns = [1, 2, 4, 8, 16, 32, 64, 360];
      ns.forEach((n, k) => CT.drawSlice(c, CT.partial(n), 70 + (k % 2) * 130, 60 + Math.floor(k / 2) * 118, 0.5, { L: 40, W: 120 }));
    }
  },
};

SC['_room'] = {
  draw(c, t) {
    const v = window.__testView || 0, M = ROOM.G.MON;
    let C, o = { t, tz: 0 };
    if (v === 0) { C = ROOM.camera([M.x, M.y + 420, M.z + 620], [M.x, M.y + 420, M.z], [0, 1, 0], 300); }
    else if (v === 1) { C = ROOM.camera([M.x + 600, M.y + 1100, M.z + 2000], [0, -150, 0], [0, 1, 0], 260); o.tz = -700; }
    else if (v === 2) { C = ROOM.orbit([0, -100, -500], 4200, -0.75, 0.22, 260); o.tz = -900; }
    else if (v === 3) { C = ROOM.orbit([0, 0, 0], 2100, Math.PI, 0.05, 300); }
    else if (v === 4) { C = ROOM.orbit([0, 0, 0], 2100, Math.PI, 0.0, 300); o.cover = 0.18; o.body = 0.0; o.spin = 0.0; }
    else { C = ROOM.orbit([0, 610, 0], 430, Math.PI / 2, 0.0, 300); o.cover = 0.0; o.body = 0.0; o.cutX = 110; o.frame = true; }
    PIX.rect(c, 0, 0, 270, 480, 'k');
    const img = K.pbegin(c); ROOM.render(img, C, o); K.pend(c, img);
  },
};

SC['_tube'] = {
  draw(c, t) {
    const v = window.__testView || 0;
    PIX.rect(c, 0, 0, 270, 480, 'k');
    if (v < 3) {
      const cam = [{ x: 0, y: -40, z: 0.70 }, { x: -10, y: -30, z: 1.0 }, { x: -21.4, y: 0, z: 9 }][v];
      K.cam(c, cam); TUBE.draw(c, { z: cam.z, t, cut: v === 0 ? 0 : 1, spin: 1.2, fil: v === 2 ? 1 : 0.35, hv: 1, heat: 0.5 });
    } else {
      const cam = { x: TW.A.x, y: TW.A.y, z: 3 };
      TW.draw(c, cam, t, { vib: 0.5 });
    }
  },
};
