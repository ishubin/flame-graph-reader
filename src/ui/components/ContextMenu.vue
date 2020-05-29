<template>
    <div ref="contextMenuContainer" class="context-menu" :style="{left: `${realX}px`, top: `${realY}px`}">
        <ul>
            <li v-for="option in options">
                <div @click="$emit('selected', option)">
                    <i v-if="option.icon" class="icon" :class="option.icon"></i>
                    {{option.name}}
                </div>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    props: ['options', 'x', 'y'],

    mounted() {
        document.body.addEventListener('click', this.onDocumentClick);

        const rect = this.$refs.contextMenuContainer.getBoundingClientRect();
        if (rect.bottom - window.innerHeight > -5) {
            this.realY = this.y - 3 - rect.height;
        }
        if (rect.right - window.innerWidth > -5) {
            this.realX = this.x - 3 - rect.width;
        }
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onDocumentClick);
    },

    data() {
        return {
            realX: this.x + 3, realY: this.y + 3
        };
    },

    methods: {
        onDocumentClick() {
            setTimeout(() => {
                this.$emit('close');
            }, 100);
        }
    }
    
}
</script>