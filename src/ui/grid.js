

function clamp(value, min, max) {
    if (value < min)  {
        return min;
    }
    if (value > max) {
        return max;
    }

    return value;
}


class Grid {
    constructor(maxY) {
        this.grid = new Array(maxY);
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = [];
        }
    }


    put(obj, x, y, w, h) {
        const row = clamp(y, 0, this.grid.length - 1);
        this.grid[row].push(obj);
    }

    lookupAtPoint(x, y, callback) {
        // for now grid doesn't care about x yet. will implement it later
        if (0 <= y && y < this.grid.length) {
            for (let i = 0; i < this.grid[y].length; i++) {
                if (callback(this.grid[y][i])) {
                    return;
                }
            }
        }
    }
}

export function createGridFromRects(rects, maxY) {
    const grid = new Grid(maxY);

    for (let i = 0; i < rects.length; i++) {
        grid.put(rects[i], rects[i].x, rects[i].d, rects[i].w, 1);
    }

    return grid;
}