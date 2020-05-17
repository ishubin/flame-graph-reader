<template>
    <div>
        <div class="middle-content">
            Hello
            <a href="#" @click="zoomOut()">Zoom out</a>
            <input type="file" @change="onFileChange"/> {{perf}} {{perfObjectCount}}
        </div>
        <canvas ref="canvas" width="1200" height="700" style="border: 1px solid grey" @dblclick="onCanvasDoubleClick"></canvas>
    </div>
</template>

<script>
import {parseProfilingLog, generateFrameRects} from './flamer';
import {createGridFromRects} from './grid';

let grid = null;

function measurePerformance(funcName, callback) {
    const timeStart = window.performance.now();
    callback();
    return window.performance.now() - timeStart;
}

export default {
    mounted() {
        this.loadReport(`
com.example.Main.main;com.exmaple.Main.test 1
com.example.Main.main;com.exmaple.Main.test;java.lang.String.format 2
a;b;we;q 3
a;b;c;v;d;d;af;f;as;s;a;a;s;f;a;a;f;a;asf;asf;asf;asf;asf;qwrwq;re;qwe;qwe;qwe;qwe;wqe;qwe;eq;wqe;w;ew;qwe;wqe;e;we;wew;eqwe;qwe;wqe;wqe;qwe;qwe;w;qe;a;d;as;da;ad;ad;asd;asda;sdas;da;dqwe;q;we;w;end 6
something else 4
        `);
    },

    beforeDestroy() {
    },

    data() {
        return {
            rootFrame: null,
            frameData: null,
            frameHeight: 20,
            offsetX: 0.0,
            zoomX: 1.0,
            maxHeight: 0,
            perf: 0,
            perfObjectCount: 0,

            backgroundColor: 'hsl(205, 27%, 23%)',

            canvasWidth: 100,
            canvasHeight: 100
        };
    },

    methods: {
        onFileChange(event) {
            this.loadFile(event.target.files[0]);
        },

        loadFile(file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                this.loadReport(event.target.result);
            };

            reader.readAsText(file);
        },

        loadReport(text) {
            this.rootFrame = parseProfilingLog(text);
            this.frameData = generateFrameRects(this.rootFrame);

            let maxDepth = 0;
            for (let i = 0; i < this.frameData.rects.length; i++) {
                const rect = this.frameData.rects[i];
                const depth = (rect.d + 1);
                if (depth > maxDepth) {
                    maxDepth = depth;
                }
            }
            this.maxHeight = (maxDepth + 1) * this.frameHeight;
            grid = createGridFromRects(this.frameData.rects, maxDepth);
            this.render();
        },

        render() {
            this.perf = measurePerformance('render', () => {
                const ctx = this.$refs.canvas.getContext('2d');
                const width = this.$refs.canvas.getBoundingClientRect().width;
                this.$refs.canvas.height = this.maxHeight;
                ctx.canvas.height = this.maxHeight;
                const height = this.maxHeight;

                this.canvasWidth = width;
                this.canvasHeight = height;

                // ctx.clearRect(0, 0, width, height);

                ctx.rect(0, 0, width, height);
                ctx.fillStyle = this.backgroundColor;
                ctx.fill();

                ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
                ctx.font = '14px Courier new';


                for (let i = 0; i < this.frameData.rects.length; i++) {
                    this.drawFrameRect(ctx, this.frameData.rects[i], width, height);
                }
            });
        },

        drawFrameRect(ctx, rect, width, height) {
            const y = Math.floor(height - (rect.d + 1) * this.frameHeight);
            if (y < 0 || y > height) {
                return;
            }
            let x = Math.floor(width * (rect.x + this.offsetX) * this.zoomX);
            let x2 = x + Math.floor(rect.w * width * this.zoomX);

            if (x2 < 0 || x > width)  {
                return;
            }
            if (x < 0) {
                x = 0;
            }
            if (x2 > width) {
                x2 = width;
            }

            ctx.fillStyle = rect.color;
            ctx.fillRect(x, y, x2-x, this.frameHeight);


            let w = x2 - x;
            let name = rect.name;
            if (w > 50 && name.length > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
                const maxSymbols = parseInt(Math.floor(w / 10));
                if (maxSymbols < name.length) {
                    name = name.substring(0, maxSymbols) + '...';
                }
                ctx.fillText(name, x + 4, y + 14, w);
            }
        },

        zoomOut() {
            this.zoomX = 1.0;
            this.offsetX = 0.0;
            this.render();
        },

        onCanvasDoubleClick(event) {
            const mx = event.offsetX;
            const my = event.offsetY;
            const x = mx / (this.canvasWidth * this.zoomX) - this.offsetX;
            const y = this.canvasHeight - my;

            for (let i = 0; i < this.frameData.rects.length; i++) {
                const rect = this.frameData.rects[i];
                const ry1 = rect.d * this.frameHeight;
                const ry2 = (rect.d + 1) * this.frameHeight;


                if (rect.x <= x && x <= rect.x + rect.w && ry1 <= y && y <= ry2) {
                    this.zoomX = 1 / rect.w;
                    this.offsetX = -rect.x;
                    this.render();
                    return;
                }
            }

        }
    },
}
</script>

