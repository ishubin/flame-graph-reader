<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="main-view">
        <div class="header">
            <div class="help">
                <a href="https://github.com/ishubin/flame-graph-reader" target="__blank"><i class="fa fa-github" aria-hidden="true"></i> Project on GitHub</a>
            </div>

            <ul class="tabs">
                <li class="tab" :class="{'active': flameGraphIndex === activeReportIndex}"  v-for="(flameGraph, flameGraphIndex) in flameGraphs">
                    <span class="tab-close" @click="closeFlameGraph(flameGraphIndex)">&#x2716;</span>
                    <span class="tab-name" v-if="toggledTabRename.reportIndex !== flameGraphIndex"  @click="activeReportIndex = flameGraphIndex" @dblclick="toggleTabRename(activeReportIndex)">{{flameGraph.name}}</span>
                    <input type="text" ref="tabRenameField" v-if="toggledTabRename.reportIndex === flameGraphIndex" v-model="toggledTabRename.name" @keydown.enter="submitTabRename()" @blur="submitTabRename">
                </li>
                <li class="tab tab-add-new">
                    <div>
                        <span>&#x2795;</span>
                        <input type="file" @change="onFileChange"/> 
                    </div>
                </li>
            </ul>

            <div class="right-tool-bar">
                <input type="text" v-model="searchKeyword" class="textfield search" placeholder="Search" @keydown.enter="toggleQuickSearch" @blur="toggleQuickSearch"/>

                <span class="btn btn-primary" v-if="mode === 'flame-graph'" @click="mode = 'table-mode'">To Table mode</span>
                <span class="btn btn-primary" v-else @click="mode = 'flame-graph'">To Flame Graph</span>

                <span class="btn btn-primary" @click="settings.compact = !settings.compact"><input type="checkbox" name="compacted" id="chk-compact" v-model="settings.compact"> Compact</span>
                <span class="btn btn-primary" @click="settings.inverted = !settings.inverted"><input type="checkbox" name="inverted" id="chk-inverted" v-model="settings.inverted"> Inverted</span>
                <span class="btn btn-primary" @click="annotationsEditorShown = true">Annotations</span>
                <span class="btn btn-primary" v-if="flameGraphs.length > 1" @click="compareGraphsModal.shown = true">Compare Flame Graphs</span>
                <span v-if="flameGraphs.length > 0 && activeReportIndex >= 0 && activeReportIndex < flameGraphs.length" class="btn btn-primary" @click="repairBrokenFramesWarningShown = true">Repair Broken Frames</span>
                <span v-if="flameGraphs.length > 0 && activeReportIndex >= 0 && activeReportIndex < flameGraphs.length" class="btn btn-primary" @click="saveFlameGraph(flameGraphs[activeReportIndex])">Save</span>
            </div>
        </div>
        <div v-if="mode === 'table-mode'">
            <frame-table-overview v-for="(flameGraph, flameGraphIndex) in flameGraphs"
                :key="`frame-table-overview-${flameGraph.id}`"
                :class="{'hidden': flameGraphIndex !== activeReportIndex}"
                :frame-data="flameGraph.frameData"
                :compared-graph-name="flameGraph.comparedWith"
                :compared-graph-max-samples="flameGraph.comparedMaxSamples"
                />
        </div>
        <div class="flame-graphs" v-else>
            <flame-graph-canvas v-for="(flameGraph, flameGraphIndex) in flameGraphs"
                :key="`flame-graph-canvas-${flameGraph.id}`"
                :class="{'hidden': flameGraphIndex !== activeReportIndex}"
                :frame-data="flameGraph.frameData"
                :annotations="annotations"
                :settings="settings"
                :compared-graph-name="flameGraph.comparedWith"
                :search-keyword="searchKeywordForFlameGraph"
                @quick-search-requested="searchKeyword = arguments[0]; toggleQuickSearch()"
                />
        </div>

        <div class="welcome" v-if="flameGraphs.length === 0">
            <h1>Welcome to Flame Graph Reader</h1>
            <p>
                It is an open-source Flame Graph visualizer that focuses on the flame graph reading experience.
                It makes it easier to analyze performance of your application by providing the following features:

                <ul>
                    <li><b>Regex based annotations.</b> 
                    You can group your code using regex and it this way you will be able to see where does your application spend most of the time</li>
                    <li>
                        <b>Marking frames.</b>
                        You might need some more time to look into your IDE and go through the code.
                        However some code paths might already look suspicious or bad to you. Luckily you can mark them as "good", "bad" or "suspicious" and get back to them later
                    </li>
                    <li>
                        <b>Compare Flame graphs</b>.
                        This feature is usefull in case your codebase is large and it is hard to see right away the difference in performance.
                        If you perform profiling before and after the code changes, you can load both reports and compare them
                    </li>
                </ul>
            </p>

            <div class="upload-report-button">
                <span>Load report</span>
                <input type="file" @change="onFileChange"/> 
            </div>
        </div>


        <annotations-editor v-if="annotationsEditorShown" :annotations="annotations" @close="annotationsEditorShown = false"/>


        <modal title="Compare Flame Graphs" @close="compareGraphsModal.shown = false" v-if="compareGraphsModal.shown" :width="400">
            <div v-for="(flameGraph, flameGraphIndex) in flameGraphs" v-if="flameGraphIndex !== activeReportIndex">
                <span class="link" @click="compareFlameGraphs(flameGraphIndex)">{{flameGraph.name}}</span>
            </div>
        </modal>


        <modal v-if="repairBrokenFramesWarningShown" title="Warning!" :width="500" :height="200" primary-button="Repair"
            @primary-submit="repairBrokenFrames(); repairBrokenFramesWarningShown = false"
            @close="repairBrokenFramesWarningShown = false"
            >
            You should use it only in case your profiler was not able to collect complete stack-trace and it appeared cut off in the report.
            It identifies the deepest stack traces and tries to attach them to another frame with the same name.
            <b>Be cautious</b> as this functionality might not show the real picture.
        </modal>


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
import {parseProfilingLog, generateFrameData, loadFlameGraphFormat, loadJfrJson} from './flamegraph';
import FlameGraphCanvas from './components/FlameGraphCanvas.vue';
import Modal from './components/Modal.vue';
import AnnotationsEditor from './components/AnnotationEditor.vue';
import FrameTableOverview from './components/FrameTableOverview.vue';


