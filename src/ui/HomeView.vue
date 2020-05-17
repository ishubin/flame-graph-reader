<template>
    <div>
        <div class="middle-content">
            Hello
            <input type="file" @change="onFileChange"/> {{perf}}
        </div>
        <canvas ref="canvas" width="1200" height="700" style="border: 1px solid grey" @click="onCanvasClick"></canvas>
    </div>
</template>

<script>
import {parseProfilingLog, generateFrameRects} from './flamer';


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
a;b;c;v;d;d;af;f;as;s;a;a;s;f;a;a;f;a;asf;asf;asf;asf;asf;qwrwq;re;qwe;qwe;qwe;qwe;wqe;qwe;eq;wqe;w;ew;qwe;wqe;e;we;wew;eqwe;qwe;wqe;wqe;qwe;qwe;w;qe;a;d;as;da;ad;ad;asd;asda;sdas;da;dqwe;q;we;w 6
something else 4
        `);
        this.$refs.canvas.addEventListener('mousewheel', this.onMouseWheel);
    },

    beforeDestroy() {
        this.$refs.canvas.removeEventListener('mousewheel', this.onMouseWheel);
    },

    data() {
        return {
            rootFrame: null,
            frameData: null,
            frameHeight: 20,
            offsetX: 0.0,
            offsetY: 0,
            zoomX: 1.0,
            maxHeight: 0,
            perf: 0,

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

            let maxHeight = 0;
            for (let i = 0; i < this.frameData.rects.length; i++) {
                const rect = this.frameData.rects[i];
                const h = (rect.d + 1) * this.frameHeight;
                if (h > maxHeight) {
                    maxHeight = h;
                }
            }
            this.maxHeight = Math.max(0, maxHeight - this.$refs.canvas.height);
            this.render();
        },

        render() {
            this.perf = measurePerformance('render', () => {
                const ctx = this.$refs.canvas.getContext('2d');
                const {width, height} = this.$refs.canvas.getBoundingClientRect();
                this.canvasWidth = width;
                this.canvasHeight = height;

                ctx.clearRect(0, 0, width, height);
                ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
                ctx.font = '12pt Calibri';

                for (let i = 0; i < this.frameData.rects.length; i++) {
                    this.drawFrameRect(ctx, this.frameData.rects[i], width, height);
                }
            });
        },

        drawFrameRect(ctx, rect, width, height) {
            const y = Math.floor(height - (rect.d + 1) * this.frameHeight) + this.offsetY;
            if (y < 0 || y > height) {
                return;
            }
            const x = Math.floor(width * (rect.x + this.offsetX) * this.zoomX);
            const w = Math.floor(rect.w * width * this.zoomX);
            ctx.fillStyle = 'rgba(255, 200, 230, 1.0)';
            ctx.fillRect(x+1, y+1, w-1, this.frameHeight-1);

            ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
            ctx.fillText(rect.name, x + 4, y + 14, w - 8);
        },

        onMouseWheel(event) {
            event.preventDefault();
            let movedOffset = this.offsetY + event.deltaY;
            if (movedOffset > this.maxHeight) {
                movedOffset = this.maxHeight;
            }
            if (movedOffset < 0) {
                movedOffset = 0;
            }

            if (this.offsetY !== movedOffset) {
                this.offsetY = movedOffset;
                this.render();
            }

            return false;
        },

        onCanvasClick(event) {
            const mx = event.offsetX;
            const my = event.offsetY;
            const x = mx / (this.canvasWidth * this.zoomX) - this.offsetX;
            const y = this.canvasHeight - my + this.offsetY;

            for (let i = 0; i < this.frameData.rects.length; i++) {
                const rect = this.frameData.rects[i];
                const ry1 = rect.d * this.frameHeight;
                const ry2 = (rect.d + 1) * this.frameHeight;


                if (rect.x <= x && x <= rect.x + rect.w && ry1 <= y && y <= ry2) {
                    this.zoomX = 1 / rect.w;
                    this.offsetY = rect.d * this.frameHeight;
                    this.offsetX = -rect.x;
                    this.render();
                    return;
                }
            }

        }
    },
}
</script>

