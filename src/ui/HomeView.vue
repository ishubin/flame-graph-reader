<template>
    <div class="main-view">
        <div class="header">
            <ul class="tabs">
                <li class="tab" :class="{'active': flameGraphIndex === activeReportIndex}" @click="activeReportIndex = flameGraphIndex" v-for="(flameGraph, flameGraphIndex) in flameGraphs">
                    <span class="tab-close" @click="closeFlameGraph(flameGraphIndex)">&#x2716;</span>
                    <span>{{flameGraph.name}}</span>
                </li>
                <li class="tab tab-add-new">
                    <span>&#x2795;</span>
                    <input type="file" @change="onFileChange"/> 
                </li>
            </ul>

            <div class="right-tool-bar">
                <input type="text" placeholder="Search" v-model="searchKeyword"/>
                <button @click="toggleSearch">Search</button>
            </div>
        </div>
        <div class="flame-graphs">
            <flame-graph-canvas v-for="(flameGraph, flameGraphIndex) in flameGraphs"
                :key="`flame-graph-canvas-${flameGraph.id}`"
                :class="{'hidden': flameGraphIndex !== activeReportIndex}"
                :frame-data="flameGraph.frameData"
                :search-keyword="toggledSearchedKeyword"
                />
        </div>


        <transition name="modal" v-if="isLoadingFlameGraph">
            <div class="modal-mask">
                <div class="modal-wrapper">
                    <div class="modal-container" style="width: 300px;">
                        <div class="modal-header">
                            <h3>Loading</h3>
                        </div>
                        <div class="modal-body">
                        </div>
                        <div class="modal-footer">
                        </div>
                    </div>
                </div>
            </div>
        </transition>
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
            activeReportIndex: 0 ,
            isLoadingFlameGraph: false,
            searchKeyword: '',
            toggledSearchedKeyword: ''
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
            this.isLoadingFlameGraph = true;
            
            setTimeout(() => {
                this.reportCounter += 1;
                const rootFrame = parseProfilingLog(text);
                const frameData = generateFrameData(rootFrame);

                this.flameGraphs.push({
                    name: name,
                    id: this.reportCounter,
                    frameData
                });
                this.activeReportIndex = this.flameGraphs.length - 1;
                this.isLoadingFlameGraph = false;
            }, 50);
        },

        closeFlameGraph(index) {
            if (index < this.flameGraphs.length) {
                if (index <= this.activeReportIndex) {
                    this.activeReportIndex -= 1;
                }
                this.flameGraphs.splice(index, 1);
            }
        },

        toggleSearch() {
            this.toggledSearchedKeyword = this.searchKeyword;
        }
    },
}
</script>

