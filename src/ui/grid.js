

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

    /**
     * Iterates though objects in specified arread and calls back the callback per each found object
     * @param {*} x 
     * @param {*} y 
     * @param {*} w 
     * @param {*} h 
     * @param {*} callback 
     */
    lookup(x, y, w, h, callback) {
        // for now grid doesn't care about x yet. will implement it later

        const rowStart  = clamp(Math.floor(y), 0, this.grid.length - 1);
        const rowEnd    = clamp(Math.floor(y + h), 0, this.grid.length - 1);

        for (let row = rowStart; row <= rowEnd; row += 1) {
            for (let i = 0; i < this.grid[row].length; i++) {
                callback(this.grid[row][i]);
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