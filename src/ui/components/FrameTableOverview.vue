<template>
    <div class="frame-table-overview">
        <input class="textfield search" type="text" v-model="searchKeyword" placeholder="Search...">

        <table class="table">
            <thead>
                <tr>
                    <th @click="toggleSort('name')">Name</th>
                    <th @click="toggleSort('samples')">Samples</th>
                    <th @click="toggleSort('selfSamples')">Self Samples</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in rows" v-if="!searchKeyword || row.name.indexOf(searchKeyword) >= 0">
                    <td>{{row.name}}</td>
                    <td>{{row.samples}} (<b>{{row.ratio | ratioToPrettyPercentage}}</b>%)</td>
                    <td>{{row.selfSamples}} (<b>{{row.selfRatio | ratioToPrettyPercentage}}</b>%)</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
export default {
    props: ['frameData'],

    beforeMount() {
        this.loadTable();
        this.sortTable();
    },

    data() {
        return {
            rows: [],
            searchKeyword: '',
            sortKey: 'samples',
            sortAscending: false
        };
    },

    methods: {
        loadTable() {
            this.rows.length = 0;

            const nameMap = new Map();

            const hasSameFrameInAncestors = (name, parentFrame) => {
                if (!parentFrame) {
                    return false;
                }
                if (parentFrame.name === name) {
                    return true;
                }

                return hasSameFrameInAncestors(name, this.frameData.findParentFrameForFrame(parentFrame));
            };

            this.frameData.traverseFrames((frame, parentFrame) => {
                if (!hasSameFrameInAncestors(frame.name, parentFrame)) {
                    if (!nameMap.has(frame.name)) {
                        nameMap.set(frame.name, {
                            samples: frame.samples,
                            selfSamples: frame.selfSamples
                        });
                    } else {
                        const value = nameMap.get(frame.name);
                        value.samples += frame.samples;
                        value.selfSamples += frame.selfSamples;
                    }
                }
            });

            nameMap.forEach((value, name) => {
                if (name !== 'all') {
                    this.rows.push({
                        name       : name,
                        samples    : value.samples,
                        selfSamples: value.selfSamples,
                        ratio      : value.samples / this.frameData.rootFrame.samples,
                        selfRatio  : value.selfSamples / this.frameData.rootFrame.samples,
                    });
                }
            });
        },

        sortTable() {
            const sortOrder = this.sortAscending ? 1: -1;
            this.rows.sort((a, b) => {
                const s = sortOrder * (a[this.sortKey] - b[this.sortKey]);
                if (s > 0) {
                    return 1;
                }
                if (s < 0) {
                    return -1;
                }
                return 0;
            });
        },

        toggleSort(sortKey) {
            if (sortKey === this.sortKey) {
                this.sortAscending = !this.sortAscending;
            } else {
                this.sortAscending = false;
                this.sortKey = sortKey;
            }
            
            this.sortTable();
        }
    },
    filters: {
        ratioToPrettyPercentage(value) {
            return `${Math.round(value * 10000) / 100}`;
        },
    }
}
</script>