export default {
    components: {FlameGraphCanvas, AnnotationsEditor, Modal, FrameTableOverview},

    mounted() {
    },

    beforeDestroy() {
    },

    beforeMount() {
        this.loadSettings(window.localStorage.getItem('settings'));
        this.loadAnnotations(window.localStorage.getItem('annotations'));
    },

    data() {
        return {
            annotations: [],
            mode: 'flame-graph',
            annotationsEditorShown: false,

            flameGraphs: [],
            reportCounter: 0,
            activeReportIndex: 0 ,
            isLoadingFlameGraph: false,
            settings: {
                inverted: false,
                compact: false
            },
            compareGraphsModal: {
                shown: false
            },

            repairBrokenFramesWarningShown: false,

            searchKeyword: '',
            searchKeywordForFlameGraph: '',

            toggledTabRename: {
                reportIndex: -1,
                name: ''
            }
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
            
            // doing this so that Vue is able to show loading popup. Otherwise it gets stuck
            setTimeout(() => {
                try {
                    const flameGraph = this.loadFlameGraph(name, text);
                    this.flameGraphs.push(flameGraph);
                    this.activeReportIndex = this.flameGraphs.length - 1;
                } catch(e) {
                    alert('Could not load report. Unrecognized format');
                }
                this.isLoadingFlameGraph = false;
            }, 50);
        },

        loadFlameGraph(name, text) {
            const json = this.loadJson(text);
            if (json) {
                return this.loadJsonReport(json, name);
            }

            // if it's not json, then we try to parse it as a folded log
            const rootFrame = parseProfilingLog(text);
            const frameData = generateFrameData(rootFrame);

            this.reportCounter += 1;
            return {
                name: name,
                id: this.reportCounter,
                frameData,
                comparedWith: null
            };
        },

        loadJsonReport(json, name) {
            if (json.type === 'flame-graph-reader') {
                try {
                    return this.loadFlameGraphReaderFormat(json);
                } catch(e) {
                    console.error('Could not load flame graph from json', e);
                    throw e;
                }
            } else {
                try {
                    return this.loadFlameGraphFromJfrJson(json, name);
                } catch(e) {
                    console.error('Could not load flame graph from json', e);
                    throw e;
                }
            }
            throw new Error('Unrecognized format');
        },

        loadFlameGraphReaderFormat(json) {
            const frameData = loadFlameGraphFormat(json);

            if (json.annotations && json.annotations.length > 0) {
                this.annotations = json.annotations;
            }
            this.reportCounter += 1;
            return {
                name: json.name,
                id: this.reportCounter,
                frameData,
                comparedWith: null
            };
        },

        loadFlameGraphFromJfrJson(json, name) {
            const frameData = loadJfrJson(json);
            this.reportCounter += 1;
            return {
                name,
                id: this.reportCounter,
                frameData,
                comparedWith: null
            };
        },

        loadJson(text) {
            try {
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        },

        closeFlameGraph(index) {
            if (index < this.flameGraphs.length) {
                if (index <= this.activeReportIndex) {
                    this.activeReportIndex -= 1;
                }
                this.flameGraphs.splice(index, 1);
            }
        },

        repairBrokenFrames() {
            if (this.activeReportIndex >= 0 && this.activeReportIndex < this.flameGraphs.length) {
                const oldFlameGraph = this.flameGraphs[this.activeReportIndex];
                const newFrameData = this.flameGraphs[this.activeReportIndex].frameData.clone();
                newFrameData.repairBrokenFrames();

                this.reportCounter += 1;

                this.flameGraphs.push({
                    name        : oldFlameGraph.name + ' (repaired)',
                    id          : this.reportCounter,
                    frameData   : newFrameData,
                    comparedWith: null
                });

                this.activeReportIndex = this.flameGraphs.length - 1;
            }
        },

        compareFlameGraphs(idx) {
            this.compareGraphsModal.shown = false;

            const newFrameData = this.flameGraphs[this.activeReportIndex].frameData.clone();
            newFrameData.compareWith(this.flameGraphs[idx].frameData.rootFrame);

            this.reportCounter += 1;

            this.flameGraphs.push({
                name              : this.flameGraphs[this.activeReportIndex].name + ' vs ' + this.flameGraphs[idx].name,
                id                : this.reportCounter,
                frameData         : newFrameData,
                comparedWith      : this.flameGraphs[idx].name,
                comparedMaxSamples: this.flameGraphs[idx].frameData.rootFrame.samples
            });

            this.activeReportIndex = this.flameGraphs.length - 1;
        },

        loadSettings(text) {
            if (!text) {
                return;
            }

            const json = JSON.parse(text);
            if (json.hasOwnProperty('compact')) {
                this.settings.compact = json.compact;
            }
            if (json.hasOwnProperty('inverted')) {
                this.settings.inverted = json.inverted;
            }
        },

        loadAnnotations(text) {
            if (!text) {
                return;
            }

            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                this.annotations.length = 0;
                for (let i = 0; i < json.length; i++) {
                    this.annotations.push({
                        name      : json[i].name,
                        enabled   : json[i].enabled,
                        regexTerms: json[i].regexTerms,
                        color     : json[i].color || {h: 250, s: 0.9, l: 0.7}
                    });
                }
            }
        },

        toggleQuickSearch() {
            this.searchKeywordForFlameGraph = this.searchKeyword;
        },

        saveFlameGraph(flameGraphReport) {
            const json = {
                type: 'flame-graph-reader',
                version: '1',
                name: flameGraphReport.name,
                frameData: flameGraphReport.frameData.toJSONObject()
            };

            if (this.annotations.length > 0) {
                json.annotations = this.annotations;
            }

            const link = document.createElement('a');
            document.body.appendChild(link);

            try {
                link.href = 'data:application/json;base64,' + btoa(JSON.stringify(json));
                link.download = flameGraphReport.name + '.flamegraph.json';
                link.click();
            } catch(e) {
                console.error(e);
            }
            setTimeout(() => document.body.removeChild(link), 100);
        },

        toggleTabRename(reportIndex) {
            this.toggledTabRename.name = this.flameGraphs[reportIndex].name;
            this.toggledTabRename.reportIndex = reportIndex;
            this.$nextTick(() => {
                this.$refs.tabRenameField[0].focus();
            });
        },

        submitTabRename() {
            const idx = this.toggledTabRename.reportIndex;
            if (idx >= 0) {
                this.flameGraphs[idx].name = this.toggledTabRename.name;
                this.toggledTabRename.reportIndex = -1;
            }
        }
    },
    watch: {
        annotations: {
            deep: true,
            handler(value){
                window.localStorage.setItem('annotations', JSON.stringify(value));
            }
        },
        settings: {
            deep: true,
            handler(value){
                window.localStorage.setItem('settings', JSON.stringify(value));
            }
        }
    }
}
</script>

