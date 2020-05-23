<template>
    <div>
        <canvas ref="canvas" width="1200" height="700"
            style="user-select: none; margin-bottom: 70px"
            @dblclick="onCanvasDoubleClick"
            @click="onCanvasClick"
            @mousemove="onCanvasMouseMove"
            @contextmenu="onRightClick"
            ></canvas>

        <div class="flame-graph-details-panel">
            <table width="100%">
                <tbody>
                    <tr>
                        <td width="50%">
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
                        </td>
                        <td>
                            <table class="table" v-if="hoveredAnnotationSamples">
                                <thead>
                                    <tr>
                                        <th>Unmatched</th>
                                        <th v-for="(samples, name) in hoveredAnnotationSamples">{{name}}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{{calculateUnmatchedSamples(hoveredAnnotationSamples, hoveredAnnotationMaxSamples) | samplesToPercent(hoveredAnnotationMaxSamples)}}</td>
                                        <td v-for="(samples, name) in hoveredAnnotationSamples">{{samples | samplesToPercent(hoveredAnnotationMaxSamples) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="table" v-else>
                                <thead>
                                    <tr>
                                        <th>Unmatched</th>
                                        <th v-for="(samples, name) in annotationSamples">{{name}}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{{calculateUnmatchedSamples(annotationSamples, annotationMaxSamples) | samplesToPercent(annotationMaxSamples)}}</td>
                                        <td v-for="(samples, name) in annotationSamples">{{samples | samplesToPercent(annotationMaxSamples) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <context-menu v-if="contextMenu.shown" 
            :key="`context-menu-${contextMenu.x}-${contextMenu.y}`"
            @close="contextMenu.shown = false"
            @selected="onContextMenuOptionSelected"
            :x="contextMenu.x"
            :y="contextMenu.y"
            :options="contextMenu.options"
        />

        <modal name="Stacktrace" v-if="shownStackTrace" @close="shownStackTrace = null">
            <pre><code class="stacktrace">{{shownStackTrace}}</code></pre>
        </modal>
    </div>
</template>

<script>
import Modal from './Modal.vue';
import ContextMenu from './ContextMenu.vue';
import {createGridFromRects} from '../grid';

export default {

    components: {Modal, ContextMenu},

    props: ['frameData', 'annotations', 'settings'],

    data() {
        return {
            grid              : createGridFromRects(this.frameData.rects, this.frameData.rootFrame.maxDepth),
            normalFrameHeight : 20,
            compactFrameHeight: 5,
            offsetX           : 0.0,
            zoomX             : 1.0,

            backgroundColor: 'hsl(205, 27%, 23%)',

            canvasWidth: 100,
            canvasHeight: 100,

            hoveredFrame: {
                rect: null
            },

            zoomedInRect: null,
            shownStackTrace: null,

            contextMenu: {
                rect   : null,
                shown  : false,
                options: [],
                x      : 0,
                y      : 0
            },

            // calculated annotated samples relative to zoomed in rect
            annotationSamples: {},
            annotationMaxSamples: 1,

            // calculated annotated samples relative to hovered frame
            hoveredAnnotationSamples: null,
            hoveredAnnotationMaxSamples: 1
        }
    },

    mounted() {
        this.annotateFrames();
        this.render();
    },

    methods: {
        getFrameHeight() {
            return this.settings.compact ? this.compactFrameHeight : this.normalFrameHeight;
        },

        render() {
            const frameHeight = this.getFrameHeight(); 
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');

            const width = window.innerWidth;
            const height = (this.frameData.rootFrame.maxDepth + 1) * frameHeight;

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
                this.drawFrameRect(ctx, this.frameData.rects[i], width, height, frameHeight);
            }
        },

        drawFrameRect(ctx, rect, width, height, frameHeight) {
            let y = Math.floor(rect.d * frameHeight);
            if (this.settings.inverted) {
                y = Math.floor(height - (rect.d + 1) * frameHeight);
            }
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

            const saturation = rect.dimmed ? 30 : rect.color.s;

            const light = (this.hoveredFrame.rect && this.hoveredFrame.rect.id === rect.id) ? 96 : rect.color.l;

            if (rect.annotated) {
                ctx.fillStyle = `hsl(250, ${saturation}%, ${light}%)`;
            } else {
                ctx.fillStyle = `hsl(${rect.color.h}, ${saturation}%, ${light}%)`;
            }

            ctx.fillRect(x, y, Math.max(1, x2-x), frameHeight);


            if (!this.settings.compact) {
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
            }
        },

        zoomOut() {
            this.zoomX = 1.0;
            this.offsetX = 0.0;

            if (this.zoomedInRect) {
                // reseting previous zoom
                this.frameData.traverseRectAncestors(this.zoomedInRect, ancestorRect => {
                    ancestorRect.dimmed = false;
                });
            }

            this.zoomedInRect = null;
            this.toggleAnnotationSamples();
            this.render();
        },

        zoomAt(mx, my) {
            const x1 = Math.max(0, this.fromCanvasCoords(mx - this.canvasWidth/4, my).x);
            const x2 = Math.min(1, this.fromCanvasCoords(mx + this.canvasWidth/4, my).x);
            const dx = x2 - x1;
            if (dx < 0.000001) {
                return;
            }

            this.zoomX = 1/dx;
            this.offsetX = -x1;
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

            this.toggleAnnotationSamples();
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
            const frameHeight = this.getFrameHeight();
            this.grid.lookupAtPoint(x, Math.floor(y/frameHeight), rect => {
                const ry1 = rect.d * frameHeight;
                const ry2 = (rect.d + 1) * frameHeight;

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

        onRightClick(event) {
            event.preventDefault();
            const {x, y} = this.fromCanvasCoords(event.offsetX, event.offsetY);
            this.showContextMenuForRect(this.findRectAtPoint(x, y), event.clientX, event.clientY);
        },

        showContextMenuForRect(rect, mx, my) {
            this.contextMenu.rect = rect;
            this.contextMenu.x = mx;
            this.contextMenu.y = my;
            this.contextMenu.options = [{
                name: 'Zoom',
                id: 'zoom'
            },{
                name: 'Zoom Out',
                id: 'zoom-out'
            }];

            if (rect) {
                this.contextMenu.options.push({
                    name: 'Zoom Into Frame',
                    id: 'zoom-into-frame'
                });
                this.contextMenu.options.push({
                    name: 'Show Stack Trace',
                    id: 'show-stack-trace'
                });
                if (rect.parentId === 0) {
                    this.contextMenu.options.push({
                        name: 'Repair Frame',
                        id: 'repair-frame'
                    });
                }
            }

            this.contextMenu.shown = true;
        },

        onContextMenuOptionSelected(option) {
            if (option.id === 'zoom-out') {
                this.zoomOut();
            } else if (option.id === 'zoom') {
                this.zoomAt(this.contextMenu.x, this.contextMenu.y);
            } else if (option.id === 'zoom-into-frame') {
                this.zoomIntoRect(this.contextMenu.rect);
            } else if (option.id === 'show-stack-trace' && this.contextMenu.rect) {
                this.shownStackTrace = this.frameData.collectStackTrace(this.contextMenu.rect.id);
            } else if (option.id === 'repair-frame') {
                this.repairFrame(this.frameData.findFrameById(this.contextMenu.rect.id));
            }

            this.contextMenu.shown = false;
        },

        onCanvasMouseMove(event) {
            const {x, y} = this.fromCanvasCoords(event.offsetX, event.offsetY);

            const foundRect = this.findRectAtPoint(x, y);
            const previousHoveredRect = this.hoveredFrame.rect;

            if (foundRect) {
                this.hoveredFrame.rect = foundRect;
                if (previousHoveredRect && previousHoveredRect.id !== foundRect.id || !previousHoveredRect) {
                    const ctx = this.$refs.canvas.getContext('2d');
                    if (previousHoveredRect) {
                        this.drawFrameRect(ctx, previousHoveredRect, this.canvasWidth, this.canvasHeight, this.getFrameHeight());
                    }
                    this.drawFrameRect(ctx, foundRect, this.canvasWidth, this.canvasHeight, this.getFrameHeight());
                    

                    const frame = this.frameData.findFrameById(foundRect.id);
                    this.hoveredAnnotationSamples = this.calculateMaxAnotationSamplesRelativeToFrame(frame);
                    this.hoveredAnnotationMaxSamples = frame.samples;
                }
            } else {
                this.hoveredAnnotationSamples = null;

                // hovered over void, deselecting rect
                this.hoveredFrame.rect = false;

                if (previousHoveredRect) {
                    const ctx = this.$refs.canvas.getContext('2d');
                    this.drawFrameRect(ctx, previousHoveredRect, this.canvasWidth, this.canvasHeight);
                }
            }
        },

        showStackTraceForRect(rect) {
            this.shownStackTrace = this.frameData.collectStackTrace(rect.id);
        },

        fromCanvasCoords(mx, my) {
            return {
                x : mx / (this.canvasWidth * this.zoomX) - this.offsetX,
                y : this.settings.inverted ? this.canvasHeight - my : my
            };
        },

        /**
         * This function walks through all frames and annotates them based on matching annotation regex terms
         */
        annotateFrames() {
            this.frameData.traverseFrames((frame, parentFrame) => {
                // stores annotation samples per frame
                frame.annotationSamples = {};

                let matched = false;
                for (let i = 0; i < this.annotations.length; i++) {
                    const annotation = this.annotations[i];
                    if (annotation.enabled) {
                        frame.annotationSamples[annotation.name] = 0;
                        for (let j = 0; j < annotation.regexTerms.length; j++) {
                            const regex = annotation.regexTerms[j];
                            if (frame.name.match(regex)) {
                                matched = true;
                                frame.annotationSamples[annotation.name] = frame.samples;
                            }
                        }
                    }
                };


                const rect = this.frameData.findRectForFrame(frame);
                if (rect) {
                    rect.annotated = matched;
                }
            });

            this.toggleAnnotationSamples();
        },

        toggleAnnotationSamples() {
            let relativeFrame = this.frameData.rootFrame;
            if (this.zoomedInRect) {
                relativeFrame = this.frameData.findFrameById(this.zoomedInRect.id);
            }
            this.annotationMaxSamples = relativeFrame.samples;
            this.annotationSamples = this.calculateMaxAnotationSamplesRelativeToFrame(relativeFrame);
        },

        calculateMaxAnotationSamplesRelativeToFrame(frame) {
            const maxAnnotationSamples = {};
            const childAnnotationSamplesSummary = {};
            for (let i = 0; i < this.annotations.length; i++) {
                if (this.annotations[i].enabled) {
                    childAnnotationSamplesSummary[this.annotations[i].name] = 0;
                }
            }

            frame.childFrames.forEach(childFrame => {
                const childMaxAnnotationSamples = this.calculateMaxAnotationSamplesRelativeToFrame(childFrame);
                for (let i = 0; i < this.annotations.length; i++) {
                    if (this.annotations[i].enabled) {
                        childAnnotationSamplesSummary[this.annotations[i].name] += childMaxAnnotationSamples[this.annotations[i].name];
                    }
                }
            });

            for (let i = 0; i < this.annotations.length; i++) {
                if (this.annotations[i].enabled) {
                    const selfSample = frame.annotationSamples[this.annotations[i].name];
                    if (selfSample === 0) {
                        maxAnnotationSamples[this.annotations[i].name] = childAnnotationSamplesSummary[this.annotations[i].name];
                    } else {
                        maxAnnotationSamples[this.annotations[i].name] = selfSample;
                    }
                }
            };

            return maxAnnotationSamples;
        },

        calculateUnmatchedSamples(annotationSamples, annotationMaxSamples) {
            let unmatched = annotationMaxSamples;
            for (let name in annotationSamples) {
                if (annotationSamples.hasOwnProperty(name)) {
                    unmatched -= annotationSamples[name];
                }
            }
            return unmatched;
        },

        repairFrame(frame) {
            this.frameData.repairFrame(frame);
            this.grid = createGridFromRects(this.frameData.rects, this.frameData.rootFrame.maxDepth);

            this.hoveredFrame.rect = null;
            this.annotateFrames();
            this.toggleAnnotationSamples();
            this.render();
        }
    },
    filters: {
        ratioToPrettyPercentage(value) {
            return `${Math.round(value * 10000) / 100}%`;
        },

        samplesToPercent(samples, total) {
            if (total > 0) {
                return `${Math.round(samples * 10000 / total) / 100}%`;
            }
            return '0%';
        }
    },

    watch: {
        annotations: {
            deep: true,
            handler() {
                this.annotateFrames();
                this.render();
            }
        },
        settings: {
            deep: true,
            handler() {
                this.render();
            }
        }
    }
}
</script>
