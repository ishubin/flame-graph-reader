<template>
    <div>
        <canvas ref="canvas" width="1200" height="700"
            @dblclick="onCanvasDoubleClick"
            @click="onCanvasClick"
            ></canvas>
    </div>
</template>
<script>
export default {

    props: ['frameData'],

    data() {
        let maxDepth = 0;
        for (let i = 0; i < this.frameData.rects.length; i++) {
            const rect = this.frameData.rects[i];
            const depth = (rect.d + 1);
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }

        const frameHeight = 20;

        return {
            frameHeight,
            offsetX: 0.0,
            zoomX: 1.0,
            maxHeight: (maxDepth + 1) * frameHeight,

            backgroundColor: 'hsl(205, 27%, 23%)',

            canvasWidth: 100,
            canvasHeight: 100
        }
    },

    mounted() {
        this.render();
    },

    methods: {
        render() {
            const ctx = this.$refs.canvas.getContext('2d');
            const width = this.$refs.canvas.getBoundingClientRect().width;
            this.$refs.canvas.height = this.maxHeight;
            ctx.canvas.height = this.maxHeight;
            const height = this.maxHeight;

            this.canvasWidth = width;
            this.canvasHeight = height;

            ctx.fillStyle = this.backgroundColor;
            ctx.rect(0, 0, width, height);
            ctx.fill();

            ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
            ctx.font = '14px Courier new';


            for (let i = 0; i < this.frameData.rects.length; i++) {
                this.drawFrameRect(ctx, this.frameData.rects[i], width, height);
            }
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
            const {x, y} = this.fromCanvasCoords(event.offsetX, event.offsetY);

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
        },

        onCanvasClick(event) {
            const {x, y} = this.fromCanvasCoords(event.offsetX, event.offsetY);

            for (let i = 0; i < this.frameData.rects.length; i++) {
                const rect = this.frameData.rects[i];
                const ry1 = rect.d * this.frameHeight;
                const ry2 = (rect.d + 1) * this.frameHeight;


                if (rect.x <= x && x <= rect.x + rect.w && ry1 <= y && y <= ry2) {
                    console.log('Selected ', rect);
                }
            }
        },

        fromCanvasCoords(mx, my) {
            return {
                x : mx / (this.canvasWidth * this.zoomX) - this.offsetX,
                y : this.canvasHeight - my
            };
        }

    }
}
</script>
