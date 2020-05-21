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
                    <th width="200px">Name</th>
                    <th>Regex</th>
                </thead>
                <tbody>
                    <tr v-for="(annotation, annotationIndex) in annotations">
                        <td><span class="close-link" @click="removeAnnotation(annotationIndex)">&#x2716;</span></td>
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
    </modal>
</template>

<script>
import Modal from './Modal.vue';


export default {
    props: ['annotations'],

    components: {Modal},

    data() {
        return {
            jsonMode: false,
            json: '',
            newAnnotation: {
                name: '',
                regexTerms: '',
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
                        regexTerms: [this.newAnnotation.regex]
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