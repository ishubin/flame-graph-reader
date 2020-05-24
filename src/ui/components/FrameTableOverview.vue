<template>
    <div class="frame-table-overview">
        <input class="textfield search" type="text" v-model="searchKeyword" @input="onSearchInput" placeholder="Search...">

        <table class="table">
            <thead>
                <tr>
                    <th @click="toggleSort('name')">
                        Name
                        <span v-if="sortKey === 'name' && this.sortAscending">&#x25B2;</span>
                        <span v-if="sortKey === 'name' && !this.sortAscending">&#x25BC;</span>
                    </th>
                    <th @click="toggleSort('samples')">
                        Samples
                        <span v-if="sortKey === 'samples' && this.sortAscending">&#x25B2;</span>
                        <span v-if="sortKey === 'samples' && !this.sortAscending">&#x25BC;</span>
                    </th>
                    <th @click="toggleSort('selfSamples')">
                        Self Samples
                        <span v-if="sortKey === 'selfSamples' && this.sortAscending">&#x25B2;</span>
                        <span v-if="sortKey === 'selfSamples' && !this.sortAscending">&#x25BC;</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in filteredRows">
                    <td>{{row.name}}</td>
                    <td>{{row.samples}} (<b>{{row.ratio | ratioToPrettyPercentage}}</b>%)</td>
                    <td>{{row.selfSamples}} (<b>{{row.selfRatio | ratioToPrettyPercentage}}</b>%)</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>

const TABLE_OVERVIEW_SYMBOL = Symbol('_tableOverview');

export default {
    props: ['frameData'],

    beforeMount() {
        this.loadTable();
    },

    data() {
        return {
            rows: [],
            filteredRows: [],
            searchKeyword: '',
            sortKey: 'samples',
            sortAscending: false,

            filteringTimerId: null
        };
    },

    methods: {
        loadTable() {
            if (this.frameData[TABLE_OVERVIEW_SYMBOL]) {
                this.rows = this.frameData[TABLE_OVERVIEW_SYMBOL];
                return;
            }

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
            this.sortTable();
            this.filterRows();
            this.frameData[TABLE_OVERVIEW_SYMBOL] = this.rows;
        },

        sortTable() {
            const sortOrder = this.sortAscending ? 1: -1;
            const sortingFunc = (a, b) => {
                if (this.sortKey === 'name') {
                    if (a.name < b.name) {
                        return sortOrder
                    }
                    if (a.name > b.name) {
                        return -sortOrder;
                    }
                    return 0;
                } 

                const s = sortOrder * (a[this.sortKey] - b[this.sortKey]);
                if (s > 0) {
                    return 1;
                }
                if (s < 0) {
                    return -1;
                }
                return 0;
            };

            this.rows.sort(sortingFunc);
            this.filteredRows.sort(sortingFunc);
        },

        toggleSort(sortKey) {
            if (sortKey === this.sortKey) {
                this.sortAscending = !this.sortAscending;
            } else {
                this.sortAscending = false;
                this.sortKey = sortKey;
            }
            
            this.sortTable();
        },

        filterRows() {
            this.filteredRows.length = 0;
            for (let i = 0; i < this.rows.length; i++) {
                if (!this.searchKeyword || this.rows[i].name.indexOf(this.searchKeyword) >= 0) {
                    this.filteredRows.push(this.rows[i]);
                }
            }
        },

        /**
         * Only filtering once user stopped typing
         */
        onSearchInput() {
            if (this.filteringTimerId) {
                clearTimeout(this.filteringTimerId);
            }

            this.filteringTimerId = setTimeout(() => this.filterRows(), 100);
        }
    },
    filters: {
        ratioToPrettyPercentage(value) {
            return `${Math.round(value * 10000) / 100}`;
        },
    }
}
</script>