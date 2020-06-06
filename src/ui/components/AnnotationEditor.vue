<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Annotations" @close="$emit('close')">
        <span class="link" @click="toggleMode">{{currentOtherMode}}</span>
        <div v-if="!jsonMode">
            <input class="textfield" type="text" v-model="newAnnotation.name" placeholder="Annotation Name">
            <input class="textfield" type="text" v-model="newAnnotation.regex" placeholder="Regex">
            <span class="btn btn-primary" @click="addAnnotation()">Add</span>

            <table class="table annotations-table">
                <thead>
                    <th width="20px"></th>
                    <th width="20px">On</th>
                    <th width="20px"></th>
                    <th width="200px">Name</th>
                    <th>Regex</th>
                </thead>
                <tbody>
                    <tr v-for="(annotation, annotationIndex) in annotations">
                        <td><span class="close-link" @click="removeAnnotation(annotationIndex)">&#x2716;</span></td>
                        <td><input type="checkbox" v-model="annotation.enabled"></td>
                        <td><span class="color-picker-rect" :style="{'background': hslToString(annotation.color)}" @click="toggleColorPickerForAnnotation(annotationIndex)"></span></td>
                        <td>
                            {{annotation.name}}
                        </td>
                        <td>
                            <ul class="annotation-regex-terms">
                                <li v-for="regex in annotation.regexTerms">
                                    <div class="regex-term">{{regex}}</div>
                                </li>
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div v-else>
            <textarea class="annotation-json" v-model="json"></textarea>
        </div>

        <modal :width="225" :height="340" v-if="colorPicker.annotationIndex >=0 && colorPicker.annotationIndex < annotations.length"
            primaryButton="Apply"
            closeButton="Cancel"
            @close="colorPicker.annotationIndex = -1"
            @primary-submit="applyColorForAnnotation(colorPicker.annotationIndex, colorPicker.colorForApplying)"
            >
            <chrome-picker v-model="colorPicker.color" @input="colorPicker.colorForApplying = arguments[0]"></chrome-picker>
        </modal>
    </modal>
</template>

<script>
import Modal from './Modal.vue';
import VueColor from 'vue-color';

export default {
    props: ['annotations'],

    components: {Modal, 'chrome-picker': VueColor.Chrome},

    data() {
        return {
            jsonMode: false,
            json: '',
            newAnnotation: {
                name: '',
                regexTerms: '',
            },

            colorPicker: {
                annotationIndex: -1,
                colorForApplying: null,
                color: {hex: '#0f0'}
            }
        }
    },

    methods: {
        addAnnotation() {
            if (this.newAnnotation.name && this.newAnnotation.regex) {

                const idx = this.findAnnotationIndexByName(this.newAnnotation.name);
                if (idx >= 0) {
                    this.annotations[idx].regexTerms.push(this.newAnnotation.regex);
                } else {
                    this.annotations.push({
                        name: this.newAnnotation.name,
                        regexTerms: [this.newAnnotation.regex],
                        enabled: true,
                        color: {h: 250, s: 0.9, l: 0.7}
                    });
                }
                this.newAnnotation.name = '';   
                this.newAnnotation.regex = '';   
            }
        },

        findAnnotationIndexByName(name) {
            for (let i = 0; i< this.annotations.length; i++) {
                if (this.annotations[i].name === name) {
                    return i;
                }
            }
            return -1;
        },

        removeAnnotation(idx) {
            this.annotations.splice(idx, 1);
        },

        toggleMode() {
            if (this.jsonMode) {
                this.convertAnnotationsBackFromJson(this.json);
            } else {
                this.json = JSON.stringify(this.annotations, null, 4);
            }

            this.jsonMode = !this.jsonMode;
        },

        convertAnnotationsBackFromJson(json) {
            const a = JSON.parse(json);
            this.annotations.length = 0;
            for(let i = 0; i < a.length; i++) {
                this.annotations.push(a[i]);
            }
        },

        toggleColorPickerForAnnotation(index) {
            if (index < 0 || index >= this.annotations.length) {
                return;
            }
            this.colorPicker.color = this.annotations[index].color;
            this.colorPicker.annotationIndex = index;
        },

        applyColorForAnnotation(annotationIndex, color) {
            if (annotationIndex < 0 || annotationIndex >= this.annotations.length) {
                return;
            }

            this.annotations[annotationIndex].color = color.hsl;
            this.colorPicker.annotationIndex = -1;
        },

        hslToString(c) {
            return `hsl(${c.h}, ${Math.round(c.s*100)}%, ${Math.round(c.l*100)}%)`;
        }
    },

    computed: {
        currentOtherMode() {
            if (this.jsonMode) {
                return 'Normal Mode';
            }
            return 'Json Mode'
        }
    }


}
</script>