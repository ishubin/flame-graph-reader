<template>
    <div>
        <canvas ref="canvas" width="1200" height="700"
            style="user-select: none; margin-bottom: 70px"
            @dblclick="onCanvasDoubleClick"
            @click="onCanvasClick"
            @mousemove="onCanvasMouseMove"
            ></canvas>

        <div class="flame-graph-details-panel">
            <div v-if="hoveredFrame.rect">
                <table class="table">
                    <thead>
                        <tr>
                            <th width="70px">%</th>
                            <th width="100px">Samples</th>
                            <th>Frame</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{hoveredFrame.rect.w | ratioToPrettyPercentage}}</td>
                            <td>{{hoveredFrame.rect.samples}}</td>
                            <td>
                                <code class="oneliner">{{hoveredFrame.rect.name}}</code>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>

            <modal name="Stacktrace" v-if="shownStackTrace" @close="shownStackTrace = null">
                <pre><code class="stacktrace">{{shownStackTrace}}</code></pre>
            </modal>
        </div>
    </div>
</template>

<script>
import Modal from './Modal.vue';
import {createGridFromRects} from '../grid';

export default {

    components: {Modal},

    props: ['frameData', 'searchKeyword'],

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
            grid:           createGridFromRects(this.frameData.rects, maxDepth),
            frameHeight,
            offsetX     : 0.0,
            zoomX       : 1.0,
            maxHeight   : (maxDepth + 1) * frameHeight,

            backgroundColor: 'hsl(205, 27%, 23%)',

            canvasWidth: 100,
            canvasHeight: 100,

            hoveredFrame: {
                rect: null
            },

            zoomedInRect: null,
            shownStackTrace: null
        }
    },

    mounted() {
        this.render();
    },

    methods: {
        render() {
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');

            const width = window.innerWidth;
            const height = this.maxHeight;

            this.canvasWidth = width;
            this.canvasHeight = height;

            // fixing rendering for retina
            if (window.devicePixelRatio === 2) {
                canvas.width = width*2;
                canvas.height = height*2;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;

                ctx.scale(2, 2);
            }


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

            if (rect.dimmed) {
                ctx.fillStyle = `hsla(${rect.color.h}, ${rect.color.s}%, ${rect.color.l}%, 0.2)`;
            } else {
                ctx.fillStyle = `hsl(${rect.color.h}, ${rect.color.s}%, ${rect.color.l}%)`;
            }
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

        zoomIntoRect(rect) {
            if (this.zoomedInRect) {
                // reseting previous zoom
                this.frameData.traverseRectAncestors(this.zoomedInRect, ancestorRect => {
                    ancestorRect.dimmed = false;
                });
            }
            this.frameData.traverseRectAncestors(rect, ancestorRect => {
                ancestorRect.dimmed = true;
            });

            this.zoomedInRect = rect;

            this.zoomX = 1 / rect.w;
            this.offsetX = -rect.x;
            this.render();
        },

        onCanvasDoubleClick(event) {
            const {x, y} = this.fromCanvasCoords(event.offsetX, event.offsetY);
            const rect = this.findRectAtPoint(x, y);
            if (rect) {
                this.zoomIntoRect(rect);
            }
        },


        findRectAtPoint(x, y) {
            let foundRect = null;
            this.grid.lookupAtPoint(x, Math.floor(y/this.frameHeight), rect => {
                const ry1 = rect.d * this.frameHeight;
                const ry2 = (rect.d + 1) * this.frameHeight;

                if (rect.x <= x && x <= rect.x + rect.w && ry1 <= y && y <= ry2) {
                    foundRect = rect;
                    return true; // telling grid lookup that we have found the item so it can stop iterating further
                }
                return false;
            });

            return foundRect;
        },

        onCanvasClick(event) {
        },

        onCanvasMouseMove(event) {
            const {x, y} = this.fromCanvasCoords(event.offsetX, event.offsetY);

            const foundRect = this.findRectAtPoint(x, y);
            if (foundRect) {
                this.hoveredFrame.rect = foundRect;
            } else {
                // hovered over void, deselecting rect
                this.hoveredFrame.rect = false;
            }
        },

        showStackTraceForRect(rect) {
            this.shownStackTrace = this.frameData.collectStackTrace(rect.id);
        },

        fromCanvasCoords(mx, my) {
            return {
                x : mx / (this.canvasWidth * this.zoomX) - this.offsetX,
                y : this.canvasHeight - my
            };
        }

    },
    filters: {
        ratioToPrettyPercentage(value) {
            return `${Math.round(value * 10000) / 100}%`;
        }
    }
}
</script>
