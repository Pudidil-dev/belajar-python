"""A small physical model of the first eight doublings: rod-shaped cells (capsules 0.9 um thick) that grow from 2 to
4 um, split in the middle and push each other apart on the agar. It runs once and is cached in out/cache/.

For every generation k it keeps two states: B[k], the cells the moment they are born (the two halves of their
mothers, same angle), and R[k], where they have been pushed to by the end of their cycle, already 4 um long.
During a cycle a cell slides from B to R while it lengthens, so the daughters of R[k] are exactly B[k+1]:
nothing jumps when a cell splits.
"""
from pathlib import Path
import numpy as np

R_CELL = 0.45           # cell radius, um
L_BORN, L_DIV = 2.0, 4.0
G_EXPL = 8              # cells are drawn one by one up to 2**8 = 256
_CACHE = Path(__file__).resolve().parent.parent / 'out' / 'cache' / 'cells_v4.npz'


def _relax(c, rng, iters):
    """Push overlapping capsules apart (each one is 5 discs along its axis), with a weak pull to the middle.
    Only neighbouring cells are compared (their centres closer than one cell length plus a width)."""
    n = len(c)
    k = 5
    offs = np.linspace(-(L_DIV / 2 - R_CELL), L_DIV / 2 - R_CELL, k)
    pairs = None
    for it in range(iters):
        if it % 8 == 0:
            dc = np.hypot(*(c[:, None, :2] - c[None, :, :2]).transpose(2, 0, 1))
            i, j = np.nonzero(np.triu(dc < L_DIV + 2 * R_CELL + 0.8, 1))
            pairs = (i, j)
        i, j = pairs
        if len(i) == 0:
            break
        d = np.stack([np.cos(c[:, 2]), np.sin(c[:, 2])], 1)
        p = c[:, None, :2] + offs[None, :, None] * d[:, None, :]            # (n, k, 2)
        diff = p[i][:, :, None, :] - p[j][:, None, :, :]                     # (pairs, k, k, 2)
        dist = np.sqrt((diff ** 2).sum(-1)) + 1e-9
        ov = np.clip(2 * R_CELL - dist, 0.0, None)
        if ov.max() < 0.004:
            break
        push = ov[..., None] * diff / dist[..., None] * 0.5
        fi = push.sum(2)                                                     # force on cell i's discs (pairs, k, 2)
        fj = -push.sum(1)                                                    # force on cell j's discs
        f = np.zeros((n, k, 2))
        np.add.at(f, i, fi)
        np.add.at(f, j, fj)
        c[:, :2] += 0.6 * f.mean(1)
        tq = (offs[None, :] * (d[:, None, 0] * f[:, :, 1] - d[:, None, 1] * f[:, :, 0])).sum(1)
        c[:, 2] += 0.6 * tq / float((offs ** 2).sum())
        m = c[:, :2].mean(0)
        c[:, :2] -= 0.0004 * (c[:, :2] - m)
    return c


def _simulate():
    rng = np.random.default_rng(3)
    B, R = [np.array([[0.0, 0.0, 0.10]])], []
    for g in range(G_EXPL + 1):
        c = B[g].copy()
        if g > 0:
            c[:, 2] += rng.normal(0, 0.09, len(c))           # daughters wobble a little as they grow
            m = c[:, :2].mean(0)
            c[:, :2] = m + (c[:, :2] - m) * 1.3              # the patch has to double its area: start spread out
        c = _relax(c, rng, 600)
        R.append(c)
        d = np.stack([np.cos(c[:, 2]), np.sin(c[:, 2])], 1)
        kids = np.empty((2 * len(c), 3))
        kids[0::2, :2] = c[:, :2] - (L_DIV / 4) * d
        kids[1::2, :2] = c[:, :2] + (L_DIV / 4) * d
        kids[0::2, 2] = kids[1::2, 2] = c[:, 2]
        B.append(kids)
    return B[:G_EXPL + 1], R


def _load():
    try:
        z = np.load(_CACHE)
        return [z[f'b{g}'] for g in range(G_EXPL + 1)], [z[f'r{g}'] for g in range(G_EXPL + 1)]
    except Exception:
        B, R = _simulate()
        try:
            _CACHE.parent.mkdir(parents=True, exist_ok=True)
            tmp = _CACHE.with_suffix('.tmp.npz')
            np.savez(tmp, **{f'b{g}': B[g] for g in range(G_EXPL + 1)}, **{f'r{g}': R[g] for g in range(G_EXPL + 1)})
            tmp.replace(_CACHE)
        except OSError:
            pass
        return B, R


BIRTH, PUSHED = _load()


def radius(g):
    """Radius of the patch (um) that holds 85 % of the cell ends at the end of cycle g."""
    c = PUSHED[g]
    d = np.stack([np.cos(c[:, 2]), np.sin(c[:, 2])], 1) * (L_DIV / 2)
    ends = np.concatenate([c[:, :2] + d, c[:, :2] - d])
    m = c[:, :2].mean(0)
    return float(np.percentile(np.hypot(*(ends - m).T), 85)), m
