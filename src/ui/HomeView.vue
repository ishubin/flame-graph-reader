<template>
    <div class="main-view">
        <div class="header">
            <input type="file" @change="onFileChange"/> 
            <ul class="tabs">
                <li class="tab" :class="{'active': flameGraphIndex === activeReportIndex}" @click="activeReportIndex = flameGraphIndex" v-for="(flameGraph, flameGraphIndex) in flameGraphs">
                    <span class="tab-close" @click="closeFlameGraph(flameGraphIndex)">&#x2716;</span>
                    <span>{{flameGraph.name}}</span>
                </li>
            </ul>
        </div>
        <div class="flame-graphs">
            <flame-graph-canvas v-for="(flameGraph, flameGraphIndex) in flameGraphs"
                :key="`flame-graph-canvas-${flameGraph.id}`"
                :class="{'hidden': flameGraphIndex !== activeReportIndex}"
                :frameData="flameGraph.frameData"/>
        </div>
    </div>
</template>

<script>
import {parseProfilingLog, generateFrameData} from './flamer';
import FlameGraphCanvas from './components/FlameGraphCanvas.vue';


export default {
    components: {FlameGraphCanvas},

    mounted() {
        this.loadReport('qwe', `
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
            flameGraphs: [],
            reportCounter: 0,
            activeReportIndex: 0 
        };
    },

    methods: {
        onFileChange(event) {
            this.loadFile(event.target.files[0]);
        },

        loadFile(file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                this.loadReport(file.name, event.target.result);
            };

            reader.readAsText(file);
        },

        loadReport(name, text) {
            this.reportCounter += 1;
            const rootFrame = parseProfilingLog(text);
            const frameData = generateFrameData(rootFrame);

            this.flameGraphs.push({
                name: name,
                id: this.reportCounter,
                frameData
            });
            this.activeReportIndex = this.flameGraphs.length - 1;
        },

        closeFlameGraph(index) {
            if (index < this.flameGraphs.length) {
                if (index <= this.activeReportIndex) {
                    this.activeReportIndex -= 1;
                }
                this.flameGraphs.splice(index, 1);
            }
        }
    },
}
</script>

