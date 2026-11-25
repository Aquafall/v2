<script lang="ts">
    import { onMount, tick } from "svelte";
    import { windowStore } from "./main";
</script>

<main>
    <div class="apprenderer" id="apprenderer">
        {#each windowStore.windows as window }
            <div> {window.name} </div>
        {/each}
    </div>
</main>

<style>

</style>