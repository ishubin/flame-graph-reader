<template>
    <div ref="contextMenuContainer" class="context-menu" :style="{left: `${realX}px`, top: `${realY}px`}">
        <ul>
            <li v-for="option in options">
                <span @click="$emit('selected', option)">{{option.name}}</span>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    props: ['options', 'x', 'y'],

    mounted() {
        const rect = this.$refs.contextMenuContainer.getBoundingClientRect();
        if (rect.bottom - window.innerHeight > -5) {
            this.realY = this.y - 3 - rect.height;
        }
        if (rect.right - window.innerWidth > -5) {
            this.realX = this.x - 3 - rect.width;
        }
    },

    data() {
        return {
            realX: this.x + 3, realY: this.y + 3
        };
    }
    
}
</script>